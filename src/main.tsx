import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "./theme/ThemeProvider";
import { ToastProvider } from "./components/ui/Toast";
import { AiTaskProvider } from "./context/AiTaskContext";
import { WorkspaceProvider } from "./context/WorkspaceContext";
import { ScanProgressProvider } from "./context/ScanProgressContext";

// Disable default browser/webview context menu (Back, Refresh, Save as, Print, etc.) in AppSec
if (typeof window !== "undefined") {
  window.addEventListener("contextmenu", (e) => {
    e.preventDefault();
  });
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <AiTaskProvider>
          <WorkspaceProvider>
            <ScanProgressProvider>
              <App />
            </ScanProgressProvider>
          </WorkspaceProvider>
        </AiTaskProvider>
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
