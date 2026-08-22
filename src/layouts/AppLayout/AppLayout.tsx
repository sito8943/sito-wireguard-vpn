import { ReactNode } from "react";

import "./styles.css";

export function AppLayout({ children }: { children: ReactNode }) {
  return <main className="app-layout">{children}</main>;
}
