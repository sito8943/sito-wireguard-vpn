import { TunnelInfo } from "../../../../lib/models/tunnel";

export interface TunnelCardPropsType {
  tunnel: TunnelInfo;
  busy: boolean;
  onConnect: (name: string) => void;
  onDisconnect: (name: string) => void;
  onDelete: (name: string) => void;
}
