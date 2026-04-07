'use client';
import { createContext, useContext, useState, useCallback } from 'react';

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, ok = true) => {
    setToast({ msg, ok, key: Date.now() });
    setTimeout(() => setToast(null), 2400);
  }, []);

  return (
    <ToastCtx.Provider value={showToast}>
      {children}
      {toast && (
        <div
          key={toast.key}
          style={{
            position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
            zIndex: 9999, padding: '10px 20px', borderRadius: 99, fontSize: 12,
            fontWeight: 700, whiteSpace: 'nowrap', pointerEvents: 'none',
            background: toast.ok ? '#14532d' : '#450a0a',
            color: toast.ok ? '#86efac' : '#fca5a5',
            border: `1px solid ${toast.ok ? '#22c55e44' : '#ef444444'}`,
          }}
        >
          {toast.msg}
        </div>
      )}
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
