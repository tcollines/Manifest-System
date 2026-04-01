import React from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import PhoneInput from '../PhoneInput';
import { Soul } from '../../types';

interface NewReportTabProps {
    formData: {
        date: string;
        hospital_name: string;
        labourers_count: number | '';
        people_reached: number | '';
        notes: string;
    };
    setFormData: React.Dispatch<React.SetStateAction<any>>;
    tempTestimony: { content: string; testifier_name: string; testifier_contact: string };
    setTempTestimony: React.Dispatch<React.SetStateAction<any>>;
    testimoniesList: any[];
    setTestimoniesList: React.Dispatch<React.SetStateAction<any[]>>;
    handleAddTestimony: () => void;
    tempSoul: any;
    setTempSoul: React.Dispatch<React.SetStateAction<any>>;
    soulsList: Partial<Soul>[];
    setSoulsList: React.Dispatch<React.SetStateAction<any[]>>;
    handleAddSoul: () => void;
    handleSubmit: () => void;
    loading: boolean;
}

export const NewReportTab: React.FC<NewReportTabProps> = ({
    formData,
    setFormData,
    tempTestimony,
    setTempTestimony,
    testimoniesList,
    setTestimoniesList,
    handleAddTestimony,
    tempSoul,
    setTempSoul,
    soulsList,
    setSoulsList,
    handleAddSoul,
    handleSubmit,
    loading
}) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Outreach Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-ministry-orange"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Number of Labourers</label>
                            <input
                                type="number"
                                value={formData.labourers_count}
                                onChange={e => {
                                    const val = e.target.value;
                                    setFormData({
                                        ...formData,
                                        labourers_count: val === '' ? '' : parseInt(val)
                                    });
                                }}
                                onKeyDown={(e) => ['ArrowUp', 'ArrowDown'].includes(e.key) && e.preventDefault()}
                                onWheel={(e) => e.currentTarget.blur()}
                                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-ministry-orange no-spinner"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">People Reached</label>
                            <input
                                type="number"
                                value={formData.people_reached}
                                onChange={e => {
                                    const val = e.target.value;
                                    setFormData({
                                        ...formData,
                                        people_reached: val === '' ? '' : parseInt(val)
                                    });
                                }}
                                onKeyDown={(e) => ['ArrowUp', 'ArrowDown'].includes(e.key) && e.preventDefault()}
                                onWheel={(e) => e.currentTarget.blur()}
                                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-ministry-orange no-spinner"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Hospital Name</label>
                            <input
                                type="text"
                                value={formData.hospital_name}
                                onChange={e => setFormData({ ...formData, hospital_name: e.target.value })}
                                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-ministry-orange"
                                placeholder="e.g. Mulago Hospital"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                            <textarea
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-ministry-orange"
                                rows={3}
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Testimonies</h3>
                    <div className="flex flex-col gap-4 mb-4">
                        <input
                            type="text"
                            placeholder="Testifier Name (Optional)"
                            className="w-full px-4 py-2 border rounded-xl"
                            value={tempTestimony.testifier_name}
                            onChange={e => setTempTestimony({ ...tempTestimony, testifier_name: e.target.value })}
                        />
                        <div className="w-full">
                            <PhoneInput
                                value={tempTestimony.testifier_contact}
                                onChange={(val) => setTempTestimony({ ...tempTestimony, testifier_contact: val })}
                                placeholder="Phone"
                            />
                        </div>
                        <textarea
                            placeholder="Testimony..."
                            className="w-full px-4 py-2 border rounded-xl min-h-[100px]"
                            value={tempTestimony.content}
                            onChange={e => setTempTestimony({ ...tempTestimony, content: e.target.value })}
                        />
                        <button
                            onClick={handleAddTestimony}
                            className="w-full flex items-center justify-center space-x-2 bg-gray-100 p-3 rounded-xl hover:bg-gray-200 transition-colors font-semibold"
                        >
                            <Plus size={20} />
                            <span>Add Testimony</span>
                        </button>
                    </div>
                    <div className="space-y-2">
                        {testimoniesList.map((t, idx) => (
                            <div key={idx} className="flex justify-between items-center p-3 bg-blue-50 text-blue-800 rounded-lg">
                                <div className="text-sm">
                                    <span className="font-bold">{t.testifier_name || 'Anonymous'}</span>
                                    {t.testifier_contact && <span className="text-xs text-blue-600 ml-2">({t.testifier_contact})</span>}
                                    <span className="mx-2">:</span>
                                    <span>{t.content}</span>
                                </div>
                                <button
                                    onClick={() => setTestimoniesList(list => list.filter((_, i) => i !== idx))}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                        {testimoniesList.length === 0 && <p className="text-sm text-gray-400 italic">No testimonies added.</p>}
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 h-fit">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center justify-between">
                    <span>Souls Won</span>
                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">{soulsList.length} Added</span>
                </h3>

                <div className="space-y-3 mb-6">
                    <input
                        type="text"
                        placeholder="Full Name (First & Last)"
                        className="w-full px-4 py-2 border rounded-xl"
                        value={tempSoul.fullName}
                        onChange={e => setTempSoul({ ...tempSoul, fullName: e.target.value })}
                    />
                    <PhoneInput
                        value={tempSoul.phone}
                        onChange={(val) => setTempSoul({ ...tempSoul, phone: val })}
                        placeholder="Phone Number"
                    />
                    <select
                        className="w-full px-4 py-2 border rounded-xl"
                        value={tempSoul.gender}
                        onChange={e => setTempSoul({ ...tempSoul, gender: e.target.value })}
                    >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                    </select>
                    <input
                        type="text"
                        placeholder="Place of Residence"
                        className="w-full px-4 py-2 border rounded-xl"
                        value={tempSoul.residence}
                        onChange={e => setTempSoul({ ...tempSoul, residence: e.target.value })}
                    />
                    <div className="pt-2 border-t border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Next of Kin (Optional)</p>
                        <div className="space-y-2">
                            <input
                                type="text"
                                placeholder="NOK Name"
                                className="w-full px-4 py-2 border rounded-xl bg-gray-50"
                                value={tempSoul.nextOfKinName}
                                onChange={e => setTempSoul({ ...tempSoul, nextOfKinName: e.target.value })}
                            />
                            <PhoneInput
                                value={tempSoul.nextOfKinContact}
                                onChange={(val) => setTempSoul({ ...tempSoul, nextOfKinContact: val })}
                                placeholder="NOK Contact"
                            />
                        </div>
                    </div>
                    <button
                        onClick={handleAddSoul}
                        className="w-full flex items-center justify-center space-x-2 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-xl font-bold transition-colors"
                    >
                        <Plus size={18} />
                        <span>Add Soul</span>
                    </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                    {soulsList.map((s, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <div className="text-sm">
                                <div className="font-bold text-gray-800">{s.firstName} {s.lastName}</div>
                                <div className="text-xs text-gray-500">{s.phone}</div>
                            </div>
                            <button
                                onClick={() => setSoulsList(list => list.filter((_, i) => i !== idx))}
                                className="text-red-400 hover:text-red-600"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                    {soulsList.length === 0 && <p className="text-sm text-gray-400 text-center italic">No souls captured yet.</p>}
                </div>

                <hr className="my-6 border-gray-100" />

                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className={`w-full flex items-center justify-center space-x-2 bg-ministry-orange text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-orange-500/20 ${loading ? 'opacity-75 cursor-not-allowed' : 'hover:bg-orange-600'
                        }`}
                >
                    <Save size={18} />
                    <span>{loading ? 'Submitting...' : 'Submit Report'}</span>
                </button>
            </div>
        </div>
    );
};
