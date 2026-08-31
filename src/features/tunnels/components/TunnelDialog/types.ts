import { SaveTunnelInput } from "@/features/tunnels/managers/TunnelManager";
import { TunnelDraft } from "@/features/tunnels/types";

export interface PickedConfFile {
  name: string;
  content: string;
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
