import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// --- PWA Service Worker registration guard ---
// Never register the SW in iframes or on Lovable preview hosts.
// In those environments, also unregister any existing SWs to avoid stale caches.
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const hostname = window.location.hostname;
const isPreviewHost =
  hostname.includes("id-preview--") ||
  hostname.includes("lovableproject.com") ||
  hostname === "localhost" ||
  hostname === "127.0.0.1";

if (isPreviewHost || isInIframe) {
  // Cleanup any service workers that might have been registered previously
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => regs.forEach((r) => r.unregister()))
      .catch(() => {});
  }

  // Clear old PWA caches in preview so stale favicons/icons do not persist.
  if ("caches" in window) {
    window.caches
      .keys()
      .then((keys) => keys.forEach((key) => window.caches.delete(key)))
      .catch(() => {});
  }
} else if ("serviceWorker" in navigator) {
  // Production-only: dynamic import so the virtual module is tree-shaken from preview builds
  import("virtual:pwa-register")
    .then(({ registerSW }) => {
      registerSW({ immediate: true });
    })
    .catch(() => {
      // virtual:pwa-register is only available when vite-plugin-pwa is active
    });
}

createRoot(document.getElementById("root")!).render(<App />);
