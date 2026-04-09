
import React, { useEffect, useState } from 'react';
import { useNotification } from './ui/NotificationSystem';
import { DEPARTMENTS } from '../constants';
import { MoreHorizontal, Users, Car, CreditCard, ClipboardCheck, Phone, Bus, BookOpen, Heart, Building2, Home, Music, Mic, Shield, Camera, Star, Utensils, Flower2 } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { DepartmentStore } from '../database/departmentStore';
import { Department } from '../types';

interface DepartmentListProps {
    onNavigate?: (view: string) => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
    Users, Car, CreditCard, ClipboardCheck, Phone, Bus, BookOpen, Heart,
    Building2, Home, Music, Mic, Shield, Camera, Star, Utensils, Flower2,
};

const getIcon = (name: string, iconKey?: string): React.ElementType => {
    if (iconKey && ICON_MAP[iconKey]) return ICON_MAP[iconKey];
    switch (name.toLowerCase()) {
        case 'registration': return ClipboardCheck;
        case 'next gen':     return Users;
        case 'parking':      return Car;
        case 'finance':      return CreditCard;
        case 'transportation': return Bus;
        case 'follow-up':    return Phone;
        case 'schools':      return BookOpen;
        case 'healing':      return Heart;
        case 'campus and institutions':
        case 'campus':       return Building2;
        case 'residents':    return Home;
        default:             return Users;
    }
};

const DepartmentList: React.FC<DepartmentListProps> = () => {
    const { showToast } = useNotification();
    const navigate = useNavigate();

    const [customDepts, setCustomDepts] = useState<Department[]>([]);
    const [loadingCustom, setLoadingCustom] = useState(true);

    useEffect(() => {
        DepartmentStore.getAll().then(res => {
            if (res.status === 'success') {
                // Only show is_custom depts here — hardcoded ones are in DEPARTMENTS constant
                setCustomDepts(res.data.filter(d => d.isCustom));
            }
            setLoadingCustom(false);
        });
    }, []);

    const handleViewDashboard = (deptName: string) => {
        const name = deptName.toLowerCase();
        if (name === 'registration')                              navigate('/registration');
        else if (name === 'next gen')                            navigate('/next-gen');
        else if (name === 'transportation')                      navigate('/transportation');
        else if (name === 'finance')                             navigate('/finance');
        else if (name === 'parking')                             navigate('/parking');
        else if (name === 'follow-up')                           navigate('/follow-up');
        else if (name === 'schools')                             navigate('/schools');
        else if (name === 'healing')                             navigate('/healing');
        else if (name === 'campus and institutions' || name === 'campus') navigate('/campus');
        else if (name === 'residents')                           navigate('/residents');
        else showToast(`Navigating to ${deptName} Dashboard... (Module under construction)`, 'info');
    };

    // Shared card renderer
    const renderCard = (
        id: string,
        name: string,
        head: string | undefined,
        members: number | undefined,
        status: string | undefined,
        iconKey: string | undefined,
        isCustom: boolean,
        onView: () => void,
        detailLink: string,
    ) => {
        const Icon = getIcon(name, iconKey);
        return (
            <div key={id} className="bg-ministry-card rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md hover:border-ministry-orange/30 transition-all duration-300 group">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                    <div className="p-2.5 bg-gray-50 rounded-xl group-hover:bg-ministry-orange/10 transition-colors">
                        <Icon className="w-6 h-6 text-gray-500 group-hover:text-ministry-orange transition-colors" />
                    </div>
                    <div className="flex space-x-2 items-center">
                        {isCustom ? (
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 text-[10px] font-bold uppercase tracking-wider rounded-full">Custom</span>
                        ) : (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wider rounded-full">{status ?? 'Active'}</span>
                        )}
                        <Link to={detailLink} className="text-gray-300 hover:text-gray-500">
                            <MoreHorizontal className="w-4 h-4" />
                        </Link>
                    </div>
                </div>

                {/* Content */}
                <div className="mb-5">
                    <button onClick={onView} className="text-left">
                        <h4 className="text-lg font-bold text-ministry-text mb-1 hover:text-ministry-orange transition-colors">{name}</h4>
                    </button>
                    <div className="flex items-center text-sm text-gray-500">
                        <span className="truncate">{head ? `Head: ${head}` : 'No head assigned'}</span>
                    </div>
                </div>

                {/* Footer */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-medium text-gray-500">
                            <span>Team Members</span>
                            <span className="text-gray-900">{members ?? 0} Active</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-ministry-text h-1.5 rounded-full group-hover:bg-ministry-orange transition-colors duration-500" style={{ width: `${Math.min((members ?? 0) * 2, 100)}%` }} />
                        </div>
                    </div>
                    <button
                        onClick={onView}
                        className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 hover:text-ministry-orange hover:border-ministry-orange/30 transition-all text-sm flex items-center justify-center group-hover:bg-white"
                    >
                        View Dashboard
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-bold text-ministry-text">Departments Overview</h3>
                <button className="text-sm text-ministry-orange hover:text-orange-700 transition-colors font-medium">Manage All</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* Static / hardcoded departments */}
                {DEPARTMENTS.map(dept =>
                    renderCard(
                        dept.id,
                        dept.name,
                        dept.head,
                        dept.members,
                        dept.status,
                        undefined,
                        false,
                        () => handleViewDashboard(dept.name),
                        `/departments/${dept.id}`,
                    )
                )}

                {/* Dynamic / custom departments from DB */}
                {!loadingCustom && customDepts.map(dept =>
                    renderCard(
                        dept.id,
                        dept.name,
                        dept.headName,
                        dept.members,
                        dept.status,
                        dept.icon,
                        true,
                        () => navigate(`/departments/${dept.id}/dashboard`),
                        `/departments/${dept.id}/dashboard`,
                    )
                )}

                {/* Loading skeleton for custom depts */}
                {loadingCustom && (
                    <div className="rounded-2xl border border-gray-100 p-5 bg-white animate-pulse h-48" />
                )}
            </div>
        </div>
    );
};

export default DepartmentList;
