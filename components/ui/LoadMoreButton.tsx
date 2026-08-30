// components/ui/LoadMoreButton.tsx
// Botón "cargar más" para paginación cliente (S17).
interface LoadMoreButtonProps {
  visible: number;
  total:   number;
  onClick: () => void;
  label?:  string;
}

export function LoadMoreButton({ visible, total, onClick, label }: LoadMoreButtonProps) {
  return (
    <div className="flex flex-col items-center gap-1 py-4">
      <button
        onClick={onClick}
        className="px-5 py-2.5 rounded-xl bg-white border border-surface-200 text-surface-600 hover:border-brand-400 hover:text-brand-600 text-sm font-bold transition-colors shadow-sm"
      >
        {label ?? `Mostrar más (${visible} de ${total})`}
      </button>
      <span className="text-xs text-surface-400">Mostrando {Math.min(visible, total)} de {total}</span>
    </div>
  );
}
