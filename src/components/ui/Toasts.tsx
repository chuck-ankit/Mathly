import { createContext, ReactNode, useCallback, useContext, useMemo, useRef, useState } from 'react';
import './ui.css';

interface Toast {
  id: number;
  message: string;
  tone?: 'default' | 'gold';
}

interface ToastContextValue {
  toast: (message: string, tone?: 'default' | 'gold') => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const toast = useCallback((message: string, tone: 'default' | 'gold' = 'default') => {
    const id = ++idRef.current;
    setToasts((t) => [...t.slice(-2), { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4200);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="ui-toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`ui-toast ${t.tone === 'gold' ? 'ui-toast--gold' : ''}`}>
            <span className="ui-toast__msg">{t.message}</span>
            <button
              type="button"
              className="ui-toast__close"
              aria-label="Dismiss"
              onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}