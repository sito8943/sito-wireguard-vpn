import { TunnelInfo } from "./models/tunnel";
import { CONF_FILE_SUFFIX, TUNNEL_STATUS, TunnelStatus } from "./constants";

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

const KB = 1024;
const MB = KB * 1024;

export function formatRate(bytesPerSec: number): string {
  if (bytesPerSec >= MB) {
    return `${(bytesPerSec / MB).toFixed(1)} MB/s`;
  }
  return `${Math.round(bytesPerSec / KB)} KB/s`;
}
