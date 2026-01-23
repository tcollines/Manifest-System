import React, { useState } from 'react';
import { useNotification } from './ui/NotificationSystem';
import PhoneInput from './PhoneInput';
import { UserPlus, Save, X } from 'lucide-react';
import { Soul } from '../types';

interface SoulEntryFormProps {
    sourceType: 'Service' | 'Event' | 'Outreach';
    sourceId: string;
    sourceName?: string;
    existingMember?: any; // Ideally Member type
    onSubmit: (data: Omit<Soul, 'id' | 'createdAt'>) => void;
    onCancel?: () => void;
}

const SoulEntryForm: React.FC<SoulEntryFormProps> = ({ sourceType, sourceId, sourceName, existingMember, onSubmit, onCancel }) => {
    const { confirm: askConfirm } = useNotification();
    const [formData, setFormData] = useState<any>({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        gender: 'Male',
        residence: '',
        notes: '',
        studentStatus: 'None',
        age: undefined,
        occupation: '',
        preferredCallTime: '',
        invitedBy: { name: '', contact: '' }
    });

    // Pre-fill if member provided
    React.useEffect(() => {
        if (existingMember) {
            setFormData((prev: any) => ({
                ...prev,
                firstName: existingMember.name ? existingMember.name.split(' ')[0] : '',
                lastName: existingMember.name ? existingMember.name.split(' ').slice(1).join(' ') : '',
                phone: existingMember.phone || '',
                residence: existingMember.residency || '',
                gender: existingMember.gender || 'Male',
            }));
        }
    }, [existingMember]);

    const [entryType, setEntryType] = useState<'Soul' | 'Confirmation'>('Soul');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Contact Confirmation
        if (!formData.phone || formData.phone === '256' || formData.phone.length <= 3) {
            if (!(await askConfirm("Missing Contact", "No contact number provided. Are you sure you want to proceed?"))) {
                return;
            }
        }

        onSubmit({
            ...formData,
            status: entryType === 'Confirmation' ? 'Confirmed' : 'New',
            sourceType,
            sourceId,
            capturedBy: 'System' // Default, acts as filler until auth context is passed or "self" for public
        });
        // Reset form
        setFormData({
            firstName: '',
            lastName: '',
            phone: '',
            email: '',
            gender: 'Male',
            residence: '',
            notes: ''
        });
        setEntryType('Soul');
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center text-gray-800">
                    <UserPlus className="w-5 h-5 mr-2 text-ministry-orange" />
                    Add Soul {sourceName ? `for ${sourceName}` : ''}
                </h3>
                {onCancel && (
                    <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Entry Type Selection for Events */}
                {sourceType === 'Event' && (
                    <div className="flex p-1 bg-gray-100 rounded-lg mb-4">
                        <button
                            type="button"
                            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${entryType === 'Soul' ? 'bg-white shadow text-ministry-orange' : 'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setEntryType('Soul')}
                        >
                            Soul Won
                        </button>
                        <button
                            type="button"
                            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${entryType === 'Confirmation' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setEntryType('Confirmation')}
                        >
                            Confirmation
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                        <input
                            type="text"
                            required
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ministry-orange focus:border-transparent"
                            value={formData.firstName}
                            onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                        <input
                            type="text"
                            required
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ministry-orange focus:border-transparent"
                            value={formData.lastName}
                            onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                        <PhoneInput
                            // required - Removed to allow empty submission with confirmation
                            value={formData.phone}
                            onChange={(val) => setFormData({ ...formData, phone: val })}
                            placeholder="700 000 000"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
                        <select
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ministry-orange focus:border-transparent"
                            value={formData.gender}
                            onChange={e => setFormData({ ...formData, gender: e.target.value as 'Male' | 'Female' })}
                        >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Residence</label>
                        <input
                            type="text"
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ministry-orange focus:border-transparent"
                            placeholder="e.g. Ntinda, Makerere"
                            value={formData.residence}
                            onChange={e => setFormData({ ...formData, residence: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-gray-400 font-normal">(Optional)</span></label>
                        <input
                            type="email"
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ministry-orange focus:border-transparent"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                </div>

                {/* Additional Details Section - ONLY FOR SERVICES */}
                {sourceType === 'Service' && (
                    <div className="border-t border-gray-100 pt-4 mt-2">
                        <h4 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Additional Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Student Status</label>
                                <select
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ministry-orange focus:border-transparent"
                                    value={formData.studentStatus}
                                    onChange={e => setFormData({ ...formData, studentStatus: e.target.value })}
                                >
                                    <option value="None">None / Working</option>
                                    <option value="Primary">Primary</option>
                                    <option value="Secondary">Secondary</option>
                                    <option value="University/Tertiary">University / Tertiary</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Age <span className="text-gray-400 font-normal">(Optional)</span></label>
                                <input
                                    type="number"
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ministry-orange focus:border-transparent"
                                    value={formData.age || ''}
                                    onChange={e => setFormData({ ...formData, age: e.target.value ? parseInt(e.target.value) : undefined })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Occupation</label>
                                <input
                                    type="text"
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ministry-orange focus:border-transparent"
                                    placeholder="e.g. Engineer, Student..."
                                    value={formData.occupation}
                                    onChange={e => setFormData({ ...formData, occupation: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Call Time</label>
                                <input
                                    type="text"
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ministry-orange focus:border-transparent"
                                    placeholder="e.g. Evenings, 7pm..."
                                    value={formData.preferredCallTime}
                                    onChange={e => setFormData({ ...formData, preferredCallTime: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Who Invited You?</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    className="w-full p-2 border border-gray-200 rounded-md text-sm focus:border-ministry-orange"
                                    placeholder="Inviter Name"
                                    value={formData.invitedBy?.name || ''}
                                    onChange={e => setFormData({ ...formData, invitedBy: { ...formData.invitedBy, name: e.target.value } })}
                                />
                                <div>
                                    <PhoneInput
                                        value={formData.invitedBy?.contact || ''}
                                        onChange={(val) => setFormData({ ...formData, invitedBy: { ...formData.invitedBy, contact: val } })}
                                        placeholder="Inviter Contact"
                                        className="h-10"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Prayer Requests</label>
                    <textarea
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ministry-orange focus:border-transparent"
                        rows={2}
                        value={formData.notes}
                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    />
                </div>

                <div className="pt-2">
                    <button
                        type="submit"
                        className="w-full py-3 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors flex items-center justify-center font-medium shadow-lg"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        Save Soul
                    </button>
                </div>
            </form >
        </div >
    );
};

export default SoulEntryForm;
