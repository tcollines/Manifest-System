import React from 'react';
import { useParams, Link, Outlet, useLocation } from 'react-router-dom';
import { DEPARTMENTS } from '../constants';
import { ArrowLeft, Users, User } from 'lucide-react';

const DepartmentDetail: React.FC = () => {
    const { departmentId } = useParams<{ departmentId: string }>();
    const location = useLocation();
    const department = DEPARTMENTS.find(d => d.id === departmentId || d.name.toLowerCase() === departmentId?.toLowerCase());

    if (!department) {
        return (
            <div className="p-8">
                <h2 className="text-xl text-red-500">Department not found</h2>
                <Link to="/departments" className="text-ministry-orange hover:underline flex items-center gap-2 mt-4">
                    <ArrowLeft size={16} /> Back to Departments
                </Link>
            </div>
        );
    }

    const isRequestsPage = location.pathname.includes('/requests');

    return (
        <div className="p-8 space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Link to="/departments" className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                    <ArrowLeft size={24} />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-ministry-text">{department.name}</h1>
                    <p className="text-gray-500">Department Overview</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <h3 className="text-gray-500 text-sm font-medium mb-1">Head of Department</h3>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <User size={20} />
                        </div>
                        <span className="text-lg font-bold text-ministry-text">{department.head}</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <h3 className="text-gray-500 text-sm font-medium mb-1">Team Size</h3>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                            <Users size={20} />
                        </div>
                        <span className="text-lg font-bold text-ministry-text">{department.members} Members</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <h3 className="text-gray-500 text-sm font-medium mb-1">Status</h3>
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-bold">{department.status}</span>
                    </div>

                </div>
            </div>

            {/* Tabs / Navigation */}
            <div className="border-b border-gray-200">
                <nav className="flex space-x-8">
                    <Link
                        to={`/departments/${departmentId}`}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${!isRequestsPage ? 'border-ministry-orange text-ministry-orange' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        Overview
                    </Link>
                    <Link
                        to={`/departments/${departmentId}/requests`}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${isRequestsPage ? 'border-ministry-orange text-ministry-orange' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        Requests
                    </Link>
                </nav>
            </div>

            <div className="mt-6">
                <Outlet />
                {!isRequestsPage && (
                    <div className="bg-gray-50 rounded-xl p-8 text-center text-gray-500">
                        <p>Department Overview content goes here.</p>
                        {/* We could potentially render the specific dashboard widget here if we wanted to be fancy */}
                        <Link to={`/${department.name.toLowerCase().replace(' ', '-')}`} className="mt-4 inline-block px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                            Go to {department.name} Main Dashboard
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DepartmentDetail;
