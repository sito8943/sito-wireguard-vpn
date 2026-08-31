import { ButtonColor } from "@sito/ui";

export interface ConfirmDialogPropsType {
  open: boolean;
  title: string;
  message: string;
  confirmText: string;
  /** Color del botón de confirmación; error para acciones destructivas. */
  confirmColor?: ButtonColor;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}
