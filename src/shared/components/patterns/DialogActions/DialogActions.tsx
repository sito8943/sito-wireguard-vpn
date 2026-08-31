import { DialogActions as UiDialogActions } from "@sito/ui";

import { DialogActionsPropsType } from "./types";

/** Envoltorio de @sito/ui — ver Dialog para el porqué (§14.1). */
export function DialogActions(props: DialogActionsPropsType) {
  return <UiDialogActions {...props} />;
}
