'use client';
// components/ui/Toast.tsx
// Sistema de notificaciones Toast ligero, sin dependencias externas

import { createContext, useContext, useState, useCallback, useEffect } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id:      string;
  message: string;
  type:    ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Contenedor de toasts — bottom-center en mobile */}
      <div className="
        fixed bottom-24 left-0 right-0 z-50
        flex flex-col items-center gap-2 px-4
        pointer-events-none
      ">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ─── Item individual ─────────────────────────────────────────
function ToastItem({ toast: t }: { toast: Toast }) {
  const colorMap: Record<ToastType, string> = {
    success: 'bg-teal-600 text-white',
    error:   'bg-red-600 text-white',
    info:    'bg-slate-800 dark:bg-slate-700 text-white',
  };
  const iconMap: Record<ToastType, string> = {
    success: '✅', error: '❌', info: 'ℹ️',
  };

  return (
    <div className={`
      flex items-center gap-2.5
      px-4 py-3 rounded-2xl shadow-lg
      text-sm font-medium
      pointer-events-auto
      animate-[slideUp_0.3s_ease]
      ${colorMap[t.type]}
    `}>
      <span>{iconMap[t.type]}</span>
      <span>{t.message}</span>

      <style jsx global>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ─── Hook de consumo ─────────────────────────────────────────
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
}
