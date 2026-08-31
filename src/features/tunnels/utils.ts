import { TunnelInfo } from "./models/tunnel";
import {
  BYTES_PER_KB,
  BYTES_PER_MB,
  CONF_FILE_SUFFIX,
  ERROR_CODE,
  RATE_DECIMALS,
  TUNNEL_NAME_INVALID_CHARS,
  TUNNEL_NAME_MAX_LENGTH,
  TUNNEL_STATUS,
  TunnelStatus,
} from "./constants";
import { t, TranslationKey } from "@/lang";

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

// Los commands de Tauri rechazan con estos códigos; cualquier otra cosa es un
// error del sistema y se muestra en crudo tras errorGeneric.
const ERROR_MESSAGE: Record<string, TranslationKey> = {
  [ERROR_CODE.INVALID_CONFIG]: "errorInvalidConfig",
  [ERROR_CODE.INVALID_NAME]: "errorInvalidName",
  [ERROR_CODE.INVALID_FILE]: "errorInvalidFile",
  [ERROR_CODE.MISSING_DEPS]: "errorMissingDeps",
  [ERROR_CODE.TUNNEL_NOT_FOUND]: "errorTunnelNotFound",
};

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
