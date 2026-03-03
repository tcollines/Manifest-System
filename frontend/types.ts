
export interface KPI {
  id: string;
  label: string;
  value: string | number;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: string;
}



export interface VolunteerAttendance {
  id: string;
  date: string;
  volunteerId: string;
  serviceId: string;
  role: string;
  status: 'Present' | 'Late' | 'Absent';
  notes?: string;
  timestamp?: string;
  manifestId?: string;
}

export interface ChartData {
  name: string;
  value: number;
  secondaryValue?: number; // e.g. Thursday vs Sunday
}

export interface ActivityLog {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  type: 'service' | 'event' | 'partnership' | 'admin';
}

export interface DepartmentRequest {
  id: string;
  department: string;
  requester: string;
  amount: string;
  reason: string;
  date: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export interface EventStats {
  attendees: number;
  firstTimers: number;
  soulsWon: number;
  students?: number; // Event only
  vehicles?: number; // Calculated dynamically
  institutions?: number; // Calculated dynamically
  expenditure?: string; // Event only
  nextGen?: number; // Service only
  manualChildrenCount?: number; // Manually added count for NextGen
}

export interface MinistryEvent {
  id: string;
  title: string;
  type: 'Service' | 'Event';
  date: string;
  time: string;
  location: string;
  description: string;
  stats: EventStats;
  serviceNumber?: number;
  createdAt?: string; // Mapped from DB created_at, useful for sorting
}

export interface User {
  id: string;
  name: string;
  role: string;
  manifestId?: string;
  departmentId?: string; // Legacy Code (e.g. 'd1')
  departmentUid?: string; // New UUID
  // Credentials & Contact
  username?: string;
  password?: string;
  contact?: string;
  email?: string;
  // Logistics
  stationId?: string;
  eventId?: string; // Links coordinator to a specific event/operation
  invitationToken?: string;
  status?: 'Active' | 'Pending';
  createdBy?: string;
}

export interface Member {
  id: string;
  name: string;
  category: 'Member' | 'First Timer' | 'Guest';
  phone: string;
  status: 'Checked In' | 'Absent';
  checkInTime?: string;
  // Extended Fields
  gender?: 'Male' | 'Female';
  createdAt?: string;
  residency?: string;
  email?: string;
  occupation?: string;
  placeOfWork?: string;
  bornAgain?: 'Yes' | 'No';
  referralSource?: string;
  isPhanerooMember?: 'Yes' | 'No';
  // Analytics
  joinedDate?: string;
  attendedServiceIds?: string[];
  currentServiceId?: string;
  firstTimerServiceId?: string;
}

export interface Child {
  id: string;
  name: string;
  parentName: string;
  parentContact: string;
  age: number;
  gender: 'Male' | 'Female';
  category?: 'Member' | 'First Timer' | 'Guest'; // Added Category
  residence: string;
  allergies?: string;
  status: 'Checked In' | 'Checked Out' | 'Absent';
  checkInTime?: string;
  checkOutTime?: string;
  joinedDate: string;
  attendedServiceIds: string[];
  currentServiceId?: string;
  // New Fields for Follow Up & Care
  followUpStatus?: 'Pending' | 'Called' | 'Message Sent' | 'Visited';
  assignedTo?: string; // Volunteer ID/Name
  salvationDate?: string;
  careNotes?: CareNote[];
  absenceReason?: string;
  howHeard?: string;
}

export interface CareNote {
  id: string;
  date: string;
  author: string;
  note: string;
  type: 'Observation' | 'Prayer' | 'Incident' | 'Communication';
}

export type JourneyStage = 'Onboarding' | 'Verifying' | 'RegApproval' | 'FinanceApproval' | 'Transit' | 'Arrived' | 'Completed';

export interface VehicleFinance {
  ongoingDispatch: string;
  ongoingBalance: string;
  returnDispatch: string;
  returnBalance: string;
  processedAt?: string;
}

// Transportation Module Vehicle
export interface Vehicle {
  id: string;
  stationId: string;
  eventId?: string; // Links vehicle to a specific event
  number_plate: string;
  driverName: string;
  driverContact: string;
  driverNin?: string; // Added field
  type: 'Car' | 'Taxi' | 'Coaster' | 'Bus';
  coordinator: string;
  coordinatorUid?: string; // ID for robust matching
  coordinatorContact?: string; // Snapshot of contact info
  timeArrival: string;
  passengerCount?: number;
  status?: 'Pending' | 'Approved' | 'En Route' | 'Arrived' | 'Completed'; // Vehicle operation status

  // New Journey Fields
  journeyDirection?: 'Ongoing' | 'Return';
  currentStage?: JourneyStage;
  approvals?: {
    registration: 'Pending' | 'Approved';
    finance: 'Pending' | 'Approved';
  };
  location?: { lat: number; lng: number }; // For map simulation
  financeDetails?: VehicleFinance;

  // Journey Timestamps
  ongoingStartTime?: string;
  ongoingArrivalTime?: string;
  returnStartTime?: string;
  returnArrivalTime?: string;
  childrenCount?: number;
}

// Parking Module Vehicle
export interface PersonalVehicle {
  id: string;
  number_plate: string;
  driverName: string;
  driverContact: string;
  status: 'Checked In' | 'Checked Out' | 'Absent';
  checkInTime?: string;
  checkOutTime?: string;
  currentServiceId?: string;
  registeredDate: string;
  attendedServiceIds?: string[]; // History of attendance
}

export interface VehicleAttendance {
  id: string;
  vehicleId: string;
  serviceId: string;
  checkInTime: string;
  checkOutTime?: string;
}

export interface Passenger {
  id: string;
  vehicleId: string;
  category: 'Member' | 'Student' | 'Institution';
  name: string;
  contact: string;
  residence: string;
  isFirstTime: 'Yes' | 'No';
  verified?: boolean;
  // Student Specifics
  school?: string;
  studentClass?: string;
  boardingType?: 'Day' | 'Boarding';
  gender?: 'Male' | 'Female';
  soulWon?: boolean;
  parentContact?: string;
  eventId?: string; // Links passenger to specific event
  stationId?: string; // Links passenger to specific station
}

export interface PickUpStation {
  id: string;
  name: string;
  location: string;
  registeredAttendees: number;
  vehicleStatus: 'Pending' | 'Arrived' | 'In Transit';
  eventId: string;
  dataEntrantId?: string;
  dataEntrantName?: string;
  coordinatorContact?: string;
  dataEntrantContact?: string;
}

export interface Transaction {
  id: string;
  type: 'Income' | 'Expense';
  category: string;
  amount: number;
  description: string;
  date: string;
  eventId?: string;
  method: 'Cash' | 'Mobile Money' | 'Bank';
}

export interface ManifestDetails {
  name: string;
  contact: string;
  address: string;
  description: string;
  logoUrl?: string;
  coordinates?: { lat: number; lng: number };
  currency?: string;
}

export interface Soul {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  gender: 'Male' | 'Female';
  residence: string;
  status: 'New' | 'Contacted' | 'Visited' | 'Integrated' | 'Lost' | 'Confirmed';
  sourceType: 'Service' | 'Event' | 'Outreach' | 'Other' | 'Healing Dept' | 'Campus';
  sourceId?: string;
  capturedBy?: string; // User ID or Name
  notes?: string;
  createdAt?: string;
  // New Fields
  preferredCallTime?: string;
  studentStatus?: 'Primary' | 'Secondary' | 'University/Tertiary' | 'None';
  age?: number;
  occupation?: string;
  invitedBy?: {
    name: string;
    contact: string;
  };
  ministry?: 'Main' | 'Next Gen';
  // New Fields for Healing Dept
  nextOfKinName?: string;
  nextOfKinContact?: string;
  // Traceability Fields
  eventId?: string;
  stationId?: string;
  vehicleId?: string;
  // Campus Fields
  campusCategory?: 'Family' | 'Evangelism' | 'Vacists' | 'Alumni';
  activityId?: string;
}

export interface CampusActivity {
  id: string;
  category: 'Family' | 'Evangelism' | 'Vacists' | 'Alumni';
  title: string;
  date: string;
  location: string;
  soulsWon: number;
  contactsCollected: number;
  notes?: string;
  createdAt?: string;
  createdBy?: string;
}

export interface CampusActivityAttendant {
  id: string;
  activityId: string;
  name: string;
  contact?: string;
  residence?: string;
  isStudent: boolean;
  institutionName?: string;
  course?: string;
  createdAt?: string;
  createdBy?: string;
}

export interface CampusFinance {
  id: string;
  type: 'Income' | 'Expense';
  category: string;
  amount: number;
  description: string;
  date: string;
  method: 'Cash' | 'Mobile Money' | 'Bank';
  recordedBy?: string;
  createdAt?: string;
}

export enum ModalType {
  NONE,
  CREATE_SERVICE,
  CREATE_EVENT,
  CREATE_PARTNERSHIP,
  ASSIGN_USER,
  SET_TARGETS,
  AI_INSIGHTS,
  CREATE_USER,
  REQUISITIONS,
  EDIT_USER
}

export interface RequisitionPayment {
  id: string;
  requisitionId: string;
  amount: number;
  method: 'Cash' | 'Mobile Money' | 'Bank';
  transactionId?: string;
  paymentDate: string;
  notes?: string;
  recordedBy?: string;
}

export interface RequisitionItem {
  id: string;
  requisitionId: string;
  description: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface Requisition {
  id: string;
  requisitionNumber: string;
  title: string;
  departmentId: string;
  requesterId: string;
  requesterName?: string; // For display
  status: 'Pending' | 'Approved' | 'Rejected' | 'Paid' | 'Pending Finance' | 'Pending Team Leader';
  totalAmount: number;
  amountPaid?: number; // New field
  payments?: RequisitionPayment[]; // New field
  items?: RequisitionItem[];
  notes?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolOutreachReport {
  id: string;
  date: string;
  centreName: string; // Outreach Centre
  purpose: string;
  labourers: {
    name: string;
    contact: string;
  }[];
  totalAttendance: number;
  teachersAttendance: number;
  studentsAttendance: number;
  soulsWon: number;
  sermonTitle: string;
  scriptureReferences: string;
  notes?: string;
  submittedBy: string; // User ID
  submittedAt: string;
}

export interface IncidentReport {
  id: string;
  childId: string;
  serviceId?: string; // Optional linkage to service
  date: string;
  reportedBy: string; // Name or ID
  type: 'Behavioral' | 'Medical' | 'Safety' | 'Other';
  description: string;
  severity: 'Low' | 'Medium' | 'High';
  status: 'Open' | 'Resolved';
  createdAt?: string;
  childName?: string;
}


export interface TrainingRequest {
  id: string;
  requesterId: string;
  topic: string;
  date: string;
  status: 'Pending' | 'Approved' | 'Completed';
  comments?: string;
  createdAt?: string;
  requesterName?: string;
}

// Monthly Reporting System Types

export interface Department {
  id: string; // UUID (eventually) or 'd1' (currently)
  code: string; // 'd1', 'd2' etc. (Legacy)
  slug: string; // 'registration', 'transportation'
  uuid: string; // Native UUID
  name: string;
  head?: string;
  headId?: string;
  dashboardRoute?: string;
  status?: 'Active' | 'Inactive';
  // Computed/Joined fields
  headName?: string;
  members?: number;
}

export interface ReportField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'textarea';
  required: boolean;
  placeholder?: string;
}

export interface MonitoringReport {
  id: string;
  title: string;
  month: string; // 'YYYY-MM'
  deadline: string;
  fields: ReportField[];
  status: 'Draft' | 'Published' | 'Expired';
  createdBy?: string;
  createdAt: string;
  // Computed
  submissions?: ReportSubmission[];
}

export interface ReportSubmission {
  id: string;
  reportId: string;
  departmentId: string;
  content: Record<string, any>; // Keyed by field.id
  status: 'Pending' | 'Draft' | 'Submitted';
  submittedBy?: string;
  submittedAt?: string;
  // Joined
  departmentName?: string;
}

export type ServiceResponse<T> =
  | { status: 'success'; data: T; count?: number }
  | { status: 'error'; message: string; error?: any };

