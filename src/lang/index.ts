import { es } from "./es";

export type TranslationKey = keyof typeof es;

const dictionary = es;

export const t = (key: TranslationKey): string => dictionary[key];
