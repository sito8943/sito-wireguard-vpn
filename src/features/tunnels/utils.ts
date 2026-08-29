import { TunnelInfo } from "./models/tunnel";
import {
  BYTES_PER_KB,
  BYTES_PER_MB,
  CONF_FILE_SUFFIX,
  RATE_DECIMALS,
  TUNNEL_STATUS,
  TunnelStatus,
} from "./constants";

export function fileStem(path: string): string {
  const base = path.split("/").pop() ?? path;
  return base.endsWith(CONF_FILE_SUFFIX)
    ? base.slice(0, -CONF_FILE_SUFFIX.length)
    : base;
}

export function getTunnelStatus(tunnel: TunnelInfo): TunnelStatus {
  if (!tunnel.connected) return TUNNEL_STATUS.DISCONNECTED;
  if (tunnel.reachable === false) return TUNNEL_STATUS.RECONNECTING;
  return TUNNEL_STATUS.CONNECTED;
}

export function formatRate(bytesPerSec: number): string {
  if (bytesPerSec >= BYTES_PER_MB) {
    return `${(bytesPerSec / BYTES_PER_MB).toFixed(RATE_DECIMALS)} MB/s`;
  }
  return `${Math.round(bytesPerSec / BYTES_PER_KB)} KB/s`;
}
