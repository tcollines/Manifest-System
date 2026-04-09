import React from 'react';

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
    hint?: string;
    /** Optional left-side icon */
    icon?: React.ReactNode;
}

/**
 * TextInput — standardised text field.
 * Mandated by STANDARDS.md §4. Use this instead of raw <input>.
 */
const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
    ({ label, error, hint, icon, className = '', id, ...props }, ref) => {
        const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
        return (
            <div className="flex flex-col gap-1 w-full">
                <label htmlFor={inputId} className="text-sm font-semibold text-gray-700">
                    {label}
                    {props.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <div className="relative">
                    {icon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                            {icon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        id={inputId}
                        {...props}
                        className={[
                            'w-full rounded-xl border px-4 py-2.5 text-sm text-gray-800',
                            'placeholder:text-gray-400 transition-colors',
                            'focus:outline-none focus:ring-2',
                            icon ? 'pl-10' : '',
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
TextInput.displayName = 'TextInput';
export default TextInput;
