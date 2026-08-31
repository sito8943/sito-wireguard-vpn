use serde::{Deserialize, Serialize};
use std::fs;
use std::os::unix::fs::PermissionsExt;
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

// wg-quick no tolera espacios en la ruta del conf: siempre trabaja sobre una
// copia root en este directorio.
const SYSTEM_CONF_DIR: &str = "/etc/wireguard";

// Opciones por túnel: archivo hermano del .conf, para no ensuciar el original.
const OPTIONS_SUFFIX: &str = "json";
// DNS previo del sistema, guardado en disco antes de tocarlo: si la app muere
// entre el connect y el disconnect, sigue habiendo con qué restaurar.
const DNS_BACKUP_FILE: &str = "dns-backup.json";
// networksetup usa esta palabra para "sin nada configurado".
const NETWORKSETUP_EMPTY: &str = "Empty";
// Conf sin la línea DNS que se le pasa a wg-quick.
const STAGING_DIR: &str = "staging";

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
    /// La app aplica el DNS al conectar y lo restaura al desconectar.
    pub manage_dns: bool,
    /// Servidores que aplicaría; vienen del .conf salvo que se fijen a mano.
    pub dns: Vec<String>,
}

/// Ajustes que no caben en el .conf de WireGuard. Viven en `<nombre>.json`
/// junto al conf, así renombrar y borrar los arrastra igual.
#[derive(Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct TunnelOptions {
    pub manage_dns: bool,
    pub dns: Vec<String>,
}

/// DNS que tenía el servicio antes de que lo tocáramos.
#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct DnsBackup {
    service: String,
    servers: Vec<String>,
    search_domains: Vec<String>,
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

// ---- Opciones por túnel -------------------------------------------------

fn options_path(app: &tauri::AppHandle, name: &str) -> Result<PathBuf, String> {
    Ok(tunnels_dir(app)?.join(format!("{name}.{OPTIONS_SUFFIX}")))
}

fn read_options(app: &tauri::AppHandle, name: &str) -> TunnelOptions {
    options_path(app, name)
        .ok()
        .and_then(|path| fs::read_to_string(path).ok())
        .and_then(|raw| serde_json::from_str(&raw).ok())
        .unwrap_or_default()
}

fn write_options(
    app: &tauri::AppHandle,
    name: &str,
    options: &TunnelOptions,
) -> Result<(), String> {
    let raw = serde_json::to_string_pretty(options).map_err(|e| e.to_string())?;
    fs::write(options_path(app, name)?, raw).map_err(|e| e.to_string())
}

// ---- DNS ----------------------------------------------------------------

/// Servidores de la línea `DNS = a, b` del conf.
fn conf_dns(content: &str) -> Vec<String> {
    parse_conf_field(content, "DNS")
        .map(|value| {
            value
                .split(',')
                .map(|item| item.trim().to_string())
                .filter(|item| !item.is_empty())
                .collect()
        })
        .unwrap_or_default()
}

/// El conf que ve wg-quick nunca lleva `DNS`: su set_dns aborta el `up` entero
/// cuando networksetup imprime cualquier cosa, y qué servicio lo dispara
/// depende del orden de un hash. Si hay que aplicar DNS, lo hace la app.
fn strip_dns_lines(content: &str) -> String {
    content
        .lines()
        .filter(|line| {
            line.split_once('=')
                .is_none_or(|(key, _)| !key.trim().eq_ignore_ascii_case("DNS"))
        })
        .collect::<Vec<_>>()
        .join("\n")
}

/// Solo IPs: estos valores acaban dentro de un comando shell con privilegios.
fn is_safe_dns(server: &str) -> bool {
    !server.is_empty()
        && server.len() <= 45
        && server
            .chars()
            .all(|c| c.is_ascii_hexdigit() || c == '.' || c == ':')
}

/// Nombre del servicio de networksetup por el que sale el tráfico ahora mismo.
/// Solo se toca ese: wg-quick los recorre todos y ahí está su fallo.
fn active_network_service() -> Option<String> {
    let route = Command::new("route")
        .args(["-n", "get", "default"])
        .output()
        .ok()?;
    let device = String::from_utf8_lossy(&route.stdout)
        .lines()
        .find_map(|line| Some(line.trim().strip_prefix("interface: ")?.trim().to_string()))?;
    let order = Command::new("networksetup")
        .arg("-listnetworkserviceorder")
        .output()
        .ok()?;
    let text = String::from_utf8_lossy(&order.stdout);
    let needle = format!("Device: {device})");
    let mut current: Option<String> = None;
    for line in text.lines() {
        if line.contains("Hardware Port") {
            if line.contains(&needle) {
                return current;
            }
            continue;
        }
        // "(1) Wi-Fi" → el nombre del servicio que usa networksetup
        if let Some((_, name)) = line.trim().strip_prefix('(')?.split_once(')') {
            let name = name.trim();
            if !name.is_empty() {
                current = Some(name.to_string());
            }
        }
    }
    None
}

/// Valores actuales de networksetup; vacío = sin configurar. Cuando no hay
/// nada, networksetup responde con una frase ("There aren't any…"), que se
/// reconoce porque lleva espacios — mismo criterio que wg-quick.
fn current_network_values(service: &str, flag: &str) -> Vec<String> {
    let Ok(output) = Command::new("networksetup").args([flag, service]).output() else {
        return Vec::new();
    };
    let text = String::from_utf8_lossy(&output.stdout);
    if text.contains(' ') {
        return Vec::new();
    }
    text.lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(str::to_string)
        .collect()
}

fn dns_backup_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join(DNS_BACKUP_FILE))
}

fn read_dns_backup(app: &tauri::AppHandle) -> Option<DnsBackup> {
    let raw = fs::read_to_string(dns_backup_path(app).ok()?).ok()?;
    serde_json::from_str(&raw).ok()
}

fn clear_dns_backup(app: &tauri::AppHandle) {
    if let Ok(path) = dns_backup_path(app) {
        let _ = fs::remove_file(path);
    }
}

/// Guarda el estado actual ANTES de tocarlo. Sin esto, un fallo a medias deja
/// el DNS del usuario cambiado y sin forma de saber a qué volver.
fn save_dns_backup(app: &tauri::AppHandle, service: &str) -> Result<(), String> {
    let backup = DnsBackup {
        service: service.to_string(),
        servers: current_network_values(service, "-getdnsservers"),
        search_domains: current_network_values(service, "-getsearchdomains"),
    };
    let raw = serde_json::to_string_pretty(&backup).map_err(|e| e.to_string())?;
    fs::write(dns_backup_path(app)?, raw).map_err(|e| e.to_string())
}

fn networksetup_command(flag: &str, service: &str, values: &[String]) -> String {
    let list = if values.is_empty() {
        NETWORKSETUP_EMPTY.to_string()
    } else {
        values.join(" ")
    };
    format!("networksetup {flag} '{service}' {list}")
}

/// Al revés que wg-quick: el DNS se aplica DESPUÉS de que el túnel esté arriba
/// y con `|| true`, así un networksetup quejica no tumba la conexión.
fn apply_dns_command(service: &str, servers: &[String]) -> String {
    let set_servers = networksetup_command("-setdnsservers", service, servers);
    let set_search = networksetup_command("-setsearchdomains", service, &[]);
    format!(" && {{ {set_servers} || true; {set_search} || true; }}")
}

fn restore_dns_command(backup: &DnsBackup) -> String {
    let servers = networksetup_command("-setdnsservers", &backup.service, &backup.servers);
    let search = networksetup_command("-setsearchdomains", &backup.service, &backup.search_domains);
    format!("; {servers} || true; {search} || true")
}

fn system_conf_path(name: &str) -> PathBuf {
    PathBuf::from(SYSTEM_CONF_DIR).join(format!("{name}.conf"))
}

/// Comando shell que deja el conf del túnel en /etc/wireguard con permisos 600.
fn install_conf_command(conf_path: &str, name: &str) -> String {
    format!(
        "mkdir -p {SYSTEM_CONF_DIR} && cp '{conf_path}' '{SYSTEM_CONF_DIR}/{name}.conf' && chmod 600 '{SYSTEM_CONF_DIR}/{name}.conf'"
    )
}

/// Borra la copia root del conf (contiene la PrivateKey). Solo pide contraseña
/// si el archivo existe, así borrar un túnel nunca conectado no molesta.
fn remove_system_conf(name: &str) -> Result<(), String> {
    let path = system_conf_path(name);
    if !path.exists() {
        return Ok(());
    }
    run_admin_shell(&format!("rm -f '{SYSTEM_CONF_DIR}/{name}.conf'"))?;
    Ok(())
}

fn find_wg_quick() -> Option<String> {
    WG_QUICK_PATHS
        .iter()
        .find(|p| PathBuf::from(p).exists())
        .map(|p| p.to_string())
}

fn run_admin_shell(command: &str) -> Result<String, String> {
    // AppleScript solo devuelve el stderr del comando cuando este falla, y
    // networksetup escribe sus avisos en stdout: sin volcar stdout a stderr el
    // motivo real del fallo no llega nunca hasta aquí. Nadie usa la salida en
    // caso de éxito, así que no se pierde nada.
    let command = format!("{{ {command}; }} 1>&2");
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
        return Ok(String::from_utf8_lossy(&output.stdout).to_string());
    }
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    // osascript devuelve "User canceled. (-128)" cuando se cierra el prompt.
    if stderr.contains("-128") {
        return Err("user-canceled".into());
    }
    Err(stderr)
}

// Últimos hitos que imprime `wg-quick up`: primero configura el DNS, después
// arranca el monitor de rutas.
const WG_DNS_MARKER: &str = "networksetup -setdnsservers";
const WG_MONITOR_MARKER: &str = "Backgrounding route monitor";

/// Un trace que llega al DNS pero no al monitor de rutas murió dentro de
/// `set_dns`: su bucle acaba en `[[ $response == *Error* ]] && echo …`, que
/// devuelve 1 cuando networksetup imprime una línea sin la palabra "Error", y
/// el `set -e` de wg-quick aborta el `up` entero. Pasa con servicios de red
/// inactivos (Thunderbolt Bridge, VPNs de terceros) y solo si el conf trae
/// línea `DNS =`, así que el usuario puede arreglarlo él mismo.
fn classify_wg_up_error(output: String) -> String {
    if output.contains(WG_DNS_MARKER) && !output.contains(WG_MONITOR_MARKER) {
        return "dns-setup-failed".into();
    }
    output
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
    let options = read_options(app, name);
    // Los del conf salvo que el usuario los haya fijado a mano en el diálogo.
    let dns = if options.dns.is_empty() {
        conf_dns(&content)
    } else {
        options.dns
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
        manage_dns: options.manage_dns,
        dns,
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

/// Nombres de los túneles guardados, ordenados.
fn tunnel_names(app: &tauri::AppHandle) -> Result<Vec<String>, String> {
    let dir = tunnels_dir(app)?;
    let mut names: Vec<String> = fs::read_dir(&dir)
        .map_err(|e| e.to_string())?
        .flatten()
        .filter_map(|entry| {
            let path = entry.path();
            if path.extension().is_none_or(|e| e != "conf") {
                return None;
            }
            Some(path.file_stem()?.to_str()?.to_string())
        })
        .collect();
    names.sort();
    Ok(names)
}

fn list_tunnels_impl(app: &tauri::AppHandle) -> Result<Vec<TunnelInfo>, String> {
    // tunnel_info hace un ping de hasta 1 s por túnel: en serie, N túneles
    // costarían N segundos y el polling de 5 s se quedaría corto.
    let workers: Vec<_> = tunnel_names(app)?
        .into_iter()
        .map(|name| {
            let app = app.clone();
            std::thread::spawn(move || tunnel_info(&app, &name).ok())
        })
        .collect();
    Ok(workers
        .into_iter()
        .filter_map(|worker| worker.join().ok().flatten())
        .collect())
}

#[tauri::command]
async fn list_tunnels(app: tauri::AppHandle) -> Result<Vec<TunnelInfo>, String> {
    blocking(move || list_tunnels_impl(&app)).await
}

/// Contenido del .conf guardado — lo usa el diálogo de edición.
#[tauri::command]
async fn read_tunnel(app: tauri::AppHandle, name: String) -> Result<String, String> {
    blocking(move || {
        let name = sanitize_name(&name)?;
        let path = tunnels_dir(&app)?.join(format!("{name}.conf"));
        fs::read_to_string(&path).map_err(|_| "tunnel-not-found".to_string())
    })
    .await
}

/// Guarda (o edita) un túnel. `previous_name` distinto = renombrado: se borra
/// el conf anterior y su copia root para no dejar PrivateKeys huérfanas.
#[tauri::command]
async fn save_tunnel(
    app: tauri::AppHandle,
    name: String,
    content: String,
    previous_name: Option<String>,
    manage_dns: bool,
    dns: Vec<String>,
) -> Result<TunnelInfo, String> {
    blocking(move || {
        if !content.contains("[Interface]") || !content.contains("PrivateKey") {
            return Err("invalid-config".into());
        }
        let name = sanitize_name(&name)?;
        let dir = tunnels_dir(&app)?;
        let previous = previous_name.as_deref().map(sanitize_name).transpose()?;
        let renamed = previous.as_deref().is_some_and(|prev| prev != name);
        // Con el túnel arriba la limpieza de /etc la hace reconnect_tunnel en un
        // único prompt de contraseña; aquí solo se toca el disco de la app.
        let previous_connected = previous
            .as_deref()
            .and_then(|prev| tunnel_info(&app, prev).ok())
            .is_some_and(|info| info.connected);
        fs::write(dir.join(format!("{name}.conf")), content).map_err(|e| e.to_string())?;
        write_options(
            &app,
            &name,
            &TunnelOptions {
                manage_dns,
                dns: dns.into_iter().filter(|s| is_safe_dns(s)).collect(),
            },
        )?;
        if renamed {
            let previous = previous.as_deref().unwrap_or_default();
            let _ = fs::remove_file(dir.join(format!("{previous}.conf")));
            let _ = fs::remove_file(dir.join(format!("{previous}.{OPTIONS_SUFFIX}")));
            if !previous_connected {
                remove_system_conf(previous)?;
            }
        }
        tunnel_info(&app, &name)
    })
    .await
}

#[tauri::command]
async fn delete_tunnel(app: tauri::AppHandle, name: String) -> Result<(), String> {
    blocking(move || {
        let name = sanitize_name(&name)?;
        // Primero la copia root: si se cancela la contraseña no se borra nada y
        // el túnel sigue completo en la lista.
        remove_system_conf(&name)?;
        let dir = tunnels_dir(&app)?;
        let _ = fs::remove_file(dir.join(format!("{name}.{OPTIONS_SUFFIX}")));
        fs::remove_file(dir.join(format!("{name}.conf"))).map_err(|e| e.to_string())
    })
    .await
}

/// Escribe en disco el conf que se le entregará a wg-quick, sin la línea DNS.
/// El original del usuario queda intacto y sigue siendo portable.
fn stage_conf(app: &tauri::AppHandle, name: &str) -> Result<String, String> {
    let content = fs::read_to_string(tunnels_dir(app)?.join(format!("{name}.conf")))
        .map_err(|_| "tunnel-not-found".to_string())?;
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?
        .join(STAGING_DIR);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join(format!("{name}.conf"));
    fs::write(&path, strip_dns_lines(&content)).map_err(|e| e.to_string())?;
    // Contiene la PrivateKey: nadie más que el usuario debe poder leerlo.
    let mut perms = fs::metadata(&path)
        .map_err(|e| e.to_string())?
        .permissions();
    perms.set_mode(0o600);
    fs::set_permissions(&path, perms).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

/// Trozo de shell que aplica el DNS tras el `up`, si el túnel lo tiene activado.
/// Deja el backup escrito antes de devolverlo.
fn dns_step(app: &tauri::AppHandle, name: &str) -> String {
    let info = match tunnel_info(app, name) {
        Ok(info) if info.manage_dns => info,
        _ => return String::new(),
    };
    let servers: Vec<String> = info.dns.into_iter().filter(|s| is_safe_dns(s)).collect();
    if servers.is_empty() {
        return String::new();
    }
    let Some(service) = active_network_service() else {
        return String::new();
    };
    if save_dns_backup(app, &service).is_err() {
        // Sin backup no se toca nada: es peor dejar el DNS cambiado sin vuelta.
        return String::new();
    }
    apply_dns_command(&service, &servers)
}

fn connect_impl(app: &tauri::AppHandle, name: &str) -> Result<TunnelInfo, String> {
    let name = sanitize_name(name)?;
    if find_wg_quick().is_none() {
        return Err("missing-deps".into());
    }
    let conf_path = stage_conf(app, &name)?;
    let install = install_conf_command(&conf_path, &name);
    let dns = dns_step(app, &name);
    // El DNS va tras `&&`: si el `up` falla no se toca la red del usuario.
    let result = run_admin_shell(&format!(
        "{install} && env PATH={TOOL_PATH} wg-quick up '{name}'{dns}"
    ))
    .map_err(classify_wg_up_error);
    if result.is_err() {
        clear_dns_backup(app);
    }
    result?;
    tunnel_info(app, &name)
}

/// Baja `previous` (o `name`), reinstala el conf editado y vuelve a subirlo,
/// todo en un único prompt de contraseña. Necesario tras editar: wg-quick
/// trabaja con la copia de /etc/wireguard, que si no queda desactualizada.
fn reconnect_impl(
    app: &tauri::AppHandle,
    name: &str,
    previous_name: Option<&str>,
) -> Result<TunnelInfo, String> {
    let name = sanitize_name(name)?;
    if find_wg_quick().is_none() {
        return Err("missing-deps".into());
    }
    let previous = match previous_name {
        Some(prev) => sanitize_name(prev)?,
        None => name.clone(),
    };
    let conf_path = stage_conf(app, &name)?;
    let install = install_conf_command(&conf_path, &name);
    let dns = dns_step(app, &name);
    // `|| true` en el down: si la interfaz ya no estaba arriba no debe abortar.
    let command = format!(
        "env PATH={TOOL_PATH} wg-quick down '{previous}' || true; rm -f '{SYSTEM_CONF_DIR}/{previous}.conf'; {install} && env PATH={TOOL_PATH} wg-quick up '{name}'{dns}"
    );
    run_admin_shell(&command).map_err(classify_wg_up_error)?;
    tunnel_info(app, &name)
}

fn disconnect_impl(app: &tauri::AppHandle, name: &str) -> Result<TunnelInfo, String> {
    let name = sanitize_name(name)?;
    // El DNS se restaura con `;`, no con `&&`: aunque el down falle hay que
    // devolver la red del usuario a como estaba.
    let restore = read_dns_backup(app)
        .map(|backup| restore_dns_command(&backup))
        .unwrap_or_default();
    let command = format!("env PATH={TOOL_PATH} wg-quick down '{name}'{restore}");
    let result = run_admin_shell(&command);
    if result.is_ok() {
        clear_dns_backup(app);
    }
    result?;
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
    let restore = read_dns_backup(app)
        .map(|backup| restore_dns_command(&backup))
        .unwrap_or_default();
    let command = names
        .iter()
        .map(|n| format!("env PATH={TOOL_PATH} wg-quick down '{n}'"))
        .collect::<Vec<_>>()
        .join("; ");
    run_admin_shell(&format!("{command}{restore}"))?;
    clear_dns_backup(app);
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

/// Servicio cuyo DNS quedó cambiado por una sesión anterior sin restaurar.
/// Solo cuenta si ya no queda ningún túnel arriba.
#[tauri::command]
async fn pending_dns_restore(app: tauri::AppHandle) -> Result<Option<String>, String> {
    blocking(move || {
        let Some(backup) = read_dns_backup(&app) else {
            return Ok(None);
        };
        if tunnel_states(&app).iter().any(|(_, connected)| *connected) {
            return Ok(None);
        }
        Ok(Some(backup.service))
    })
    .await
}

#[tauri::command]
async fn restore_dns(app: tauri::AppHandle) -> Result<(), String> {
    blocking(move || {
        let Some(backup) = read_dns_backup(&app) else {
            return Ok(());
        };
        // El comando empieza por "; " porque se compone tras un wg-quick down.
        run_admin_shell(restore_dns_command(&backup).trim_start_matches("; "))?;
        clear_dns_backup(&app);
        Ok(())
    })
    .await
}

#[tauri::command]
async fn reconnect_tunnel(
    app: tauri::AppHandle,
    name: String,
    previous_name: Option<String>,
) -> Result<TunnelInfo, String> {
    blocking(move || reconnect_impl(&app, &name, previous_name.as_deref())).await
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
    for name in tunnel_names(app).ok()? {
        if let Ok(info) = tunnel_info(app, &name) {
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
    None
}

/// (nombre, conectado) de cada túnel — sin pings, barato para el menú.
fn tunnel_states(app: &tauri::AppHandle) -> Vec<(String, bool)> {
    let Ok(dir) = tunnels_dir(app) else {
        return Vec::new();
    };
    // tunnel_names ya viene ordenado; aquí no hay pings, solo ifconfig.
    tunnel_names(app)
        .unwrap_or_default()
        .into_iter()
        .filter_map(|name| {
            let content = fs::read_to_string(dir.join(format!("{name}.conf"))).ok()?;
            let connected = parse_conf_field(&content, "Address")
                .as_deref()
                .and_then(interface_for_address)
                .is_some();
            Some((name, connected))
        })
        .collect()
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
            read_tunnel,
            save_tunnel,
            delete_tunnel,
            connect_tunnel,
            disconnect_tunnel,
            reconnect_tunnel,
            pending_dns_restore,
            restore_dns
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::{classify_wg_up_error, conf_dns, is_safe_dns, strip_dns_lines};

    /// Trace real de un `up` que murió en set_dns (macOS Sonoma): llega a
    /// configurar el DNS y nunca imprime el hito del monitor de rutas.
    const TRACE_DNS_FAILURE: &str = "[#] wireguard-go utun[+] Interface for papa is utun4[#] wg addconf utun4 /dev/fd/63[#] ifconfig utun4 inet 10.0.0.5/32 10.0.0.5 alias[#] ifconfig utun4 up[#] route -q -n add -inet 0.0.0.0/1 -interface utun4[#] networksetup -getdnsservers Ethernet[#] networksetup -setdnsservers Thunderbolt Bridge 1.1.1.1[#] networksetup -setsearchdomains Thunderbolt Bridge Empty[#] rm -f /var/run/wireguard/utun4.sock";

    const TRACE_SUCCESS: &str = "[#] wireguard-go utun[+] Interface for papa is utun4[#] networksetup -setdnsservers Wi-Fi 1.1.1.1[+] Backgrounding route monitor";

    #[test]
    fn detects_set_dns_failure() {
        assert_eq!(
            classify_wg_up_error(TRACE_DNS_FAILURE.to_string()),
            "dns-setup-failed"
        );
    }

    #[test]
    fn leaves_a_completed_up_untouched() {
        assert_eq!(
            classify_wg_up_error(TRACE_SUCCESS.to_string()),
            TRACE_SUCCESS
        );
    }

    const CONF: &str = "[Interface]\nPrivateKey = k\nAddress = 10.0.0.3/32\nDNS = 1.1.1.1, 8.8.8.8\n\n[Peer]\nAllowedIPs = 0.0.0.0/0";

    #[test]
    fn reads_every_dns_server_from_the_conf() {
        assert_eq!(conf_dns(CONF), vec!["1.1.1.1", "8.8.8.8"]);
        assert!(conf_dns("[Interface]\nAddress = 10.0.0.3/32").is_empty());
    }

    #[test]
    fn removes_only_the_dns_line() {
        let stripped = strip_dns_lines(CONF);
        assert!(!stripped.contains("DNS"));
        assert!(stripped.contains("PrivateKey = k"));
        assert!(stripped.contains("AllowedIPs = 0.0.0.0/0"));
        // Una línea que solo menciona DNS en el valor no se toca.
        let hook = "PostUp = echo DNS=1";
        assert_eq!(strip_dns_lines(hook), hook);
    }

    #[test]
    fn rejects_dns_values_that_are_not_addresses() {
        assert!(is_safe_dns("1.1.1.1"));
        assert!(is_safe_dns("2606:4700:4700::1111"));
        // Estos acaban dentro de un comando con privilegios.
        assert!(!is_safe_dns("1.1.1.1; rm -rf /"));
        assert!(!is_safe_dns("$(whoami)"));
        assert!(!is_safe_dns("'; reboot #"));
        assert!(!is_safe_dns(""));
    }

    #[test]
    fn leaves_unrelated_errors_untouched() {
        // Cancelar el prompt de contraseña no toca el DNS: debe pasar intacto.
        assert_eq!(
            classify_wg_up_error("user-canceled".into()),
            "user-canceled"
        );
        assert_eq!(
            classify_wg_up_error("wg-quick: `utun4' already exists".into()),
            "wg-quick: `utun4' already exists"
        );
    }
}
