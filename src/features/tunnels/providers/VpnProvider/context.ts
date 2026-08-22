import { createContext } from "react";

import { VpnContextValue } from "./types";

export const VpnContext = createContext<VpnContextValue | null>(null);
