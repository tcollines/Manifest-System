import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useNotification } from '../../../components/ui/NotificationSystem';
import { apiFetch } from '../../../services/api';
import { MapPin, User, Phone, CheckCircle, ShieldAlert, Plus, Trash2, Car, Users } from 'lucide-react';
import PhoneInput from '../../../components/PhoneInput';
import NumberPlateInput from '../../../components/NumberPlateInput';

interface PassengerInput {
  id: string;
  name: string;
  contact: string;
  residence: string;
  isFirstTime: boolean;
}

export default function PublicPrivateRegistration() {
  const { eventId } = useParams<{ eventId: string }>();
  const { showToast } = useNotification();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [event, setEvent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [transportMode, setTransportMode] = useState<'Private Car' | 'Public Transport' | null>(null);
  const [numberPlate, setNumberPlate] = useState('');
  
  const [passengers, setPassengers] = useState<PassengerInput[]>([{
    id: Date.now().toString(),
    name: '',
    contact: '',
    residence: '',
    isFirstTime: false
  }]);

  useEffect(() => {
    fetchEventDetails();
  }, [eventId]);

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/public/events/${eventId}`);
      
      if (!res || !res.id) {
        setError('Event not found or link is invalid.');
        return;
      }
      
      setEvent(res);
    } catch (err: any) {
      setError('This registration link has expired or is invalid.');
    } finally {
      setLoading(false);
    }
  };

  const addPassengerRow = () => {
    setPassengers([...passengers, {
      id: Date.now().toString(),
      name: '',
      contact: '',
      residence: '',
      isFirstTime: false
    }]);
  };

  const removePassengerRow = (id: string) => {
    if (passengers.length === 1) return;
    setPassengers(passengers.filter(p => p.id !== id));
  };

  const updatePassenger = (id: string, field: keyof PassengerInput, value: any) => {
    setPassengers(passengers.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transportMode) {
      showToast("Please select your transport means", "error");
      return;
    }

    if (transportMode === 'Private Car' && !numberPlate.trim()) {
      showToast("Please enter the car number plate", "error");
      return;
    }

    const validPassengers = passengers.filter(p => p.name.trim() !== '');
    if (validPassengers.length === 0) {
      showToast("Please add at least one passenger name", "error");
      return;
    }

    const finalTransportMeans = transportMode === 'Private Car' 
      ? `Private Car (${numberPlate.toUpperCase()})` 
      : 'Public Transport';

    const payloadPassengers = validPassengers.map(p => ({
      ...p,
      transportMeans: finalTransportMeans,
      category: 'Member'
    }));

    try {
      setSubmitting(true);
      await apiFetch(`/public/events/${eventId}/passengers`, {
        method: 'POST',
        body: JSON.stringify({
          eventId,
          passengers: payloadPassengers
        })
      });

      setSuccess(true);
      showToast("Registration successful! Thank you.", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to submit registration", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-ministry-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ministry-orange"></div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-ministry-black flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center max-w-md w-full shadow-lg">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Link Expired</h2>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-ministry-black flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-green-100 text-center max-w-md w-full shadow-lg">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Complete</h2>
          <p className="text-gray-600 mb-6">
            Your details have been successfully recorded for {event.title}.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-ministry-orange text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition-colors shadow-sm"
          >
            Register Another Group
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ministry-black text-gray-900 py-6 sm:py-10 px-4 sm:px-6 lg:px-8 overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <img src="/MANIFEST.png" alt="Manifest" className="h-12 sm:h-16 mx-auto mb-4 sm:mb-6" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">
            {event.title}
          </h1>
          <p className="text-ministry-orange font-bold text-md sm:text-lg">Private Commuter Registration</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
          
          <div className="bg-white rounded-2xl p-5 sm:p-8 border border-gray-200 shadow-sm">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-5 flex items-center">
              <Car className="mr-3 text-ministry-orange" />
              Transport Mode <span className="text-red-500 ml-1">*</span>
            </h2>
            
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
              <button
                type="button"
                onClick={() => setTransportMode('Private Car')}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center space-y-2 ${
                  transportMode === 'Private Car' 
                    ? 'border-ministry-orange bg-orange-50' 
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                }`}
              >
                <Car className={transportMode === 'Private Car' ? 'text-ministry-orange' : 'text-gray-400'} size={28} />
                <span className={`font-bold ${transportMode === 'Private Car' ? 'text-gray-900' : 'text-gray-500'}`}>
                  Private Car
                </span>
              </button>
              
              <button
                type="button"
                onClick={() => setTransportMode('Public Transport')}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center space-y-2 ${
                  transportMode === 'Public Transport' 
                    ? 'border-ministry-orange bg-orange-50' 
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                }`}
              >
                <Users className={transportMode === 'Public Transport' ? 'text-ministry-orange' : 'text-gray-400'} size={28} />
                <span className={`font-bold ${transportMode === 'Public Transport' ? 'text-gray-900' : 'text-gray-500'}`}>
                  Public Transport
                </span>
              </button>
            </div>

            {transportMode === 'Private Car' && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Car Number Plate <span className="text-red-500">*</span>
                </label>
                <NumberPlateInput
                  value={numberPlate}
                  onChange={(val: string) => setNumberPlate(val)}
                />
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-5 sm:p-8 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center">
                <Users className="mr-3 text-ministry-orange" />
                Passengers List
              </h2>
            </div>

            <div className="space-y-5">
              {passengers.map((passenger, index) => (
                <div key={passenger.id} className="p-4 sm:p-5 rounded-xl border border-gray-200 bg-gray-50 relative group">
                  {passengers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePassengerRow(passenger.id)}
                      className="absolute -right-2 -top-2 w-8 h-8 bg-white text-red-500 hover:bg-red-50 hover:text-red-600 rounded-full flex items-center justify-center transition-colors border border-gray-200 shadow-sm"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User size={16} className="text-gray-400" />
                        </div>
                        <input
                          type="text"
                          required
                          value={passenger.name}
                          onChange={(e) => updatePassenger(passenger.id, 'name', e.target.value)}
                          className="w-full bg-white border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-ministry-orange/20 focus:border-ministry-orange transition-colors shadow-sm"
                          placeholder="Passenger Name"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Contact Number
                      </label>
                        <PhoneInput
                          value={passenger.contact}
                          onChange={(val: string) => updatePassenger(passenger.id, 'contact', val)}
                        />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Place of Residence
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <MapPin size={16} className="text-gray-400" />
                        </div>
                        <input
                          type="text"
                          value={passenger.residence}
                          onChange={(e) => updatePassenger(passenger.id, 'residence', e.target.value)}
                          className="w-full bg-white border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-ministry-orange/20 focus:border-ministry-orange transition-colors shadow-sm text-sm"
                          placeholder="e.g., Kisaasi, Kampala"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-2 pt-1">
                      <div className="flex items-center justify-between sm:justify-start sm:space-x-4 bg-white px-4 py-3 rounded-lg border border-gray-200 shadow-sm">
                        <span className="text-sm font-bold text-gray-700">Is this their First Time?</span>
                        <button
                          type="button"
                          onClick={() => updatePassenger(passenger.id, 'isFirstTime', !passenger.isFirstTime)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ministry-orange ${
                            passenger.isFirstTime ? 'bg-ministry-orange' : 'bg-gray-300'
                          }`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            passenger.isFirstTime ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addPassengerRow}
              className="mt-5 flex items-center justify-center w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:text-ministry-orange hover:border-ministry-orange hover:bg-orange-50 transition-all font-bold"
            >
              <Plus size={20} className="mr-2" />
              Add Another Passenger
            </button>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center py-4 bg-ministry-orange text-white rounded-xl font-bold text-lg shadow-md hover:bg-orange-600 focus:outline-none focus:ring-4 focus:ring-ministry-orange/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              ) : (
                'Submit Registration'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
