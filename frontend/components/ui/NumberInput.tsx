import React from 'react';

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
    label: string;
    error?: string;
    hint?: string;
    /** Display mode: 'integer' (default) | 'currency' — currency shows UGX prefix */
    format?: 'integer' | 'currency';
    onChange?: (value: number) => void;
}

/**
 * NumberInput — standardised numeric field.
 * Prevents non-numeric input. Mandated by STANDARDS.md §4.
 * Currency mode shows UGX prefix.
 */
const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
    ({ label, error, hint, format = 'integer', onChange, className = '', id, value, ...props }, ref) => {
        const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
        const isCurrency = format === 'currency';

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const raw = e.target.value.replace(/,/g, '');
            const num = parseInt(raw, 10);
            if (!isNaN(num) && onChange) onChange(num);
            else if (raw === '' && onChange)  onChange(0);
        };

        const displayValue = value !== undefined && value !== null && value !== ''
            ? isCurrency
                ? Number(value).toLocaleString('en-UG')
                : String(value)
            : '';

        return (
            <div className="flex flex-col gap-1 w-full">
                <label htmlFor={inputId} className="text-sm font-semibold text-gray-700">
                    {label}
                    {props.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <div className="relative">
                    {isCurrency && (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 pointer-events-none select-none">
                            UGX
                        </span>
                    )}
                    <input
                        ref={ref}
                        id={inputId}
                        type="text"
                        inputMode="numeric"
                        value={displayValue}
                        onChange={handleChange}
                        {...props}
                        className={[
                            'w-full rounded-xl border px-4 py-2.5 text-sm text-gray-800',
                            'placeholder:text-gray-400 transition-colors',
                            'focus:outline-none focus:ring-2',
                            isCurrency ? 'pl-12' : '',
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
NumberInput.displayName = 'NumberInput';
export default NumberInput;
