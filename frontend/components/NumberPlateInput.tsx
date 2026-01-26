import React, { useState, useRef } from 'react';

interface NumberPlateInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    required?: boolean;
}

// Regex Patterns for Validation
const PATTERNS = {
    // New Digital (2026+)
    NEW_PRIVATE: /^U[A-Z]\s\d{3}[A-Z]{2}$/,       // UA 001AA -> UB 001AA
    NEW_MOTO: /^UM[A-Z]\s\d{3}[A-Z]{2}$/,         // UMA 001AA -> UMB 001AA
    NEW_TRAILER: /^T\sU[A-Z]\s\d{3}[A-Z]{2}$/,    // T UA 001AA -> T UB 001AA
    NEW_GOVT: /^UG\s\d{2}\s\d{5}$/,               // UG 32 00042

    // Existing / Outgoing
    OLD_PRIVATE: /^U[A-L][A-Z]\s\d{3}[A-Z]$/, // UAA - ULZ
    OLD_GOVT: /^UG\s\d{4}[A-Z]$/,             // UG 0123A
    DIPLOMATIC: /^CD\s\d{2}-\d{3}[A-Z]$/,     // CD 01-700U
    DUTY_FREE: /^EX\s\d{5}$/,                 // EX 12345
};

const NumberPlateInput: React.FC<NumberPlateInputProps> = ({ value, onChange, placeholder = "UA 001AA", className, required }) => {
    const [plateType, setPlateType] = useState<string | null>(null);
    const [touched, setTouched] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-Format Logic
    const formatInput = (input: string) => {
        let clean = input.toUpperCase().replace(/[^A-Z0-9]/g, ''); // Strip non-alphanumeric
        let formatted = clean;

        // Trailer: T U[A-Z] ...
        if (clean.startsWith('T')) {
            if (clean.length > 3 && clean.startsWith('TU')) {
                formatted = `T ${clean.slice(1, 3)} ${clean.slice(3, 6)}${clean.slice(6)}`;
            } else if (clean.length > 1 && clean.startsWith('TU')) {
                formatted = `T ${clean.slice(1)}`;
            } else {
                // Just T... wait for U
                formatted = `T ${clean.slice(1)}`;
            }
        }
        // Moto: UM[A-Z] ...
        else if (clean.startsWith('UM')) {
            if (clean.length > 3) formatted = `${clean.slice(0, 3)} ${clean.slice(3, 6)}${clean.slice(6)}`;
            // else just UM... or UMA...
        }
        else if (clean.startsWith('UG')) {
            // Distinguish between Govt (UG + Digits) and Old Private Series (UG + Letter, e.g. UGA, UGR)
            const isPrivateSeries = clean.length > 2 && /[A-Z]/.test(clean[2]);

            if (isPrivateSeries) {
                // Formatting for Private Series: UGR 123A (Space after 3rd char)
                if (clean.length > 3) formatted = `${clean.slice(0, 3)} ${clean.slice(3, 6)}${clean.slice(6)}`;
            } else {
                // Formatting for Govt: UG 0123... (Space after 2nd char)
                if (clean.length >= 4) {
                    if (clean.length > 7) formatted = `UG ${clean.slice(2, 4)} ${clean.slice(4, 9)}`;
                    else if (clean.length === 7 && /[A-Z]/.test(clean[6])) formatted = `UG ${clean.slice(2, 6)}${clean.slice(6)}`;
                    else formatted = `UG ${clean.slice(2)}`;
                } else formatted = `UG ${clean.slice(2)}`;
            }
        }
        // New Private: U[A-Z] ... (e.g. UA, UB) CHECK 3rd char
        // AND Old Private: U[A-L][A-Z] ...
        else if (clean.startsWith('U')) {
            if (clean.length > 2) {
                // Check 3rd char to decide formatting
                const thirdChar = clean[2];
                if (/\d/.test(thirdChar)) {
                    // New Private: UB 001 AA -> Space after 2nd char
                    if (clean.length > 2) formatted = `${clean.slice(0, 2)} ${clean.slice(2, 5)}${clean.slice(5)}`;
                } else {
                    // Old Private: UBA 001 A -> Space after 3rd char
                    if (clean.length > 3) formatted = `${clean.slice(0, 3)} ${clean.slice(3, 6)}${clean.slice(6)}`;
                }
            }
        }
        else if (clean.startsWith('CD')) {
            if (clean.length > 4) formatted = `CD ${clean.slice(2, 4)}-${clean.slice(4)}`;
            else if (clean.length > 2) formatted = `CD ${clean.slice(2)}`;
        }
        else if (clean.startsWith('EX')) {
            if (clean.length > 2) formatted = `EX ${clean.slice(2)}`;
        }

        return formatted.trim();
    };

    const detectType = (val: string) => {
        if (PATTERNS.NEW_PRIVATE.test(val)) return "Private Vehicle (New)";
        if (PATTERNS.NEW_MOTO.test(val)) return "Motorcycle (New)";
        if (PATTERNS.NEW_TRAILER.test(val)) return "Trailer (New)";
        if (PATTERNS.NEW_GOVT.test(val)) return "Government (New)";
        if (PATTERNS.OLD_PRIVATE.test(val)) return "Private Vehicle (Old)";
        if (PATTERNS.OLD_GOVT.test(val)) return "Government (Old)";
        if (PATTERNS.DIPLOMATIC.test(val)) return "Diplomatic";
        if (PATTERNS.DUTY_FREE.test(val)) return "Duty Free";
        if (val.length > 3 && !val.includes(' ') && val.length < 10) return "Personalized / Foreign";
        return null;
    };

    // Helper to validate character at specific position based on detected prefix
    const validateNextChar = (current: string, nextChar: string): { valid: boolean; error?: string } => {
        const clean = current.replace(/[\s-]/g, '') + nextChar.toUpperCase();

        // 1. Motorcycle: UM[A-Z] + 3 Digits + 2 Letters
        if (clean.startsWith('UM')) {
            const index = clean.length - 1;
            // 0-1: UM
            if (index < 2) return { valid: true };

            // 2: Letter (Series A-Z)
            if (index === 2) {
                if (!/[A-Z]/.test(nextChar.toUpperCase())) return { valid: false, error: "Expected a letter (Series)" };
            }

            // 3-5: Digits
            if (index >= 3 && index <= 5) {
                if (!/\d/.test(nextChar)) return { valid: false, error: "Expected a number" };
            }
            // 6-7: Letters
            if (index >= 6 && index <= 7) {
                if (!/[A-Z]/.test(nextChar.toUpperCase())) return { valid: false, error: "Expected a letter" };
            }
            if (index > 7) return { valid: false, error: "Maximum length reached for Motorcycle" };
        }

        // 2. Trailer: T U[A-Z] + 3 Digits + 2 Letters
        else if (clean.startsWith('TU')) {
            const index = clean.length - 1;
            // 0-1: TU
            if (index < 2) return { valid: true };

            // 2: Letter (Series A-Z)
            if (index === 2) {
                if (!/[A-Z]/.test(nextChar.toUpperCase())) return { valid: false, error: "Expected a letter (Series)" };
            }

            // 3-5: Digits
            if (index >= 3 && index <= 5) {
                if (!/\d/.test(nextChar)) return { valid: false, error: "Expected a number" };
            }
            // 6-7: Letters
            if (index >= 6 && index <= 7) {
                if (!/[A-Z]/.test(nextChar.toUpperCase())) return { valid: false, error: "Expected a letter" };
            }
            if (index > 7) return { valid: false, error: "Maximum length reached" };
        } else if (clean.startsWith('T')) {
            // Checking T only
            if (clean.length === 1) return { valid: true }; // T allowed
            if (clean.length === 2 && nextChar.toUpperCase() !== 'U') return { valid: false, error: "Expected 'U' after 'T'" };
        }

        // 3. New Govt: UG + ... (Same as before)
        else if (clean.startsWith('UG')) {
            // Logic mostly identical to original to differentiate Old Private UG...
            const index = clean.length - 1;
            if (index < 2) return { valid: true };

            // Check Index 2 (3rd char) for Branch
            const thirdChar = clean[2];
            const isOldPrivateSeries = /[A-Z]/.test(thirdChar);

            if (isOldPrivateSeries) { // UG[Letter]... -> Old Private
                if (index === 2) {
                    if (!/[A-Z]/.test(nextChar.toUpperCase())) return { valid: false, error: "Expected letter (Private) or digit (Govt)" };
                }
                if (index >= 3 && index <= 5) { // 3 Digits
                    if (!/\d/.test(nextChar)) return { valid: false, error: "Expected a digit" };
                }
                if (index === 6) { // 1 Letter
                    if (!/[A-Z]/.test(nextChar.toUpperCase())) return { valid: false, error: "Expected a letter" };
                }
                if (index > 6) return { valid: false, error: "Max length reached" };
                return { valid: true };
            }

            // Govt Logic (UG + Digit...)
            if (index >= 2 && index <= 3) { // 2-3 are Digits
                if (index === 2) {
                    // Branch point check
                    const isLetter = /[A-Z]/.test(nextChar.toUpperCase());
                    const isDigit = /\d/.test(nextChar);
                    if (!isLetter && !isDigit) return { valid: false, error: "Expected digit (Govt) or letter (Private)" };
                    return { valid: true };
                }
                if (!/\d/.test(nextChar)) return { valid: false, error: "Expected a digit" };
            }

            // 4-5: Digits
            if (index >= 4 && index <= 5) {
                if (!/\d/.test(nextChar)) return { valid: false, error: "Expected a digit" };
            }

            // Index 6: Branch Old Govt (Letter) vs New Govt (Digit)
            if (index === 6) {
                const isLetter = /[A-Z]/.test(nextChar.toUpperCase());
                const isDigit = /\d/.test(nextChar);
                if (!isLetter && !isDigit) return { valid: false, error: "Expected digit (New) or letter (Old)" };
            }

            // Index 7-8: Digits (New Govt)
            if (index >= 7 && index <= 8) {
                if (/[A-Z]/.test(clean[6])) return { valid: false, error: "Max length for Old Govt reached" };
                if (!/\d/.test(nextChar)) return { valid: false, error: "Expected a digit for New Govt" };
            }
            if (index > 8) return { valid: false, error: "Max length reached" };
        }

        // 4. New Private vs Old Private (Starting with U)
        // clean starts with U...
        else if (clean.startsWith('U')) {
            const index = clean.length - 1;
            if (index < 1) return { valid: true };

            // Index 1 (2nd char): U[X]
            if (index === 1) {
                const char = nextChar.toUpperCase();
                // Valid 2nd chars:
                // New Private: A-Z (e.g. UA, UB, UC)
                // Old Private: A-L (e.g. UAA, ULA)
                // New Moto: M (Handling UM separately above caught it? Yes, startsWith('UM') catches it first IF order matters.
                // Order check: 'UM' is caught above. So here 'U' + 'M' is effectively unreachable unless logic falls through.
                // BUT wait, 'UM' block catches clean.startsWith('UM').
                // If I type 'U', next is 'M', clean becomes 'UM'. startsWith('UM') is true.
                // Does this block execute? No, it's 'else if'.
                // SO 'UM' is safe.

                // Allow A-Z here basically.
                if (!/[A-Z]/.test(char)) return { valid: false, error: "Expected a letter" };
            }

            // Index 2 (3rd char): U X [Y]
            // Branch point for New vs Old Private
            if (index === 2) {
                const isDigit = /\d/.test(nextChar); // New Private: U B 0...
                const isLetter = /[A-Z]/.test(nextChar.toUpperCase()); // Old Private: U B A...

                if (!isDigit && !isLetter) return { valid: false, error: "Expected digit (New) or letter (Old)" };
                return { valid: true };
            }

            // Check Path based on 3rd char
            const isNewPath = /\d/.test(clean[2]);

            if (isNewPath) { // New Private: U X 0...
                // 3-4: Digits (index 2 was digit, so index 3,4 must be digits. Total 3 digits: 2,3,4)
                if (index >= 3 && index <= 4) {
                    if (!/\d/.test(nextChar)) return { valid: false, error: "Expected a digit" };
                }
                // 5-6: Letters
                if (index >= 5 && index <= 6) {
                    if (!/[A-Z]/.test(nextChar.toUpperCase())) return { valid: false, error: "Expected a letter" };
                }
                if (index > 6) return { valid: false, error: "Max length reached" };

            } else { // Old Private: U X L ...
                // 3-5: Digits (index 2 was letter. 3,4,5 are digits)
                if (index >= 3 && index <= 5) {
                    if (!/\d/.test(nextChar)) return { valid: false, error: "Expected a digit" };
                }
                // 6: Letter
                if (index === 6) {
                    if (!/[A-Z]/.test(nextChar.toUpperCase())) return { valid: false, error: "Expected a letter" };
                }
                if (index > 6) return { valid: false, error: "Max length reached" };
            }
        }

        else if (clean.startsWith('CD')) {
            // ... existing CD logic
            const index = clean.length - 1;
            if (index < 2) return { valid: true };
            if (index >= 2 && index <= 6) {
                if (!/\d/.test(nextChar)) return { valid: false, error: "Expected a digit" };
            }
            if (index === 7) {
                if (!/[A-Z]/.test(nextChar.toUpperCase())) return { valid: false, error: "Expected a letter" };
            }
            if (index > 7) return { valid: false, error: "Max length reached" };
        }
        else if (clean.startsWith('EX')) {
            // ... existing EX logic
            const index = clean.length - 1;
            if (index < 2) return { valid: true };
            if (index >= 2 && index <= 6) {
                if (!/\d/.test(nextChar)) return { valid: false, error: "Expected a digit" };
            }
            if (index > 6) return { valid: false, error: "Max length reached" };
        }

        return { valid: true };
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.toUpperCase();
        const lastChar = rawValue.slice(-1);
        const isDelete = rawValue.length < value.length;

        // If deleting, just allow it and reformat
        if (isDelete) {
            const formatted = formatInput(rawValue);
            setPlateType(detectType(formatted));
            setErrorMsg(null);
            onChange(formatted);
            return;
        }

        // Validate the NEW character against the current context
        // pass rawValue but we need to check strict logic against *formatted* concept or clean concept
        // My validateNextChar uses "Clean" logic.

        // Pass the *previous* value + new char? 
        // rawValue is exactly that.

        const validation = validateNextChar(value.replace(/[^A-Z0-9]/g, ''), lastChar);
        if (!validation.valid && value.length > 0) { // Only strict check if not empty start
            // Reject input
            setErrorMsg(validation.error || "Invalid character for this format");
            // Trigger shake or visual feedback?
            setTouched(true);
            return;
        }

        setErrorMsg(null);
        const formatted = formatInput(rawValue);
        setPlateType(detectType(formatted));
        onChange(formatted);
    };

    const isValid = plateType !== null || (value.length > 0 && detectType(value) !== null);

    return (
        <div className="w-full">
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={handleChange}
                    onBlur={() => setTouched(true)}
                    className={`w-full p-3 border rounded-xl font-mono uppercase tracking-widest text-lg bg-white outline-none transition-all ${errorMsg ? 'border-red-500 bg-red-50' :
                        touched && !isValid ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-ministry-orange'
                        } ${className}`}
                    placeholder={placeholder}
                    required={required}
                />
                {/* Validation Indicator */}
                {value.length > 0 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        {isValid ? <span className="text-xl">🇺🇬</span> : (touched && <span className="text-red-500 font-bold">?</span>)}
                    </div>
                )}
            </div>

            {/* Error or Type Label */}
            <div className="flex justify-between mt-1 h-5">
                {errorMsg ? (
                    <span className="text-xs font-bold text-red-500 animate-pulse">{errorMsg}</span>
                ) : (
                    <span className={`text-[10px] font-bold uppercase transition-opacity duration-300 ${plateType ? 'opacity-100' : 'opacity-0'} ${plateType?.includes('Government') ? 'text-red-600' :
                        plateType?.includes('Diplomatic') ? 'text-blue-600' :
                            'text-gray-500'
                        }`}>
                        {plateType}
                    </span>
                )}
            </div>
        </div>
    );
};

export default NumberPlateInput;
