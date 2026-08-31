// Nombres de comandos Tauri (deben coincidir con src-tauri/src/lib.rs)
export const TUNNEL_COMMAND = {
  CHECK_DEPS: "check_deps",
  READ_CONF_FILE: "read_conf_file",
  READ_TUNNEL: "read_tunnel",
  LIST_TUNNELS: "list_tunnels",
  SAVE_TUNNEL: "save_tunnel",
  DELETE_TUNNEL: "delete_tunnel",
  CONNECT_TUNNEL: "connect_tunnel",
  DISCONNECT_TUNNEL: "disconnect_tunnel",
  RECONNECT_TUNNEL: "reconnect_tunnel",
  PENDING_DNS_RESTORE: "pending_dns_restore",
  RESTORE_DNS: "restore_dns",
} as const;

export type TunnelCommand =
  (typeof TUNNEL_COMMAND)[keyof typeof TUNNEL_COMMAND];
