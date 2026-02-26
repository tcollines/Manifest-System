
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
  { name: 'Jan', value: 400, secondaryValue: 850 },
  { name: 'Feb', value: 300, secondaryValue: 900 },
  { name: 'Mar', value: 550, secondaryValue: 1200 },
  { name: 'Apr', value: 450, secondaryValue: 1100 },
  { name: 'May', value: 600, secondaryValue: 1350 },
  { name: 'Jun', value: 700, secondaryValue: 1500 },
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
