export const CONF_EXTENSION = "conf";
export const CONF_FILE_SUFFIX = `.${CONF_EXTENSION}`;

// wg-quick limita el nombre de interfaz (se valida también en Rust)
export const TUNNEL_NAME_MAX_LENGTH = 15;

export const BYTES_PER_KB = 1024;
export const BYTES_PER_MB = BYTES_PER_KB * 1024;
export const RATE_DECIMALS = 1;

export const TUNNEL_STATUS = {
  CONNECTED: "connected",
  RECONNECTING: "reconnecting",
  DISCONNECTED: "disconnected",
} as const;

export type TunnelStatus = (typeof TUNNEL_STATUS)[keyof typeof TUNNEL_STATUS];
