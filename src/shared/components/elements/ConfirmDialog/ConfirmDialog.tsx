import { Button, Dialog } from "@sito/ui";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";

import { BUTTON_COLOR, BUTTON_VARIANT } from "@/shared/constants";
import { t } from "@/lang";
import { ConfirmDialogPropsType } from "./types";

import "@/styles/components/ConfirmDialog.css";

/**
 * Confirmación para acciones sin vuelta atrás (borrar, sobrescribir).
 * No usa DialogActions de @sito/ui porque este no permite teñir de rojo el
 * botón primario.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmText,
  confirmColor = BUTTON_COLOR.PRIMARY,
  busy = false,
  onConfirm,
  onClose,
}: ConfirmDialogPropsType) {
  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      closeLabel={t("cancel")}
      closeIcon={<FontAwesomeIcon icon={faXmark} />}
      className="ConfirmDialog"
    >
      <div className="body">
        <p className="message">{message}</p>
        <div className="actions">
          <Button variant={BUTTON_VARIANT.TEXT} onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            color={confirmColor}
            variant={BUTTON_VARIANT.SUBMIT}
            loading={busy}
            loadingLabel={t("working")}
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
