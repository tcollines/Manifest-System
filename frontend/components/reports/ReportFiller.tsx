import React, { useState, useEffect } from 'react';
import { MonitoringReport, ReportField, User } from '../../types';
import { apiFetch } from '../../services/api';

interface ReportFillerProps {
    report: MonitoringReport;
    departmentId: string;
    user: User;
    onSuccess: () => void;
}

const ReportFiller: React.FC<ReportFillerProps> = ({ report, departmentId, user, onSuccess }) => {
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [status, setStatus] = useState<'Pending' | 'Draft' | 'Submitted'>('Pending');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initial load of existing submission if any
    useEffect(() => {
        if ((report as any).submission) {
            setFormData((report as any).submission.content || {});
            setStatus((report as any).submission.status);
        }
    }, [report]);

    const handleChange = (fieldId: string, value: any) => {
        if (new Date(report.deadline) < new Date()) return; // Read-only if deadline passed
        setFormData(prev => ({ ...prev, [fieldId]: value }));
    };

    const handleSubmit = async (newStatus: 'Draft' | 'Submitted') => {
        setLoading(true);
        setError(null);
        try {
            // Validation
            if (newStatus === 'Submitted') {
                const missing = report.fields.filter(f => f.required && !formData[f.id]);
                if (missing.length > 0) {
                    throw new Error(`Please fill all required fields: ${missing.map(f => f.label).join(', ')}`);
                }
            }

            await apiFetch(`/reports/${report.id}/submit`, {
                method: 'POST',
                body: JSON.stringify({
                    departmentId,
                    content: formData,
                    status: newStatus,
                    userId: user.id
                })
            });

            onSuccess();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const isDeadlinePassed = new Date(report.deadline) < new Date();
    const isReadOnly = isDeadlinePassed; // Editable until deadline, even if submitted

    return (
        <div className="max-w-3xl mx-auto">
            {error && (
                <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
                    {error}
                </div>
            )}

            <div className="space-y-6">
                {report.fields.map((field: ReportField) => (
                    <div key={field.id} className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>

                        {field.type === 'textarea' ? (
                            <textarea
                                value={formData[field.id] || ''}
                                onChange={(e) => handleChange(field.id, e.target.value)}
                                disabled={isReadOnly}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-100 min-h-[100px]"
                                placeholder={field.placeholder}
                            />
                        ) : field.type === 'number' ? (
                            <input
                                type="number"
                                value={formData[field.id] || ''}
                                onChange={(e) => handleChange(field.id, e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                                        e.preventDefault();
                                    }
                                }}
                                disabled={isReadOnly}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-100 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                placeholder={field.placeholder}
                            />
                        ) : field.type === 'date' ? (
                            <input
                                type="date"
                                value={formData[field.id] || ''}
                                onChange={(e) => handleChange(field.id, e.target.value)}
                                disabled={isReadOnly}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-100"
                            />
                        ) : (
                            <input
                                type="text"
                                value={formData[field.id] || ''}
                                onChange={(e) => handleChange(field.id, e.target.value)}
                                disabled={isReadOnly}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-100"
                                placeholder={field.placeholder}
                            />
                        )}
                    </div>
                ))}
            </div>

            <div className="mt-8 flex justify-end space-x-4 pt-6 border-t border-gray-100">
                {!isReadOnly && (
                    <>
                        <button
                            onClick={() => handleSubmit('Draft')}
                            disabled={loading}
                            className="px-4 py-2 text-gray-600 hover:text-black font-medium disabled:opacity-50"
                        >
                            Save Draft
                        </button>
                        <button
                            onClick={() => handleSubmit('Submitted')}
                            disabled={loading}
                            className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
                        >
                            {loading ? 'Submitting...' : status === 'Submitted' ? 'Update Submission' : 'Submit Report'}
                        </button>
                    </>
                )}
                {isReadOnly && (
                    <div className="text-red-500 font-medium flex items-center">
                        🔒 Deadline Passed - Report Locked
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReportFiller;
