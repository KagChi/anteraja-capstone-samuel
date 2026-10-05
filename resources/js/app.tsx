import "../css/app.css";
import { createInertiaApp, router } from "@inertiajs/react";
import type { ComponentType } from "react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "./Contexts/SessionContext";
import { ShipmentProvider } from "./Contexts/ShipmentContext";
import { ToastProvider } from "./Contexts/ToastContext";
import type { AuthUser } from "./types";

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
    const authUser =
      (props.initialPage.props as { auth?: { user: AuthUser | null } }).auth
        ?.user ?? null;
    createRoot(el).render(
      <StrictMode>
        <AuthProvider initialUser={authUser}>
          <ToastProvider>
            <ShipmentProvider>
              <App {...props} />
            </ShipmentProvider>
          </ToastProvider>
        </AuthProvider>
      </StrictMode>,
    );
  },
});
