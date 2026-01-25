
import React from 'react';
import { useNotification } from './ui/NotificationSystem';
import { DEPARTMENTS } from '../constants';
import { MoreHorizontal, Users, Car, CreditCard, ClipboardCheck, Phone, Bus, BookOpen } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

interface DepartmentListProps {
  onNavigate?: (view: string) => void; // Keeping optional to prevent break if passed
}

const getIcon = (name: string) => {
  switch (name.toLowerCase()) {
    case 'registration': return ClipboardCheck;
    case 'next gen': return Users;
    case 'parking': return Car;
    case 'finance': return CreditCard;
    case 'transportation': return Bus;
    case 'follow-up': return Phone;
    case 'schools': return BookOpen;
    default: return Users;
  }
}

const DepartmentList: React.FC<DepartmentListProps> = () => {
  const { showToast } = useNotification();
  const navigate = useNavigate();

  const handleViewDashboard = (deptName: string) => {
    if (deptName.toLowerCase() === 'registration') {
      navigate('/registration');
    } else if (deptName.toLowerCase() === 'next gen') {
      navigate('/next-gen');
    } else if (deptName.toLowerCase() === 'transportation') {
      navigate('/transportation');
    } else if (deptName.toLowerCase() === 'finance') {
      navigate('/finance');
    } else if (deptName.toLowerCase() === 'parking') {
      navigate('/parking');
    } else if (deptName.toLowerCase() === 'follow-up') {
      navigate('/follow-up');
    } else if (deptName.toLowerCase() === 'schools') {
      navigate('/schools');
    } else {
      showToast(`Navigating to ${deptName} Dashboard... (Module under construction)`, 'info');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-bold text-ministry-text">Departments Overview</h3>
        <button className="text-sm text-ministry-orange hover:text-orange-700 transition-colors font-medium">Manage All</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {DEPARTMENTS.map((dept) => {
          const Icon = getIcon(dept.name);
          return (
            <div key={dept.id} className="bg-ministry-card rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md hover:border-ministry-orange/30 transition-all duration-300 group">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 bg-gray-50 rounded-xl group-hover:bg-ministry-orange/10 transition-colors">
                  <Icon className="w-6 h-6 text-gray-500 group-hover:text-ministry-orange transition-colors" />
                </div>
                <div className="flex space-x-2 items-center">
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wider rounded-full">{dept.status}</span>
                  <Link to={`/departments/${dept.id}`} className="text-gray-300 hover:text-gray-500">
                    <MoreHorizontal className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Content */}
              <div className="mb-5">
                <Link to={`/departments/${dept.id}`}>
                  <h4 className="text-lg font-bold text-ministry-text mb-1 hover:text-ministry-orange transition-colors">{dept.name}</h4>
                </Link>
                <div className="flex items-center text-sm text-gray-500">
                  <span className="truncate">Head: {dept.head}</span>
                </div>
              </div>

              {/* Footer / Stats */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-medium text-gray-500">
                    <span>Team Members</span>
                    <span className="text-gray-900">{dept.members} Active</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-ministry-text h-1.5 rounded-full group-hover:bg-ministry-orange transition-colors duration-500" style={{ width: `${Math.min(dept.members * 2, 100)}%` }}></div>
                  </div>
                </div>

                <button
                  onClick={() => handleViewDashboard(dept.name)}
                  className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 hover:text-ministry-orange hover:border-ministry-orange/30 transition-all text-sm flex items-center justify-center group-hover:bg-white"
                >
                  View Dashboard
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
};

export default DepartmentList;
