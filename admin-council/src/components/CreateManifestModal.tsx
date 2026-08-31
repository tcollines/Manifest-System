import React, { useState } from 'react';
import { createManifest } from '../services/adminApi';

interface CreateManifestModalProps {
    onClose: () => void;
    onCreated: () => void;
}

const REGIONS = ['Unassigned','Central','Eastern','Western','Northern','Southern','East Africa','West Africa','Southern Africa','North Africa','Europe','North America','South America','Asia Pacific','Middle East'];
const CURRENCIES = ['UGX','KES','TZS','RWF','USD','EUR','GBP','ZAR','NGN','GHS'];

const CreateManifestModal: React.FC<CreateManifestModalProps> = ({ onClose, onCreated }) => {
    const [name, setName] = useState('');
    const [region, setRegion] = useState('Unassigned');
    const [contact, setContact] = useState('');
    const [address, setAddress] = useState('');
    const [description, setDescription] = useState('');
    const [currency, setCurrency] = useState('UGX');
    const [teamLeaderName, setTeamLeaderName] = useState('');
    const [teamLeaderEmail, setTeamLeaderEmail] = useState('');
    const [teamLeaderContact, setTeamLeaderContact] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) { setError('Manifest name is required'); return; }
        setError(null);
        setIsSubmitting(true);
        try {
            await createManifest({ 
                name: name.trim(), 
                region, 
                contact: contact.trim(), 
                address: address.trim(), 
                description: description.trim(), 
                currency,
                teamLeaderName: teamLeaderName.trim(),
                teamLeaderEmail: teamLeaderEmail.trim(),
                teamLeaderContact: teamLeaderContact.trim()
            });
            onCreated();
        } catch (err: any) {
            setError(err.message || 'Failed to create manifest');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl border border-gray-200 animate-in zoom-in-95 slide-in-from-bottom-2 duration-200">
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                    <h3 className="text-base font-semibold text-gray-900">Create New Manifest</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="px-6 py-5 space-y-4">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>
                        )}

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Manifest Name *</label>
                            <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 transition-all" placeholder="e.g. Phaneroo Ministries" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Region</label>
                                <select className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-orange-400 transition-all" value={region} onChange={(e) => setRegion(e.target.value)}>
                                    {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Currency</label>
                                <select className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-orange-400 transition-all" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Contact</label>
                            <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-400 transition-all" placeholder="Phone or email" value={contact} onChange={(e) => setContact(e.target.value)} />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Address</label>
                            <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-400 transition-all" placeholder="Physical address" value={address} onChange={(e) => setAddress(e.target.value)} />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Description</label>
                            <textarea className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-400 transition-all resize-y min-h-[80px]" placeholder="Brief description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                        </div>

                        <div className="pt-4 mt-4 border-t border-gray-100">
                            <h4 className="text-sm font-semibold text-gray-900 mb-4">Team Leader Details</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Team Leader Name</label>
                                    <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-400 transition-all" placeholder="John Doe" value={teamLeaderName} onChange={(e) => setTeamLeaderName(e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email (For Authorization)</label>
                                        <input type="email" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-400 transition-all" placeholder="john@example.com" value={teamLeaderEmail} onChange={(e) => setTeamLeaderEmail(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Contact</label>
                                        <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-400 transition-all" placeholder="Phone number" value={teamLeaderContact} onChange={(e) => setTeamLeaderContact(e.target.value)} />
                                    </div>
                                </div>
                                {teamLeaderEmail && (
                                    <p className="text-xs text-orange-600 mt-2">
                                        An authorization magic link will be automatically sent to <strong>{teamLeaderEmail}</strong>.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
                        <button type="button" className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all" onClick={onClose}>Cancel</button>
                        <button type="submit" className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 rounded-lg shadow-sm transition-all disabled:opacity-60" disabled={isSubmitting}>
                            {isSubmitting ? 'Creating...' : 'Create Manifest'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateManifestModal;
