import React from 'react';
import { ArrowLeft, Users, CreditCard, Ticket, Save } from 'lucide-react';
import { useRegistration } from '../RegistrationContext';
import PhoneInput from '../../../components/PhoneInput';

export default function AddMemberForm() {
    const {
        viewMode,
        selectedService,
        formData,
        handleInputChange,
        setFormData,
        handleRegister,
        handleBackRegistration
    } = useRegistration();

    if (viewMode !== 'register-new') return null;

    return (
        <div className="max-w-5xl mx-auto space-y-6 p-4 md:p-0">
            <div className="flex items-center space-x-3 border-b border-gray-100 pb-4">
                <button onClick={handleBackRegistration} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <h2 className="text-xl font-bold text-ministry-text">
                    {selectedService ? 'Register & Check In' : 'Add New Member'}
                </h2>
            </div>

            <form onSubmit={handleRegister} className="space-y-8 bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="md:col-span-2 pb-2 border-b border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center">
                            <Users className="w-5 h-5 mr-2 text-ministry-orange" /> Personal Details
                        </h3>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Full Name <span className="text-red-500">*</span></label>
                        <input required name="name" value={formData.name} onChange={handleInputChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none" placeholder="John Doe" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Gender <span className="text-red-500">*</span></label>
                        <select name="gender" value={formData.gender} onChange={handleInputChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none">
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                    </div>

                    <div className="md:col-span-2 pb-2 border-b border-gray-100 mt-2">
                        <h3 className="text-lg font-bold text-gray-800">Contact Info</h3>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Phone Number</label>
                        <PhoneInput
                            value={formData.phone}
                            onChange={(val) => setFormData({ ...formData, phone: val })}
                            placeholder="700 000 000"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Email Address</label>
                        <input name="email" type="email" value={formData.email} onChange={handleInputChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none" placeholder="john@example.com" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-bold text-gray-700">Place of Residence <span className="text-red-500">*</span></label>
                        <input required name="residence" value={formData.residence} onChange={handleInputChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none" placeholder="e.g. Entebbe, Kitoro" />
                    </div>

                    <div className="md:col-span-2 pb-2 border-b border-gray-100 mt-2">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center">
                            <CreditCard className="w-5 h-5 mr-2 text-ministry-orange" /> Professional
                        </h3>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Occupation</label>
                        <input name="occupation" value={formData.occupation} onChange={handleInputChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none" placeholder="e.g. Engineer" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Place of Work</label>
                        <input name="placeOfWork" value={formData.placeOfWork} onChange={handleInputChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none" placeholder="e.g. Ministry Works" />
                    </div>

                    <div className="md:col-span-2 pb-2 border-b border-gray-100 mt-2">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center">
                            <Ticket className="w-5 h-5 mr-2 text-ministry-orange" /> Ministry Details
                        </h3>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Are you a Phaneroo member? <span className="text-red-500">*</span></label>
                        <select name="isPhanerooMember" value={formData.isPhanerooMember} onChange={handleInputChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none">
                            <option value="No">No</option>
                            <option value="Yes">Yes</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Born Again?</label>
                        <select name="bornAgain" value={formData.bornAgain} onChange={handleInputChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none">
                            <option value="No">No</option><option value="Yes">Yes</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Category</label>
                        <select name="category" value={formData.category} onChange={handleInputChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none">
                            <option value="First Timer">First Timer</option><option value="Member">Member</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Referral Source</label>
                        <input name="referralSource" value={formData.referralSource} onChange={handleInputChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none" placeholder="Invited by..." />
                    </div>
                </div>

                <div className="flex justify-end pt-6 border-t border-gray-100">
                    <button type="submit" className="px-10 py-4 bg-ministry-text text-white rounded-xl font-bold hover:bg-ministry-orange transition-colors shadow-lg flex items-center justify-center text-lg">
                        <Save className="w-5 h-5 mr-2" />
                        {selectedService ? 'Register & Check In' : 'Save to Database'}
                    </button>
                </div>
            </form>
        </div>
    );
}
