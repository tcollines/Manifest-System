const fs = require('fs');

const code = fs.readFileSync('components/RegistrationDashboard.tsx', 'utf8');

const s1 = 'const RegistrationDashboard: React.FC<RegistrationDashboardProps> = ({ events, currentUser, onOpenModal, refreshParentData, urlTab }) => {';
const s2 = '  return (\n    <div className="p-4 md:p-8 space-y-6 md:space-y-8 animate-in fade-in duration-500 relative pb-20 md:pb-8">';
const sDeleteModal = '      {/* Delete Modal */}';
const eManualModal = '      <div className="flex justify-between items-center">';
const sBottomModals = '        {/* Modals (Add Station, Entrant, Vehicle, Passenger) */}';

const idx1 = code.indexOf(s1);
const idx2 = code.indexOf(s2);
const idx3 = code.indexOf(sDeleteModal);
const idx4 = code.indexOf(eManualModal);
const idx5 = code.indexOf(sBottomModals);
// End Modals: Last EventDetailsModal component end
const endModalsTag = '<EventDetailsModal\n            isOpen={showHighlights}\n            onClose={() => { setShowHighlights(false); setHighlightEvent(null); }}\n            event={highlightEvent}\n          />';
const idx6 = code.indexOf(endModalsTag) + endModalsTag.length;

if (idx1 === -1 || idx2 === -1 || idx3 === -1 || idx4 === -1 || idx5 === -1 || idx6 === -1) {
  console.log('Failed to find boundaries');
  console.log({idx1, idx2, idx3, idx4, idx5, idx6});
  process.exit(1);
}

// Extract the state logic:
let stateLogic = code.substring(idx1 + s1.length, idx2);
// Remove useNotification from extracted logic since we'll put it at the top
stateLogic = stateLogic.replace('const { showToast, confirm: askConfirm } = useNotification();', '');


// Extract modals logic:
let topModals = code.substring(idx3, idx4);
let bottomModals = code.substring(idx5, idx6);

const variablesToExport = [
  'events', 'currentUser', 'refreshParentData', 'urlTab',
  'isLogisticsRole', 'canDeleteLogistics', 'effectiveTab', 'isMember', 'canCreateService',
  'services', 'logisticsEvents', 'debouncedSearchQuery', 'abortControllerRef', 'refreshData',
  'sortEvents'
];
let match;
const regexConst = /(?:const|let)\s+\[\s*([a-zA-Z0-9_]+)\s*,\s*([a-zA-Z0-9_]+)\s*\]\s*=/g;
while ((match = regexConst.exec(stateLogic)) !== null) {
  variablesToExport.push(match[1]);
  variablesToExport.push(match[2]);
}

const regexHandle = /(?:const\s+((?:handle|open|close|confirm|validate)[a-zA-Z0-9_]+)\s*=\s*(?:async)?\s*(?:\([^()]*\)|[a-zA-Z0-9_]+)\s*=>)/g;
while ((match = regexHandle.exec(stateLogic)) !== null) {
  variablesToExport.push(match[1]);
}

// Add simple consts
const regexSimpleConst = /const\s+([a-zA-Z0-9_]+)\s*=\s*(?:useRef|useSearchParams)/g;
while ((match = regexSimpleConst.exec(stateLogic)) !== null) {
  variablesToExport.push(match[1]);
}
variablesToExport.push('itemsPerPage');

let contextFile = `import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';
import { useNotification } from '../context/NotificationContext';
// Stores
import MemberStore from '../database/memberStore';
import LogisticsStore from '../database/logisticsStore';
import VehicleStore from '../database/vehicleStore';
import EventStore from '../database/eventStore';
import ManifestStore from '../database/manifestStore';
import SoulsStore from '../database/soulsStore';
import UserStore from '../database/userStore';

import { useAuth } from '../../context/AuthContext';
import { useEvent } from '../../context/EventContext';

// Types
import { Member, Passenger, ExtendedStation, Vehicle, PersonalVehicle, MinistryEvent, User } from '../types';
import { validateContact, validateDriverIdentity } from '../utils/validation';

// Components
import NumberPlateInput from './NumberPlateInput';
import EventDetailsModal from './EventDetailsModal';
import PhoneInput from './PhoneInput';
import ManualCountModal from './ManualCountModal';

import {
  CalendarPlus, Key, Calendar, CheckCircle, History, UserIcon, BarChart3,
  CalendarCheck, Users, ArrowLeft, Eye, Trash2, Loader2, Search, Download,
  FileSpreadsheet, Plus, AlertTriangle
} from 'lucide-react';

export const RegistrationContext = createContext<any>(null);

export const useRegistration = () => {
    const ctx = useContext(RegistrationContext);
    if (!ctx) throw new Error('useRegistration must be used inside RegistrationProvider');
    return ctx;
};

interface RegistrationProviderProps {
  children: React.ReactNode;
}

export const RegistrationProvider: React.FC<RegistrationProviderProps> = ({ children }) => {
  const { user: currentUser } = useAuth();
  const { events, refreshEvents: refreshParentData } = useEvent();
  const [params] = useSearchParams();
  const urlTab = params.get('tab') as any;
  const { showToast, confirm: askConfirm } = useNotification();

${stateLogic}

  const contextValue = {
    ${[...new Set(variablesToExport)].join(', \n    ')}
  };

  return (
    <RegistrationContext.Provider value={contextValue}>
      {children}
${topModals}
${bottomModals}
    </RegistrationContext.Provider>
  );
};
`;

fs.writeFileSync('modules/registration/RegistrationContext.tsx', contextFile);
console.log('Successfully wrote RegistrationContext.tsx');
