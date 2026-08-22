# Sito WireGuard VPN

Cliente WireGuard plug-and-play para macOS (Tauri v2 + React 19 + `@sito/ui`).
Pensado para gente no técnica: importar un `.conf`, apretar **Conectar**, poner la contraseña del Mac, listo.

## Cómo funciona

- Los `.conf` importados se guardan en `~/Library/Application Support/com.sito8943.wireguard-vpn/tunnels/`.
- **Conectar** copia el conf a `/etc/wireguard/` y ejecuta `wg-quick up <nombre>` mediante `osascript … with administrator privileges` (prompt nativo de contraseña de macOS).
- El estado se detecta sin root: se busca la IP del túnel (`Address`) en `ifconfig`, con polling cada 5 s.
- Requiere `wireguard-tools` (Homebrew). Si falta, la app muestra un banner con el comando `brew install wireguard-tools` para copiar.

## Desarrollo

```bash
pnpm install
pnpm tauri dev     # app de escritorio
pnpm tauri build   # genera .app/.dmg en src-tauri/target/release/bundle/
```

## Arquitectura

Sigue `../ARCHITECTURE_RULES.md`: `TunnelManager` (lib/managers) encapsula los `invoke` de Tauri, `VpnProvider` lo expone vía contexto + hook `useVpn`, las vistas solo componen.

**Excepción documentada (§8 routing):** app de una sola vista; no hay react-router. Las rutas centralizadas viven en `src/lib/routes.ts` para cuando existan más pantallas.

## Comandos Rust (src-tauri)

| Comando | Qué hace |
| --- | --- |
| `check_deps` | Busca `wg-quick` en rutas de Homebrew |
| `read_conf_file` | Lee un `.conf` elegido con el file picker |
| `list_tunnels` | Lista confs guardados + estado conectado |
| `save_tunnel` / `delete_tunnel` | CRUD de confs (valida `[Interface]`/`PrivateKey`, nombre ≤15 chars) |
| `connect_tunnel` / `disconnect_tunnel` | `wg-quick up/down` con privilegios de admin |

## Seguridad

- Nunca commitear archivos `.conf` (contienen claves privadas); la app los guarda fuera del repo.
- El binario no incluye ninguna configuración embebida.
