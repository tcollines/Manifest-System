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
    NEW_PRIVATE: /^UA\s\d{3}[A-Z]{2}$/,       // UA 001AA
    NEW_MOTO: /^UMA\s\d{3}[A-Z]{2}$/,         // UMA 001AA
    NEW_TRAILER: /^T\sUA\s\d{3}[A-Z]{2}$/,    // T UA 001AA
    NEW_GOVT: /^UG\s\d{2}\s\d{5}$/,           // UG 32 00042

    // Existing / Outgoing
    OLD_PRIVATE: /^U[A-B][A-Z]\s\d{3}[A-Z]$/, // UAA - UBZ (Never reached UCA)
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

        if (clean.startsWith('TUA')) {
            if (clean.length > 3) formatted = `T UA ${clean.slice(3, 6)}${clean.slice(6)}`;
            else if (clean.length > 1) formatted = `T UA ${clean.slice(3)}`;
            else formatted = `T ${clean.slice(1)}`;
        }
        else if (clean.startsWith('UMA')) {
            if (clean.length > 3) formatted = `UMA ${clean.slice(3, 6)}${clean.slice(6)}`;
            else formatted = `UMA ${clean.slice(3)}`;
        }
        else if (clean.startsWith('UG')) {
            if (clean.length >= 4) {
                if (clean.length > 7) formatted = `UG ${clean.slice(2, 4)} ${clean.slice(4, 9)}`;
                else if (clean.length === 7 && /[A-Z]/.test(clean[6])) formatted = `UG ${clean.slice(2, 6)}${clean.slice(6)}`;
                else formatted = `UG ${clean.slice(2)}`;
            } else formatted = `UG ${clean.slice(2)}`;
        }
        else if (clean.startsWith('UA')) {
            if (clean.length > 2) {
                if (/\d/.test(clean[2])) formatted = `UA ${clean.slice(2, 5)}${clean.slice(5)}`;
                else formatted = `${clean.slice(0, 3)} ${clean.slice(3, 6)}${clean.slice(6)}`;
            } else formatted = clean;
        }
        else if (clean.startsWith('U')) {
            if (clean.length > 3) formatted = `${clean.slice(0, 3)} ${clean.slice(3, 6)}${clean.slice(6)}`;
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

        // 1. Motorcycle: UMA + 3 Digits + 2 Letters
        if (clean.startsWith('UMA')) {
            const index = clean.length - 1;
            if (index < 3) return { valid: true };
            if (index >= 3 && index <= 5) {
                if (!/\d/.test(nextChar)) return { valid: false, error: "Expected a number (e.g. UMA 0...)" };
            }
            if (index >= 6 && index <= 7) {
                if (!/[A-Z]/.test(nextChar.toUpperCase())) return { valid: false, error: "Expected a letter (e.g. ...AA)" };
            }
            if (index > 7) return { valid: false, error: "Maximum length reached for Motorcycle" };
        }

        // 2. Trailer: T UA + 3 Digits + 2 Letters
        else if (clean.startsWith('TUA')) {
            const index = clean.length - 1;
            if (index < 3) return { valid: true };
            if (index >= 3 && index <= 5) {
                if (!/\d/.test(nextChar)) return { valid: false, error: "Expected a number" };
            }
            if (index >= 6 && index <= 7) {
                if (!/[A-Z]/.test(nextChar.toUpperCase())) return { valid: false, error: "Expected a letter" };
            }
            if (index > 7) return { valid: false, error: "Maximum length reached" };
        }

        // 3. New Govt: UG + 2 Digits + 5 Digits (Total 9 chars: UG3200042)
        // OR Old Govt: UG + 4 Digits + 1 Letter (Total 7 chars: UG0123A)
        else if (clean.startsWith('UG')) {
            const index = clean.length - 1;

            // 0-1: UG
            if (index < 2) return { valid: true };

            // 2-3: Digits always (common to both)
            // Clean: UG32... or UG01...
            if (index >= 2 && index <= 3) {
                if (!/\d/.test(nextChar)) return { valid: false, error: "Expected a digit" };
            }

            // 4-5: 
            // If Old Govt: index 4 is Digit (5th digit). Index 5 is ignored? No, Old is UG + 4digits + Letter
            // Wait: Old Govt = U(0)G(1) D(2)D(3)D(4)D(5) L(6)
            // New Govt = U(0)G(1) D(2)D(3) D(4)D(5)D(6)D(7)D(8)

            // So 2-5 are digits for Old. 2-8 are digits for New.
            // Conflict at index 6: Old expects Letter, New expects Digit.

            if (index >= 2 && index <= 5) {
                if (!/\d/.test(nextChar)) return { valid: false, error: "Expected a digit" };
            }

            // At index 6 (7th char)
            if (index === 6) {
                // Could be Letter (Old end) or Digit (New continue)
                const isLetter = /[A-Z]/.test(nextChar.toUpperCase());
                const isDigit = /\d/.test(nextChar);

                if (!isLetter && !isDigit) return { valid: false, error: "Expected a digit (New) or letter (Old)" };

                // Note: If they type Letter, they are done (Old). 
                // If they type Digit, they must continue (New).
            }

            // Index 7-8: Must be Digits (New Govt only)
            if (index >= 7 && index <= 8) {
                // If previous char was Letter (Old Govt), we shouldn't be here (max length check would catch it if we strictly enforced type logic, but here we dynamically validate)
                // But wait, if index 6 was Letter, can they type index 7?
                // If index 6 letter -> Old Govt Detected. Max Length is 7.
                // We should check 'current' state?
                if (/[A-Z]/.test(clean[6])) {
                    return { valid: false, error: "Max length for Old Govt reached" };
                }
                if (!/\d/.test(nextChar)) return { valid: false, error: "Expected a digit for New Govt" };
            }

            if (index > 8) return { valid: false, error: "Max length reached" };
        }

        // 4. New Private: UA + 3 Digits + 2 Letters -> UA001AA
        // Clean: UA001AA (Length 7)
        // clean starts with UA. But NOT UMA.
        else if (clean.startsWith('UA') && !clean.startsWith('UAA') && !clean.startsWith('UAB') && !clean.startsWith('UAC')) {
            const index = clean.length - 1;

            // 0-1: UA
            if (index < 2) return { valid: true };

            // Special Check: Is this actually Old Private starting with UA? e.g. UAA...
            // If index 2 is Letter -> Old Private pattern.
            // If index 2 is Digit -> New Private pattern.

            if (index === 2) {
                // Allow Digit or Letter.
                const isLetter = /[A-Z]/.test(nextChar.toUpperCase());
                const isDigit = /\d/.test(nextChar);
                if (!isLetter && !isDigit) return { valid: false, error: "Expected digit (New) or letter (Old)" };
                return { valid: true };
            }

            // If index > 2, check what path we are on.
            const isNewPath = /\d/.test(clean[2]); // 3rd char was digit

            if (isNewPath) { // UA 001 AA
                // 2-4: Digits
                if (index >= 2 && index <= 4) {
                    if (!/\d/.test(nextChar)) return { valid: false, error: "Expected a digit" };
                }
                // 5-6: Letters
                if (index >= 5 && index <= 6) {
                    if (!/[A-Z]/.test(nextChar.toUpperCase())) return { valid: false, error: "Expected a letter" };
                }
                if (index > 6) return { valid: false, error: "Max length reached" };
            } else {
                // Old Private Path handled by generic 'U' block if we let it fall through?
                // But clean.startsWith('UA') catches it. So validNextChar must handle UAA here.
                // Old Private: U + 2 Letters + 3 Digits + 1 Letter (Total 7: UAA 001 A -> UAA001A)

                // 2: Letter (Already checked above)
                // 3-5: Digits
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

        // 5. Diplomatic: CD + 2 Digits + 3 Digits + 1 Letter
        // Total 8 chars: CD01700U
        else if (clean.startsWith('CD')) {
            const index = clean.length - 1;
            // 0-1: CD
            if (index < 2) return { valid: true };
            // 2-6: Digits (5 digits total)
            if (index >= 2 && index <= 6) {
                if (!/\d/.test(nextChar)) return { valid: false, error: "Expected a digit" };
            }
            // 7: Letter
            if (index === 7) {
                if (!/[A-Z]/.test(nextChar.toUpperCase())) return { valid: false, error: "Expected a letter" };
            }
            if (index > 7) return { valid: false, error: "Max length reached" };
        }

        // 6. Duty Free: EX + 5 Digits -> EX12345 (7 chars)
        else if (clean.startsWith('EX')) {
            const index = clean.length - 1;
            // 0-1: EX
            if (index < 2) return { valid: true };
            // 2-6: Digits
            if (index >= 2 && index <= 6) {
                if (!/\d/.test(nextChar)) return { valid: false, error: "Expected a digit" };
            }
            if (index > 6) return { valid: false, error: "Max length reached" };
        }

        // 7. Generic Old Private (U...) that is not UA...
        // e.g. UBB 001 A -> UBB001A
        else if (clean.startsWith('U')) {
            const index = clean.length - 1;
            // 0: U
            if (index < 1) return { valid: true };

            // 1: Second Char must be A or B (Old Private) OR M (Motorcycle)
            if (index === 1) {
                const char = nextChar.toUpperCase();
                const isOldPrivate = /[A-B]/.test(char);
                const isMoto = char === 'M';

                if (!isOldPrivate && !isMoto) return { valid: false, error: "Expected 'A', 'B' (Old Private) or 'M' (Motorcycle)" };
            }

            // 2: Third Char
            if (index === 2) {
                // If previous was M (clean[1] == 'M'), this MUST be A
                if (clean[1] === 'M') {
                    if (nextChar.toUpperCase() !== 'A') return { valid: false, error: "Expected 'A' to complete 'UMA'" };
                } else {
                    // Old Private: Any letter
                    if (!/[A-Z]/.test(nextChar.toUpperCase())) return { valid: false, error: "Expected a letter" };
                }
            }
            // 3-5: Digits
            if (index >= 3 && index <= 5) {
                if (!/\d/.test(nextChar)) return { valid: false, error: "Expected a digit" };
            }
            // 6: Letter
            if (index === 6) {
                if (!/[A-Z]/.test(nextChar.toUpperCase())) return { valid: false, error: "Expected a letter" };
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
