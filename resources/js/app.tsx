import "../css/app.css";
import { createInertiaApp, router } from "@inertiajs/react";
import type { ComponentType } from "react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ShipmentProvider } from "./Contexts/ShipmentContext";
import { ToastProvider } from "./Contexts/ToastContext";

const appName = "Satria Rapid Field Dispatch";

router.on("navigate", () => {
  window.scrollTo(0, 0);
});

createInertiaApp({
  title: (title) => (title ? `${title} — ${appName}` : appName),
  resolve: async (name) => {
    const pages = import.meta.glob("./Pages/**/*.tsx");
    const importPage = pages[`./Pages/${name}.tsx`];

    if (!importPage) {
      throw new Error(`Inertia page not found: ${name}`);
    }

    const module = (await importPage()) as { default: ComponentType };
    return module.default ?? (module as unknown as ComponentType);
  },
  setup({ el, App, props }) {
    createRoot(el).render(
      <StrictMode>
        <ToastProvider>
          <ShipmentProvider>
            <App {...props} />
          </ShipmentProvider>
        </ToastProvider>
      </StrictMode>,
    );
  },
});
