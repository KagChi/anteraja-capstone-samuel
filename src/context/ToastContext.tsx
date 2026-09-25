import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { MaterialIcon } from "../components/MaterialIcon";

type ToastType = "ok" | "error";

type ShowToast = (text: string, type?: ToastType) => void;

const ToastContext = createContext<ShowToast | null>(null);

interface ToastState {
  text: string;
  type: ToastType;
  visible: boolean;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<number | null>(null);

  const show = useCallback<ShowToast>((text, type = "ok") => {
    setToast({ text, type, visible: true });
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setToast((current) =>
        current ? { ...current, visible: false } : current,
      );
    }, 3200);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? (
        <output
          aria-live="polite"
          className={`pointer-events-none fixed top-[calc(1rem+env(safe-area-inset-top,0px))] left-1/2 z-[80] flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-2 rounded-xl px-4 py-[0.65rem] text-[13px] font-semibold text-white shadow-[0_12px_30px_rgba(28,27,27,0.25)] transition-[transform,opacity] duration-300 ${
            toast.type === "error" ? "bg-error" : "bg-[#1c1b1b]"
          } ${
            toast.visible
              ? "translate-y-0 opacity-100"
              : "-translate-y-[160%] opacity-0"
          }`}
        >
          <MaterialIcon
            name={toast.type === "error" ? "error" : "check_circle"}
            className="text-[18px]"
          />
          <span>{toast.text}</span>
        </output>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ShowToast {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
