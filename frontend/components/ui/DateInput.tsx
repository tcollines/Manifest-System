import React from 'react';
import { Calendar } from 'lucide-react';

interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
    label: string;
    error?: string;
    hint?: string;
    /** 'date' (default) | 'datetime-local' | 'month' */
    mode?: 'date' | 'datetime-local' | 'month';
}

/**
 * DateInput — standardised date picker.
 * Mandated by STANDARDS.md §4. Returns ISO date strings.
 */
const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
    ({ label, error, hint, mode = 'date', className = '', id, ...props }, ref) => {
        const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
        return (
            <div className="flex flex-col gap-1 w-full">
                <label htmlFor={inputId} className="text-sm font-semibold text-gray-700">
                    {label}
                    {props.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                        ref={ref}
                        id={inputId}
                        type={mode}
                        {...props}
                        className={[
                            'w-full rounded-xl border pl-10 pr-4 py-2.5 text-sm text-gray-800',
                            'transition-colors focus:outline-none focus:ring-2',
                            error
                                ? 'border-red-400 bg-red-50 focus:ring-red-300'
                                : 'border-gray-200 bg-white focus:ring-ministry-orange/30 focus:border-ministry-orange',
                            props.disabled ? 'bg-gray-50 opacity-60 cursor-not-allowed' : '',
                            className,
                        ].join(' ')}
                    />
                </div>
                {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
                {hint && !error && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
            </div>
        );
    }
);
DateInput.displayName = 'DateInput';
export default DateInput;
