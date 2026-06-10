import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register the push notifications service worker.
// Push SWs are scoped/lightweight and don't intercept fetches.
if ("serviceWorker" in navigator && window.isSecureContext) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => console.warn("SW registration failed", err));
  });
}

createRoot(document.getElementById("root")!).render(<App />);
