"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type Toast = {
  id: number;
  text: string;
  action?: string;
  onAction?: () => void;
  duration?: number;
};

type ToastInput = Omit<Toast, "id">;

const ToastContext = createContext<(toast: ToastInput) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((toast: ToastInput) => {
    const id = Date.now() + Math.random();
    const item = { ...toast, id };
    setToasts((current) => [...current, item]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((entry) => entry.id !== id));
    }, toast.duration ?? 8000);
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed inset-x-0 bottom-24 z-40 flex flex-col items-center gap-2 px-4 md:bottom-8" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className="card flex items-center gap-4 px-4 py-3 text-sm shadow-card">
            <span>{toast.text}</span>
            {toast.action ? (
              <button
                type="button"
                className="font-medium text-accent"
                onClick={() => {
                  toast.onAction?.();
                  setToasts((current) => current.filter((entry) => entry.id !== toast.id));
                }}
              >
                {toast.action}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
