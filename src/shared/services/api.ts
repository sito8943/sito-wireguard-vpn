import { invoke } from "@tauri-apps/api/core";

import { TunnelInfo } from "@/shared/models";
import { TUNNEL_COMMAND } from "./constants";

/**
 * Único punto de la app que llama a `invoke` (ARCHITECTURE_RULES §13).
 * Los features consumen estos wrappers a través de sus managers.
 */

/** Ruta de `wg-quick` si está instalado; `null` si falta la dependencia. */
export function checkDeps(): Promise<string | null> {
  return invoke<string | null>(TUNNEL_COMMAND.CHECK_DEPS);
}

/** Lee un `.conf` externo elegido con el file picker. */
export function readConfFile(path: string): Promise<string> {
  return invoke<string>(TUNNEL_COMMAND.READ_CONF_FILE, { path });
}

/** Lee el `.conf` ya guardado de un túnel, para editarlo. */
export function readTunnel(name: string): Promise<string> {
  return invoke<string>(TUNNEL_COMMAND.READ_TUNNEL, { name });
}

/** Lista los túneles guardados con su estado de conexión y tráfico. */
export function listTunnels(): Promise<TunnelInfo[]> {
  return invoke<TunnelInfo[]>(TUNNEL_COMMAND.LIST_TUNNELS);
}

/** Crea o edita un túnel; `previousName` distinto de `name` = renombrado. */
export function saveTunnel(
  name: string,
  content: string,
  previousName: string | null,
  manageDns: boolean,
  dns: string[],
): Promise<TunnelInfo> {
  return invoke<TunnelInfo>(TUNNEL_COMMAND.SAVE_TUNNEL, {
    name,
    content,
    previousName,
    manageDns,
    dns,
  });
}

/** Borra el `.conf` del túnel y su copia root de `/etc/wireguard`. */
export function deleteTunnel(name: string): Promise<void> {
  return invoke<void>(TUNNEL_COMMAND.DELETE_TUNNEL, { name });
}

/** `wg-quick up` con privilegios de administrador. */
export function connectTunnel(name: string): Promise<TunnelInfo> {
  return invoke<TunnelInfo>(TUNNEL_COMMAND.CONNECT_TUNNEL, { name });
}

/** `wg-quick down` con privilegios de administrador. */
export function disconnectTunnel(name: string): Promise<TunnelInfo> {
  return invoke<TunnelInfo>(TUNNEL_COMMAND.DISCONNECT_TUNNEL, { name });
}

/** Servicio de red cuyo DNS quedó cambiado sin restaurar, si lo hay. */
export function pendingDnsRestore(): Promise<string | null> {
  return invoke<string | null>(TUNNEL_COMMAND.PENDING_DNS_RESTORE);
}

/** Devuelve el DNS del sistema al valor guardado antes de conectar. */
export function restoreDns(): Promise<void> {
  return invoke<void>(TUNNEL_COMMAND.RESTORE_DNS);
}

/** Baja `previousName`, reinstala el conf y sube `name` en un solo prompt. */
export function reconnectTunnel(
  name: string,
  previousName: string | null,
): Promise<TunnelInfo> {
  return invoke<TunnelInfo>(TUNNEL_COMMAND.RECONNECT_TUNNEL, {
    name,
    previousName,
  });
}
