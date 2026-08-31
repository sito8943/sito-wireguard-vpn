import { IconButton as UiIconButton } from "@sito/ui";

import { IconButtonPropsType } from "./types";

/** Envoltorio de @sito/ui — ver Button para el porqué (§14.1). */
export function IconButton(props: IconButtonPropsType) {
  return <UiIconButton {...props} />;
}
