import type { ButtonColor, ButtonSize, ButtonVariant } from "@sito/ui";

export const THEME = {
  LIGHT: "light",
  DARK: "dark",
} as const;

export type Theme = (typeof THEME)[keyof typeof THEME];

// @sito/ui 0.3.3 aún no exporta sus const-objects BUTTON_*; se declaran aquí
// tipados contra la lib (satisfies) para que tsc avise si la API cambia.
export const BUTTON_COLOR = {
  PRIMARY: "primary",
  ERROR: "error",
  SUCCESS: "success",
} as const satisfies Record<string, ButtonColor>;

export const BUTTON_VARIANT = {
  TEXT: "text",
  SUBMIT: "submit",
  OUTLINED: "outlined",
} as const satisfies Record<string, ButtonVariant>;

export const BUTTON_SIZE = {
  SM: "sm",
  MD: "md",
  LG: "lg",
} as const satisfies Record<string, ButtonSize>;
