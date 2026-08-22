export interface ImportDialogPropsType {
  open: boolean;
  onClose: () => void;
  busy: boolean;
  onSave: (name: string, content: string) => Promise<void>;
  onPickFile: () => Promise<{ name: string; content: string } | null>;
}
