// components/ui/Button.tsx
// Botón reutilizable con variantes y estados de carga
import { type ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size    = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  Variant;
  size?:     Size;
  loading?:  boolean;
  fullWidth?: boolean;
  leftIcon?:  string;
}

const variantClasses: Record<Variant, string> = {
  primary:   'bg-teal-500 hover:bg-teal-600 text-white shadow-sm shadow-teal-500/20 disabled:bg-teal-300',
  secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200',
  danger:    'bg-red-500 hover:bg-red-600 text-white shadow-sm shadow-red-500/20',
  ghost:     'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300',
};

const sizeClasses: Record<Size, string> = {
  sm:  'px-3 py-1.5 text-xs rounded-lg',
  md:  'px-4 py-2.5 text-sm rounded-xl',
  lg:  'px-5 py-3   text-base rounded-xl',
};

export function Button({
  variant   = 'primary',
  size      = 'md',
  loading   = false,
  fullWidth = false,
  leftIcon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`
        font-semibold transition-all duration-150 active:scale-95
        flex items-center justify-center gap-2
        disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : leftIcon ? (
        <span>{leftIcon}</span>
      ) : null}
      {children}
    </button>
  );
}
