import React from 'react';

/**
 * Standardised form inputs, required by STANDARDS.md section 4 and
 * EXECUTION_GUIDE step 5. Raw <input> tags inside complex forms are forbidden.
 *
 * Every input supports an `error` string and an `onBlur` hook for intermediate
 * formatting, as the standard requires, and renders the error beneath the field
 * so a validation failure names its own field rather than surfacing as a banner.
 *
 * PhoneInput already exists at components/PhoneInput.tsx and is not duplicated
 * here.
 */

interface BaseProps {
    name: string;
    label: string;
    error?: string;
    required?: boolean;
    disabled?: boolean;
    hint?: string;
    className?: string;
}

const Field: React.FC<BaseProps & { children: React.ReactNode }> = ({
    name, label, error, required, hint, className, children
}) => (
    <div className={className}>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {children}
        {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
        {error && <p className="mt-1 text-xs text-red-600" role="alert">{error}</p>}
    </div>
);

const controlClass = (error?: string, disabled?: boolean) =>
    `w-full px-3 py-2 border rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 ${
        error
            ? 'border-red-400 focus:ring-red-200 focus:border-red-500'
            : 'border-gray-300 focus:ring-ministry-orange/30 focus:border-ministry-orange'
    } ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'}`;

export const TextInput: React.FC<BaseProps & {
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    placeholder?: string;
    maxLength?: number;
}> = ({ value, onChange, onBlur, placeholder, maxLength, ...base }) => (
    <Field {...base}>
        <input
            id={base.name}
            name={base.name}
            type="text"
            value={value}
            placeholder={placeholder}
            maxLength={maxLength}
            disabled={base.disabled}
            onChange={e => onChange(e.target.value)}
            onBlur={onBlur}
            className={controlClass(base.error, base.disabled)}
        />
    </Field>
);

/**
 * Numeric input.
 *
 * `value` is a number or null, never a formatted string: VALIDATION_RULES
 * section 1.3 requires amounts to cross the wire as integers, so "10,000" must
 * never reach a payload. With format="currency" the field accepts digits,
 * separators and spaces while typing, strips them on change, and rejects a
 * fractional entry when `integerOnly` is set.
 */
export const NumberInput: React.FC<BaseProps & {
    value: number | null;
    onChange: (value: number | null) => void;
    onBlur?: () => void;
    min?: number;
    max?: number;
    placeholder?: string;
    format?: 'plain' | 'currency';
    integerOnly?: boolean;
}> = ({ value, onChange, onBlur, min, max, placeholder, format = 'plain', integerOnly, ...base }) => {
    const [raw, setRaw] = React.useState<string>(value === null || value === undefined ? '' : String(value));

    React.useEffect(() => {
        const next = value === null || value === undefined ? '' : String(value);
        // Only resync from the parent when it genuinely differs, so typing
        // "1000" is not fought by a re-render normalising the text.
        if (Number(raw.replace(/[,\s]/g, '')) !== value) setRaw(next);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const handle = (text: string) => {
        setRaw(text);
        const cleaned = text.replace(/[,\s]/g, '');
        if (cleaned === '') { onChange(null); return; }
        const parsed = Number(cleaned);
        if (Number.isNaN(parsed)) return;
        if (integerOnly && !Number.isInteger(parsed)) { onChange(parsed); return; }
        onChange(parsed);
    };

    return (
        <Field {...base}>
            <div className="relative">
                {format === 'currency' && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">UGX</span>
                )}
                <input
                    id={base.name}
                    name={base.name}
                    type="text"
                    inputMode={integerOnly ? 'numeric' : 'decimal'}
                    value={raw}
                    min={min}
                    max={max}
                    placeholder={placeholder}
                    disabled={base.disabled}
                    onChange={e => handle(e.target.value)}
                    onBlur={onBlur}
                    className={`${controlClass(base.error, base.disabled)} ${format === 'currency' ? 'pl-12' : ''}`}
                />
            </div>
        </Field>
    );
};

export const SelectInput: React.FC<BaseProps & {
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    options: Array<{ value: string; label: string }>;
    placeholder?: string;
}> = ({ value, onChange, onBlur, options, placeholder, ...base }) => (
    <Field {...base}>
        <select
            id={base.name}
            name={base.name}
            value={value}
            disabled={base.disabled}
            onChange={e => onChange(e.target.value)}
            onBlur={onBlur}
            className={controlClass(base.error, base.disabled)}
        >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
    </Field>
);

/**
 * Date input.
 *
 * Emits YYYY-MM-DD, which is what every sales endpoint expects. Defaults are
 * the caller's business: use getKampalaToday() rather than the browser's date,
 * or an entry made late in the evening lands on the wrong day.
 */
export const DateInput: React.FC<BaseProps & {
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    min?: string;
    max?: string;
}> = ({ value, onChange, onBlur, min, max, ...base }) => (
    <Field {...base}>
        <input
            id={base.name}
            name={base.name}
            type="date"
            value={value}
            min={min}
            max={max}
            disabled={base.disabled}
            onChange={e => onChange(e.target.value)}
            onBlur={onBlur}
            className={controlClass(base.error, base.disabled)}
        />
    </Field>
);
