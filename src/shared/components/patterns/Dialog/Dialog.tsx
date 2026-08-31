import { Dialog as UiDialog } from "@sito/ui";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";

import { t } from "@/lang";
import { DialogPropsType } from "./types";

/**
 * Envoltorio de @sito/ui que fija el botón de cierre (icono y etiqueta) para
 * que todos los modales de la app cierren igual (§14.2).
 */
export function Dialog(props: DialogPropsType) {
  return (
    <UiDialog
      closeLabel={t("cancel")}
      closeIcon={<FontAwesomeIcon icon={faXmark} />}
      {...props}
    />
  );
}
