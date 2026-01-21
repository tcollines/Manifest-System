import React, { useState, useEffect } from 'react';
import { Globe, ArrowLeft, CheckCircle } from 'lucide-react';
import SoulEntryForm from './SoulEntryForm';
import { EventStore } from '../database/eventStore';
import { SoulsStore } from '../database/soulsStore';
import { MinistryEvent, Soul } from '../types';

const PublicSoulEntry: React.FC = () => {
    // Manually parse ID from URL since we aren't using React Router provider
    const pathParts = window.location.pathname.split('/');
    // Assuming /collect-souls/:eventId
    const eventId = pathParts.find(part => part.startsWith('evt-')) || pathParts[pathParts.length - 1];
    const [eventData, setEventData] = useState<MinistryEvent | null>(null);
    const [status, setStatus] = useState<'loading' | 'active' | 'success' | 'error'>('loading');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            if (!eventId) {
                setStatus('error');
                setErrorMsg('Invalid Event Link');
                return;
            }
            try {
                const events = await EventStore.getAll();
                const event = events.find(e => e.id === eventId);
                if (event) {
                    setEventData(event);
                    setStatus('active');
                } else {
                    // Fallback for demo if ID not exact match in mock mode or error
                    // In real app, we would probably query by ID directly
                    setStatus('error');
                    setErrorMsg('Event not found or link expired.');
                }
            } catch (e) {
                setStatus('error');
                setErrorMsg('Failed to load event details.');
            }
        };
        fetchData();
    }, [eventId]);

    const handleSubmit = async (data: Omit<Soul, 'id' | 'createdAt'>) => {
        try {
            await SoulsStore.add({
                ...data,
                capturedBy: 'Public Link' // Or prompt for user name
            } as Soul);
            setStatus('success');
        } catch (e) {
            console.error(e);
            alert("Failed to submit. Please check connection.");
        }
    };

    const handleBack = () => {
        setStatus('active');
    };

    if (status === 'loading') {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Loading Event...</div>;
    }

    if (status === 'success') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full border border-green-100">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Hallelujah!</h2>
                    <p className="text-gray-600 mb-6">Soul successfully registered for <strong>{eventData?.title}</strong>.</p>

                    <button
                        onClick={handleBack}
                        className="w-full py-3 bg-ministry-orange text-white rounded-xl font-bold hover:bg-orange-600 transition-colors"
                    >
                        Register Another Soul
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
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* Brand Header */}
            <div className="bg-black text-white p-4 sticky top-0 z-10 shadow-md">
                <div className="max-w-md mx-auto flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <div className="bg-ministry-neon p-1.5 rounded-lg">
                            <Globe className="w-4 h-4 text-black" />
                        </div>
                        <span className="font-bold tracking-wider text-sm">Follow-up</span>
                    </div>
                    <div className="text-xs text-white/60">
                        {new Date().toLocaleDateString()}
                    </div>
                </div>
            </div>

            <div className="max-w-md mx-auto p-4 md:pt-8 pb-20">
                <div className="mb-6">
                    <span className="text-xs font-bold text-ministry-orange uppercase tracking-wider">Soul Winning for</span>
                    <h1 className="text-2xl font-bold text-gray-900 mt-1">{eventData?.title}</h1>
                    <p className="text-gray-500 text-sm mt-1">{eventData?.date} • {eventData?.location}</p>
                </div>

                <SoulEntryForm
                    sourceType="Event"
                    sourceId={eventId!}
                    onSubmit={handleSubmit}
                />

                <div className="mt-8 text-center text-xs text-gray-400">
                    Manifest Management System &copy; {new Date().getFullYear()}
                </div>
            </div>
        </div>
    );
};

export default PublicSoulEntry;
