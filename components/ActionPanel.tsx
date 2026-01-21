
import React, { useState, useEffect } from 'react';
import { ModalType, MinistryEvent, User } from '../types';
import { X, Save, UserPlus, Calendar, Briefcase, Target, Lock, Phone, Mail, Loader2, Send } from 'lucide-react';
import { DEPARTMENTS } from '../constants';
import { supabase } from '../services/supabaseClient';

interface ActionPanelProps {
  modalType: ModalType;
  closeModal: () => void;
  onSave?: (data: any) => void;
  onSaveUser?: (data: User) => void;
  currentUser?: User | null;
}

const ActionPanel: React.FC<ActionPanelProps> = ({ modalType, closeModal, onSave, onSaveUser, currentUser }) => {
  const [formData, setFormData] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    description: '',
    location: 'Main Auditorium',
    targetCount: '',
    // User Form fields
    fullname: '',
    email: '',
    contact: '256', // Initialize with 256
    departmentId: '',
    role: 'Dept Admin'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = currentUser?.role === 'Administrator';
  const isTeamLeader = currentUser?.role === 'TeamLeader';

  // Reset form when modal opens
  useEffect(() => {
    setFormData({
      title: '',
      date: new Date().toISOString().split('T')[0],
      time: '09:00',
      description: '',
      location: 'Main Auditorium',
      targetCount: '',
      fullname: '',
      email: '',
      contact: '256', // Initialize with 256
      // If not admin/team leader, lock to current user's department
      departmentId: !isAdmin && !isTeamLeader && currentUser?.departmentId ? currentUser.departmentId : '',

      role: isTeamLeader ? 'Administrator' : 'Dept Admin' // Default role for Team Leader adds is Admin
    });
  }, [modalType, currentUser, isAdmin, isTeamLeader]);

  if (modalType === ModalType.NONE || modalType === ModalType.AI_INSIGHTS) return null;

  const getTitle = () => {
    switch (modalType) {
      case ModalType.CREATE_SERVICE: return 'Create New Service';
      case ModalType.CREATE_EVENT: return 'Plan Ministry Event';
      case ModalType.CREATE_PARTNERSHIP: return 'New Partnership Activity';
      case ModalType.ASSIGN_USER: return 'Assign User / Department';
      case ModalType.SET_TARGETS: return 'Set Soul Winning Targets';
      case ModalType.CREATE_USER: return isTeamLeader ? 'Add Administrator' : 'Add New System User';
      default: return '';
    }
  };

  const getIcon = () => {
    switch (modalType) {
      case ModalType.CREATE_SERVICE: return Calendar;
      case ModalType.CREATE_EVENT: return Calendar;
      case ModalType.CREATE_PARTNERSHIP: return Briefcase;
      case ModalType.ASSIGN_USER: return UserPlus;
      case ModalType.SET_TARGETS: return Target;
      case ModalType.CREATE_USER: return UserPlus;
      default: return Calendar;
    }
  };

  // Helper for contact validation
  const validateContact = (val: string) => {
    let digits = val.replace(/\D/g, '');
    if (digits.length > 13) digits = digits.slice(0, 13);
    if (digits.length > 0 && !digits.startsWith('256')) {
      return '256';
    }
    return digits;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'contact') {
      setFormData({ ...formData, contact: validateContact(value) });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async () => {
    if (modalType === ModalType.CREATE_SERVICE || modalType === ModalType.CREATE_EVENT) {
      const newEvent: MinistryEvent = {
        id: `e-${Date.now()}`,
        title: formData.title || (modalType === ModalType.CREATE_SERVICE ? 'New Service' : 'New Event'),
        type: modalType === ModalType.CREATE_SERVICE ? 'Service' : 'Event',
        date: formData.date,
        time: formData.time,
        location: formData.location,
        description: formData.description || 'No description provided.',
        stats: { attendees: 0, firstTimers: 0, soulsWon: 0, nextGen: 0, students: 0, expenditure: '$0.00' }
      };
      if (onSave) onSave(newEvent);
    } else if (modalType === ModalType.SET_TARGETS) {
      alert(`Target set to: ${formData.targetCount}`);
    } else if (modalType === ModalType.CREATE_USER) {
      if (!formData.email) {
        alert("Please enter an email address.");
        return;
      }
      setIsSubmitting(true);
      try {
        // 1. Generate Token
        const invitationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

        // 2. Create User Profile FIRST
        const newUser: User = {
          id: crypto.randomUUID(),
          name: formData.fullname,
          role: formData.role,
          departmentId: formData.departmentId,
          contact: formData.contact,
          email: formData.email,
          username: '', // Not set yet (triggers Setup flow)
          password: '',  // Not set yet
          invitationToken: invitationToken,
          status: 'Pending'
        };

        if (onSaveUser) {
          await onSaveUser(newUser);
        } else {
          // Fallback if onSaveUser not provided (should not happen in App.tsx usage)
          console.warn("No onSaveUser handler provided");
        }

        // 3. Send Magic Link (Delivery Mechanism Only)
        // We append the token to the redirect URL so it persists
        const { error } = await supabase.auth.signInWithOtp({
          email: formData.email,
          options: {
            emailRedirectTo: `${window.location.origin}/setup-account?token=${invitationToken}`
          }
        });

        if (error) throw error;

        alert(`Invite sent to ${formData.email}! They can click the link to sign in and set their password.`);
        closeModal();
      } catch (err: any) {
        console.error("Invite Error:", err);
        alert(`Failed to send invite: ${err.message}`);
      } finally {
        setIsSubmitting(false);
      }
      return; // Early return to handle async flow
    }
    closeModal();
  };

  const Icon = getIcon();

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-ministry-card w-full max-w-lg rounded-2xl border border-gray-200 shadow-2xl transform transition-all animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="bg-gray-100 p-2 rounded-lg border border-gray-200">
              <Icon className="w-5 h-5 text-ministry-orange" />
            </div>
            <h3 className="text-xl font-bold text-ministry-text">{getTitle()}</h3>
          </div>
          <button onClick={closeModal} className="text-gray-400 hover:text-gray-900 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {modalType === ModalType.SET_TARGETS && (
            <div className="bg-ministry-neon/10 border border-ministry-neon/30 p-4 rounded-xl mb-4">
              <p className="text-gray-800 text-sm font-medium">Pro Tip: Use AI Insights to get a recommended target based on current growth trends.</p>
            </div>
          )}

          {/* Common Field: Title / Name (Services/Events) */}
          {(modalType !== ModalType.ASSIGN_USER && modalType !== ModalType.SET_TARGETS && modalType !== ModalType.CREATE_USER) && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500">Name / Title</label>
              <input
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                type="text"
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-ministry-text focus:outline-none focus:border-ministry-orange focus:ring-1 focus:ring-ministry-orange transition-all"
                placeholder="Enter title..."
              />
            </div>
          )}

          {/* --- CREATE USER FORM (Dynamic based on Role) --- */}
          {modalType === ModalType.CREATE_USER && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-500">Full Name</label>
                <input
                  name="fullname"
                  value={formData.fullname}
                  onChange={handleInputChange}
                  type="text"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-ministry-text focus:outline-none focus:border-ministry-orange"
                  placeholder="e.g. John Doe"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-500">Email Address</label>
                <input
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  type="email"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-ministry-text focus:outline-none focus:border-ministry-orange"
                  placeholder="john@example.com"
                />
              </div>



              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-500">Contact</label>
                <input
                  name="contact"
                  value={formData.contact}
                  onChange={handleInputChange}
                  type="text"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-ministry-text focus:outline-none focus:border-ministry-orange"
                  placeholder="256..."
                />
              </div>

              {/* Hide Role/Dept selection for Team Leader when adding Admin */}
              {!isTeamLeader && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-500">Role</label>
                    <select name="role" value={formData.role} onChange={handleInputChange} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-ministry-text focus:outline-none focus:border-ministry-orange">
                      <option value="Dept Admin">Dept Admin</option>
                      <option value="Member">Member</option>
                      {isAdmin && <option value="Head of Dept">Head of Dept</option>}
                      {isAdmin && <option value="Administrator">Administrator</option>}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-500">Department</label>
                    <select
                      name="departmentId"
                      value={formData.departmentId}
                      onChange={handleInputChange}
                      disabled={!isAdmin}
                      className={`w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-ministry-text focus:outline-none focus:border-ministry-orange ${!isAdmin ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      <option value="">None</option>
                      {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </>
          )}

          {(modalType === ModalType.CREATE_SERVICE || modalType === ModalType.CREATE_EVENT) && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500">Date</label>
                  <input
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    type="date"
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-ministry-text focus:outline-none focus:border-ministry-orange"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500">Time</label>
                  <input
                    name="time"
                    value={formData.time}
                    onChange={handleInputChange}
                    type="time"
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-ministry-text focus:outline-none focus:border-ministry-orange"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-500">Location</label>
                <input
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  type="text"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-ministry-text focus:outline-none focus:border-ministry-orange"
                  placeholder="e.g. Main Auditorium"
                />
              </div>
            </>
          )}

          {modalType === ModalType.ASSIGN_USER && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500">Department</label>
              <select className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-ministry-text focus:outline-none focus:border-ministry-orange">
                <option>Select Department...</option>
                <option>Finance</option>
                <option>Registration</option>
                <option>Next Gen</option>
              </select>
            </div>
          )}

          {modalType === ModalType.SET_TARGETS && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500">Target Count</label>
              <input
                name="targetCount"
                value={formData.targetCount}
                onChange={handleInputChange}
                type="number"
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-ministry-text focus:outline-none focus:border-ministry-orange"
                placeholder="e.g. 5000"
              />
            </div>
          )}

          {(modalType === ModalType.CREATE_SERVICE || modalType === ModalType.CREATE_EVENT || modalType === ModalType.CREATE_PARTNERSHIP) && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500">Description / Notes</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-ministry-text h-24 focus:outline-none focus:border-ministry-orange"
                placeholder="Add details..."
              ></textarea>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
          <button onClick={closeModal} className="px-5 py-2.5 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors font-medium">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`px-5 py-2.5 rounded-xl bg-ministry-orange text-white font-bold hover:bg-orange-600 transition-colors flex items-center shadow-lg shadow-orange-500/30 ${isSubmitting ? 'opacity-70 cursor-wait' : ''}`}
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> :
              modalType === ModalType.CREATE_USER ? <Send className="w-4 h-4 mr-2" /> :
                <Save className="w-4 h-4 mr-2" />}
            {isTeamLeader && modalType === ModalType.CREATE_USER ? (isSubmitting ? 'Sending...' : 'Invite Administrator') :
              modalType === ModalType.CREATE_USER ? (isSubmitting ? 'Sending...' : 'Send Invite') :
                'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActionPanel;
