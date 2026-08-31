import { invoke } from "@tauri-apps/api/core";

import { TunnelInfo } from "@/features/tunnels/models/tunnel";
import { TUNNEL_COMMAND } from "./constants";
import { SaveTunnelInput } from "./types";

/**
 * Encapsula todas las operaciones de dominio sobre túneles WireGuard.
 * Los componentes nunca llaman a `invoke` directamente (ARCHITECTURE_RULES §4).
 */
export class TunnelManager {
  checkDeps(): Promise<string | null> {
    return invoke<string | null>(TUNNEL_COMMAND.CHECK_DEPS);
  }

  readConfFile(path: string): Promise<string> {
    return invoke<string>(TUNNEL_COMMAND.READ_CONF_FILE, { path });
  }

  /** Contenido del .conf ya guardado, para el diálogo de edición. */
  read(name: string): Promise<string> {
    return invoke<string>(TUNNEL_COMMAND.READ_TUNNEL, { name });
  }

  list(): Promise<TunnelInfo[]> {
    return invoke<TunnelInfo[]>(TUNNEL_COMMAND.LIST_TUNNELS);
  }

  save(input: SaveTunnelInput): Promise<TunnelInfo> {
    return invoke<TunnelInfo>(TUNNEL_COMMAND.SAVE_TUNNEL, {
      name: input.name,
      content: input.content,
      previousName: input.previousName ?? null,
    });
  }

  remove(name: string): Promise<void> {
    return invoke<void>(TUNNEL_COMMAND.DELETE_TUNNEL, { name });
  }

  connect(name: string): Promise<TunnelInfo> {
    return invoke<TunnelInfo>(TUNNEL_COMMAND.CONNECT_TUNNEL, { name });
  }

  disconnect(name: string): Promise<TunnelInfo> {
    return invoke<TunnelInfo>(TUNNEL_COMMAND.DISCONNECT_TUNNEL, { name });
  }

  /** Baja `previousName` y sube `name` con el conf nuevo en un solo prompt. */
  reconnect(name: string, previousName?: string): Promise<TunnelInfo> {
    return invoke<TunnelInfo>(TUNNEL_COMMAND.RECONNECT_TUNNEL, {
      name,
      previousName: previousName ?? null,
    });
  }
}
