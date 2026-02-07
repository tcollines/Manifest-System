
import React, { useState } from 'react';
import { ReportField } from '../../types';
import { Plus, Trash, GripVertical, Save, X, ArrowUp, ArrowDown } from 'lucide-react';
import { useNotification } from '../ui/NotificationSystem';

interface ReportBuilderProps {
    onSuccess: () => void;
    createdBy: string;
}

const ReportBuilder: React.FC<ReportBuilderProps> = ({ onSuccess, createdBy }) => {
    const { showToast } = useNotification();
    const [title, setTitle] = useState('');
    const [month, setMonth] = useState('');
    const [deadline, setDeadline] = useState('');
    const [fields, setFields] = useState<ReportField[]>([
        { id: 'f1', label: 'Summary of Activities', type: 'textarea', required: true }
    ]);
    const [loading, setLoading] = useState(false);

    const addField = () => {
        setFields([...fields, {
            id: `f${Date.now()}`,
            label: '',
            type: 'text',
            required: false
        }]);
    };

    const removeField = (id: string) => {
        setFields(fields.filter(f => f.id !== id));
    };

    const updateField = (id: string, key: keyof ReportField, value: any) => {
        setFields(fields.map(f => f.id === id ? { ...f, [key]: value } : f));
    };

    const moveField = (index: number, direction: 'up' | 'down') => {
        const newFields = [...fields];
        if (direction === 'up' && index > 0) {
            [newFields[index], newFields[index - 1]] = [newFields[index - 1], newFields[index]];
        } else if (direction === 'down' && index < newFields.length - 1) {
            [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
        }
        setFields(newFields);
    };

    const handleSave = async () => {
        if (!title || !month || !deadline) {
            showToast('Please fill all basic details', 'error');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('http://localhost:5000/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    month,
                    deadline: new Date(deadline).toISOString(),
                    fields,
                    created_by: createdBy
                })
            });

            if (!res.ok) throw new Error('Failed to create report');
            showToast('Report template published successfully', 'success');
            onSuccess();
        } catch (error) {
            console.error(error);
            showToast('Error creating report', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-4xl mx-auto">
            <h2 className="text-xl font-bold mb-6">Create Monthly Report Template</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Report Title</label>
                    <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                        placeholder="e.g. February 2026 Report"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                    <input
                        type="month"
                        value={month}
                        onChange={e => setMonth(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                    <input
                        type="datetime-local"
                        value={deadline}
                        onChange={e => setDeadline(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                    />
                </div>
            </div>

            <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Report Fields</h3>
                    <button onClick={addField} className="text-sm flex items-center text-blue-600 hover:text-blue-800">
                        <Plus className="w-4 h-4 mr-1" />
                        Add Field
                    </button>
                </div>

                <div className="space-y-3">
                    {fields.map((field, index) => (
                        <div key={field.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100 group transition-all hover:shadow-sm">
                            <div className="flex flex-col gap-1 mt-1 text-gray-400">
                                <button
                                    onClick={() => moveField(index, 'up')}
                                    disabled={index === 0}
                                    className="hover:text-black disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <ArrowUp className="w-4 h-4" />
                                </button>
                                <GripVertical className="w-4 h-4 opacity-50 cursor-grab active:cursor-grabbing" />
                                <button
                                    onClick={() => moveField(index, 'down')}
                                    disabled={index === fields.length - 1}
                                    className="hover:text-black disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <ArrowDown className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <input
                                    type="text"
                                    value={field.label}
                                    onChange={e => updateField(field.id, 'label', e.target.value)}
                                    placeholder="Field Label (e.g. Souls Won)"
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 outline-none transition-all"
                                />
                                <select
                                    value={field.type}
                                    onChange={e => updateField(field.id, 'type', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 outline-none transition-all"
                                >
                                    <option value="text">Short Text</option>
                                    <option value="textarea">Long Text / Paragraph</option>
                                    <option value="number">Number</option>
                                    <option value="date">Date</option>
                                </select>
                                <div className="flex items-center space-x-4">
                                    <label className="flex items-center space-x-2 text-sm text-gray-600 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={field.required}
                                            onChange={e => updateField(field.id, 'required', e.target.checked)}
                                            className="rounded text-black focus:ring-black w-4 h-4 border-gray-300"
                                        />
                                        <span>Required</span>
                                    </label>
                                    <div className="flex-1 text-right">
                                        <button
                                            onClick={() => removeField(field.id)}
                                            className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Remove Field"
                                        >
                                            <Trash className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-gray-100">
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 flex items-center gap-2 disabled:opacity-50 transition-all active:scale-95"
                >
                    <Save className="w-4 h-4" />
                    {loading ? 'Creating...' : 'Publish Report Template'}
                </button>
            </div>
        </div>
    );
};

export default ReportBuilder;
