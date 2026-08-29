use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use tauri::Manager;

const WG_QUICK_PATHS: [&str; 3] = [
    "/opt/homebrew/bin/wg-quick",
    "/usr/local/bin/wg-quick",
    "/usr/bin/wg-quick",
];

// PATH que wg-quick necesita para encontrar wg y wireguard-go
const TOOL_PATH: &str = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin";

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TunnelInfo {
    pub name: String,
    pub address: Option<String>,
    pub endpoint: Option<String>,
    pub connected: bool,
    /// Interfaz utun asignada por wg-quick (solo cuando está conectado).
    pub interface: Option<String>,
    pub rx_bytes: Option<u64>,
    pub tx_bytes: Option<u64>,
    /// None = no aplica (desconectado); Some(false) = interfaz activa pero sin
    /// alcance al endpoint → la UI lo muestra como "Reconectando".
    pub reachable: Option<bool>,
}

fn tunnels_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?
        .join("tunnels");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn parse_conf_field(content: &str, key: &str) -> Option<String> {
    content.lines().find_map(|line| {
        let line = line.trim();
        let (k, v) = line.split_once('=')?;
        if k.trim().eq_ignore_ascii_case(key) {
            Some(v.trim().to_string())
        } else {
            None
        }
    })
}

fn sanitize_name(name: &str) -> Result<String, String> {
    let clean: String = name
        .trim()
        .trim_end_matches(".conf")
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '_')
        .collect();
    // wg-quick limita el nombre de interfaz a 15 caracteres
    if clean.is_empty() || clean.len() > 15 {
        return Err("invalid-tunnel-name".into());
    }
    Ok(clean)
}

/// Devuelve el nombre de la interfaz (utunX) que tiene asignada la IP del túnel.
fn interface_for_address(address: &str) -> Option<String> {
    let ip = address.split('/').next().unwrap_or(address);
    let output = Command::new("ifconfig").output().ok()?;
    let text = String::from_utf8_lossy(&output.stdout);
    let needle = format!("inet {ip} ");
    let mut current: Option<String> = None;
    for line in text.lines() {
        if !line.starts_with(['\t', ' ']) {
            current = line.split(':').next().map(str::to_string);
        } else if line.trim_start().starts_with("inet ") && line.contains(&needle) {
            return current;
        }
    }
    None
}

/// Bytes acumulados (rx, tx) de una interfaz vía `netstat -ibn` — no requiere root.
fn interface_bytes(iface: &str) -> Option<(u64, u64)> {
    let output = Command::new("netstat")
        .args(["-ibn", "-I", iface])
        .output()
        .ok()?;
    let text = String::from_utf8_lossy(&output.stdout);
    for line in text.lines().skip(1) {
        let cols: Vec<&str> = line.split_whitespace().collect();
        // Fila <Link#N>: ... Ipkts Ierrs Ibytes Opkts Oerrs Obytes Coll
        if cols.len() >= 8 && cols.iter().any(|c| c.starts_with("<Link")) {
            let n = cols.len();
            let rx = cols[n - 5].parse().ok()?;
            let tx = cols[n - 2].parse().ok()?;
            return Some((rx, tx));
        }
    }
    None
}

/// Ping de 1 paquete / 1 s al host del endpoint. wg-quick instala una ruta de
/// host hacia el endpoint por la interfaz física, así que esto comprueba el
/// internet "real" aunque el túnel enrute 0.0.0.0/0.
fn endpoint_reachable(endpoint: &str) -> bool {
    let host = endpoint
        .rsplit_once(':')
        .map(|(h, _)| h)
        .unwrap_or(endpoint);
    Command::new("ping")
        .args(["-c", "1", "-t", "1", host])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

fn find_wg_quick() -> Option<String> {
    WG_QUICK_PATHS
        .iter()
        .find(|p| PathBuf::from(p).exists())
        .map(|p| p.to_string())
}

fn run_admin_shell(command: &str) -> Result<String, String> {
    // osascript muestra el prompt nativo de contraseña de macOS
    let escaped = command.replace('\\', "\\\\").replace('"', "\\\"");
    let script = format!(
        "do shell script \"{escaped}\" with prompt \"Sito WireGuard VPN necesita permisos de administrador\" with administrator privileges"
    );
    let output = Command::new("osascript")
        .args(["-e", &script])
        .output()
        .map_err(|e| e.to_string())?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

fn tunnel_info(app: &tauri::AppHandle, name: &str) -> Result<TunnelInfo, String> {
    let path = tunnels_dir(app)?.join(format!("{name}.conf"));
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let address = parse_conf_field(&content, "Address");
    let endpoint = parse_conf_field(&content, "Endpoint");
    let interface = address.as_deref().and_then(interface_for_address);
    let connected = interface.is_some();
    let (rx_bytes, tx_bytes) = interface
        .as_deref()
        .and_then(interface_bytes)
        .map(|(rx, tx)| (Some(rx), Some(tx)))
        .unwrap_or((None, None));
    let reachable = if connected {
        endpoint.as_deref().map(endpoint_reachable)
    } else {
        None
    };
    Ok(TunnelInfo {
        name: name.to_string(),
        address,
        endpoint,
        connected,
        interface,
        rx_bytes,
        tx_bytes,
        reachable,
    })
}

#[tauri::command]
fn check_deps() -> Option<String> {
    find_wg_quick()
}

// Los commands son async + spawn_blocking: los no-async de Tauri corren en el
// hilo principal, y aquí hay trabajo bloqueante (osascript esperando la
// contraseña, pings de 1 s) que congelaría la UI.

/// Ejecuta trabajo bloqueante fuera del hilo principal y del pool async.
async fn blocking<T: Send + 'static>(
    task: impl FnOnce() -> Result<T, String> + Send + 'static,
) -> Result<T, String> {
    tauri::async_runtime::spawn_blocking(task)
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn read_conf_file(path: String) -> Result<String, String> {
    blocking(move || {
        if !path.ends_with(".conf") {
            return Err("invalid-file".into());
        }
        fs::read_to_string(&path).map_err(|e| e.to_string())
    })
    .await
}

fn list_tunnels_impl(app: &tauri::AppHandle) -> Result<Vec<TunnelInfo>, String> {
    let dir = tunnels_dir(app)?;
    let mut tunnels = Vec::new();
    for entry in fs::read_dir(&dir).map_err(|e| e.to_string())?.flatten() {
        let path = entry.path();
        if path.extension().is_some_and(|e| e == "conf") {
            if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                if let Ok(info) = tunnel_info(app, stem) {
                    tunnels.push(info);
                }
            }
        }
    }
    tunnels.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(tunnels)
}

#[tauri::command]
async fn list_tunnels(app: tauri::AppHandle) -> Result<Vec<TunnelInfo>, String> {
    blocking(move || list_tunnels_impl(&app)).await
}

#[tauri::command]
async fn save_tunnel(
    app: tauri::AppHandle,
    name: String,
    content: String,
) -> Result<TunnelInfo, String> {
    blocking(move || {
        if !content.contains("[Interface]") || !content.contains("PrivateKey") {
            return Err("invalid-config".into());
        }
        let name = sanitize_name(&name)?;
        let path = tunnels_dir(&app)?.join(format!("{name}.conf"));
        fs::write(&path, content).map_err(|e| e.to_string())?;
        tunnel_info(&app, &name)
    })
    .await
}

#[tauri::command]
async fn delete_tunnel(app: tauri::AppHandle, name: String) -> Result<(), String> {
    blocking(move || {
        let name = sanitize_name(&name)?;
        let path = tunnels_dir(&app)?.join(format!("{name}.conf"));
        fs::remove_file(&path).map_err(|e| e.to_string())
    })
    .await
}

fn connect_impl(app: &tauri::AppHandle, name: &str) -> Result<TunnelInfo, String> {
    let name = sanitize_name(name)?;
    if find_wg_quick().is_none() {
        return Err("missing-deps".into());
    }
    let conf = tunnels_dir(app)?.join(format!("{name}.conf"));
    let conf_path = conf.to_string_lossy().to_string();
    // wg-quick no tolera espacios en la ruta del conf: se copia a /etc/wireguard
    let command = format!(
        "mkdir -p /etc/wireguard && cp '{conf_path}' '/etc/wireguard/{name}.conf' && chmod 600 '/etc/wireguard/{name}.conf' && env PATH={TOOL_PATH} wg-quick up '{name}'"
    );
    run_admin_shell(&command)?;
    tunnel_info(app, &name)
}

fn disconnect_impl(app: &tauri::AppHandle, name: &str) -> Result<TunnelInfo, String> {
    let name = sanitize_name(name)?;
    let command = format!("env PATH={TOOL_PATH} wg-quick down '{name}'");
    run_admin_shell(&command)?;
    tunnel_info(app, &name)
}

/// Baja todos los túneles activos con un único prompt de contraseña.
fn disconnect_all_impl(app: &tauri::AppHandle) -> Result<(), String> {
    let names: Vec<String> = tunnel_states(app)
        .into_iter()
        .filter(|(_, connected)| *connected)
        .map(|(name, _)| name)
        .collect();
    if names.is_empty() {
        return Ok(());
    }
    let command = names
        .iter()
        .map(|n| format!("env PATH={TOOL_PATH} wg-quick down '{n}'"))
        .collect::<Vec<_>>()
        .join("; ");
    run_admin_shell(&command)?;
    Ok(())
}

#[tauri::command]
async fn connect_tunnel(app: tauri::AppHandle, name: String) -> Result<TunnelInfo, String> {
    blocking(move || connect_impl(&app, &name)).await
}

#[tauri::command]
async fn disconnect_tunnel(app: tauri::AppHandle, name: String) -> Result<TunnelInfo, String> {
    blocking(move || disconnect_impl(&app, &name)).await
}

// ---- System tray -------------------------------------------------------

const TRAY_ID: &str = "main-tray";
const TRAY_TICK_SECS: u64 = 3;
const TRAY_TUNNEL_PREFIX: &str = "tunnel:";
const TRAY_MENU_DISCONNECT_ALL: &str = "Desconectar todo";
const TRAY_MENU_SHOW: &str = "Mostrar";
const TRAY_MENU_QUIT: &str = "Salir";

/// "1,2 MB/s" / "340 KB/s" — corto para la barra de menú.
fn format_rate(bytes_per_sec: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    if bytes_per_sec >= MB {
        let tenths = bytes_per_sec * 10 / MB;
        format!("{},{} MB/s", tenths / 10, tenths % 10)
    } else {
        format!("{} KB/s", bytes_per_sec / KB)
    }
}

/// Primer túnel conectado: (nombre, rx, tx, reachable).
fn active_tunnel(app: &tauri::AppHandle) -> Option<(String, u64, u64, bool)> {
    let dir = tunnels_dir(app).ok()?;
    for entry in fs::read_dir(&dir).ok()?.flatten() {
        let path = entry.path();
        if path.extension().is_some_and(|e| e == "conf") {
            if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                if let Ok(info) = tunnel_info(app, stem) {
                    if info.connected {
                        return Some((
                            info.name,
                            info.rx_bytes.unwrap_or(0),
                            info.tx_bytes.unwrap_or(0),
                            info.reachable.unwrap_or(true),
                        ));
                    }
                }
            }
        }
    }
    None
}

/// (nombre, conectado) de cada túnel — sin pings, barato para el menú.
fn tunnel_states(app: &tauri::AppHandle) -> Vec<(String, bool)> {
    let Ok(dir) = tunnels_dir(app) else {
        return Vec::new();
    };
    let Ok(entries) = fs::read_dir(&dir) else {
        return Vec::new();
    };
    let mut states: Vec<(String, bool)> = entries
        .flatten()
        .filter_map(|entry| {
            let path = entry.path();
            if !path.extension().is_some_and(|e| e == "conf") {
                return None;
            }
            let name = path.file_stem()?.to_str()?.to_string();
            let content = fs::read_to_string(&path).ok()?;
            let connected = parse_conf_field(&content, "Address")
                .as_deref()
                .and_then(interface_for_address)
                .is_some();
            Some((name, connected))
        })
        .collect();
    states.sort();
    states
}

fn build_tray_menu(
    app: &tauri::AppHandle,
    states: &[(String, bool)],
) -> tauri::Result<tauri::menu::Menu<tauri::Wry>> {
    use tauri::menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem};

    let menu = Menu::new(app)?;
    for (name, connected) in states {
        // Check = online. Click en activo → desconecta; en inactivo → conecta.
        let item = CheckMenuItem::with_id(
            app,
            format!("{TRAY_TUNNEL_PREFIX}{name}"),
            name,
            true,
            *connected,
            None::<&str>,
        )?;
        menu.append(&item)?;
    }
    if !states.is_empty() {
        menu.append(&PredefinedMenuItem::separator(app)?)?;
    }
    menu.append(&MenuItem::with_id(
        app,
        "disconnect-all",
        TRAY_MENU_DISCONNECT_ALL,
        states.iter().any(|(_, connected)| *connected),
        None::<&str>,
    )?)?;
    menu.append(&PredefinedMenuItem::separator(app)?)?;
    menu.append(&MenuItem::with_id(
        app,
        "show",
        TRAY_MENU_SHOW,
        true,
        None::<&str>,
    )?)?;
    menu.append(&MenuItem::with_id(
        app,
        "quit",
        TRAY_MENU_QUIT,
        true,
        None::<&str>,
    )?)?;
    Ok(menu)
}

fn spawn_tray_updater(app: &tauri::AppHandle) {
    let handle = app.clone();
    std::thread::spawn(move || {
        let mut prev: Option<(String, u64, u64)> = None;
        let mut prev_states: Vec<(String, bool)> = Vec::new();
        loop {
            let states = tunnel_states(&handle);
            let title = match active_tunnel(&handle) {
                Some((name, rx, tx, reachable)) => {
                    let rates = match &prev {
                        Some((pname, prx, ptx)) if *pname == name => {
                            let down = rx.saturating_sub(*prx) / TRAY_TICK_SECS;
                            let up = tx.saturating_sub(*ptx) / TRAY_TICK_SECS;
                            format!("↓{} ↑{}", format_rate(down), format_rate(up))
                        }
                        _ => "↓… ↑…".to_string(),
                    };
                    prev = Some((name, rx, tx));
                    if reachable {
                        rates
                    } else {
                        "VPN ⟳".to_string()
                    }
                }
                None => {
                    prev = None;
                    String::new()
                }
            };
            let states_changed = states != prev_states;
            prev_states = states.clone();
            let h = handle.clone();
            let _ = handle.run_on_main_thread(move || {
                let Some(tray) = h.tray_by_id(TRAY_ID) else {
                    return;
                };
                let _ = tray.set_title(if title.is_empty() {
                    None
                } else {
                    Some(title.as_str())
                });
                if states_changed {
                    if let Ok(menu) = build_tray_menu(&h, &states) {
                        let _ = tray.set_menu(Some(menu));
                    }
                }
            });
            std::thread::sleep(std::time::Duration::from_secs(TRAY_TICK_SECS));
        }
    });
}

fn on_tray_menu_event(app: &tauri::AppHandle, id: &str) {
    match id {
        "quit" => app.exit(0),
        "show" => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
        "disconnect-all" => {
            let handle = app.clone();
            std::thread::spawn(move || {
                let _ = disconnect_all_impl(&handle);
            });
        }
        other => {
            if let Some(name) = other.strip_prefix(TRAY_TUNNEL_PREFIX) {
                let name = name.to_string();
                let handle = app.clone();
                std::thread::spawn(move || {
                    match tunnel_info(&handle, &name) {
                        Ok(info) if info.connected => {
                            let _ = disconnect_impl(&handle, &name);
                        }
                        Ok(_) => {
                            let _ = connect_impl(&handle, &name);
                        }
                        Err(_) => {}
                    };
                });
            }
        }
    }
}

fn setup_tray(app: &tauri::App) -> tauri::Result<()> {
    use tauri::tray::TrayIconBuilder;

    let handle = app.handle();
    let menu = build_tray_menu(handle, &tunnel_states(handle))?;

    TrayIconBuilder::with_id(TRAY_ID)
        .icon(app.default_window_icon().expect("app icon").clone())
        .icon_as_template(true)
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| on_tray_menu_event(app, event.id.as_ref()))
        .build(app)?;

    spawn_tray_updater(handle);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            setup_tray(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            check_deps,
            read_conf_file,
            list_tunnels,
            save_tunnel,
            delete_tunnel,
            connect_tunnel,
            disconnect_tunnel
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
