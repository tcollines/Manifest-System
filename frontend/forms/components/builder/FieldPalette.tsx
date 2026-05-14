import React from 'react';
import { FIELD_TYPE_META } from '../../types/forms.types';
import type { FieldType } from '../../types/forms.types';

interface Props { onAdd: (type: FieldType) => void; }

const groups = ['Basic', 'Selection', 'Contact & Files', 'Advanced'];

const FieldPalette: React.FC<Props> = ({ onAdd }) => (
  <div className="py-4 px-3">
    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2 mb-3">Field Types</p>
    {groups.map(g => {
      const items = FIELD_TYPE_META.filter(m => m.group === g);
      return (
        <div key={g} className="mb-4">
          <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold px-2 mb-1.5">{g}</p>
          {items.map(meta => (
            <button key={meta.type} onClick={() => onAdd(meta.type)}
              title={meta.description}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-sm text-gray-500 hover:bg-orange-50 hover:text-orange-600 transition-all group mb-0.5">
              <span className="text-base leading-none">{meta.icon}</span>
              <span className="font-medium text-xs">{meta.label}</span>
            </button>
          ))}
        </div>
      );
    })}
  </div>
);

export default FieldPalette;
