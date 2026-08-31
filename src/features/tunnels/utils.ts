import { TunnelInfo } from "@/shared/models";
import {
  BYTES_PER_KB,
  BYTES_PER_MB,
  CONF_DNS_KEY,
  CONF_FILE_SUFFIX,
  CONF_KEY_SEPARATOR,
  CONF_LINE_SEPARATOR,
  DNS_SEPARATOR,
  ERROR_MESSAGE,
  RATE_DECIMALS,
  TUNNEL_NAME_INVALID_CHARS,
  TUNNEL_NAME_MAX_LENGTH,
  TUNNEL_STATUS,
  TunnelStatus,
} from "./constants";
import { t } from "@/lang";

export function fileStem(path: string): string {
  const base = path.split("/").pop() ?? path;
  return base.endsWith(CONF_FILE_SUFFIX)
    ? base.slice(0, -CONF_FILE_SUFFIX.length)
    : base;
}

/**
 * Espejo de sanitize_name() en Rust: la UI muestra de antemano el nombre real
 * con el que se guardará el túnel en vez de dejar que el backend lo recorte.
 */
export function sanitizeTunnelName(name: string): string {
  const trimmed = name.trim();
  const base = trimmed.endsWith(CONF_FILE_SUFFIX)
    ? trimmed.slice(0, -CONF_FILE_SUFFIX.length)
    : trimmed;
  return base
    .replace(TUNNEL_NAME_INVALID_CHARS, "")
    .slice(0, TUNNEL_NAME_MAX_LENGTH);
}

/** `DNS = 1.1.1.1` → true; ignora mayúsculas y espacios, como el parser de Rust. */
function isDnsLine(line: string): boolean {
  const [key] = line.split(CONF_KEY_SEPARATOR);
  return key.trim().toLowerCase() === CONF_DNS_KEY;
}

/** Servidores de la línea `DNS = a, b` del conf; vacío si no la hay. */
export function confDnsServers(content: string): string[] {
  const line = content.split(CONF_LINE_SEPARATOR).find(isDnsLine);
  if (!line) return [];
  return line
    .slice(line.indexOf(CONF_KEY_SEPARATOR) + 1)
    .split(DNS_SEPARATOR)
    .map((server) => server.trim())
    .filter(Boolean);
}

export function translateError(code: string): string {
  const key = ERROR_MESSAGE[code.trim()];
  return key ? t(key) : `${t("errorGeneric")} ${code}`;
}

export function getTunnelStatus(tunnel: TunnelInfo): TunnelStatus {
  if (!tunnel.connected) return TUNNEL_STATUS.DISCONNECTED;
  if (tunnel.reachable === false) return TUNNEL_STATUS.RECONNECTING;
  return TUNNEL_STATUS.CONNECTED;
}

export function formatRate(bytesPerSec: number): string {
  if (bytesPerSec >= BYTES_PER_MB) {
    return `${(bytesPerSec / BYTES_PER_MB).toFixed(RATE_DECIMALS)} MB/s`;
  }
  return `${Math.round(bytesPerSec / BYTES_PER_KB)} KB/s`;
}
