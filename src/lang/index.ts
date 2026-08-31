import { es } from "./es";

type Dictionary = typeof es;

export type TranslationKey = keyof Dictionary;

/**
 * Las cadenas con datos son funciones (ARCHITECTURE_RULES §9), no plantillas
 * con marcadores: así `t` exige los argumentos correctos en tiempo de compilación.
 */
type TranslationArgs<K extends TranslationKey> = Dictionary[K] extends (
  ...args: infer P
) => string
  ? P
  : [];

const dictionary = es;

export const t = <K extends TranslationKey>(
  key: K,
  ...args: TranslationArgs<K>
): string => {
  const entry: unknown = dictionary[key];
  if (typeof entry === "function") {
    return (entry as (...params: TranslationArgs<K>) => string)(...args);
  }
  return entry as string;
};
