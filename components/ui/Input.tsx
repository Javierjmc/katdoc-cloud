// components/ui/Input.tsx
// Input y Textarea reutilizables con label, error y hint
import { type InputHTMLAttributes, type TextareaHTMLAttributes, forwardRef } from 'react';

const baseClass = `
  w-full px-3 py-2.5 rounded-xl text-sm
  bg-surface-50 dark:bg-surface-800
  text-surface-800 dark:text-white
  placeholder:text-surface-400 dark:placeholder:text-surface-500
  border border-surface-200 dark:border-surface-700
  focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20
  disabled:opacity-50 disabled:cursor-not-allowed
  transition-all
`;

// ─── Wrapper con Label ───────────────────────────────────────
interface FieldProps {
  label?:    string;
  error?:    string;
  hint?:     string;
  children:  React.ReactNode;
  required?: boolean;
  className?: string;
}

export function Field({ label, error, hint, required, children, className }: FieldProps) {
  return (
    <div className={`flex flex-col gap-1 ${className ?? ''}`}>
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400">
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-surface-400">{hint}</p>}
    </div>
  );
}

// ─── Input ───────────────────────────────────────────────────
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, className = '', ...props }, ref) => (
    <input
      ref={ref}
      className={`${baseClass} ${error ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20' : ''} ${className}`}
      {...props}
    />
  )
);
Input.displayName = 'Input';

// ─── Textarea ────────────────────────────────────────────────
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, className = '', rows = 3, ...props }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      className={`${baseClass} resize-none ${error ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20' : ''} ${className}`}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';

// ─── Select ──────────────────────────────────────────────────
interface SelectProps extends InputHTMLAttributes<HTMLSelectElement> {
  options:  { value: string; label: string }[];
  error?:   boolean;
}

export function Select({ options, error, className = '', ...props }: SelectProps) {
  return (
    <select
      className={`${baseClass} appearance-none ${error ? 'border-red-400' : ''} ${className}`}
      {...(props as React.SelectHTMLAttributes<HTMLSelectElement>)}
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
