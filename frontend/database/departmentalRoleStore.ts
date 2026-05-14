import { supabase } from '../services/supabaseClient';
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
      const { data, error } = await supabase
        .from('departmental_roles')
        .select('*')
        .eq('department_id', departmentId)
        .order('role_name', { ascending: true });
        
      if (error) return { status: 'error', message: error.message };
      return { status: 'success', data: data.map(mapToCamelCase) };
    } catch (err: any) {
      return { status: 'error', message: err.message };
    }
  },
  
  async addRole(role: Omit<DepartmentalRole, 'id' | 'createdAt'>): Promise<ServiceResponse<DepartmentalRole>> {
    try {
      const { data, error } = await supabase
        .from('departmental_roles')
        .insert({
          department_id: role.departmentId,
          role_name: role.roleName,
          description: role.description
        })
        .select()
        .single();
        
      if (error) return { status: 'error', message: error.message };
      return { status: 'success', data: mapToCamelCase(data) };
    } catch (err: any) {
      return { status: 'error', message: err.message };
    }
  },
  
  async deleteRole(id: string): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase.from('departmental_roles').delete().eq('id', id);
      if (error) return { status: 'error', message: error.message };
      return { status: 'success', data: undefined };
    } catch (err: any) {
      return { status: 'error', message: err.message };
    }
  }
};
