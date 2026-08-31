# Sito WireGuard VPN

Cliente WireGuard **plug-and-play para macOS**, sin App Store ni Apple ID. Hecho con Tauri v2 + React 19 + [`@sito/ui`](https://www.npmjs.com/package/@sito/ui).

Pensado para gente no técnica: importar un `.conf`, apretar **Conectar**, poner la contraseña del Mac, listo.

## Requisitos

- macOS 14 (Sonoma) o superior — Apple Silicon o Intel.
- [`wireguard-tools`](https://formulae.brew.sh/formula/wireguard-tools) de Homebrew (si falta, la propia app te muestra el comando para copiar).

## Instalación

### Opción A — Homebrew (recomendada)

```bash
brew install --cask sito8943/tap/sito-wireguard-vpn
xattr -dr com.apple.quarantine "/Applications/Sito WireGuard VPN.app"
```

El `xattr` es necesario porque la app **no está firmada** con un certificado de Apple (Homebrew 6 eliminó el flag `--no-quarantine`). El cask instala también `wireguard-tools` automáticamente como dependencia.

### Opción B — DMG desde Releases

1. Descarga el `.dmg` de tu arquitectura desde [Releases](https://github.com/sito8943/sito-wireguard-vpn/releases):
   - `*_aarch64.dmg` → Apple Silicon (M1 o posterior)
   - `*_x64.dmg` → Intel
2. Arrastra la app a **Aplicaciones**.
3. Quita la cuarentena (app sin firmar; macOS la bloquea si no):

```bash
xattr -cr "/Applications/Sito WireGuard VPN.app"
```

4. Instala la dependencia si no la tienes:

```bash
brew install wireguard-tools
```

## Uso

1. Abre la app. Si falta `wireguard-tools`, un banner te da el comando para copiar.
2. Botón **+** → importa tu `.conf` de WireGuard (file picker o pegando el texto).
3. **Conectar** → macOS pide tu contraseña de administrador (prompt nativo) → conectado.
4. El lápiz de cada tarjeta **edita** el túnel (nombre y `.conf`); si estaba conectado se reconecta solo con un único prompt de contraseña.
5. El estado se refresca solo cada 5 segundos.

## Problema conocido: la línea `DNS` del `.conf`

`wg-quick` 1.0.20260223 aborta el `up` si el `.conf` trae `DNS = …` y algún
servicio de red del Mac (Thunderbolt Bridge, VPN de terceros) imprime un aviso:
el bucle de `set_dns` termina en `[[ $response == *Error* ]] && echo …`, que
devuelve 1 cuando la línea no contiene "Error", y el `set -e` del script mata el
proceso. El túnel se revierte, pero **el DNS que ya escribió no se restaura** —
`del_dns` solo corre desde el monitor de rutas, que nunca llegó a arrancar.

Qué servicio lo dispara depende del orden de iteración de un array asociativo
de bash, así que enchufar un adaptador o instalar otra VPN puede activar o
desactivar el fallo sin tocar nada del túnel.

Por eso **el conf que recibe `wg-quick` nunca lleva la línea `DNS`**: se copia a
`staging/` sin ella (`stage_conf`). El `.conf` del usuario queda intacto. Si el
túnel tiene marcada la casilla **Aplicar el DNS al conectar**, lo aplica la
propia app —solo sobre el servicio de red activo, después de que el túnel esté
arriba y sin abortar si `networksetup` protesta— y lo restaura al desconectar.
El valor previo se guarda en `dns-backup.json` antes de tocar nada; si queda
huérfano, la app ofrece restaurarlo en un banner. Para hacerlo a mano:

```bash
sudo networksetup -setdnsservers "Wi-Fi" Empty
sudo networksetup -setsearchdomains "Wi-Fi" Empty
```

## Cómo funciona

- Los `.conf` importados se guardan en `~/Library/Application Support/com.sito8943.wireguard-vpn/tunnels/`.
- **Conectar** copia el conf a `/etc/wireguard/` y ejecuta `wg-quick up <nombre>` mediante `osascript … with administrator privileges`.
- El estado se detecta sin root: se busca la IP del túnel (`Address`) en `ifconfig`.

## Desarrollo

```bash
pnpm install
pnpm tauri dev     # app de escritorio
pnpm tauri build   # genera .app/.dmg en src-tauri/target/release/bundle/
pnpm lint          # eslint
pnpm format:check  # prettier
pnpm exec tsc --noEmit
```

### Arquitectura

Feature-sliced con CSS plano y design tokens:

```txt
src/
  app/                      # Composition root: routes.ts, layout/AppLayout
  shared/                   # Genérico/cross-feature
    components/elements/    # Primitivas (Button, IconButton, TextInput, TextArea, Spinner)
    components/patterns/    # Composiciones (Dialog, DialogActions, ConfirmDialog)
    services/               # api.ts: TODOS los invoke de Tauri, uno por comando
    models/                 # TunnelInfo, TunnelRate (contrato con Rust)
    providers/ThemeProvider # Tema del SO (prefers-color-scheme → <html data-theme>)
    constants.ts            # THEME, BUTTON_COLOR/VARIANT/SIZE
  features/tunnels/         # Todo el dominio VPN
    Tunnels.tsx             # Vista principal
    components/             # StatusBadge, TunnelCard, TunnelDialog, DepsBanner
    providers/VpnProvider/  # Contexto + hook useVpn
    managers/TunnelManager/ # Orquesta el dominio sobre shared/services/api
    constants.ts types.ts utils.ts
  lang/                     # i18n (es)
  styles/                   # theme.css (tokens :root, light/dark) + CSS por componente
```

Las reglas completas están en [`ARCHITECTURE_RULES.md`](./ARCHITECTURE_RULES.md). En corto:

- Imports con alias `@/` (→ `src/`).
- Sin literales mágicos: comandos Tauri en `TUNNEL_COMMAND`, variantes de UI en const-objects, thresholds en `constants.ts` (§11).
- Todos los valores dimensionales/colores del CSS salen de tokens `--*` en `styles/theme.css` (§12).
- Ningún `invoke` fuera de `shared/services/api.ts` (§13); ningún feature importa `@sito/ui` ni usa `<input>`/`<textarea>` crudos (§14) — ESLint lo bloquea.
- Las cadenas con datos son funciones en `lang/es.ts` (§9).

### Comandos Rust (src-tauri)

| Comando                                | Qué hace                                                      |
| -------------------------------------- | ------------------------------------------------------------- |
| `check_deps`                           | Busca `wg-quick` en rutas de Homebrew                         |
| `read_conf_file`                       | Lee un `.conf` elegido con el file picker                     |
| `list_tunnels`                         | Lista confs guardados + estado conectado (un hilo por túnel)  |
| `read_tunnel`                          | Devuelve el `.conf` guardado para el diálogo de edición       |
| `save_tunnel` / `delete_tunnel`        | CRUD de confs (valida `[Interface]`/`PrivateKey`, nombre ≤15) |
| `connect_tunnel` / `disconnect_tunnel` | `wg-quick up/down` con privilegios de admin                   |
| `reconnect_tunnel`                     | `down` + reinstala el conf + `up` en un solo prompt           |

Los `Err(...)` devuelven códigos estables (`invalid-config`, `invalid-tunnel-name`,
`missing-deps`, `tunnel-not-found`, `user-canceled`) que la UI traduce en
`features/tunnels/utils.ts`; cancelar el prompt de contraseña no se muestra como error.

## CI/CD

- **Lint** (`lint.yml`): ESLint + Prettier + type-check en cada push/PR.
- **Build macOS** (`build-macos-arm.yml` / `build-macos-intel.yml`): al publicar un Release, compilan los `.dmg` (arm64 en runner Sonoma, x86_64 cross-compilado) y los adjuntan al Release.
- **Homebrew** (`update-homebrew-cask.yml`): tras el Release, calcula los sha256 de ambos DMG y actualiza el cask en [sito8943/homebrew-tap](https://github.com/sito8943/homebrew-tap). Requiere el secret `TAP_GITHUB_TOKEN` (PAT con Contents:write sobre el tap).

Publicar una versión: subir `version` en `package.json`, `src-tauri/tauri.conf.json` y `src-tauri/Cargo.toml`, y publicar un Release con tag `vX.Y.Z` — el resto es automático.

## Seguridad

- Los `.conf` contienen claves privadas: **nunca** se commitean ni se embeben en el binario; viven solo en el Application Support del usuario y en `/etc/wireguard/` (root, `600`).
- Al borrar o renombrar un túnel también se elimina su copia de `/etc/wireguard/` para no dejar claves privadas huérfanas (pide contraseña solo si esa copia existe).
- La app pide privilegios solo al conectar/desconectar/borrar, vía el prompt nativo de macOS.
