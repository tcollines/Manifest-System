import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

interface SelectInputProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
    label: string;
    options: SelectOption[];
    error?: string;
    hint?: string;
    placeholder?: string;
}

/**
 * SelectInput — standardised dropdown.
 * Mandated by STANDARDS.md §4.
 */
const SelectInput = React.forwardRef<HTMLSelectElement, SelectInputProps>(
    ({ label, options, error, hint, placeholder, className = '', id, ...props }, ref) => {
        const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
        return (
            <div className="flex flex-col gap-1 w-full">
                <label htmlFor={inputId} className="text-sm font-semibold text-gray-700">
                    {label}
                    {props.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <div className="relative">
                    <select
                        ref={ref}
                        id={inputId}
                        {...props}
                        className={[
                            'w-full rounded-xl border px-4 py-2.5 pr-10 text-sm text-gray-800 appearance-none',
                            'transition-colors focus:outline-none focus:ring-2',
                            error
                                ? 'border-red-400 bg-red-50 focus:ring-red-300'
                                : 'border-gray-200 bg-white focus:ring-ministry-orange/30 focus:border-ministry-orange',
                            props.disabled ? 'bg-gray-50 opacity-60 cursor-not-allowed' : 'cursor-pointer',
                            className,
                        ].join(' ')}
                    >
                        {placeholder && (
                            <option value="" disabled>
                                {placeholder}
                            </option>
                        )}
                        {options.map(opt => (
                            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
                {hint && !error && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
            </div>
        );
    }
);
SelectInput.displayName = 'SelectInput';
export default SelectInput;
