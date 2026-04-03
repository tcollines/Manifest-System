import React, { useState, useEffect } from 'react';
import { useNotification } from './ui/NotificationSystem';
import { MapPin, ArrowLeft, CheckCircle, Plus, Trash2, Users } from 'lucide-react';
import { apiFetchPublic } from '../services/api';
import { Residence } from '../types';

const PublicResidentSoulEntry: React.FC = () => {
    const { showToast } = useNotification();
    const pathParts = window.location.pathname.split('/');
    const residenceId = pathParts[pathParts.length - 1];
    
    const [residenceData, setResidenceData] = useState<Residence | null>(null);
    const [status, setStatus] = useState<'loading' | 'active' | 'success' | 'error' | 'submitting'>('loading');
    const [errorMsg, setErrorMsg] = useState('');

    const [labourName, setLabourName] = useState('');
    const [labourContact, setLabourContact] = useState('');
    
    // A dynamic list of souls
    type SoulInput = { firstName: string; lastName: string; contact: string; residency: string; gender: 'Male' | 'Female' };
    const [soulsList, setSoulsList] = useState<SoulInput[]>([
        { firstName: '', lastName: '', contact: '', residency: '', gender: 'Male' }
    ]);
    const [minorsCount, setMinorsCount] = useState<number>(0);

    useEffect(() => {
        const fetchData = async () => {
            if (!residenceId) {
                setStatus('error');
                setErrorMsg('Invalid Residential Area Link');
                return;
            }
            try {
                const data = await apiFetchPublic(`/public/residences/${residenceId}`);

                setResidenceData({
                    id: data.id,
                    name: data.name,
                    coordinatorName: data.coordinator_name || '',
                    createdAt: data.created_at
                });
                setStatus('active');
            } catch (e) {
                setStatus('error');
                setErrorMsg('Residential Area not found or link expired.');
            }
        };
        fetchData();
    }, [residenceId]);

    const handleAddSoul = () => {
        setSoulsList([...soulsList, { firstName: '', lastName: '', contact: '', residency: '', gender: 'Male' }]);
    };

    const handleRemoveSoul = (index: number) => {
        if (soulsList.length > 1) {
            const newList = [...soulsList];
            newList.splice(index, 1);
            setSoulsList(newList);
        }
    };

    const handleSoulChange = (index: number, field: keyof SoulInput, value: string) => {
        const newList = [...soulsList];
        newList[index] = { ...newList[index], [field]: value };
        setSoulsList(newList);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!labourName || !labourContact) {
            showToast("Please enter Labour's name and contact.", 'error');
            return;
        }

        // Validate souls
        for (let i = 0; i < soulsList.length; i++) {
            const s = soulsList[i];
            if (!s.firstName) {
                showToast(`Please enter first name for Soul #${i + 1}`, 'error');
                return;
            }
        }

        setStatus('submitting');
        
        try {
            await apiFetchPublic('/public/souls', {
                method: 'POST',
                body: JSON.stringify({
                    residenceId,
                    souls: soulsList.map(s => ({
                        firstName: s.firstName,
                        lastName: s.lastName || '',
                        phone: s.contact,
                        gender: s.gender,
                        residence: s.residency || (residenceData?.name || ''),
                        capturedBy: `${labourName.trim()} (${labourContact.trim()})`,
                        notes: `Added via Residential Public Link`
                    })),
                    minorsCount
                })
            });
            setStatus('success');
        } catch (e) {
            console.error(e);
            showToast("Failed to submit some souls. Please check connection.", 'error');
            setStatus('active');
        }
    };

    const handleBack = () => {
        setSoulsList([{ firstName: '', lastName: '', contact: '', residency: '', gender: 'Male' }]);
        setMinorsCount(0);
        setStatus('active');
    };

    if (status === 'loading') return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Loading Residential Area...</div>;

    if (status === 'success') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full border border-green-100">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Hallelujah!</h2>
                    <p className="text-gray-600 mb-6">Successfully registered {soulsList.length + minorsCount} soul(s) for <strong>{residenceData?.name}</strong>.</p>

                    <button onClick={handleBack} className="w-full py-3 bg-ministry-orange text-white rounded-xl font-bold hover:bg-orange-600 transition-colors">
                        Register More Souls
                    </button>
                </div>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Link Error</h2>
                    <p className="text-gray-500">{errorMsg}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans pb-20">
            <div className="bg-black text-white p-4 sticky top-0 z-10 shadow-md">
                <div className="max-w-md mx-auto flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <div className="bg-ministry-neon p-1.5 rounded-lg">
                            <MapPin className="w-4 h-4 text-black" />
                        </div>
                        <span className="font-bold tracking-wider text-sm">Residency Outreach</span>
                    </div>
                    <div className="text-xs text-white/60">{new Date().toLocaleDateString()}</div>
                </div>
            </div>

            <div className="max-w-md mx-auto p-4 md:pt-8 flex flex-col gap-6">
                <div className="text-center">
                    <span className="text-xs font-bold text-ministry-orange uppercase tracking-wider">Soul Winning for</span>
                    <h1 className="text-2xl font-bold text-gray-900 mt-1">{residenceData?.name}</h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Labour Details */}
                    <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <Users className="w-5 h-5 text-gray-400" /> Labourer Details
                        </h2>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Your Name *</label>
                            <input 
                                type="text" 
                                required
                                className="w-full p-3 rounded-xl border-gray-300 border focus:ring-ministry-orange focus:border-ministry-orange transition-shadow" 
                                value={labourName}
                                onChange={e => setLabourName(e.target.value)}
                                placeholder="E.g. John Doe"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Your Contact *</label>
                            <input 
                                type="text" 
                                required
                                className="w-full p-3 rounded-xl border-gray-300 border focus:ring-ministry-orange focus:border-ministry-orange transition-shadow" 
                                value={labourContact}
                                onChange={e => setLabourContact(e.target.value)}
                                placeholder="E.g. +256 700 000000"
                            />
                        </div>
                    </div>

                    {/* Souls List */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold">Souls Won ({soulsList.length})</h2>
                        </div>

                        {soulsList.map((soul, index) => (
                            <div key={index} className="bg-white p-5 rounded-2xl border shadow-sm relative">
                                {soulsList.length > 1 && (
                                    <button 
                                        type="button" 
                                        onClick={() => handleRemoveSoul(index)}
                                        className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                )}
                                <h3 className="text-md font-semibold text-ministry-orange mb-4">Soul #{index + 1}</h3>
                                
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">First Name *</label>
                                            <input 
                                                type="text" required
                                                className="w-full p-2.5 bg-gray-50 rounded-lg border-gray-200 border focus:bg-white text-sm"
                                                value={soul.firstName}
                                                onChange={e => handleSoulChange(index, 'firstName', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">Last Name</label>
                                            <input 
                                                type="text"
                                                className="w-full p-2.5 bg-gray-50 rounded-lg border-gray-200 border focus:bg-white text-sm"
                                                value={soul.lastName}
                                                onChange={e => handleSoulChange(index, 'lastName', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Contact</label>
                                        <input 
                                            type="text"
                                            className="w-full p-2.5 bg-gray-50 rounded-lg border-gray-200 border focus:bg-white text-sm"
                                            value={soul.contact}
                                            onChange={e => handleSoulChange(index, 'contact', e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Place of Residency</label>
                                        <input 
                                            type="text"
                                            className="w-full p-2.5 bg-gray-50 rounded-lg border-gray-200 border focus:bg-white text-sm"
                                            value={soul.residency}
                                            onChange={e => handleSoulChange(index, 'residency', e.target.value)}
                                            placeholder={`Defaults to ${residenceData?.name}`}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Gender</label>
                                        <select
                                            className="w-full p-2.5 bg-gray-50 rounded-lg border-gray-200 border focus:bg-white text-sm"
                                            value={soul.gender}
                                            onChange={e => handleSoulChange(index, 'gender', e.target.value as any)}
                                        >
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ))}

                        <button 
                            type="button" 
                            onClick={handleAddSoul}
                            className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 flex items-center justify-center gap-2 border border-dashed border-gray-300"
                        >
                            <Plus className="w-5 h-5" /> Add Another Soul
                        </button>

                        <div className="bg-orange-50 border border-orange-100 p-5 rounded-2xl shadow-sm">
                            <h2 className="text-md font-bold text-gray-800 mb-2">Minors (Optional)</h2>
                            <p className="text-xs text-gray-500 mb-3">If you won the souls of any minors where details cannot be fully captured, enter the total count below.</p>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Number of Minors Won</label>
                                <input 
                                    type="number" 
                                    min="0"
                                    className="w-full p-3 rounded-xl border-orange-200 border bg-white focus:ring-ministry-orange focus:border-ministry-orange transition-shadow" 
                                    value={minorsCount}
                                    onChange={e => setMinorsCount(parseInt(e.target.value) || 0)}
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={status === 'submitting'}
                        className="w-full py-4 bg-ministry-orange text-white rounded-xl font-bold text-lg hover:bg-orange-600 shadow-xl shadow-orange-500/20 disabled:bg-gray-400 flex items-center justify-center gap-2"
                    >
                        {status === 'submitting' ? 'Submitting...' : 'Submit Souls'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default PublicResidentSoulEntry;
