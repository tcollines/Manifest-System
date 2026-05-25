import { Department, DepartmentRequest } from '../types';

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
  { id: 'afc0240b-0faf-48ec-a1d8-ad2f193eb891', code: 'd11', slug: 'sales', uuid: 'afc0240b-0faf-48ec-a1d8-ad2f193eb891', name: 'Sales & Merchandise', head: 'Sales HOD', members: 5, status: 'Active' },
];

// Replaced by DB data, keeping empty arrays or minimal fallbacks if strictly necessary for type safety in some old components, but aiming to use stores.
export const DEPARTMENT_REQUESTS: DepartmentRequest[] = [];
