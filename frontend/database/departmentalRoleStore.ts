import { apiFetch } from '../services/api';
import { DepartmentalRole, ServiceResponse } from '../types';

// Map DB snake_case to TS camelCase
const mapToCamelCase = (row: any): DepartmentalRole => ({
  id: row.id,
  departmentId: row.department_id,
  roleName: row.role_name,
  description: row.description,
  createdAt: row.created_at
});

export const DepartmentalRoleStore = {
  async getByDepartment(departmentId: string): Promise<ServiceResponse<DepartmentalRole[]>> {
    try {
      const data = await apiFetch(`/departments/${departmentId}/roles`);
      return { status: 'success', data: data.map(mapToCamelCase) };
    } catch (err: any) {
      return { status: 'error', message: err.message };
    }
  },
  
  async addRole(role: Omit<DepartmentalRole, 'id' | 'createdAt'>): Promise<ServiceResponse<DepartmentalRole>> {
    try {
      const data = await apiFetch(`/departments/${role.departmentId}/roles`, {
        method: 'POST',
        body: JSON.stringify({ roleName: role.roleName, description: role.description })
      });
      return { status: 'success', data: mapToCamelCase(data) };
    } catch (err: any) {
      return { status: 'error', message: err.message };
    }
  },
  
  async deleteRole(id: string): Promise<ServiceResponse<void>> {
    try {
      await apiFetch(`/departments/roles/${id}`, { method: 'DELETE' });
      return { status: 'success', data: undefined };
    } catch (err: any) {
      return { status: 'error', message: err.message };
    }
  }
};
