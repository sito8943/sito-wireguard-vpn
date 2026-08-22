import { createContext } from "react";

import { ThemeContextValue } from "./types";

export const ThemeContext = createContext<ThemeContextValue | null>(null);
