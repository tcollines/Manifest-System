import React, { useState } from 'react';
import { DepartmentStore } from '../../database/departmentStore';
import { validate, CreateDepartmentSchema } from '../../shared/validators/deptSchemas';
import { useNotification } from '../../components/ui/NotificationSystem';
import TextInput from '../../components/ui/TextInput';
import { X, Building2 } from 'lucide-react';

interface Props {
    onClose: () => void;
    onCreated: (deptId: string) => void;
}

// Common icon options for new departments
const ICON_OPTIONS = [
    { value: 'Users',       label: '👥 Teams & People' },
    { value: 'Music',       label: '🎵 Music / Worship' },
    { value: 'Mic',         label: '🎤 Media / Audio' },
    { value: 'Heart',       label: '❤️ Welfare / Care' },
    { value: 'BookOpen',    label: '📖 Teaching / Word' },
    { value: 'Camera',      label: '📷 Photography / Video' },
    { value: 'Star',        label: '⭐ Ushering / Protocol' },
    { value: 'Shield',      label: '🛡️ Security' },
    { value: 'Bus',         label: '🚌 Transport' },
    { value: 'Utensils',    label: '🍽️ Catering' },
    { value: 'Flower2',     label: '🌸 Decoration' },
    { value: 'Building2',   label: '🏢 Administration' },
];

const CreateDepartmentModal: React.FC<Props> = ({ onClose, onCreated }) => {
    const { showToast } = useNotification();
    const [form, setForm]           = useState({ name: '', description: '', icon: 'Users' });
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [saving, setSaving]       = useState(false);

    const set = (key: string, value: string) => {
        setForm(f => ({ ...f, [key]: value }));
        setFieldErrors(e => { const n = { ...e }; delete n[key]; return n; });
    };

    const handleCreate = async () => {
        const raw = validate(CreateDepartmentSchema, form);
        if (!raw.success) {
            setFieldErrors((raw as any).errors);
            return;
        }
        setSaving(true);
        const res = await DepartmentStore.create((raw as any).data);
        setSaving(false);
        if (res.status === 'success') {
            showToast(`${res.data.name} department created!`, 'success');
            onCreated(res.data.id);
        } else {
            showToast(res.message, 'error');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-ministry-orange/10 p-2.5 rounded-xl">
                            <Building2 className="w-5 h-5 text-ministry-orange" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-900">New Department</h2>
                            <p className="text-xs text-gray-500">This will be immediately available system-wide</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-xl hover:bg-gray-100 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 flex flex-col gap-4">
                    <TextInput
                        label="Department Name"
                        value={form.name}
                        onChange={e => set('name', e.target.value)}
                        placeholder="e.g. Media & Broadcasting"
                        error={fieldErrors.name}
                        required
                    />

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description (optional)</label>
                        <textarea
                            value={form.description}
                            onChange={e => set('description', e.target.value)}
                            rows={2}
                            placeholder="Brief purpose or scope of this department"
                            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-ministry-orange/30 focus:border-ministry-orange transition-all resize-none text-gray-800"
                        />
                    </div>

                    {/* Icon picker */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Icon</label>
                        <div className="grid grid-cols-3 gap-2">
                            {ICON_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => set('icon', opt.value)}
                                    className={[
                                        'px-3 py-2 rounded-xl text-xs font-medium text-left transition-all border',
                                        form.icon === opt.value
                                            ? 'bg-ministry-orange/10 border-ministry-orange text-ministry-orange'
                                            : 'border-gray-200 text-gray-600 hover:bg-gray-50',
                                    ].join(' ')}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 pb-6 flex gap-3">
                    <button
                        onClick={handleCreate}
                        disabled={saving}
                        className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-2xl text-sm font-bold shadow-sm hover:shadow-md transition-all disabled:opacity-60"
                    >
                        {saving ? 'Creating…' : 'Create Department'}
                    </button>
                    <button onClick={onClose} className="px-5 py-3 rounded-2xl text-sm font-semibold text-gray-500 hover:bg-gray-100 transition-colors">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateDepartmentModal;
