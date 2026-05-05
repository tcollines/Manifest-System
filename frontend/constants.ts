
import { KPI, Department, ChartData, ActivityLog, DepartmentRequest, MinistryEvent, User, Member, PickUpStation, Child, PersonalVehicle } from './types';
import {
  Users,
  DollarSign,
  TrendingUp,
  Heart,
  Briefcase,
  Calendar,
  Activity
} from 'lucide-react';

// NOTE: KPI structure is used for visual layout, values will be populated dynamically.
export const KPIS: KPI[] = [
  { id: '1', label: 'Total Collections', value: '...', change: '0%', trend: 'up', icon: 'DollarSign' },
  { id: '2', label: 'Monthly Expenses', value: '...', change: '0%', trend: 'down', icon: 'Activity' },
  { id: '3', label: 'Total Offerings', value: '...', change: '0%', trend: 'up', icon: 'Heart' },
  { id: '4', label: 'Partnerships', value: '...', change: '0%', trend: 'up', icon: 'Briefcase' },
  { id: '5', label: 'PMI Giving', value: '...', change: '0%', trend: 'up', icon: 'TrendingUp' },
];

export const DEPARTMENTS: Department[] = [
  { id: '0b685c69-edb6-44b9-8f21-1a11878b6d7b', code: 'd0', slug: 'administration', uuid: '0b685c69-edb6-44b9-8f21-1a11878b6d7b', name: 'Administration', head: 'Admin', members: 5, status: 'Active' },
  { id: '81b8b740-6663-4179-bcfb-e3dc7524d36c', code: 'd1', slug: 'registration', uuid: '81b8b740-6663-4179-bcfb-e3dc7524d36c', name: 'Registration', head: 'Sarah Connor', members: 12, status: 'Active' },
  { id: 'a9aff0dc-1a78-4c00-ad29-4531942670d0', code: 'd2', slug: 'next-gen', uuid: 'a9aff0dc-1a78-4c00-ad29-4531942670d0', name: 'Next Gen', head: 'John Doe', members: 45, status: 'Active' },
  { id: '65808f94-cf1c-4e0f-b7f0-d3ac2b49d20a', code: 'd3', slug: 'parking', uuid: '65808f94-cf1c-4e0f-b7f0-d3ac2b49d20a', name: 'Parking', head: 'Harvey Specter', members: 15, status: 'Active' },
  { id: 'e35f6789-1862-4c31-8b13-96d59463d257', code: 'd4', slug: 'finance', uuid: 'e35f6789-1862-4c31-8b13-96d59463d257', name: 'Finance', head: 'Jessica Pearson', members: 6, status: 'Active' },
  { id: '4630e48a-f97e-48fd-a901-864b591c282f', code: 'd5', slug: 'transportation', uuid: '4630e48a-f97e-48fd-a901-864b591c282f', name: 'Transportation', head: 'Mike Ross', members: 8, status: 'Active' },
  { id: 'e680342f-72c7-4d10-b7cb-631725afe770', code: 'd6', slug: 'follow-up', uuid: 'e680342f-72c7-4d10-b7cb-631725afe770', name: 'Follow-Up', head: 'Donna Paulsen', members: 22, status: 'Active' },
  { id: '4d99940e-58ec-40ba-92bd-4a65651bf23a', code: 'd7', slug: 'schools', uuid: '4d99940e-58ec-40ba-92bd-4a65651bf23a', name: 'Schools', head: 'Schools Coordinator', members: 10, status: 'Active' },
  { id: 'f1a0d749-d681-4150-9764-aecfeac8b0ca', code: 'd8', slug: 'healing', uuid: 'f1a0d749-d681-4150-9764-aecfeac8b0ca', name: 'Healing', head: 'Healing Coordinator', members: 5, status: 'Active' },
  { id: 'b2c1d3e4-f5a6-7890-bcde-1234567890ab', code: 'd9', slug: 'campus', uuid: 'b2c1d3e4-f5a6-7890-bcde-1234567890ab', name: 'Campus and Institutions', head: 'Campus Coordinator', members: 10, status: 'Active' },
  { id: 'c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', code: 'd10', slug: 'residents', uuid: 'c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', name: 'Residents', head: 'Resident Coordinator', members: 0, status: 'Active' },
];

// Replaced by DB data, keeping empty arrays or minimal fallbacks if strictly necessary for type safety in some old components, but aiming to use stores.
export const DEPARTMENT_REQUESTS: DepartmentRequest[] = [];
export const MOCK_EVENTS: MinistryEvent[] = [
  {
    id: 'e1',
    title: 'Sunday Glory Service',
    type: 'Service',
    date: '2023-10-01',
    time: '10:00 AM',
    location: 'Main Sanctuary',
    description: 'Weekly Sunday Service',
    stats: { attendees: 1250, firstTimers: 45, soulsWon: 12, nextGen: 300 }
  },
  {
    id: 'e2',
    title: 'Power Thursday',
    type: 'Service',
    date: '2023-10-05',
    time: '05:00 PM',
    location: 'Main Sanctuary',
    description: 'Weekly Mid-week Service',
    stats: { attendees: 850, firstTimers: 20, soulsWon: 5, nextGen: 150 }
  },
  {
    id: 'e3',
    title: 'Youth Conference',
    type: 'Event',
    date: '2023-11-15',
    time: '09:00 AM',
    location: 'Convention Center',
    description: 'Annual Youth Gathering',
    stats: { attendees: 2000, firstTimers: 150, soulsWon: 50, students: 1800 }
  }
];
export const MOCK_USERS: User[] = [
  {
    id: 'mock-admin',
    name: 'System Admin',
    role: 'Super Admin',
    departmentId: 'd0',
    username: 'admin',
    password: 'password123',
    contact: '000-000-0000',
    email: 'admin@ministry.com',
    status: 'Active'
  }
];
export const MOCK_MEMBERS: Member[] = [];
export const MOCK_CHILDREN: Child[] = [];
export const MOCK_PERSONAL_VEHICLES: PersonalVehicle[] = [];
export const PICKUP_STATIONS: PickUpStation[] = [];

// Static Visual Data for Charts (could be dynamic later)
export const SOUL_WINNING_DATA: ChartData[] = [
  { name: 'Street Evangelism', value: 450 },
  { name: 'Online Outreach', value: 300 },
  { name: 'Church Services', value: 550 },
  { name: 'Events', value: 200 },
];

export const ATTENDANCE_DATA: ChartData[] = [
  { name: 'Jan W1', value: 380, secondaryValue: 820, title: 'Sunday Glory Service', description: 'Week 1' },
  { name: 'Jan W2', value: 420, secondaryValue: 880, title: 'Power Thursday', description: 'Week 2' },
  { name: 'Jan W3', value: 390, secondaryValue: 840, title: 'Sunday Glory Service', description: 'Week 3' },
  { name: 'Jan W4', value: 410, secondaryValue: 860, title: 'Power Thursday', description: 'Week 4' },
  { name: 'Feb W1', value: 290, secondaryValue: 870, title: 'Sunday Glory Service', description: 'Week 1' },
  { name: 'Feb W2', value: 310, secondaryValue: 920, title: 'Power Thursday', description: 'Week 2' },
  { name: 'Feb W3', value: 305, secondaryValue: 910, title: 'Sunday Glory Service', description: 'Week 3' },
  { name: 'Feb W4', value: 295, secondaryValue: 900, title: 'Power Thursday', description: 'Week 4' },
  { name: 'Mar W1', value: 520, secondaryValue: 1150, title: 'Sunday Glory Service', description: 'Week 1' },
  { name: 'Mar W2', value: 540, secondaryValue: 1180, title: 'Power Thursday', description: 'Week 2' },
  { name: 'Mar W3', value: 560, secondaryValue: 1220, title: 'Sunday Glory Service', description: 'Week 3' },
  { name: 'Mar W4', value: 580, secondaryValue: 1250, title: 'Power Thursday', description: 'Week 4' },
  { name: 'Apr W1', value: 440, secondaryValue: 1080, title: 'Sunday Glory Service', description: 'Week 1' },
  { name: 'Apr W2', value: 460, secondaryValue: 1120, title: 'Power Thursday', description: 'Week 2' },
  { name: 'Apr W3', value: 430, secondaryValue: 1070, title: 'Sunday Glory Service', description: 'Week 3' },
  { name: 'Apr W4', value: 470, secondaryValue: 1130, title: 'Power Thursday', description: 'Week 4' },
  { name: 'May W1', value: 590, secondaryValue: 1320, title: 'Sunday Glory Service', description: 'Week 1' },
  { name: 'May W2', value: 610, secondaryValue: 1370, title: 'Power Thursday', description: 'Week 2' },
  { name: 'May W3', value: 580, secondaryValue: 1300, title: 'Sunday Glory Service', description: 'Week 3' },
  { name: 'May W4', value: 620, secondaryValue: 1410, title: 'Power Thursday', description: 'Week 4' },
  { name: 'Jun W1', value: 680, secondaryValue: 1450, title: 'Sunday Glory Service', description: 'Week 1' },
  { name: 'Jun W2', value: 710, secondaryValue: 1520, title: 'Power Thursday', description: 'Week 2' },
  { name: 'Jun W3', value: 690, secondaryValue: 1480, title: 'Sunday Glory Service', description: 'Week 3' },
  { name: 'Jun W4', value: 720, secondaryValue: 1550, title: 'Power Thursday', description: 'Week 4' },
];

export const RECENT_ACTIVITY: ActivityLog[] = [
  { id: 'a1', action: 'System Initialized', user: 'Admin', timestamp: 'Now', type: 'admin' }
];

export const VEHICLE_TYPES = ['Car', 'Taxi', 'Coaster', 'Bus'];

export const SERVICE_REPORT_DATA = [
  { id: 1, date: 'Oct 01', service: 'Sunday Glory Service', adults: 1250, nextGen: 300, souls: 45 },
  { id: 2, date: 'Oct 05', service: 'Power Thursday', adults: 850, nextGen: 150, souls: 20 },
];

export const FINANCIAL_REPORT_DATA = {
  income: [
    { category: 'Tithes & Offerings', percentage: 65, amount: 80925 },
    { category: 'Partnership Giving', percentage: 25, amount: 31125 },
  ],
  expenses: [
    { category: 'Operations & Maintenance', percentage: 40, amount: 18080 },
    { category: 'Outreach & Missions', percentage: 30, amount: 13560 },
  ]
};

export const SOULS_CHANNELS_DATA = [
  { channel: 'Street Evangelism', count: 450, color: 'bg-orange-500', trend: '+12%' },
  { channel: 'Online Outreach', count: 300, color: 'bg-blue-500', trend: '+8%' },
  { channel: 'Church Services', count: 550, color: 'bg-purple-500', trend: '+15%' },
  { channel: 'Special Events', count: 200, color: 'bg-green-500', trend: '+5%' },
];

export const CURRENCIES = [
  { code: 'UGX', name: 'Ugandan Shilling' },
  { code: 'USD', name: 'United States Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound Sterling' },
  { code: 'KES', name: 'Kenyan Shilling' },
  { code: 'RWF', name: 'Rwandan Franc' },
  { code: 'TZS', name: 'Tanzanian Shilling' },
  { code: 'AED', name: 'United Arab Emirates Dirham' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'ZAR', name: 'South African Rand' },
  { code: 'NGN', name: 'Nigerian Naira' },
  { code: 'GHS', name: 'Ghanaian Cedi' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'ZMW', name: 'Zambian Kwacha' },
];

export const SOURCE_TYPE_COLORS: Record<string, string> = {
  'Healing Dept': 'bg-red-50 text-red-700',
  'Campus': 'bg-blue-50 text-blue-700',
  'Service': 'bg-gray-100 text-gray-800',
  'Event': 'bg-gray-100 text-gray-800',
  'Outreach': 'bg-gray-100 text-gray-800',
  'Other': 'bg-gray-100 text-gray-800',
};
