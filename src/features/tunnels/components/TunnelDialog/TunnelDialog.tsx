import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleInfo, faFolderOpen } from "@fortawesome/free-solid-svg-icons";

import { Button } from "@/shared/components/elements/Button";
import { TextInput } from "@/shared/components/elements/TextInput";
import { TextArea } from "@/shared/components/elements/TextArea";
import { Dialog } from "@/shared/components/patterns/Dialog";
import { DialogActions } from "@/shared/components/patterns/DialogActions";
import { ConfirmDialog } from "@/shared/components/patterns/ConfirmDialog";
import { BUTTON_COLOR, BUTTON_VARIANT } from "@/shared/constants";
import { t } from "@/lang";
import {
  TUNNEL_DIALOG_MODE,
  TUNNEL_NAME_MAX_LENGTH,
} from "@/features/tunnels/constants";
import {
  hasDnsLine,
  sanitizeTunnelName,
  stripDnsLine,
} from "@/features/tunnels/utils";
import { DIALOG_CONTENT_ROWS } from "./constants";
import { TunnelDialogPropsType } from "./types";

import "@/styles/components/TunnelDialog.css";

export function TunnelDialog({
  open,
  draft,
  existingNames,
  busy,
  onClose,
  onSave,
  onPickFile,
}: TunnelDialogPropsType) {
  // El padre monta este componente solo mientras está abierto,
  // así el estado del formulario se resetea al cerrar.
  const [name, setName] = useState(draft.name);
  const [content, setContent] = useState(draft.content);
  const [confirmingOverwrite, setConfirmingOverwrite] = useState(false);
  const [confirmingDns, setConfirmingDns] = useState(false);

  const editing = draft.mode === TUNNEL_DIALOG_MODE.EDIT;
  const cleanName = sanitizeTunnelName(name);
  // wg-quick solo acepta [A-Za-z0-9_-]: avisar antes de guardar en vez de
  // recortar el nombre a espaldas del usuario.
  const renamed = cleanName !== name.trim() && cleanName.length > 0;
  const collides =
    cleanName !== draft.name && existingNames.includes(cleanName);

  const pickFile = async () => {
    const picked = await onPickFile();
    if (!picked) return;
    // Al editar, el nombre es del túnel ya guardado: solo se reemplaza el conf.
    if (!editing) setName(picked.name);
    setContent(picked.content);
  };

  const save = async (finalContent: string) => {
    setConfirmingOverwrite(false);
    setConfirmingDns(false);
    setContent(finalContent);
    const saved = await onSave({
      name: cleanName,
      content: finalContent,
      previousName: editing ? draft.name : undefined,
    });
    // Si falló, el diálogo se queda abierto con lo escrito y el error se ve
    // detrás; cerrarlo obligaría a pegar el .conf otra vez.
    if (saved) onClose();
  };

  // Confirmaciones encadenadas: primero el nombre (sobrescritura), después el
  // contenido (la línea DNS que rompe wg-quick en macOS).
  const confirmContent = () =>
    hasDnsLine(content) ? setConfirmingDns(true) : save(content);

  const submit = () =>
    collides ? setConfirmingOverwrite(true) : confirmContent();

  if (!open) return null;

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title={editing ? t("editTitle") : t("importTitle")}
        className="TunnelDialog"
      >
        <div className="body">
          <Button variant={BUTTON_VARIANT.OUTLINED} onClick={pickFile}>
            <FontAwesomeIcon icon={faFolderOpen} /> {t("importPickFile")}
          </Button>
          {editing && draft.connected ? (
            <p className="hint">
              <FontAwesomeIcon icon={faCircleInfo} /> {t("editConnectedHint")}
            </p>
          ) : null}
          <label className="field">
            {t("importName")}
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("importNamePlaceholder")}
              maxLength={TUNNEL_NAME_MAX_LENGTH}
            />
          </label>
          {renamed ? (
            <p className="hint">
              <FontAwesomeIcon icon={faCircleInfo} />{" "}
              {t("nameSanitizedHint", cleanName)}
            </p>
          ) : null}
          <label className="field">
            {t("importContent")}
            <TextArea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={DIALOG_CONTENT_ROWS}
              spellCheck={false}
            />
          </label>
          <DialogActions
            primaryText={t("importSave")}
            cancelText={t("cancel")}
            onPrimaryClick={submit}
            onCancel={onClose}
            isLoading={busy}
            disabled={!cleanName || !content.trim()}
          />
        </div>
      </Dialog>

      <ConfirmDialog
        open={confirmingOverwrite}
        title={t("confirmOverwriteTitle")}
        message={t("confirmOverwriteText", cleanName)}
        confirmText={t("confirmOverwriteAction")}
        confirmColor={BUTTON_COLOR.ERROR}
        busy={busy}
        onConfirm={confirmContent}
        onClose={() => setConfirmingOverwrite(false)}
      />

      <ConfirmDialog
        open={confirmingDns}
        title={t("confirmDnsTitle")}
        message={t("confirmDnsText")}
        confirmText={t("confirmDnsStrip")}
        extraText={t("confirmDnsKeep")}
        busy={busy}
        onExtra={() => save(content)}
        onConfirm={() => save(stripDnsLine(content))}
        onClose={() => setConfirmingDns(false)}
      />
    </>
  );
}
