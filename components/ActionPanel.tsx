
import React, { useState, useEffect } from 'react';
import { useNotification } from './ui/NotificationSystem';
import PhoneInput from './PhoneInput';
import { ModalType, MinistryEvent, User } from '../types';
import { X, Save, UserPlus, Calendar, Briefcase, Target, Lock, Phone, Mail, Loader2, Send } from 'lucide-react';
import { DEPARTMENTS } from '../constants';
import { supabase } from '../services/supabaseClient';

interface ActionPanelProps {
  modalType: ModalType;
  closeModal: () => void;
  onSave?: (data: any) => void;
  onSaveUser?: (data: User) => void;
  onUpdateUser?: (data: User) => void;
  currentUser?: User | null;
  targetUser?: User | null;
}

const ActionPanel: React.FC<ActionPanelProps> = ({ modalType, closeModal, onSave, onSaveUser, onUpdateUser, currentUser, targetUser }) => {
  const { showToast } = useNotification();
  const [formData, setFormData] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    description: '',
    location: 'Main Auditorium',
    targetCount: '',
    serviceNumber: '',
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
      serviceNumber: '',
      fullname: '',
      email: '',
      contact: '256', // Initialize with 256
      // If not admin/team leader, lock to current user's department
      departmentId: !isAdmin && !isTeamLeader && currentUser?.departmentId ? currentUser.departmentId : '',

      role: isTeamLeader ? 'Administrator' : 'Dept Admin' // Default role for Team Leader adds is Admin
    });
  }, [modalType, currentUser, isAdmin, isTeamLeader]);

  // Populate data when Editing
  useEffect(() => {
    if (modalType === ModalType.EDIT_USER && targetUser) {
      setFormData(prev => ({
        ...prev,
        fullname: targetUser.name,
        email: targetUser.email || '',
        contact: targetUser.contact || '',
        departmentId: targetUser.departmentId || '',
        role: targetUser.role
      }));
    }
  }, [modalType, targetUser]);

  if (modalType === ModalType.NONE || modalType === ModalType.AI_INSIGHTS) return null;

  const getTitle = () => {
    switch (modalType) {
      case ModalType.CREATE_SERVICE: return 'Create New Service';
      case ModalType.CREATE_EVENT: return 'Plan Ministry Event';
      case ModalType.CREATE_PARTNERSHIP: return 'New Partnership Activity';
      case ModalType.ASSIGN_USER: return 'Assign User / Department';
      case ModalType.SET_TARGETS: return 'Set Soul Winning Targets';
      case ModalType.CREATE_USER: return isTeamLeader ? 'Add Administrator' : 'Add New System User';
      case ModalType.EDIT_USER: return 'Edit User Details';
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
      case ModalType.EDIT_USER: return UserPlus; // or EditIcon if imported
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
        stats: { attendees: 0, firstTimers: 0, soulsWon: 0, nextGen: 0, students: 0, expenditure: '$0.00' },
        serviceNumber: formData.serviceNumber ? parseInt(formData.serviceNumber) : undefined
      };
      if (onSave) onSave(newEvent);
    } else if (modalType === ModalType.SET_TARGETS) {
      showToast(`Target set to: ${formData.targetCount}`, 'success');
    } else if (modalType === ModalType.CREATE_USER) {
      if (!formData.email) {
        showToast("Please enter an email address.", 'error');
        return;
      }

      const cleanEmail = formData.email.trim();
      const cleanName = formData.fullname.trim();
      const cleanContact = formData.contact.trim();

      // Mandate Contact Field
      if (!cleanContact || cleanContact === '256' || cleanContact.length <= 3) {
        showToast("Contact number is required for new users.", 'error');
        return;
      }

      // Basic Email Validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        showToast("Please enter a valid email address.", 'error');
        return;
      }
      if (cleanEmail.startsWith('www.')) {
        showToast("Email addresses should not start with 'www.'. Please enter a valid email (e.g. name@gmail.com).", 'error');
        return;
      }

      setIsSubmitting(true);
      try {
        // 1. Generate Token
        const invitationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

        // 2. Create User Profile FIRST
        const newUser: User = {
          id: crypto.randomUUID(),
          name: cleanName,
          role: formData.role,
          departmentId: formData.departmentId,
          contact: cleanContact,
          createdBy: currentUser?.id, // Track who added the user
          email: cleanEmail,
          username: undefined, // Not set yet (triggers Setup flow)
          password: `PENDING_${invitationToken}`,  // Placeholder to satisfy NOT NULL constraint
          invitationToken: invitationToken,
          status: 'Pending'
        };

        if (onSaveUser) {
          await onSaveUser(newUser);
        } else {
          // Fallback if onSaveUser not provided (should not happen in App.tsx usage)
          console.warn("No onSaveUser handler provided");
        }

        // 3. No Invite Sent (User will use Google Login)
        showToast(`User "${cleanName}" added. They can now login with Google.`, 'success');

        closeModal();
      } catch (err: any) {
        console.error("User Creation Error:", err);
        showToast(`Failed to create user: ${err.message}`, 'error');
      } finally {
        setIsSubmitting(false);
      }
      return; // Early return to handle async flow
    } else if (modalType === ModalType.EDIT_USER && targetUser) {
      setIsSubmitting(true);
      try {
        const updatedUser: User = {
          ...targetUser,
          role: formData.role,
          departmentId: formData.departmentId,
          // name, contact could be updated too if desired, but sticking to prompt scope for now?
          // Let's allow updating name/contact too as it's standard
          name: formData.fullname,
          contact: formData.contact,
          email: formData.email // Identity, usually locked but let's allow
        };

        if (onUpdateUser) {
          await onUpdateUser(updatedUser);
        }
        closeModal();
      } catch (e: any) {
        console.error("Update Error:", e);
        showToast("Failed to update user", 'error');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }
    closeModal();
  };

  const Icon = getIcon();

  const isCreator = currentUser?.id === targetUser?.createdBy; // Kept for legacy/fallback reference if needed, but primary logic is Role-based now.
  // Refined Permissions Logic
  const isHeadOfTheirDept = modalType === ModalType.CREATE_USER ? (currentUser?.role === 'Head of Dept') : (currentUser?.role === 'Head of Dept' && currentUser?.departmentId === targetUser?.departmentId);
  const isDeptAdminOfTheirDept = modalType === ModalType.CREATE_USER ? (currentUser?.role === 'Dept Admin') : (currentUser?.role === 'Dept Admin' && (targetUser ? currentUser?.departmentId === targetUser.departmentId : true));

  const isTargetTeamLeader = targetUser?.role === 'TeamLeader';
  const isSelf = currentUser?.id === targetUser?.id;

  // Permissions
  // 1. Team Leader: Can edit everything (except themselves target is TL logic below).
  // 2. Administrator: Can edit Role AND Department of anyone (except TL).
  // 3. Head of Dept / Dept Admin: Can edit Role ONLY, and ONLY for members of their own department.

  let canEditRole = isTeamLeader || isAdmin || isHeadOfTheirDept || isDeptAdminOfTheirDept;
  let canEditDept = isTeamLeader || isAdmin;
  let canEditProfile = true;

  // Team Leader Protection Rules
  if (isTargetTeamLeader) {
    // Rule: Team Leader Role and Department are immutable via this UI
    // "administrator cannot edit the team leader role... he [TL] cannot edit his role"
    canEditRole = false;
    canEditDept = false;

    // Rule: "Only he [TL] can edit [himself]"
    // If target is TL, ONLY the TL themselves can edit the profile details.
    if (!isSelf) {
      canEditProfile = false;
    }
  }

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
          {(modalType !== ModalType.ASSIGN_USER && modalType !== ModalType.SET_TARGETS && modalType !== ModalType.CREATE_USER && modalType !== ModalType.EDIT_USER) && (
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

          {/* --- CREATE / EDIT USER FORM (Dynamic based on Role) --- */}
          {(modalType === ModalType.CREATE_USER || modalType === ModalType.EDIT_USER) && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-500">Full Name</label>
                <input
                  name="fullname"
                  value={formData.fullname}
                  onChange={handleInputChange}
                  disabled={!canEditProfile}
                  type="text"
                  className={`w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-ministry-text focus:outline-none focus:border-ministry-orange ${!canEditProfile ? 'opacity-60 bg-gray-100 cursor-not-allowed' : ''}`}
                  placeholder="e.g. John Doe"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-500">Email Address</label>
                <input
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={!canEditProfile && modalType !== ModalType.CREATE_USER} // Allow create always (implied)
                  type="email"
                  className={`w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-ministry-text focus:outline-none focus:border-ministry-orange ${!canEditProfile && modalType !== ModalType.CREATE_USER ? 'opacity-60 bg-gray-100 cursor-not-allowed' : ''}`}
                  placeholder="john@example.com"
                />
              </div>



              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-500">Contact</label>
                <PhoneInput
                  value={formData.contact}
                  onChange={(val) => setFormData({ ...formData, contact: val })}
                  disabled={!canEditProfile}
                  placeholder="700 000 000"
                />
              </div>

              {/* Hide Role/Dept selection for Team Leader when adding Admin, but SHOW if Editing */}
              {(!isTeamLeader || modalType === ModalType.EDIT_USER) && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-500">Role</label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      disabled={!canEditRole}
                      className={`w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-ministry-text focus:outline-none focus:border-ministry-orange ${!canEditRole ? 'opacity-60 bg-gray-100 cursor-not-allowed' : ''}`}
                    >
                      {/* Dynamic Role Options based on Permissions */}
                      {(() => {
                        const allRoles = ['Dept Admin', 'Member', 'Head of Dept', 'Administrator', 'TeamLeader', 'Logistics', 'Coordinator'];
                        let allowedRoles = allRoles;

                        if (isAdmin || isTeamLeader) {
                          allowedRoles = allRoles;
                        } else if (currentUser?.role === 'Head of Dept') {
                          allowedRoles = ['Dept Admin', 'Member'];
                        } else if (currentUser?.role === 'Dept Admin') {
                          allowedRoles = ['Member'];
                        }

                        // Ensure current value is shown even if technically not allowed (e.g. viewing someone else), or fall back
                        // But for editing/creating, we restrict.

                        return allowedRoles.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ));
                      })()}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-500">Department</label>
                    <select
                      name="departmentId"
                      value={formData.departmentId}
                      onChange={handleInputChange}
                      disabled={!canEditDept}
                      className={`w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-ministry-text focus:outline-none focus:border-ministry-orange ${!canEditDept ? 'opacity-60 bg-gray-100 cursor-not-allowed' : ''}`}
                    >
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

              {modalType === ModalType.CREATE_SERVICE && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500">Service Number (e.g. 376)</label>
                  <input
                    name="serviceNumber"
                    value={formData.serviceNumber}
                    onChange={handleInputChange}
                    type="number"
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-ministry-text focus:outline-none focus:border-ministry-orange"
                    placeholder="376"
                  />
                </div>
              )}
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
            disabled={isSubmitting || (!canEditProfile && !canEditRole && !canEditDept && modalType === ModalType.EDIT_USER)}
            className={`px-5 py-2.5 rounded-xl bg-ministry-orange text-white font-bold hover:bg-orange-600 transition-colors flex items-center shadow-lg shadow-orange-500/30 ${(isSubmitting || (!canEditProfile && !canEditRole && !canEditDept && modalType === ModalType.EDIT_USER)) ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> :
              modalType === ModalType.CREATE_USER ? <Send className="w-4 h-4 mr-2" /> :
                <Save className="w-4 h-4 mr-2" />}
            {isTeamLeader && modalType === ModalType.CREATE_USER ? (isSubmitting ? 'Adding...' : 'Add Administrator') :
              modalType === ModalType.CREATE_USER ? (isSubmitting ? 'Adding...' : 'Add User') :
                'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActionPanel;
