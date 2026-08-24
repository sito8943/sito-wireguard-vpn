# Sito WireGuard VPN

Cliente WireGuard **plug-and-play para macOS**, sin App Store ni Apple ID. Hecho con Tauri v2 + React 19 + [`@sito/ui`](https://www.npmjs.com/package/@sito/ui).

Pensado para gente no técnica: importar un `.conf`, apretar **Conectar**, poner la contraseña del Mac, listo.

## Requisitos

- macOS 14 (Sonoma) o superior — Apple Silicon o Intel.
- [`wireguard-tools`](https://formulae.brew.sh/formula/wireguard-tools) de Homebrew (si falta, la propia app te muestra el comando para copiar).

## Instalación

### Opción A — Homebrew (recomendada)

```bash
brew install --cask --no-quarantine sito8943/tap/sito-wireguard-vpn
```

`--no-quarantine` es necesario porque la app **no está firmada** con un certificado de Apple; instala también `wireguard-tools` automáticamente como dependencia.

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
4. El estado se refresca solo cada 5 segundos.

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
    components/elements/    # Primitivas (Spinner)
    providers/ThemeProvider # Tema del SO (prefers-color-scheme → <html data-theme>)
    constants.ts            # THEME, BUTTON_COLOR/VARIANT/SIZE
  features/tunnels/         # Todo el dominio VPN
    Tunnels.tsx             # Vista principal
    components/             # StatusBadge, TunnelCard, ImportDialog, DepsBanner
    providers/VpnProvider/  # Contexto + hook useVpn
    managers/TunnelManager/ # Encapsula los invoke de Tauri
    models/ constants.ts utils.ts
  lang/                     # i18n (es)
  styles/                   # theme.css (tokens :root, light/dark) + CSS por componente
```

- Imports con alias `@/` (→ `src/`).
- Sin literales mágicos: comandos Tauri en `TUNNEL_COMMAND`, variantes de UI en const-objects, thresholds en `constants.ts`.
- Todos los valores dimensionales/colores del CSS salen de tokens `--*` en `styles/theme.css`.

### Comandos Rust (src-tauri)

| Comando                                | Qué hace                                                      |
| -------------------------------------- | ------------------------------------------------------------- |
| `check_deps`                           | Busca `wg-quick` en rutas de Homebrew                         |
| `read_conf_file`                       | Lee un `.conf` elegido con el file picker                     |
| `list_tunnels`                         | Lista confs guardados + estado conectado                      |
| `save_tunnel` / `delete_tunnel`        | CRUD de confs (valida `[Interface]`/`PrivateKey`, nombre ≤15) |
| `connect_tunnel` / `disconnect_tunnel` | `wg-quick up/down` con privilegios de admin                   |

## CI/CD

- **Lint** (`lint.yml`): ESLint + Prettier + type-check en cada push/PR.
- **Build macOS** (`build-macos-arm.yml` / `build-macos-intel.yml`): al publicar un Release, compilan los `.dmg` (arm64 en runner Sonoma, x86_64 cross-compilado) y los adjuntan al Release.
- **Homebrew** (`update-homebrew-cask.yml`): tras el Release, calcula los sha256 de ambos DMG y actualiza el cask en [sito8943/homebrew-tap](https://github.com/sito8943/homebrew-tap). Requiere el secret `TAP_GITHUB_TOKEN` (PAT con Contents:write sobre el tap).

Publicar una versión: subir `version` en `package.json`, `src-tauri/tauri.conf.json` y `src-tauri/Cargo.toml`, y publicar un Release con tag `vX.Y.Z` — el resto es automático.

## Seguridad

- Los `.conf` contienen claves privadas: **nunca** se commitean ni se embeben en el binario; viven solo en el Application Support del usuario y en `/etc/wireguard/` (root, `600`).
- La app pide privilegios solo al conectar/desconectar, vía el prompt nativo de macOS.
