import { TunnelDialogMode } from "./constants";

/** Túnel que está editando el diálogo; null mientras no hay ninguno abierto. */
export interface TunnelDraft {
  mode: TunnelDialogMode;
  name: string;
  content: string;
  connected: boolean;
}
