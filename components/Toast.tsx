"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

type ToastType = "success" | "error" | "info";
type Toast = { id: number; type: ToastType; message: string };

type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  /** Show success or error based on an action result. */
  result: (res: { ok: boolean; message: string }) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

const STYLE: Record<ToastType, { bg: string; icon: string }> = {
  success: { bg: "bg-lime", icon: "✅" },
  error: { bg: "bg-red text-white", icon: "⛔" },
  info: { bg: "bg-blue", icon: "ℹ️" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (type: ToastType, message: string) => {
      if (!message) return;
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, type, message }]);
      setTimeout(() => remove(id), 4500);
    },
    [remove],
  );

  const api: ToastApi = {
    success: (m) => push("success", m),
    error: (m) => push("error", m),
    info: (m) => push("info", m),
    result: (res) => push(res.ok ? "success" : "error", res.message),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(92vw,360px)] flex-col gap-2">
        {toasts.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => remove(t.id)}
            className={`nb-toast pointer-events-auto flex items-start gap-2 rounded-xl border-[3px] border-ink px-4 py-3 text-left text-sm font-bold shadow-[4px_4px_0_0_#131313] ${STYLE[t.type].bg}`}
          >
            <span className="text-base leading-none">{STYLE[t.type].icon}</span>
            <span className="flex-1">{t.message}</span>
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
