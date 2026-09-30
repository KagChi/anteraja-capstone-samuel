import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { MaterialIcon } from "../Components/MaterialIcon";

type ToastType = "ok" | "error";

type ShowToast = (text: string, type?: ToastType) => void;

type ToastPhase = "enter" | "shown" | "exit";

const ToastContext = createContext<ShowToast | null>(null);

interface ToastState {
  text: string;
  type: ToastType;
}

const VISIBLE_MS = 3200;
const EXIT_MS = 360;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [phase, setPhase] = useState<ToastPhase>("enter");
  const timers = useRef<number[]>([]);
  const frame = useRef<number | null>(null);

  const clearAsync = useCallback(() => {
    for (const timer of timers.current) window.clearTimeout(timer);
    timers.current = [];
    if (frame.current !== null) {
      window.cancelAnimationFrame(frame.current);
      frame.current = null;
    }
  }, []);

  const show = useCallback<ShowToast>(
    (text, type = "ok") => {
      clearAsync();
      setToast({ text, type });
      setPhase("enter");
      frame.current = window.requestAnimationFrame(() => {
        frame.current = window.requestAnimationFrame(() => {
          setPhase("shown");
        });
      });
      timers.current.push(
        window.setTimeout(() => setPhase("exit"), VISIBLE_MS),
        window.setTimeout(() => setToast(null), VISIBLE_MS + EXIT_MS),
      );
    },
    [clearAsync],
  );

  useEffect(() => clearAsync, [clearAsync]);

  const phaseClass =
    phase === "shown"
      ? "translate-y-0 opacity-100"
      : phase === "exit"
        ? "translate-y-[160%] opacity-0"
        : "-translate-y-[160%] opacity-0";

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? (
        <output
          aria-live="polite"
          className={`pointer-events-none fixed top-[calc(1rem+env(safe-area-inset-top,0px))] left-1/2 z-[80] flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-2 rounded-xl px-4 py-[0.65rem] text-[13px] font-semibold text-white shadow-[0_12px_30px_rgba(28,27,27,0.25)] transition-[translate,opacity] duration-300 ease-out ${
            toast.type === "error" ? "bg-error" : "bg-[#1c1b1b]"
          } ${phaseClass}`}
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
