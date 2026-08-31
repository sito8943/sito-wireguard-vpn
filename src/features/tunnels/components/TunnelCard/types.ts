import { TunnelInfo, TunnelRate } from "@/shared/models";

export interface TunnelCardPropsType {
  tunnel: TunnelInfo;
  rate: TunnelRate | null;
  busy: boolean;
  onConnect: (name: string) => void;
  onDisconnect: (name: string) => void;
  onEdit: (tunnel: TunnelInfo) => void;
  onDelete: (name: string) => void;
}
