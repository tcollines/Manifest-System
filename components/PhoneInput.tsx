import React from 'react';
import { Phone } from 'lucide-react';

interface PhoneInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    required?: boolean;
    className?: string;
    disabled?: boolean;
    error?: string;
}

const PhoneInput: React.FC<PhoneInputProps> = ({ value, onChange, placeholder = "Enter phone number", required = false, className, disabled, error }) => {
    const [touched, setTouched] = React.useState(false);

    // Basic Logic: Allow typing, but maybe format on blur?
    // For now, just a controlled input.

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        onChange(val);
    };

    // Simple validation for display
    const isValid = !value || /^[+]?[\d\s-]{10,15}$/.test(value.trim());

    return (
        <div className={`phone-input-container group ${className} ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className={`
                relative flex items-center bg-white border rounded-xl overflow-hidden transition-all duration-200
                ${error || (touched && !isValid) ? 'border-red-500 focus-within:ring-red-200' : 'border-gray-200 focus-within:border-ministry-orange focus-within:ring-4 focus-within:ring-orange-500/10'}
            `}>
                <div className="pl-4 pr-2 text-gray-400">
                    <Phone className="w-5 h-5" />
                </div>
                <input
                    type="tel"
                    value={value || ''}
                    onChange={handleChange}
                    onBlur={() => setTouched(true)}
                    placeholder={placeholder}
                    required={required}
                    disabled={disabled}
                    className="w-full px-2 py-3 bg-transparent outline-none text-ministry-text placeholder-gray-400 font-medium"
                />
            </div>
            {(error || (touched && !isValid)) && (
                <p className="mt-1 text-xs text-red-500 font-medium ml-1">
                    {error || "Invalid phone number format"}
                </p>
            )}
        </div>
    );
};

export const validateE164 = (val: string): boolean => {
    // Simple regex for E.164-ish
    return /^\+?[1-9]\d{1,14}$/.test(val);
};

export default PhoneInput;
