import { useEffect, useState } from "react";
import { Button, Dialog, DialogActions } from "@sito/ui";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFolderOpen } from "@fortawesome/free-solid-svg-icons";

import { t } from "../../../../lang";
import { ImportDialogPropsType } from "./types";

import "./styles.css";

export function ImportDialog({
  open,
  onClose,
  busy,
  onSave,
  onPickFile,
}: ImportDialogPropsType) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    if (open) {
      setName("");
      setContent("");
    }
  }, [open]);

  const pickFile = async () => {
    const picked = await onPickFile();
    if (!picked) return;
    setName(picked.name);
    setContent(picked.content);
  };

  const submit = async () => {
    await onSave(name, content);
    onClose();
  };

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("importTitle")}
      className="import-dialog"
    >
      <div className="import-dialog-body">
        <Button variant="outlined" onClick={pickFile}>
          <FontAwesomeIcon icon={faFolderOpen} /> {t("importPickFile")}
        </Button>
        <label className="import-dialog-field">
          {t("importName")}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("importNamePlaceholder")}
            maxLength={15}
          />
        </label>
        <label className="import-dialog-field">
          {t("importContent")}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={9}
            spellCheck={false}
          />
        </label>
        <DialogActions
          primaryText={t("importSave")}
          cancelText={t("cancel")}
          onPrimaryClick={submit}
          onCancel={onClose}
          isLoading={busy}
          disabled={!name.trim() || !content.trim()}
        />
      </div>
    </Dialog>
  );
}
