import { invoke } from "@tauri-apps/api/core";

import { TunnelInfo } from "../../models/tunnel";
import { SaveTunnelInput } from "./types";

/**
 * Encapsula todas las operaciones de dominio sobre túneles WireGuard.
 * Los componentes nunca llaman a `invoke` directamente (ARCHITECTURE_RULES §4).
 */
export class TunnelManager {
  checkDeps(): Promise<string | null> {
    return invoke<string | null>("check_deps");
  }

  readConfFile(path: string): Promise<string> {
    return invoke<string>("read_conf_file", { path });
  }

  list(): Promise<TunnelInfo[]> {
    return invoke<TunnelInfo[]>("list_tunnels");
  }

  save(input: SaveTunnelInput): Promise<TunnelInfo> {
    return invoke<TunnelInfo>("save_tunnel", { ...input });
  }

  remove(name: string): Promise<void> {
    return invoke<void>("delete_tunnel", { name });
  }

  connect(name: string): Promise<TunnelInfo> {
    return invoke<TunnelInfo>("connect_tunnel", { name });
  }

  disconnect(name: string): Promise<TunnelInfo> {
    return invoke<TunnelInfo>("disconnect_tunnel", { name });
  }
}
