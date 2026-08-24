import { TunnelInfo } from "@/features/tunnels/models/tunnel";
import { SaveTunnelInput } from "@/features/tunnels/managers/TunnelManager";

export interface VpnContextValue {
  tunnels: TunnelInfo[];
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
