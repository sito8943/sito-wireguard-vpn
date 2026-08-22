import React from "react";
import ReactDOM from "react-dom/client";

import { VpnProvider } from "./providers/VpnProvider";
import { AppLayout } from "./layouts/AppLayout";
import { Home } from "./views/Home";

import "@sito/ui/theme.css";
import "@sito/ui/styles.css";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <VpnProvider>
      <AppLayout>
        <Home />
      </AppLayout>
    </VpnProvider>
  </React.StrictMode>
);
