import React, { useState, useRef, useEffect } from 'react';
import { CheckCircle2, ChevronDown, Search, X } from 'lucide-react';

// ─── Country data: { code, name, flag emoji, dialCode, digits (local number length) }
// digits = expected local subscriber number length (after country code)
export interface CountryEntry {
  code: string;
  name: string;
  flag: string;
  dial: string;
  digits: number; // exact local number length
}

export const COUNTRIES: CountryEntry[] = [
  // Africa
  { code: 'ZA', name: 'South Africa',       flag: '🇿🇦', dial: '+27',  digits: 9  },
  { code: 'KE', name: 'Kenya',               flag: '🇰🇪', dial: '+254', digits: 9  },
  { code: 'NG', name: 'Nigeria',             flag: '🇳🇬', dial: '+234', digits: 10 },
  { code: 'GH', name: 'Ghana',               flag: '🇬🇭', dial: '+233', digits: 9  },
  { code: 'ET', name: 'Ethiopia',            flag: '🇪🇹', dial: '+251', digits: 9  },
  { code: 'TZ', name: 'Tanzania',            flag: '🇹🇿', dial: '+255', digits: 9  },
  { code: 'UG', name: 'Uganda',              flag: '🇺🇬', dial: '+256', digits: 9  },
  { code: 'ZW', name: 'Zimbabwe',            flag: '🇿🇼', dial: '+263', digits: 9  },
  { code: 'ZM', name: 'Zambia',              flag: '🇿🇲', dial: '+260', digits: 9  },
  { code: 'BW', name: 'Botswana',            flag: '🇧🇼', dial: '+267', digits: 8  },
  { code: 'NA', name: 'Namibia',             flag: '🇳🇦', dial: '+264', digits: 9  },
  { code: 'MW', name: 'Malawi',              flag: '🇲🇼', dial: '+265', digits: 9  },
  { code: 'MZ', name: 'Mozambique',          flag: '🇲🇿', dial: '+258', digits: 9  },
  { code: 'RW', name: 'Rwanda',              flag: '🇷🇼', dial: '+250', digits: 9  },
  { code: 'SN', name: 'Senegal',             flag: '🇸🇳', dial: '+221', digits: 9  },
  { code: 'CI', name: "Côte d'Ivoire",      flag: '🇨🇮', dial: '+225', digits: 10 },
  { code: 'CM', name: 'Cameroon',            flag: '🇨🇲', dial: '+237', digits: 9  },
  { code: 'MA', name: 'Morocco',             flag: '🇲🇦', dial: '+212', digits: 9  },
  { code: 'DZ', name: 'Algeria',             flag: '🇩🇿', dial: '+213', digits: 9  },
  { code: 'TN', name: 'Tunisia',             flag: '🇹🇳', dial: '+216', digits: 8  },
  { code: 'EG', name: 'Egypt',               flag: '🇪🇬', dial: '+20',  digits: 10 },
  { code: 'AO', name: 'Angola',              flag: '🇦🇴', dial: '+244', digits: 9  },
  { code: 'CD', name: 'DR Congo',            flag: '🇨🇩', dial: '+243', digits: 9  },
  // Americas
  { code: 'US', name: 'United States',       flag: '🇺🇸', dial: '+1',   digits: 10 },
  { code: 'CA', name: 'Canada',              flag: '🇨🇦', dial: '+1',   digits: 10 },
  { code: 'MX', name: 'Mexico',              flag: '🇲🇽', dial: '+52',  digits: 10 },
  { code: 'BR', name: 'Brazil',              flag: '🇧🇷', dial: '+55',  digits: 11 },
  { code: 'AR', name: 'Argentina',           flag: '🇦🇷', dial: '+54',  digits: 10 },
  { code: 'CO', name: 'Colombia',            flag: '🇨🇴', dial: '+57',  digits: 10 },
  { code: 'CL', name: 'Chile',               flag: '🇨🇱', dial: '+56',  digits: 9  },
  { code: 'PE', name: 'Peru',                flag: '🇵🇪', dial: '+51',  digits: 9  },
  // Europe
  { code: 'GB', name: 'United Kingdom',      flag: '🇬🇧', dial: '+44',  digits: 10 },
  { code: 'DE', name: 'Germany',             flag: '🇩🇪', dial: '+49',  digits: 11 },
  { code: 'FR', name: 'France',              flag: '🇫🇷', dial: '+33',  digits: 9  },
  { code: 'IT', name: 'Italy',               flag: '🇮🇹', dial: '+39',  digits: 10 },
  { code: 'ES', name: 'Spain',               flag: '🇪🇸', dial: '+34',  digits: 9  },
  { code: 'PT', name: 'Portugal',            flag: '🇵🇹', dial: '+351', digits: 9  },
  { code: 'NL', name: 'Netherlands',         flag: '🇳🇱', dial: '+31',  digits: 9  },
  { code: 'BE', name: 'Belgium',             flag: '🇧🇪', dial: '+32',  digits: 9  },
  { code: 'CH', name: 'Switzerland',         flag: '🇨🇭', dial: '+41',  digits: 9  },
  { code: 'SE', name: 'Sweden',              flag: '🇸🇪', dial: '+46',  digits: 9  },
  { code: 'NO', name: 'Norway',              flag: '🇳🇴', dial: '+47',  digits: 8  },
  { code: 'DK', name: 'Denmark',             flag: '🇩🇰', dial: '+45',  digits: 8  },
  { code: 'PL', name: 'Poland',              flag: '🇵🇱', dial: '+48',  digits: 9  },
  { code: 'RU', name: 'Russia',              flag: '🇷🇺', dial: '+7',   digits: 10 },
  // Middle East
  { code: 'AE', name: 'UAE',                 flag: '🇦🇪', dial: '+971', digits: 9  },
  { code: 'SA', name: 'Saudi Arabia',        flag: '🇸🇦', dial: '+966', digits: 9  },
  { code: 'QA', name: 'Qatar',               flag: '🇶🇦', dial: '+974', digits: 8  },
  { code: 'KW', name: 'Kuwait',              flag: '🇰🇼', dial: '+965', digits: 8  },
  { code: 'IL', name: 'Israel',              flag: '🇮🇱', dial: '+972', digits: 9  },
  { code: 'TR', name: 'Turkey',              flag: '🇹🇷', dial: '+90',  digits: 10 },
  // Asia
  { code: 'IN', name: 'India',               flag: '🇮🇳', dial: '+91',  digits: 10 },
  { code: 'PK', name: 'Pakistan',            flag: '🇵🇰', dial: '+92',  digits: 10 },
  { code: 'BD', name: 'Bangladesh',          flag: '🇧🇩', dial: '+880', digits: 10 },
  { code: 'CN', name: 'China',               flag: '🇨🇳', dial: '+86',  digits: 11 },
  { code: 'JP', name: 'Japan',               flag: '🇯🇵', dial: '+81',  digits: 10 },
  { code: 'KR', name: 'South Korea',         flag: '🇰🇷', dial: '+82',  digits: 10 },
  { code: 'ID', name: 'Indonesia',           flag: '🇮🇩', dial: '+62',  digits: 11 },
  { code: 'PH', name: 'Philippines',         flag: '🇵🇭', dial: '+63',  digits: 10 },
  { code: 'TH', name: 'Thailand',            flag: '🇹🇭', dial: '+66',  digits: 9  },
  { code: 'VN', name: 'Vietnam',             flag: '🇻🇳', dial: '+84',  digits: 9  },
  { code: 'MY', name: 'Malaysia',            flag: '🇲🇾', dial: '+60',  digits: 9  },
  { code: 'SG', name: 'Singapore',           flag: '🇸🇬', dial: '+65',  digits: 8  },
  // Oceania
  { code: 'AU', name: 'Australia',           flag: '🇦🇺', dial: '+61',  digits: 9  },
  { code: 'NZ', name: 'New Zealand',         flag: '🇳🇿', dial: '+64',  digits: 9  },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  value: string;
  onChange: (v: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const PhoneField: React.FC<Props> = ({ value, onChange }) => {
  // Parse stored value — format: "+27|821234567"
  const [country, setCountry] = useState<CountryEntry>(
    () => COUNTRIES.find(c => value.startsWith(c.dial + '|')) ?? COUNTRIES[0]
  );
  const [digits, setDigits] = useState<string>(
    () => value.includes('|') ? value.split('|')[1] : ''
  );
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync up to parent whenever country or digits change
  useEffect(() => {
    onChange(digits ? `${country.dial}|${digits}` : '');
  }, [country, digits]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (c: CountryEntry) => {
    setCountry(c);
    setDigits(''); // reset digits when country changes
    setOpen(false);
    setSearch('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleDigitInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, ''); // digits only
    if (raw.length <= country.digits) setDigits(raw);
  };

  const isComplete = digits.length === country.digits;
  const remaining = country.digits - digits.length;

  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.dial.includes(search) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-2">
      <div className="flex gap-2">

        {/* Country picker trigger */}
        <div className="relative shrink-0" ref={dropRef}>
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            className="flex items-center gap-1.5 px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm hover:border-orange-400 focus:outline-none focus:border-orange-400 transition-all whitespace-nowrap h-[46px]"
          >
            <span className="text-lg leading-none">{country.flag}</span>
            <span className="text-gray-600 font-mono text-xs font-semibold">{country.dial}</span>
            <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown */}
          {open && (
            <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden">
              {/* Search */}
              <div className="p-2 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    autoFocus
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search country..."
                    className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 transition-all"
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {/* List */}
              <div className="overflow-y-auto max-h-56">
                {filtered.length === 0 ? (
                  <p className="text-center text-gray-400 text-xs py-4">No results</p>
                ) : (
                  filtered.map(c => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleSelect(c)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors hover:bg-orange-50 ${
                        c.code === country.code ? 'bg-orange-50 text-orange-600 font-semibold' : 'text-gray-700'
                      }`}
                    >
                      <span className="text-lg w-6 text-center leading-none">{c.flag}</span>
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className="text-xs text-gray-400 font-mono shrink-0">{c.dial}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Digit input */}
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            value={digits}
            onChange={handleDigitInput}
            placeholder={'0'.repeat(country.digits)}
            maxLength={country.digits}
            className={`w-full h-[46px] px-3 pr-10 bg-gray-50 border rounded-xl text-sm font-mono tracking-widest placeholder-gray-300 focus:outline-none transition-all ${
              isComplete
                ? 'border-green-400 bg-green-50 text-green-800 focus:border-green-500'
                : 'border-gray-200 text-gray-900 focus:border-orange-400'
            }`}
          />
          {/* Checkmark when complete */}
          {isComplete && (
            <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
          )}
        </div>
      </div>

      {/* Helper: digit counter */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] text-gray-400">
          {country.name} · {country.dial} · {country.digits} digits
        </span>
        {digits.length > 0 && !isComplete && (
          <span className="text-[10px] text-orange-400 font-semibold">
            {remaining} more digit{remaining !== 1 ? 's' : ''} needed
          </span>
        )}
        {isComplete && (
          <span className="text-[10px] text-green-500 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Valid number
          </span>
        )}
      </div>

      {/* Full number preview */}
      {digits.length > 0 && (
        <p className="text-[11px] text-gray-400 font-mono px-1">
          Full: <span className="text-gray-600">{country.dial} {digits}</span>
        </p>
      )}
    </div>
  );
};

export default PhoneField;
