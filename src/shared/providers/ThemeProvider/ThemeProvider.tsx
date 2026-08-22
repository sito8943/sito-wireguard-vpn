import { ReactNode, useEffect, useMemo, useState } from "react";

import { THEME } from "../../constants";
import { ThemeContext } from "./context";
import { PREFERS_DARK_QUERY, THEME_DATA_ATTRIBUTE } from "./constants";
import { getSystemTheme } from "./utils";
import { ThemeContextValue } from "./types";

/**
 * Sigue el tema del sistema operativo (prefers-color-scheme) y lo refleja
 * en <html data-theme="…"> para que theme.css aplique la paleta correcta.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState(getSystemTheme);

  useEffect(() => {
    const media = window.matchMedia(PREFERS_DARK_QUERY);
    const onChange = (event: MediaQueryListEvent) => {
      setTheme(event.matches ? THEME.DARK : THEME.LIGHT);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute(THEME_DATA_ATTRIBUTE, theme);
  }, [theme]);

  const value = useMemo<ThemeContextValue>(() => ({ theme }), [theme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
