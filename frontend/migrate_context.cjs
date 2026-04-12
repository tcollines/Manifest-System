const fs = require('fs');

const code = fs.readFileSync('components/RegistrationDashboard.tsx', 'utf8');

const topImports = `import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';
import { showToast } from '../utils/toast';
// Stores
import MemberStore from '../database/memberStore';
import LogisticsStore from '../database/logisticsStore';
import VehicleStore from '../database/vehicleStore';
import EventStore from '../database/eventStore';
import ManifestStore from '../database/manifestStore';
import SoulsStore from '../database/soulsStore';
import UserStore from '../database/userStore';

// Types
import { Member, Passenger, ExtendedStation, Vehicle, PersonalVehicle, MinistryEvent, User } from '../types';
import { validateContact, validateDriverIdentity } from '../utils/validation';

// Components
import NumberPlateInput from '../components/NumberPlateInput';
import EventDetailsModal from '../components/EventDetailsModal';
import PhoneInput from '../components/PhoneInput';
import ManualCountModal from '../components/ManualCountModal';

import {
  CalendarPlus,
  Key,
  Calendar,
  CheckCircle,
  History,
  UserIcon,
  BarChart3,
  CalendarCheck,
  Users,
  ArrowLeft,
  Eye,
  Trash2,
  Loader2,
  Search,
  Download,
  FileSpreadsheet,
  Plus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useEvent } from '../../context/EventContext';

export const RegistrationContext = createContext<any>(null);

export const useRegistration = () => {
    const ctx = useContext(RegistrationContext);
    if (!ctx) throw new Error('useRegistration must be used inside RegistrationProvider');
    return ctx;
};

interface RegistrationProviderProps {
  children: React.ReactNode;
}
`;

// Extract everything from 'const RegistrationDashboard =' to the 'return (' statement
const startIdx = code.indexOf('const RegistrationDashboard');
const returnIdx = code.indexOf('      <div className="flex flex-col min-h-screen bg-gray-50 pb-20">');

if (startIdx === -1 || returnIdx === -1) {
  console.log('Failed to find boundaries');
  process.exit(1);
}

let providerBody = code.substring(startIdx, returnIdx);

// Replace signature
providerBody = providerBody.replace(/const RegistrationDashboard:\s*React\.FC<RegistrationDashboardProps>\s*=\s*\([^)]*\)\s*=>\s*\{/g, `export const RegistrationProvider: React.FC<RegistrationProviderProps> = ({ children }) => {\n  const { user: currentUser } = useAuth();\n  const { events, refreshEvents: refreshParentData } = useEvent();\n  const urlTab = new URLSearchParams(window.location.search).get('tab');`);

// Delete old props destructuring
providerBody = providerBody.replace(/const { events, currentUser, refreshParentData, urlTab } = props;/g, '');

// Collect all state variables to build the context default value
// This includes all variables defined as `const [foo, setFoo] = useState`
// and functions like `handleSomething`
// It is simpler to just expose everything.
// We'll create a regex to collect all top level `const xyz = ` or `function xyz`
const variablesToExport = [];
let match;
const regexConst = /(?:const|let)\s+\[([a-zA-Z0-9_]+),\s*([a-zA-Z0-9_]+)\]\s*=/g;
while ((match = regexConst.exec(providerBody)) !== null) {
  variablesToExport.push(match[1]);
  variablesToExport.push(match[2]);
}

const functionNames = [
  'handleSelectStation',
  'handleOpenService',
  'handleDownloadHighlights',
  'handleBackLogistics',
  'handleBackRegistration',
  'handlePrintManifest',
  'handleInputChange',
  'handleRegister',
  'handleSelectAll',
  'handleSelectOne',
  'handleDeleteSelected',
  'handleViewMember',
  'handleUpdateMember',
  'handleExportMembers',
  'handleCheckIn',
  'handleUndoCheckIn',
  'handleAddStation',
  'handleDeleteStation',
  'handleAddExtraEntrant',
  'handleAddVehicle',
  'handleDeleteVehicle',
  'handleAddPassenger',
  'handleDeletePassenger',
  'handleUpdateChildrenCount',
  'handleAddEvent',
  'handleDeleteEvent',
  'handleApproveVehicle',
  'openAddMember',
  'openAddStudent',
  'openAddInstitution'
];
variablesToExport.push(...functionNames);

// additional values
variablesToExport.push(
  'isLogisticsRole', 'canDeleteLogistics', 'effectiveTab', 'services', 'logisticsEvents',
  'debouncedSearchQuery', 'itemsPerPage'
);

// We'll just define the return statement
let finalReturn = `
  const contextValue = {
    events,
    currentUser,
    refreshParentData,
    urlTab,
    ${[...new Set(variablesToExport)].join(',\\n    ')}
  };

  return (
    <RegistrationContext.Provider value={contextValue}>
      {children}
`;

// Get the Modals from the bottom of return statement
const modalsStartIdx = code.indexOf('        {/* Modals (Add Station, Entrant, Vehicle, Passenger) */}');
const endIdx = code.lastIndexOf('      <EventDetailsModal');
let modalsCode = '';
if (modalsStartIdx !== -1 && endIdx !== -1) {
  // Grab up to the end of EventDetailsModal
  const absoluteEndIdx = code.indexOf('/>', endIdx) + 2;
  modalsCode = code.substring(modalsStartIdx, absoluteEndIdx);
}

finalReturn += modalsCode + '\n    </RegistrationContext.Provider>\n  );\n};\n';

fs.writeFileSync('modules/registration/RegistrationContext.tsx', topImports + '\n' + providerBody + finalReturn);
console.log('Successfully wrote RegistrationContext.tsx');
