import { TunnelInfo, TunnelRate } from "@/shared/models";
import { SaveTunnelInput } from "@/features/tunnels/managers/TunnelManager";

export interface TrafficSample {
  rx: number;
  tx: number;
  at: number;
}

export interface VpnContextValue {
  tunnels: TunnelInfo[];
  rates: Record<string, TunnelRate>;
  wgQuickPath: string | null;
  loading: boolean;
  busyTunnel: string | null;
  /** Mensaje ya traducido, listo para pintar. */
  error: string | null;
  /** Servicio de red cuyo DNS quedó cambiado por una sesión anterior. */
  pendingDnsService: string | null;
  refresh: () => Promise<void>;
  recheckDeps: () => Promise<void>;
  /** `false` si falló: el diálogo se queda abierto con lo que escribió el usuario. */
  saveTunnel: (input: SaveTunnelInput) => Promise<boolean>;
  readConfFile: (path: string) => Promise<string>;
  readTunnel: (name: string) => Promise<string | null>;
  removeTunnel: (name: string) => Promise<boolean>;
  connect: (name: string) => Promise<boolean>;
  disconnect: (name: string) => Promise<boolean>;
  restoreDns: () => Promise<boolean>;
  clearError: () => void;
}
