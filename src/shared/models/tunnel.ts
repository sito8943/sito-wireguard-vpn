export interface TunnelInfo {
  name: string;
  address: string | null;
  endpoint: string | null;
  connected: boolean;
  interface: string | null;
  rxBytes: number | null;
  txBytes: number | null;
  /** null = desconectado; false = interfaz activa sin alcance al endpoint (reconectando) */
  reachable: boolean | null;
  /** La app aplica el DNS al conectar y lo restaura al desconectar. */
  manageDns: boolean;
  /** Servidores que aplicaría; salen del .conf salvo que se fijen a mano. */
  dns: string[];
}

export interface TunnelRate {
  downBps: number;
  upBps: number;
}
