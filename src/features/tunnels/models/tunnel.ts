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
}

export interface TunnelRate {
  downBps: number;
  upBps: number;
}
