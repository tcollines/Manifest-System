import React from 'react';
import {
    Users, Bus, MapPin, TrendingUp,
    CheckCircle, AlertCircle, Info,
    CreditCard as IdCard
} from 'lucide-react';
import { Vehicle, Passenger } from '../types';
import { ExtendedStation } from '../database/logisticsStore';

interface StageDetailsTabProps {
    vehicles: Vehicle[];
    passengers: Passenger[];
    stations: ExtendedStation[];
}

export const StageDetailsTab: React.FC<StageDetailsTabProps> = ({ vehicles, passengers, stations }) => {
    // 1. Pre-process data for O(1) lookups
    const vehiclesByStation = React.useMemo(() => {
        const map = new Map<string, Vehicle[]>();
        vehicles.forEach(v => {
            const list = map.get(v.stationId) || [];
            list.push(v);
            map.set(v.stationId, list);
        });
        return map;
    }, [vehicles]);

    const passengersByVehicle = React.useMemo(() => {
        const map = new Map<string, number>();
        passengers.forEach(p => {
            map.set(p.vehicleId, (map.get(p.vehicleId) || 0) + 1);
        });
        return map;
    }, [passengers]);

    // 2. Calculate Per Stage Stats efficiently
    const stageStats = React.useMemo(() => {
        return stations.map(station => {
            const stationVehicles = vehiclesByStation.get(station.id) || [];

            let passengerCount = 0;
            let childrenCount = 0;
            const stationVehicleSummary: any = {};

            stationVehicles.forEach(v => {
                passengerCount += passengersByVehicle.get(v.id) || 0;
                childrenCount += v.childrenCount || 0;
                const type = v.type || 'Other';
                stationVehicleSummary[type] = (stationVehicleSummary[type] || 0) + 1;
            });

            return {
                ...station,
                totalPeople: passengerCount + childrenCount,
                vehicleCount: stationVehicles.length,
                vehicleSummary: stationVehicleSummary,
                breakdown: { passengers: passengerCount, children: childrenCount }
            };
        }).sort((a, b) => b.totalPeople - a.totalPeople);
    }, [stations, vehiclesByStation, passengersByVehicle]);

    // 2. Calculate Vehicle Kind Summary (aggregated from event-scoped stages)
    const vehicleSummary = React.useMemo(() => {
        const summary: any = {};
        stageStats.forEach(stage => {
            Object.entries(stage.vehicleSummary).forEach(([type, count]) => {
                summary[type] = (summary[type] || 0) + (count as number);
            });
        });
        return summary;
    }, [stageStats]);

    // 3. Calculate Aggregated Stats from Stage Data (strictly event-scoped)
    const totalPeople = stageStats.reduce((sum, s) => sum + s.totalPeople, 0);
    const totalFleet = stageStats.reduce((sum, s) => sum + s.vehicleCount, 0);
    const totalStages = stageStats.length;
    const avgPerStage = totalStages > 0 ? Math.round(totalPeople / totalStages) : 0;

    return (
        <div className="space-y-4 lg:space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Header Totals — 2-col on mobile, 4-col on desktop */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
                <div className="bg-white p-3 lg:p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-ministry-orange/5 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
                    <div className="flex items-center gap-3 relative">
                        <div className="p-2 lg:p-3 bg-ministry-orange/10 text-ministry-orange rounded-xl">
                            <Users className="w-5 h-5 lg:w-6 lg:h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total People</p>
                            <p className="text-xl lg:text-2xl font-black text-ministry-text">{totalPeople.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-3 lg:p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
                    <div className="flex items-center gap-3 relative">
                        <div className="p-2 lg:p-3 bg-blue-100 text-blue-600 rounded-xl">
                            <Bus className="w-5 h-5 lg:w-6 lg:h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Fleet</p>
                            <p className="text-xl lg:text-2xl font-black text-ministry-text">{totalFleet.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-3 lg:p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
                    <div className="flex items-center gap-3 relative">
                        <div className="p-2 lg:p-3 bg-green-100 text-green-600 rounded-xl">
                            <MapPin className="w-5 h-5 lg:w-6 lg:h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Active Stages</p>
                            <p className="text-xl lg:text-2xl font-black text-ministry-text">{totalStages.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-3 lg:p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
                    <div className="flex items-center gap-3 relative">
                        <div className="p-2 lg:p-3 bg-purple-100 text-purple-600 rounded-xl">
                            <TrendingUp className="w-5 h-5 lg:w-6 lg:h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Avg Per Stage</p>
                            <p className="text-xl lg:text-2xl font-black text-ministry-text">
                                {avgPerStage.toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
                {/* Stage Breakdown */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-4 lg:p-5 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-bold text-ministry-text flex items-center gap-2 text-sm lg:text-base">
                                <MapPin className="w-4 h-4 text-ministry-orange" />
                                People Transported Per Stage
                            </h3>
                            <span className="text-[10px] bg-white px-2 py-1 rounded-full border border-gray-100 font-bold text-gray-400 uppercase shadow-sm">
                                Live Data
                            </span>
                        </div>

                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50/30">
                                        <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Stage Name</th>
                                        <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fleet Detail</th>
                                        <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Adults</th>
                                        <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Children</th>
                                        <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Total Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {stageStats.map(stage => (
                                        <tr key={stage.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-ministry-text group-hover:bg-ministry-orange group-hover:text-white transition-colors">
                                                        <MapPin className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-gray-800">{stage.name}</p>
                                                        <p className="text-[10px] text-gray-400">{stage.location}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1.5 font-bold text-sm text-gray-600">
                                                        <Bus className="w-3.5 h-3.5" />
                                                        {stage.vehicleCount} Vehicles
                                                    </div>
                                                    <div className="flex gap-1.5">
                                                        {Object.entries(stage.vehicleSummary).map(([type, count]: [any, any]) => (
                                                            <span key={type} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-bold uppercase">
                                                                {count} {type.charAt(0)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 font-medium text-sm text-gray-600">
                                                {stage.breakdown.passengers}
                                            </td>
                                            <td className="px-5 py-4 font-medium text-sm text-purple-600">
                                                {stage.breakdown.children}
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <div className="inline-flex items-center bg-gray-900 text-white px-3 py-1 rounded-full font-black text-xs shadow-lg shadow-black/10">
                                                    {stage.totalPeople}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {stageStats.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-5 py-12 text-center">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Info className="w-8 h-8 text-gray-200" />
                                                    <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">No stages data available</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card List */}
                        <div className="md:hidden divide-y divide-gray-50">
                            {stageStats.map(stage => (
                                <div key={stage.id} className="p-3 flex items-center gap-3">
                                    <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center text-ministry-text shrink-0">
                                        <MapPin className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm text-gray-800 truncate">{stage.name}</p>
                                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                            <span className="flex items-center gap-1"><Bus className="w-3 h-3" />{stage.vehicleCount}</span>
                                            <span>·</span>
                                            <span>{stage.breakdown.passengers} adults</span>
                                            <span>·</span>
                                            <span className="text-purple-600">{stage.breakdown.children} kids</span>
                                        </div>
                                    </div>
                                    <div className="bg-gray-900 text-white px-2.5 py-1 rounded-full font-black text-xs shrink-0">
                                        {stage.totalPeople}
                                    </div>
                                </div>
                            ))}
                            {stageStats.length === 0 && (
                                <div className="p-8 text-center">
                                    <Info className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                                    <p className="text-sm text-gray-400 font-bold">No stages data available</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Vehicle Kind Summary */}
                <div className="space-y-4 lg:space-y-6">
                    <div className="bg-white p-4 lg:p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h3 className="font-black text-ministry-text mb-4 lg:mb-6 uppercase text-xs tracking-widest flex items-center gap-2 border-b border-gray-50 pb-3 lg:pb-4">
                            <IdCard className="w-4 h-4 text-blue-500" />
                            Vehicle Kind Summary
                        </h3>
                        <div className="space-y-3 lg:space-y-4">
                            {['Bus', 'Coaster', 'Taxi', 'Car'].map(type => {
                                const count = vehicleSummary[type] || 0;
                                const percentage = vehicles.length > 0 ? (count / vehicles.length) * 100 : 0;
                                return (
                                    <div key={type} className="space-y-1.5 lg:space-y-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${type === 'Bus' ? 'bg-indigo-500' :
                                                    type === 'Coaster' ? 'bg-emerald-500' :
                                                        type === 'Taxi' ? 'bg-orange-500' : 'bg-slate-400'
                                                    }`} />
                                                <span className="font-bold text-gray-700">{type === 'Bus' ? 'Buses' : `${type}s`}</span>
                                            </div>
                                            <span className="text-gray-400 font-mono font-bold">{count}</span>
                                        </div>
                                        <div className="h-2 bg-gray-50 rounded-full overflow-hidden border border-gray-100 shadow-inner">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ${type === 'Bus' ? 'bg-indigo-500 shadow-indigo-500/30' :
                                                    type === 'Coaster' ? 'bg-emerald-500 shadow-emerald-500/30' :
                                                        type === 'Taxi' ? 'bg-orange-500 shadow-orange-500/30' : 'bg-slate-400 shadow-slate-400/30'
                                                    } shadow-lg`}
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-6 lg:mt-8 p-3 lg:p-4 bg-gray-900 rounded-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -mr-8 -mt-8" />
                            <div className="relative">
                                <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Fleet Capacity</p>
                                <div className="flex items-end gap-2">
                                    <p className="text-2xl font-black text-white">{totalPeople}</p>
                                    <p className="text-[10px] text-ministry-orange font-bold uppercase mb-1.5 flex items-center gap-1">
                                        <TrendingUp className="w-3 h-3" />
                                        Optimal
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-ministry-orange to-orange-600 p-4 lg:p-6 rounded-2xl shadow-xl shadow-orange-500/20 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-20">
                            <Info className="w-12 h-12" />
                        </div>
                        <h4 className="font-black uppercase text-[10px] tracking-widest mb-2 opacity-80">Efficiency Alert</h4>
                        <p className="text-sm font-medium leading-relaxed">
                            Averages show approximately <strong>{stations.length > 0 ? Math.round(totalPeople / stations.length) : 0} people</strong> per stage.
                            Consider redeploying fleet to high-traffic zones.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
