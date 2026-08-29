import { TunnelInfo, TunnelRate } from "@/features/tunnels/models/tunnel";
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
  error: string | null;
  refresh: () => Promise<void>;
  recheckDeps: () => Promise<void>;
  importTunnel: (input: SaveTunnelInput) => Promise<void>;
  readConfFile: (path: string) => Promise<string>;
  removeTunnel: (name: string) => Promise<void>;
  connect: (name: string) => Promise<void>;
  disconnect: (name: string) => Promise<void>;
  clearError: () => void;
}
