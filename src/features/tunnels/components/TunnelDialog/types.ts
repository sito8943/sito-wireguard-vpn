import { SaveTunnelInput } from "@/features/tunnels/managers/TunnelManager";
import { TunnelDialogMode } from "@/features/tunnels/constants";

export interface PickedConfFile {
  name: string;
  content: string;
}

/** Túnel que está editando el diálogo; null mientras no hay ninguno abierto. */
export interface TunnelDraft {
  mode: TunnelDialogMode;
  name: string;
  content: string;
  connected: boolean;
}

export interface TunnelDialogPropsType {
  open: boolean;
  draft: TunnelDraft;
  /** Nombres ya guardados, para avisar antes de sobrescribir. */
  existingNames: string[];
  busy: boolean;
  onClose: () => void;
  onSave: (input: SaveTunnelInput) => Promise<boolean>;
  onPickFile: () => Promise<PickedConfFile | null>;
}
