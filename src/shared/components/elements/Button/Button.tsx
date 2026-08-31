import { Button as UiButton } from "@sito/ui";

import { ButtonPropsType } from "./types";

/**
 * Envoltorio de @sito/ui: el contrato de props que ve la app es este, no el de
 * la librería, para poder cambiarla sin tocar los features (§14.1).
 */
export function Button(props: ButtonPropsType) {
  return <UiButton {...props} />;
}
