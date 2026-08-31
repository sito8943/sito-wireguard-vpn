import type { TranslationKey } from "@/lang";
import type { TunnelDraft } from "./types";

export const CONF_EXTENSION = "conf";
// Clave del .conf que dispara set_dns en wg-quick (ver errorDnsSetupFailed)
export const CONF_DNS_KEY = "dns";
export const DNS_SEPARATOR = ",";
export const DEFAULT_DNS = "1.1.1.1";
export const CONF_KEY_SEPARATOR = "=";
export const CONF_LINE_SEPARATOR = "\n";
export const CONF_FILE_SUFFIX = `.${CONF_EXTENSION}`;

// wg-quick limita el nombre de interfaz (se valida también en Rust)
export const TUNNEL_NAME_MAX_LENGTH = 15;
// Mismo filtro que sanitize_name() en src-tauri/src/lib.rs
export const TUNNEL_NAME_INVALID_CHARS = /[^a-zA-Z0-9_-]/g;

export const BYTES_PER_KB = 1024;
export const BYTES_PER_MB = BYTES_PER_KB * 1024;
export const RATE_DECIMALS = 1;

export const TUNNEL_STATUS = {
  CONNECTED: "connected",
  RECONNECTING: "reconnecting",
  DISCONNECTED: "disconnected",
} as const;

export type TunnelStatus = (typeof TUNNEL_STATUS)[keyof typeof TUNNEL_STATUS];

export const TUNNEL_DIALOG_MODE = {
  CREATE: "create",
  EDIT: "edit",
} as const;

export type TunnelDialogMode =
  (typeof TUNNEL_DIALOG_MODE)[keyof typeof TUNNEL_DIALOG_MODE];

// Códigos que devuelve Rust en los Err(...) — deben coincidir con lib.rs
export const ERROR_CODE = {
  INVALID_CONFIG: "invalid-config",
  INVALID_NAME: "invalid-tunnel-name",
  INVALID_FILE: "invalid-file",
  MISSING_DEPS: "missing-deps",
  TUNNEL_NOT_FOUND: "tunnel-not-found",
  DNS_SETUP_FAILED: "dns-setup-failed",
  USER_CANCELED: "user-canceled",
} as const;

export type ErrorCode = (typeof ERROR_CODE)[keyof typeof ERROR_CODE];

// Los commands de Tauri rechazan con estos códigos; cualquier otro string es un
// error del sistema y se muestra en crudo tras errorGeneric.
export const ERROR_MESSAGE: Record<string, TranslationKey> = {
  [ERROR_CODE.INVALID_CONFIG]: "errorInvalidConfig",
  [ERROR_CODE.INVALID_NAME]: "errorInvalidName",
  [ERROR_CODE.INVALID_FILE]: "errorInvalidFile",
  [ERROR_CODE.MISSING_DEPS]: "errorMissingDeps",
  [ERROR_CODE.TUNNEL_NOT_FOUND]: "errorTunnelNotFound",
  [ERROR_CODE.DNS_SETUP_FAILED]: "errorDnsSetupFailed",
};

/** Estado inicial del diálogo al importar un túnel nuevo. */
export const EMPTY_DRAFT: TunnelDraft = {
  mode: TUNNEL_DIALOG_MODE.CREATE,
  name: "",
  content: "",
  connected: false,
  manageDns: false,
  dns: [],
};
