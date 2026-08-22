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
pub struct TunnelInfo {
    pub name: String,
    pub address: Option<String>,
    pub endpoint: Option<String>,
    pub connected: bool,
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

fn interface_has_address(address: &str) -> bool {
    let ip = address.split('/').next().unwrap_or(address);
    let Ok(output) = Command::new("ifconfig").output() else {
        return false;
    };
    let text = String::from_utf8_lossy(&output.stdout);
    text.lines()
        .any(|l| l.trim_start().starts_with("inet ") && l.contains(&format!("inet {ip} ")))
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
    let connected = address
        .as_deref()
        .map(interface_has_address)
        .unwrap_or(false);
    Ok(TunnelInfo {
        name: name.to_string(),
        address,
        endpoint,
        connected,
    })
}

#[tauri::command]
fn check_deps() -> Option<String> {
    find_wg_quick()
}

#[tauri::command]
fn read_conf_file(path: String) -> Result<String, String> {
    if !path.ends_with(".conf") {
        return Err("invalid-file".into());
    }
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_tunnels(app: tauri::AppHandle) -> Result<Vec<TunnelInfo>, String> {
    let dir = tunnels_dir(&app)?;
    let mut tunnels = Vec::new();
    for entry in fs::read_dir(&dir).map_err(|e| e.to_string())?.flatten() {
        let path = entry.path();
        if path.extension().is_some_and(|e| e == "conf") {
            if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                if let Ok(info) = tunnel_info(&app, stem) {
                    tunnels.push(info);
                }
            }
        }
    }
    tunnels.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(tunnels)
}

#[tauri::command]
fn save_tunnel(app: tauri::AppHandle, name: String, content: String) -> Result<TunnelInfo, String> {
    if !content.contains("[Interface]") || !content.contains("PrivateKey") {
        return Err("invalid-config".into());
    }
    let name = sanitize_name(&name)?;
    let path = tunnels_dir(&app)?.join(format!("{name}.conf"));
    fs::write(&path, content).map_err(|e| e.to_string())?;
    tunnel_info(&app, &name)
}

#[tauri::command]
fn delete_tunnel(app: tauri::AppHandle, name: String) -> Result<(), String> {
    let name = sanitize_name(&name)?;
    let path = tunnels_dir(&app)?.join(format!("{name}.conf"));
    fs::remove_file(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn connect_tunnel(app: tauri::AppHandle, name: String) -> Result<TunnelInfo, String> {
    let name = sanitize_name(&name)?;
    if find_wg_quick().is_none() {
        return Err("missing-deps".into());
    }
    let conf = tunnels_dir(&app)?.join(format!("{name}.conf"));
    let conf_path = conf.to_string_lossy().to_string();
    // wg-quick no tolera espacios en la ruta del conf: se copia a /etc/wireguard
    let command = format!(
        "mkdir -p /etc/wireguard && cp '{conf_path}' '/etc/wireguard/{name}.conf' && chmod 600 '/etc/wireguard/{name}.conf' && env PATH={TOOL_PATH} wg-quick up '{name}'"
    );
    run_admin_shell(&command)?;
    tunnel_info(&app, &name)
}

#[tauri::command]
fn disconnect_tunnel(app: tauri::AppHandle, name: String) -> Result<TunnelInfo, String> {
    let name = sanitize_name(&name)?;
    let command = format!("env PATH={TOOL_PATH} wg-quick down '{name}'");
    run_admin_shell(&command)?;
    tunnel_info(&app, &name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
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
