'use client';
// components/ui/ConfirmDialog.tsx
// Modal de confirmación reutilizable (reemplaza el window.confirm nativo)

interface ConfirmDialogProps {
  open:      boolean;
  title:     string;
  message:   string;
  confirmLabel?: string;
  cancelLabel?:  string;
  danger?:   boolean;
  loading?:  boolean;
  onConfirm: () => void;
  onCancel:  () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel  = 'Cancelar',
  danger       = false,
  loading      = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    // Overlay
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onCancel}
    >
      {/* Panel */}
      <div
        className="
          w-full max-w-sm rounded-3xl
          bg-white dark:bg-surface-900
          border border-surface-200 dark:border-surface-800
          shadow-2xl shadow-black/20
          p-6
        "
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-surface-800 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-surface-500 dark:text-surface-400 mb-6">{message}</p>

        <div className="flex flex-col gap-2">
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`
              w-full py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed
              ${danger
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-brand-500 hover:bg-brand-600 text-white'
              }
            `}
          >
            {loading ? '⏳ ...' : confirmLabel}
          </button>
          <button
            onClick={onCancel}
            className="
              w-full py-3 rounded-xl font-semibold text-sm
              bg-surface-100 dark:bg-surface-800
              text-surface-700 dark:text-surface-200
              hover:bg-surface-200 dark:hover:bg-surface-700
              transition-colors
            "
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
