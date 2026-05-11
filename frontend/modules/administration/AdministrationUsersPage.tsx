import React, { useState, useEffect } from 'react';
import { User, ModalType } from '../../types';
import { Search, Edit2, Trash2, Shield, Plus } from 'lucide-react';
import { DEPARTMENTS } from '../../constants';
import { UserStore } from '../../database/userStore';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';

interface Props {
  openModal: (t: ModalType) => void;
  onDeleteUser: (id: string) => void;
  onEditUser: (u: User) => void;
  refreshTrigger?: number;
}

const AdministrationUsersPage: React.FC<Props> = ({ openModal, onDeleteUser, onEditUser, refreshTrigger }) => {
  const { user: currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [localUsers, setLocalUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbDepartments, setDbDepartments] = useState<any[]>(DEPARTMENTS);

  useEffect(() => {
    const fetchUsersAndDepts = async () => {
      setLoading(true);
      const [usersRes, deptsRes] = await Promise.all([
          UserStore.getAll(),
          import('../../database/departmentStore').then(m => m.DepartmentStore.getAll())
      ]);

      if (deptsRes.status === 'success' && deptsRes.data) {
          const staticIds = new Set(DEPARTMENTS.map((d: any) => d.id));
          const custom = deptsRes.data.filter((d: any) => d.isCustom && !staticIds.has(d.id));
          setDbDepartments([...DEPARTMENTS, ...custom]);
      } else {
          setDbDepartments([...DEPARTMENTS]);
      }

      if (usersRes.status === 'success' && usersRes.data) {
        setLocalUsers(usersRes.data);
      }
      setLoading(false);
    };
    fetchUsersAndDepts();
  }, [refreshTrigger]);
  
  const isAdmin = currentUser?.role === 'Administrator' || currentUser?.role === 'Super Admin' || currentUser?.role === 'TeamLeader';

  // Filter users: Admins see all, Leads see only their department (if they somehow get here)
  const baseUsers = isAdmin
      ? localUsers
      : localUsers.filter(u => u.departmentId === currentUser?.departmentId);

  const filteredUsers = baseUsers.filter(user => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      const deptName = dbDepartments.find(d => d.id === user.departmentId || d.slug === user.departmentId || d.code === user.departmentId)?.name.toLowerCase() || '';

      return (
          user.name.toLowerCase().includes(query) ||
          (user.email && user.email.toLowerCase().includes(query)) ||
          (user.username && user.username.toLowerCase().includes(query)) ||
          (user.contact && user.contact.includes(query)) ||
          user.role.toLowerCase().includes(query) ||
          deptName.includes(query)
      );
  });

  if (loading) {
      return (
          <div className="bg-ministry-card border border-gray-200 rounded-2xl shadow-sm p-8 flex justify-center items-center h-64">
              <LoadingSpinner fullPage={false} message="Loading system users..." />
          </div>
      );
  }

  return (
    <div className="bg-ministry-card border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 bg-white">
          <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                  type="text"
                  placeholder="Search users by name, role, department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:border-ministry-orange focus:ring-1 focus:ring-ministry-orange transition-all"
              />
          </div>
          <button 
              onClick={() => openModal(ModalType.CREATE_USER)}
              className="w-full md:w-auto bg-ministry-text text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-black transition-all flex items-center justify-center shadow-lg shadow-gray-200"
          >
              <Plus className="w-5 h-5 mr-2" />
              Add User
          </button>
      </div>

      <div className="overflow-x-auto bg-white">
          <table className="w-full text-left">
              <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Contact</th>
                      <th className="px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Department</th>
                      <th className="px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Username</th>
                      <th className="px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-3 py-3">
                              <div className="flex items-center">
                                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-ministry-text font-bold shadow-inner">
                                      {user.name.charAt(0)}{user.name.split(' ')[1]?.[0] || ''}
                                  </div>
                                  <div className="ml-4">
                                      <div className="text-sm font-bold text-ministry-text">{user.name}</div>
                                      <div className="text-sm text-gray-500">{user.email}</div>
                                  </div>
                              </div>
                          </td>
                          <td className="px-3 py-3 text-sm font-medium text-gray-700">{user.contact || 'N/A'}</td>
                          <td className="px-3 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.role === 'Administrator' ? 'bg-purple-100 text-purple-700' :
                                  (user.role === 'Head of Dept' || user.role === 'Dept Admin')  ? 'bg-blue-100 text-blue-700' :
                                      user.role === 'TeamLeader' ? 'bg-orange-100 text-orange-700' :
                                          user.role === 'Reg. Admin' ? 'bg-indigo-100 text-indigo-700' :
                                              user.role === 'Member' ? 'bg-green-100 text-green-700' :
                                                  'bg-gray-100 text-gray-600'
                                  }`}>{user.role}</span>
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600">
                              {dbDepartments.find(d => d.id === user.departmentId || d.slug === user.departmentId || d.code === user.departmentId)?.name || 'N/A'}
                          </td>
                          <td className="px-3 py-3 text-sm font-mono text-gray-500">{user.username}</td>
                          <td className="px-3 py-3 text-right">
                              <div className="flex justify-end gap-1">
                                  <button onClick={() => onEditUser(user)} className="text-gray-400 hover:text-ministry-orange transition-colors p-2 hover:bg-orange-50 rounded-lg">
                                      <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => onDeleteUser(user.id)} className="text-gray-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg">
                                      <Trash2 className="w-4 h-4" />
                                  </button>
                              </div>
                          </td>
                      </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                      <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                              No users found matching your search.
                          </td>
                      </tr>
                  )}
              </tbody>
          </table>
      </div>
    </div>
  );
};

export default AdministrationUsersPage;
