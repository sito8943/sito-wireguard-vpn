import { api } from "@/shared/services";
import { TunnelInfo } from "@/shared/models";
import { SaveTunnelInput } from "./types";

/**
 * Encapsula las operaciones de dominio sobre túneles WireGuard: los componentes
 * hablan con este manager, nunca con la capa de IPC (ARCHITECTURE_RULES §3).
 */
export class TunnelManager {
  checkDeps(): Promise<string | null> {
    return api.checkDeps();
  }

  readConfFile(path: string): Promise<string> {
    return api.readConfFile(path);
  }

  /** Contenido del .conf ya guardado, para el diálogo de edición. */
  read(name: string): Promise<string> {
    return api.readTunnel(name);
  }

  list(): Promise<TunnelInfo[]> {
    return api.listTunnels();
  }

  save(input: SaveTunnelInput): Promise<TunnelInfo> {
    return api.saveTunnel(
      input.name,
      input.content,
      input.previousName ?? null,
    );
  }

  remove(name: string): Promise<void> {
    return api.deleteTunnel(name);
  }

  connect(name: string): Promise<TunnelInfo> {
    return api.connectTunnel(name);
  }

  disconnect(name: string): Promise<TunnelInfo> {
    return api.disconnectTunnel(name);
  }

  /** Baja `previousName` y sube `name` con el conf nuevo en un solo prompt. */
  reconnect(name: string, previousName?: string): Promise<TunnelInfo> {
    return api.reconnectTunnel(name, previousName ?? null);
  }
}
