export interface PickedConfFile {
  name: string;
  content: string;
}

export interface ImportDialogPropsType {
  open: boolean;
  onClose: () => void;
  busy: boolean;
  onSave: (name: string, content: string) => Promise<void>;
  onPickFile: () => Promise<PickedConfFile | null>;
}
