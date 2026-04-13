import React from 'react';
import { Heart, Edit2, Trash2 } from 'lucide-react';
import { useHealing } from '../HealingContext';

export const TestimoniesTab: React.FC = () => {
    const { allTestimonies, setEditingTestimony, handleDeleteTestimony } = useHealing();
    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Testimonies Database</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allTestimonies.map((testimony) => (
                    <div key={testimony.id} className="group relative p-6 bg-blue-50/50 border border-blue-100 rounded-2xl hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <h4 className="font-bold text-gray-900">{testimony.testifier_name || 'Anonymous'}</h4>
                                <p className="text-xs text-blue-600">{testimony.testifier_contact || 'No contact'}</p>
                            </div>
                            <div className="bg-white p-2 rounded-full text-blue-500 shadow-sm">
                                <Heart size={16} />
                            </div>
                        </div>
                        <p className="text-gray-700 text-sm mb-4 line-clamp-4 italic">"{testimony.content}"</p>
                        <div className="text-xs text-gray-400 pt-3 border-t border-blue-100 flex justify-between">
                            <span>{new Date(testimony.created_at).toLocaleDateString()}</span>
                            {/* @ts-ignore */}
                            <span>{testimony.healing_reports?.hospital_name}</span>
                        </div>
                        <div className="absolute top-2 right-2 flex space-x-1">
                            <button
                                onClick={() => setEditingTestimony(testimony)}
                                className="p-1.5 bg-white text-blue-500 rounded-full shadow-sm hover:bg-blue-50"
                                title="Edit"
                            >
                                <Edit2 size={14} />
                            </button>
                            <button
                                onClick={() => testimony.id && handleDeleteTestimony(testimony.id)}
                                className="p-1.5 bg-white text-red-500 rounded-full shadow-sm hover:bg-red-50"
                                title="Delete"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            {allTestimonies.length === 0 && (
                <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    No testimonies recorded yet.
                </div>
            )}
        </div>
    );
};
