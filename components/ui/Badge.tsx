// components/ui/Badge.tsx
// ─── Badge ───────────────────────────────────────────────────
type BadgeColor = 'teal' | 'red' | 'yellow' | 'slate' | 'green';

interface BadgeProps {
  label:   string;
  color?:  BadgeColor;
}

const colorMap: Record<BadgeColor, string> = {
  teal:   'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800',
  red:    'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800',
  yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/50 dark:text-yellow-300 dark:border-yellow-800',
  slate:  'bg-surface-100 text-surface-600 border-surface-200 dark:bg-surface-800 dark:text-surface-300 dark:border-surface-700',
  green:  'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800',
};

export function Badge({ label, color = 'teal' }: BadgeProps) {
  return (
    <span className={`
      inline-block px-2 py-0.5 rounded-full text-xs font-semibold border
      ${colorMap[color]}
    `}>
      {label}
    </span>
  );
}

// ─── Spinner ─────────────────────────────────────────────────
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' };
  return (
    <div className={`
      ${sizes[size]} rounded-full border-2
      border-surface-200 dark:border-surface-700
      border-t-brand-500 animate-spin
    `} />
  );
}

// ─── PageLoader ──────────────────────────────────────────────
export function PageLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <Spinner size="lg" />
      <p className="text-sm text-surface-400">Cargando...</p>
    </div>
  );
}

// ─── EmptyState ──────────────────────────────────────────────
interface EmptyStateProps {
  icon?:     string;
  title:     string;
  subtitle?: string;
  action?:   React.ReactNode;
}

export function EmptyState({ icon = '📭', title, subtitle, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
      <span className="text-5xl mb-4">{icon}</span>
      <h3 className="text-lg font-semibold text-surface-700 dark:text-surface-200 mb-1">{title}</h3>
      {subtitle && <p className="text-sm text-surface-400 max-w-xs">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─── Card ────────────────────────────────────────────────────
interface CardProps {
  children:  React.ReactNode;
  className?: string;
  padding?:  boolean;
}

export function Card({ children, className = '', padding = true }: CardProps) {
  return (
    <div className={`
      rounded-2xl
      bg-white dark:bg-surface-900
      border border-surface-200 dark:border-surface-800
      shadow-sm
      ${padding ? 'p-4' : ''}
      ${className}
    `}>
      {children}
    </div>
  );
}

// ─── ErrorMessage ────────────────────────────────────────────
export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="
      flex items-start gap-2 p-3 rounded-xl
      bg-red-50 dark:bg-red-950/30
      border border-red-200 dark:border-red-900
      text-red-700 dark:text-red-300
      text-sm
    ">
      <span className="shrink-0">⚠️</span>
      <p>{message}</p>
    </div>
  );
}

// ─── SuccessMessage ──────────────────────────────────────────
export function SuccessMessage({ message }: { message: string }) {
  return (
    <div className="
      flex items-start gap-2 p-3 rounded-xl
      bg-green-50 dark:bg-green-950/30
      border border-green-200 dark:border-green-900
      text-green-700 dark:text-green-300
      text-sm
    ">
      <span className="shrink-0">✅</span>
      <p>{message}</p>
    </div>
  );
}
