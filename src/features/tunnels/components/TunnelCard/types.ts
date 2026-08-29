import { TunnelInfo, TunnelRate } from "@/features/tunnels/models/tunnel";

export interface TunnelCardPropsType {
  tunnel: TunnelInfo;
  rate: TunnelRate | null;
  busy: boolean;
  onConnect: (name: string) => void;
  onDisconnect: (name: string) => void;
  onDelete: (name: string) => void;
}
