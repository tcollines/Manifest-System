import React, { useEffect, useState } from 'react';
import { Department, DeptChurchMember } from '../../../types';
import { DeptRole } from '../../../shared/enums';
import { DeptChurchMemberStore } from '../../../database/deptChurchMemberStore';
import { ServiceScheduleStore } from '../../../database/serviceScheduleStore';
import { WorkplanStore } from '../../../database/workplanStore';
import { DeptFinanceStore } from '../../../database/deptFinanceStore';
import { formatCurrency } from '../../../shared/formatters';
import StatCard from '../../../components/ui/StatCard';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { Users, Calendar, ClipboardList, DollarSign } from 'lucide-react';
import { User } from '../../../types';

interface Props {
    department: Department;
    user: User | null;
    deptRole: DeptRole | null;
    systemRole: any;
}

const OverviewTab: React.FC<Props> = ({ department, user, deptRole, systemRole }) => {
    const [memberCount, setMemberCount]   = useState<number | null>(null);
    const [scheduleCount, setScheduleCount] = useState<number | null>(null);
    const [workplanCount, setWorkplanCount] = useState<number | null>(null);
    const [balance, setBalance]           = useState<number | null>(null);
    const [loading, setLoading]           = useState(true);

    useEffect(() => {
        const deptId = department.id;
        Promise.allSettled([
            DeptChurchMemberStore.getByDepartment(deptId),
            ServiceScheduleStore.getByDepartment(deptId),
            WorkplanStore.getByDepartment(deptId),
            DeptFinanceStore.getByDepartment(deptId),
        ]).then(([members, schedules, workplans, finances]) => {
            if (members.status    === 'fulfilled' && members.value.status    === 'success') setMemberCount(members.value.data.length);
            if (schedules.status  === 'fulfilled' && schedules.value.status  === 'success') setScheduleCount(schedules.value.data.length);
            if (workplans.status  === 'fulfilled' && workplans.value.status  === 'success') setWorkplanCount(workplans.value.data.length);
            if (finances.status   === 'fulfilled' && finances.value.status   === 'success') {
                const summary = DeptFinanceStore.getSummary(finances.value.data);
                setBalance(summary.netBalance);
            }
            setLoading(false);
        });
    }, [department.id]);

    if (loading) return <LoadingSpinner message="Loading overview…" />;

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h2 className="text-lg font-bold text-gray-800 mb-1">{department.name} — Overview</h2>
                {department.description && <p className="text-sm text-gray-500">{department.description}</p>}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    title="Team Members"
                    value={memberCount ?? '—'}
                    icon={Users}
                    iconBg="bg-blue-50"
                    iconColor="text-blue-600"
                />
                <StatCard
                    title="Schedules"
                    value={scheduleCount ?? '—'}
                    icon={Calendar}
                    iconBg="bg-ministry-orange/10"
                    iconColor="text-ministry-orange"
                />
                <StatCard
                    title="Workplans"
                    value={workplanCount ?? '—'}
                    icon={ClipboardList}
                    iconBg="bg-purple-50"
                    iconColor="text-purple-600"
                />
                <StatCard
                    title="Net Balance"
                    value={balance != null ? formatCurrency(balance) : '—'}
                    icon={DollarSign}
                    iconBg="bg-green-50"
                    iconColor="text-green-600"
                />
            </div>
        </div>
    );
};

export default OverviewTab;
