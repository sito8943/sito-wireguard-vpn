import { useState } from "react";
import { Button, BUTTON_VARIANTS, Dialog, DialogActions } from "@sito/ui";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFolderOpen, faXmark } from "@fortawesome/free-solid-svg-icons";

import { t } from "../../../../lang";
import { TUNNEL_NAME_MAX_LENGTH } from "../../constants";
import { IMPORT_CONTENT_ROWS } from "./constants";
import { ImportDialogPropsType } from "./types";

import "../../../../styles/components/ImportDialog.css";

export function ImportDialog({
  open,
  onClose,
  busy,
  onSave,
  onPickFile,
}: ImportDialogPropsType) {
  // El padre monta este componente solo mientras está abierto,
  // así el estado del formulario se resetea al cerrar.
  const [name, setName] = useState("");
  const [content, setContent] = useState("");

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
      closeLabel={t("cancel")}
      closeIcon={<FontAwesomeIcon icon={faXmark} />}
      className="ImportDialog"
    >
      <div className="body">
        <Button variant={BUTTON_VARIANTS.OUTLINED} onClick={pickFile}>
          <FontAwesomeIcon icon={faFolderOpen} /> {t("importPickFile")}
        </Button>
        <label className="field">
          {t("importName")}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("importNamePlaceholder")}
            maxLength={TUNNEL_NAME_MAX_LENGTH}
          />
        </label>
        <label className="field">
          {t("importContent")}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={IMPORT_CONTENT_ROWS}
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
