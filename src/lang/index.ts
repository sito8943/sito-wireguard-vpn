import { es } from "./es";

export type TranslationKey = keyof typeof es;
export type TranslationParams = Record<string, string>;

const dictionary = es;

// Los textos con datos usan marcadores {clave}: t("confirmDeleteText", { name })
const PLACEHOLDER = /\{(\w+)\}/g;

export const t = (key: TranslationKey, params?: TranslationParams): string => {
  const text: string = dictionary[key];
  if (!params) return text;
  return text.replace(
    PLACEHOLDER,
    (match, param: string) => params[param] ?? match,
  );
};
