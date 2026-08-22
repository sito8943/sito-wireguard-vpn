import { useContext } from "react";

import { VpnContext } from "./context";
import { VpnContextValue } from "./types";

export function useVpn(): VpnContextValue {
  const context = useContext(VpnContext);
  if (!context) {
    throw new Error("useVpn must be used within VpnProvider");
  }
  return context;
}
