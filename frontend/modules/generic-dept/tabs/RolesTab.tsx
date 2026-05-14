import React, { useState, useEffect } from 'react';
import { DepartmentalRoleStore } from '../../../database/departmentalRoleStore';
import { DepartmentalRole, Department, User } from '../../../types';
import { DeptRole } from '../../../shared/enums';
import { Trash2, Plus, Users, ShieldAlert } from 'lucide-react';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { useNotification } from '../../../components/ui/NotificationSystem';

interface RolesTabProps {
    department: Department;
    user: User;
    deptRole: DeptRole | null;
}

const RolesTab: React.FC<RolesTabProps> = ({ department, deptRole }) => {
    const { showToast, confirm } = useNotification();
    const [roles, setRoles] = useState<DepartmentalRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [roleName, setRoleName] = useState('');
    const [description, setDescription] = useState('');

    const canEdit = deptRole === 'HOD' || deptRole === 'Dept Admin';

    const loadRoles = async () => {
        setLoading(true);
        const res = await DepartmentalRoleStore.getByDepartment(department.id);
        if (res.status === 'success') {
            setRoles(res.data);
            setError(null);
        } else {
            setError(res.message);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadRoles();
    }, [department.id]);

    const handleAddRole = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!roleName.trim()) return;

        setSaving(true);
        const res = await DepartmentalRoleStore.addRole({
            departmentId: department.id,
            roleName: roleName.trim(),
            description: description.trim() || undefined
        });

        if (res.status === 'success') {
            setRoleName('');
            setDescription('');
            showToast('Role added successfully', 'success');
            loadRoles();
        } else {
            showToast('Failed to add role: ' + res.message, 'error');
        }
        setSaving(false);
    };

    const handleDeleteRole = async (roleId: string) => {
        const confirmed = await confirm('Are you sure you want to delete this role? It will not remove members currently assigned to it in past schedules, but it will be unavailable for future schedules.');
        if (!confirmed) return;

        const res = await DepartmentalRoleStore.deleteRole(roleId);
        if (res.status === 'success') {
            showToast('Role deleted successfully', 'success');
            loadRoles();
        } else {
            showToast('Failed to delete role: ' + res.message, 'error');
        }
    };

    if (loading) return <LoadingSpinner message="Loading roles..." />;

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-medium">Error loading roles</h4>
                        <p className="text-sm mt-1">{error}</p>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-6 items-start">
                {/* Main List */}
                <div className="flex-1 w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
                        <Users className="w-5 h-5 text-ministry-orange" />
                        <h2 className="text-lg font-bold text-gray-900">Departmental Roles</h2>
                    </div>

                    {roles.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <p>No operational roles defined for this department yet.</p>
                            {canEdit && <p className="text-sm mt-2">Use the form to add roles (e.g., "Worship Leader", "Usher").</p>}
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {roles.map(role => (
                                <div key={role.id} className="p-4 px-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div>
                                        <p className="font-semibold text-gray-900">{role.roleName}</p>
                                        {role.description && <p className="text-sm text-gray-500 mt-0.5">{role.description}</p>}
                                    </div>
                                    {canEdit && (
                                        <button 
                                            onClick={() => handleDeleteRole(role.id)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete Role"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Add Role Form */}
                {canEdit && (
                    <div className="w-full md:w-80 flex-shrink-0 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Plus className="w-4 h-4 text-ministry-orange" />
                            Add New Role
                        </h3>
                        <form onSubmit={handleAddRole} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Role Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={roleName}
                                    onChange={e => setRoleName(e.target.value)}
                                    placeholder="e.g. Protocol Officer"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-ministry-orange focus:border-transparent text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Description (Optional)</label>
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Brief explanation of responsibilities..."
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-ministry-orange focus:border-transparent text-sm resize-none"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={saving || !roleName.trim()}
                                className="w-full bg-gray-900 text-white font-medium py-2 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 text-sm flex justify-center items-center gap-2"
                            >
                                {saving ? <LoadingSpinner size="small" message="" /> : 'Save Role'}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RolesTab;
