import React from 'react';
import PhoneInputFromLib, { isPossiblePhoneNumber, getCountryCallingCode, Country } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

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
    const [country, setCountry] = React.useState<Country>('UG');
    const [touched, setTouched] = React.useState(false);

    // Ensure value has + if missing (for correct display of legacy 256 numbers)
    const displayValue = value && !value.startsWith('+') && value.startsWith('256')
        ? `+${value}`
        : value;

    const handleChange = (val: string | undefined) => {
        // react-phone-number-input returns undefined if empty
        onChange(val || '');
    };

    // Check validity (Relaxed to isPossiblePhoneNumber)
    const isValid = displayValue ? isPossiblePhoneNumber(displayValue) : true;

    // Check if it's just the country code (incomplete)
    // We strip spaces to handle formatting like "+256 "
    const isJustCountryCode = displayValue && country && getCountryCallingCode(country) && displayValue.replace(/\s/g, '') === `+${getCountryCallingCode(country)}`;

    return (
        <div className={`phone-input-container group ${className} ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className={`
                relative flex items-center bg-white border rounded-xl overflow-hidden transition-all duration-200
                ${error || (touched && !isValid && displayValue && !isJustCountryCode)
                    ? 'border-red-500 focus-within:ring-red-200'
                    : (isValid && displayValue && !isJustCountryCode)
                        ? 'border-green-500 focus-within:border-green-500 focus-within:ring-green-200'
                        : 'border-gray-200 focus-within:border-ministry-orange focus-within:ring-4 focus-within:ring-orange-500/10'
                }
            `}>
                <PhoneInputFromLib
                    international
                    defaultCountry="UG"
                    country={country}
                    onCountryChange={setCountry}
                    value={displayValue}
                    onChange={handleChange}
                    placeholder={placeholder}
                    disabled={disabled}
                    limitMaxLength={true}
                    className="w-full px-4 py-3 bg-transparent outline-none"
                    numberInputProps={{
                        required: required,
                        disabled: disabled,
                        onBlur: () => setTouched(true),
                        className: "focus:outline-none w-full bg-transparent text-ministry-text placeholder-gray-400 font-medium"
                    }}
                />
            </div>
            {(error || (touched && !isValid && displayValue && !isJustCountryCode)) && (
                <p className="mt-1 text-xs text-red-500 font-medium ml-1">
                    {error || "Invalid phone number format"}
                </p>
            )}

            <style>{`
                .PhoneInput {
                    display: flex;
                    align-items: center;
                    width: 100%;
                }
                .PhoneInputCountry {
                    margin-right: 1rem;
                    padding-right: 1rem;
                    border-right: 1px solid #f3f4f6;
                    display: flex;
                    align-items: center;
                    position: relative;
                }
                .PhoneInputCountrySelect {
                    position: absolute;
                    top: 0;
                    left: 0;
                    height: 100%;
                    width: 100%;
                    z-index: 1;
                    border: 0;
                    opacity: 0;
                    cursor: pointer;
                }
                .PhoneInputCountryIcon {
                    width: 1.5em;
                    height: 1.0em;
                    border-radius: 2px;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
                }
                .PhoneInputCountrySelectArrow {
                    margin-left: 0.5rem;
                    opacity: 0.5;
                    border-color: currentColor;
                    color: inherit;
                }
                .PhoneInputInput {
                    flex: 1;
                    min-width: 0;
                    background-color: transparent;
                    outline: none;
                    font-size: 0.95rem;
                }
            `}</style>
        </div>
    );
};

export const validateE164 = (val: string): boolean => {
    return val ? isPossiblePhoneNumber(val) : false;
};

export default PhoneInput;
