import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { Loader2, X } from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* Button                                                                      */
/* -------------------------------------------------------------------------- */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const variants: Record<Variant, string> = {
  primary: 'bg-ink-900 text-white hover:bg-ink-700 disabled:bg-ink-400',
  secondary:
    'bg-white text-ink-900 border border-ink-200 hover:bg-ink-50 disabled:text-ink-400',
  ghost: 'text-ink-700 hover:bg-ink-100',
  danger: 'bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = 'primary',
  loading,
  icon,
  children,
  className = '',
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Field + Input + Select                                                      */
/* -------------------------------------------------------------------------- */

export function Field({
  label,
  required,
  hint,
  children,
  className = '',
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="text-sm font-semibold text-ink-700">
        {label}
        {required && <span className="text-brand-600"> *</span>}
      </span>
      {children}
      {hint && <span className="block text-xs text-ink-500">{hint}</span>}
    </label>
  );
}

const controlClass =
  'w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = '', ...rest }, ref) {
    return <input ref={ref} {...rest} className={`${controlClass} ${className}`} />;
  },
);

export function Select({
  children,
  className = '',
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} className={`${controlClass} ${className}`}>
      {children}
    </select>
  );
}

/* -------------------------------------------------------------------------- */
/* Modal                                                                       */
/* -------------------------------------------------------------------------- */

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink-900/40 p-0 sm:items-center sm:p-4">
      <div
        className={`animate-rise max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-ink-100 bg-white px-5 py-4">
          <h2 className="text-base font-bold text-ink-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Misc                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Action row for the bottom of a Modal.
 *
 * Sticks to the bottom of the sheet's scroll area, so on a phone the Cancel
 * and Save buttons stay put when the keyboard opens instead of being pushed
 * off-screen. The negative margins let the bar span the full sheet width
 * despite the body's padding, and the bottom padding clears an iPhone's home
 * indicator.
 */
export function ModalActions({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-5 -mb-5 mt-4 flex gap-2 border-t border-ink-100 bg-white px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  tone = 'default',
  onClick,
  active,
}: {
  label: string;
  value: number | string;
  tone?: 'default' | 'brand' | 'dark';
  onClick?: () => void;
  active?: boolean;
}) {
  const base =
    tone === 'dark'
      ? 'bg-ink-900 text-white'
      : tone === 'brand'
        ? 'bg-brand-50 text-brand-700 border border-brand-100'
        : 'bg-white text-ink-900 border border-ink-200';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`rounded-2xl px-4 py-3.5 text-left transition-all ${base} ${
        onClick ? 'cursor-pointer hover:shadow-md' : 'cursor-default'
      } ${active ? 'ring-2 ring-brand-500' : ''}`}
    >
      <p className="text-[11px] font-bold uppercase tracking-wider opacity-60">{label}</p>
      <p className="mt-1 text-3xl font-black tabular-nums">{value}</p>
    </button>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink-200 bg-white/60 px-6 py-12 text-center">
      <p className="font-semibold text-ink-700">{title}</p>
      {hint && <p className="mt-1 text-sm text-ink-500">{hint}</p>}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-ink-500">
      <Loader2 className="size-5 animate-spin" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

export function Badge({
  children,
  tone = 'default',
}: {
  children: ReactNode;
  tone?: 'default' | 'brand' | 'green' | 'muted';
}) {
  const tones = {
    default: 'bg-ink-100 text-ink-700',
    brand: 'bg-brand-50 text-brand-700',
    green: 'bg-emerald-50 text-emerald-700',
    muted: 'bg-ink-100 text-ink-500',
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
