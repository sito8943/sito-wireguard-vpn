export const CONF_EXTENSION = "conf";
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
  USER_CANCELED: "user-canceled",
} as const;

export type ErrorCode = (typeof ERROR_CODE)[keyof typeof ERROR_CODE];
