import React from "react";
import ReactDOM from "react-dom/client";

import { Tunnels, VpnProvider } from "./features/tunnels";
import { ThemeProvider } from "./shared/providers/ThemeProvider";
import { AppLayout } from "./app/layout/AppLayout";

import "@sito/ui/theme.css";
import "@sito/ui/styles.css";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <VpnProvider>
        <AppLayout>
          <Tunnels />
        </AppLayout>
      </VpnProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
