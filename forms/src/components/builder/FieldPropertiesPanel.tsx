import React, { useState } from 'react';
import type { FormField, FieldType } from '../../types/forms.types';
import { FIELD_TYPE_META } from '../../types/forms.types';

interface Props { field: FormField; onChange: (patch: Partial<FormField>) => void; showAiConfig?: boolean; }

// Types that share the `options[]` array — keep options when switching between these
const OPTION_TYPES = new Set<FieldType>(['dropdown', 'radio', 'multi_select']);

// All optional type-specific keys — cleared when switching field types
const TYPE_SPECIFIC_KEYS: (keyof FormField)[] = [
  'options', 'placeholder', 'min', 'max', 'allowDecimals',
  'contactType', 'autoGps', 'dateOnly', 'timeOnly',
  'maxFileSizeMb', 'allowedFileTypes', 'ai_question',
];

const Toggle: React.FC<{ label: string; value: boolean; onChange: (v: boolean) => void }> = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between py-2">
    <span className="text-xs text-gray-500 font-medium">{label}</span>
    <button onClick={() => onChange(!value)}
      className={`w-9 h-5 rounded-full transition-all relative ${value ? 'bg-orange-500' : 'bg-gray-200'}`}>
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${value ? 'left-4' : 'left-0.5'}`} />
    </button>
  </div>
);

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1.5">{children}</p>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input {...props} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-400 transition-all" />
);

// ─── Type Picker ──────────────────────────────────────────────────────────────

const TypePicker: React.FC<{ current: FieldType; onChange: (t: FieldType) => void }> = ({ current, onChange }) => {
  const [open, setOpen] = useState(false);
  const currentMeta = FIELD_TYPE_META.find(m => m.type === current);

  const groups = FIELD_TYPE_META.reduce<Record<string, typeof FIELD_TYPE_META>>((acc, m) => {
    (acc[m.group] ??= []).push(m);
    return acc;
  }, {});

  return (
    <div className="relative">
      <Label>Field Type</Label>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 hover:border-orange-400 transition-all"
      >
        <span className="text-base leading-none">{currentMeta?.icon}</span>
        <span className="flex-1 text-left font-medium">{currentMeta?.label}</span>
        <span className={`text-gray-400 text-xs transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl z-20 overflow-hidden max-h-72 overflow-y-auto">
            {Object.entries(groups).map(([group, items]) => (
              <div key={group}>
                <p className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 border-b border-gray-100">
                  {group}
                </p>
                {items.map(m => (
                  <button
                    key={m.type}
                    onClick={() => { onChange(m.type); setOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-orange-50 transition-all ${m.type === current ? 'bg-orange-50 text-orange-600 font-semibold' : 'text-gray-700'}`}
                  >
                    <span className="text-base w-5 text-center leading-none">{m.icon}</span>
                    <span className="flex-1">{m.label}</span>
                    {m.type === current && <span className="text-orange-500 text-xs">✓</span>}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ─── Main Panel ───────────────────────────────────────────────────────────────

const FieldPropertiesPanel: React.FC<Props> = ({ field, onChange, showAiConfig }) => {
  const handleTypeChange = (newType: FieldType) => {
    if (newType === field.type) return;

    const keepOptions = OPTION_TYPES.has(field.type) && OPTION_TYPES.has(newType);

    // Build a clean patch — only include keys that need a value
    const patch: Record<string, unknown> = { type: newType };

    if (OPTION_TYPES.has(newType)) {
      patch.options = keepOptions ? field.options : ['Option 1', 'Option 2'];
    }

    // For each type-specific key that exists on the current field but is NOT
    // in the new patch, set it to null so sanitize() can remove it before write.
    // This avoids writing `undefined` to Firestore.
    TYPE_SPECIFIC_KEYS.forEach(key => {
      if (!(key in patch) && field[key] !== undefined) {
        patch[key] = null;
      }
    });

    onChange(patch as Partial<FormField>);
  };

  return (
    <div className="p-4 space-y-5">
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Field Properties</p>

      {/* Field Type Switcher */}
      <TypePicker current={field.type} onChange={handleTypeChange} />

      <div className="border-t border-gray-100" />

      {/* Kairos AI Question (only if chatbot mode) */}
      {showAiConfig && (
        <div className="bg-orange-50/50 -mx-4 px-4 py-3 mb-2 border-y border-orange-100">
          <Label><span className="text-orange-500 mr-1">✨</span> Kairos AI Question</Label>
          <textarea
            value={field.ai_question ?? ''}
            onChange={e => onChange({ ai_question: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 bg-white border border-orange-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 transition-all resize-none mt-1 shadow-sm"
            placeholder="How Kairos will ask this..."
          />
        </div>
      )}

      {/* Label */}
      <div>
        <Label>Label</Label>
        <Input value={field.label} onChange={e => onChange({ label: e.target.value })} placeholder="Question label" />
      </div>

      {/* Helper Text */}
      <div>
        <Label>Helper Text</Label>
        <Input
          value={field.description ?? ''}
          onChange={e => onChange({ description: e.target.value || undefined })}
          placeholder="Optional hint"
        />
      </div>

      {/* Required toggle */}
      <div className="border-t border-gray-100 pt-3">
        <Toggle label="Required" value={field.required} onChange={v => onChange({ required: v })} />
      </div>

      {/* Placeholder — text inputs only */}
      {['short_text', 'long_text', 'number', 'contact'].includes(field.type) && (
        <div>
          <Label>Placeholder</Label>
          <Input
            value={field.placeholder ?? ''}
            onChange={e => onChange({ placeholder: e.target.value || undefined })}
            placeholder="Placeholder text"
          />
        </div>
      )}

      {/* Number options */}
      {field.type === 'number' && (
        <div className="space-y-3">
          <div>
            <Label>Min Value</Label>
            <Input
              type="number"
              value={field.min ?? ''}
              onChange={e => onChange({ min: e.target.value ? +e.target.value : null as any })}
              placeholder="No minimum"
            />
          </div>
          <div>
            <Label>Max Value</Label>
            <Input
              type="number"
              value={field.max ?? ''}
              onChange={e => onChange({ max: e.target.value ? +e.target.value : null as any })}
              placeholder="No maximum"
            />
          </div>
          <Toggle label="Allow Decimals" value={field.allowDecimals ?? false} onChange={v => onChange({ allowDecimals: v })} />
        </div>
      )}

      {/* Contact type */}
      {field.type === 'contact' && (
        <div>
          <Label>Contact Type</Label>
          <div className="flex gap-2">
            {(['phone', 'email', 'both'] as const).map(t => (
              <button key={t} onClick={() => onChange({ contactType: t })}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold capitalize transition-all border ${field.contactType === t ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-500 border-gray-200 hover:border-orange-300'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* GPS */}
      {field.type === 'gps' && (
        <Toggle label="Auto-capture on open" value={field.autoGps ?? false} onChange={v => onChange({ autoGps: v })} />
      )}

      {/* DateTime */}
      {field.type === 'datetime' && (
        <div className="space-y-1">
          <Toggle label="Date only" value={field.dateOnly ?? false} onChange={v => onChange({ dateOnly: v, timeOnly: false })} />
          <Toggle label="Time only" value={field.timeOnly ?? false} onChange={v => onChange({ timeOnly: v, dateOnly: false })} />
        </div>
      )}

      {/* File / Image max size */}
      {['file', 'image'].includes(field.type) && (
        <div>
          <Label>Max Size (MB)</Label>
          <Input
            type="number"
            value={field.maxFileSizeMb ?? ''}
            onChange={e => onChange({ maxFileSizeMb: e.target.value ? +e.target.value : null as any })}
            placeholder="10"
          />
        </div>
      )}
    </div>
  );
};

export default FieldPropertiesPanel;
