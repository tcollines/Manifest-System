import React from 'react';
import PhoneInput from '../../components/PhoneInput';
import { useHealing } from './HealingContext';
import { HealingStore } from '../../database/HealingStore';
import { useNotification } from '../../components/ui/NotificationSystem';

export const HealingModals: React.FC = () => {
    const { 
        editingSoul, setEditingSoul, 
        editingTestimony, setEditingTestimony,
        loadData
    } = useHealing();
    const { showToast } = useNotification();

    const handleUpdateSoul = async () => {
        if (!editingSoul || !editingSoul.id) return;
        try {
            const payload = {
                first_name: editingSoul.firstName || editingSoul.first_name,
                last_name: editingSoul.lastName || editingSoul.last_name,
                phone: editingSoul.phone,
                residence: editingSoul.residence,
                next_of_kin_name: editingSoul.nextOfKinName,
                next_of_kin_contact: editingSoul.nextOfKinContact,
                notes: editingSoul.notes
            };
            await HealingStore.updateSoul(editingSoul.id, payload as any);
            showToast('Soul updated successfully', 'success');
            setEditingSoul(null);
            loadData();
        } catch (error) {
            showToast('Failed to update soul', 'error');
        }
    };

    const handleUpdateTestimony = async () => {
        if (!editingTestimony || !editingTestimony.id) return;
        try {
            await HealingStore.updateTestimony(editingTestimony.id, editingTestimony);
            showToast('Testimony updated successfully', 'success');
            setEditingTestimony(null);
            loadData();
        } catch (error) {
            showToast('Failed to update testimony', 'error');
        }
    };

    return (
        <>
            {/* Edit Soul Modal */}
            {editingSoul && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
                        <h3 className="text-xl font-bold">Edit Soul</h3>
                        <div className="space-y-3">
                            <input
                                className="w-full px-4 py-2 border rounded-xl"
                                value={editingSoul.first_name || ''}
                                onChange={e => setEditingSoul({ ...editingSoul, first_name: e.target.value })}
                                placeholder="First Name"
                            />
                            <input
                                className="w-full px-4 py-2 border rounded-xl"
                                value={editingSoul.last_name || ''}
                                onChange={e => setEditingSoul({ ...editingSoul, last_name: e.target.value })}
                                placeholder="Last Name"
                            />
                            <PhoneInput
                                value={editingSoul.phone || ''}
                                onChange={val => setEditingSoul({ ...editingSoul, phone: val })}
                                placeholder="Phone"
                            />
                            <input
                                className="w-full px-4 py-2 border rounded-xl"
                                value={editingSoul.residence || ''}
                                onChange={e => setEditingSoul({ ...editingSoul, residence: e.target.value })}
                                placeholder="Place of Residence"
                            />
                            <div className="pt-2 border-t border-gray-100">
                                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Next of Kin (Optional)</p>
                                <div className="space-y-2">
                                    <input
                                        className="w-full px-4 py-2 border rounded-xl bg-gray-50"
                                        value={editingSoul.nextOfKinName || ''}
                                        onChange={e => setEditingSoul({ ...editingSoul, nextOfKinName: e.target.value })}
                                        placeholder="NOK Name"
                                    />
                                    <PhoneInput
                                        value={editingSoul.nextOfKinContact || ''}
                                        onChange={val => setEditingSoul({ ...editingSoul, nextOfKinContact: val })}
                                        placeholder="NOK Contact"
                                    />
                                </div>
                            </div>
                            <textarea
                                className="w-full px-4 py-2 border rounded-xl"
                                value={editingSoul.notes || ''}
                                onChange={e => setEditingSoul({ ...editingSoul, notes: e.target.value })}
                                placeholder="Notes"
                                rows={2}
                            />
                        </div>
                        <div className="flex space-x-2 pt-2">
                            <button
                                onClick={() => setEditingSoul(null)}
                                className="flex-1 py-2 rounded-xl border hover:bg-gray-50 font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateSoul}
                                className="flex-1 py-2 rounded-xl bg-ministry-orange text-white font-medium hover:bg-orange-600"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Testimony Modal */}
            {editingTestimony && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
                        <h3 className="text-xl font-bold">Edit Testimony</h3>
                        <div className="space-y-3">
                            <input
                                className="w-full px-4 py-2 border rounded-xl"
                                value={editingTestimony.testifier_name || ''}
                                onChange={e => setEditingTestimony({ ...editingTestimony, testifier_name: e.target.value })}
                                placeholder="Testifier Name"
                            />
                            <PhoneInput
                                value={editingTestimony.testifier_contact || ''}
                                onChange={val => setEditingTestimony({ ...editingTestimony, testifier_contact: val })}
                                placeholder="Contact"
                            />
                            <textarea
                                className="w-full px-4 py-2 border rounded-xl min-h-[150px]"
                                value={editingTestimony.content || ''}
                                onChange={e => setEditingTestimony({ ...editingTestimony, content: e.target.value })}
                                placeholder="Testimony Content"
                            />
                        </div>
                        <div className="flex space-x-2 pt-2">
                            <button
                                onClick={() => setEditingTestimony(null)}
                                className="flex-1 py-2 rounded-xl border hover:bg-gray-50 font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateTestimony}
                                className="flex-1 py-2 rounded-xl bg-ministry-orange text-white font-medium hover:bg-orange-600"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
