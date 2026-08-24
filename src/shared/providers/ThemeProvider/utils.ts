import { THEME, Theme } from "@/shared/constants";
import { PREFERS_DARK_QUERY } from "./constants";

export function getSystemTheme(): Theme {
  return window.matchMedia(PREFERS_DARK_QUERY).matches
    ? THEME.DARK
    : THEME.LIGHT;
}
