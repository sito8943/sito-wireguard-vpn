import { ReactNode } from "react";

import "../../../styles/views/AppLayout.css";

export function AppLayout({ children }: { children: ReactNode }) {
  return <main className="AppLayout">{children}</main>;
}
