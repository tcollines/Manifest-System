import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Calendar, Users, HeartHandshake, GraduationCap, Building2 } from 'lucide-react';
import { useCampus } from './CampusContext';

const TABS = [
    { id: 'families',   label: 'Families',    mobileLabel: 'Families',  icon: Users },
    { id: 'evangelism', label: 'Evangelism',  mobileLabel: 'Evang.',    icon: HeartHandshake },
    { id: 'vacists',    label: 'Vacists',     mobileLabel: 'Vacists',   icon: GraduationCap },
    { id: 'alumni',     label: 'Alumni',      mobileLabel: 'Alumni',    icon: Building2 },
];

export const CampusTabsLayout: React.FC = () => {
    const { stats, events, selectedEventId, setSelectedEventId } = useCampus();
    const location = useLocation();

    const pathParts = location.pathname.split('/');
    const basePath = pathParts.slice(0, -1).join('/');

    return (
        <div className="flex flex-col min-h-full bg-gray-50">

            {/* ── Header ──────────────────────────────────────────────── */}
            <div className="px-4 md:px-8 pt-4 md:pt-8 pb-0">
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                        <h1 className="text-xl md:text-3xl font-bold text-ministry-text">Campus &amp; Institutions</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Manage campus fellowships, evangelism, and related activities</p>
                    </div>
                    {/* Event filter — compact on mobile */}
                    <div className="relative shrink-0">
                        <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                        <select
                            value={selectedEventId}
                            onChange={(e) => setSelectedEventId(e.target.value)}
                            className="pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs md:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ministry-orange shadow-sm max-w-[140px] md:max-w-none"
                        >
                            <option value="">All Events</option>
                            {events && events.map(event => (
                                <option key={event.id} value={event.id}>{event.title}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* KPI summary — 2-col on mobile, 3-col on desktop */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-4">
                    <div className="bg-white border border-gray-100 p-3 md:p-4 rounded-xl flex items-center gap-3 shadow-sm">
                        <div className="p-2 bg-blue-50 rounded-lg shrink-0">
                            <Users className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium leading-tight">Total Souls Won</p>
                            <p className="text-xl md:text-2xl font-black text-gray-900">{stats.totalSouls}</p>
                        </div>
                    </div>
                    <div className="bg-white border border-gray-100 p-3 md:p-4 rounded-xl flex items-center gap-3 shadow-sm">
                        <div className="p-2 bg-green-50 rounded-lg shrink-0">
                            <Building2 className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium leading-tight">Families Setup</p>
                            <p className="text-xl md:text-2xl font-black text-gray-900">{stats.totalFamilies}</p>
                        </div>
                    </div>
                    <div className="col-span-2 md:col-span-1 bg-white border border-gray-100 p-3 md:p-4 rounded-xl flex items-center gap-3 shadow-sm">
                        <div className="p-2 bg-purple-50 rounded-lg shrink-0">
                            <HeartHandshake className="w-4 h-4 md:w-5 md:h-5 text-purple-500" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium leading-tight">Evangelism Outreaches</p>
                            <p className="text-xl md:text-2xl font-black text-gray-900">{stats.totalEvangelisms}</p>
                        </div>
                    </div>
                </div>

                {/* Desktop tab strip */}
                <div className="hidden md:flex border-b border-gray-200 mb-0">
                    {TABS.map(({ id, label, icon: Icon }) => (
                        <NavLink
                            key={id}
                            to={`${basePath}/${id}`}
                            className={({ isActive }) =>
                                `flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap ${isActive
                                    ? 'border-ministry-orange text-ministry-orange bg-ministry-orange/5'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`
                            }
                        >
                            <Icon className="w-4 h-4" />
                            <span>{label}</span>
                        </NavLink>
                    ))}
                </div>
            </div>

            {/* ── Content ─────────────────────────────────────────────── */}
            <div className="flex-1 mb-20 md:mb-0 md:px-8 md:pt-6 md:pb-8">
                <div className="md:bg-white md:rounded-xl md:shadow-sm md:border md:border-gray-100 md:p-6 min-h-[400px]">
                    <Outlet />
                </div>
            </div>

            {/* ── Mobile Floating Bottom Navigation ───────────────────── */}
            <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm">
                <div className="flex items-center justify-around bg-white/75 backdrop-blur-2xl p-2 rounded-full border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                    {TABS.map(({ id, mobileLabel, icon: Icon }) => (
                        <NavLink
                            key={id}
                            to={`${basePath}/${id}`}
                            className={({ isActive }) =>
                                `flex flex-col items-center justify-center flex-1 py-2 rounded-full transition-all duration-300 relative overflow-hidden ${isActive ? 'text-ministry-neon' : 'text-gray-500'}`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    {isActive && <div className="absolute inset-0 bg-black rounded-full animate-in zoom-in duration-300" />}
                                    <div className="relative z-10 flex flex-col items-center gap-0.5">
                                        <Icon strokeWidth={isActive ? 2.5 : 2} className={`w-4 h-4 transition-transform duration-300 ${isActive ? 'text-ministry-neon scale-110' : ''}`} />
                                        <span className={`text-[10px] tracking-wide ${isActive ? 'font-bold text-ministry-neon' : 'font-medium'}`}>{mobileLabel}</span>
                                    </div>
                                </>
                            )}
                        </NavLink>
                    ))}
                </div>
            </div>
        </div>
    );
};
