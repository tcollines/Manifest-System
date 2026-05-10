
import React from 'react';
import { useNotification } from './ui/NotificationSystem';
import KPIGrid from './KPIGrid';
import AnalyticsCharts from './AnalyticsCharts';
import AttendanceTrendChart from './AttendanceTrendChart';
import DepartmentList from './DepartmentList';
import { ModalType, MinistryEvent } from '../types';
import { useQuery } from '@tanstack/react-query';
import { Plus, UserPlus, Target, FileText, Download, Sparkles, Map, Maximize2, Package, FileCheck, CheckCircle, ClipboardList, DollarSign } from 'lucide-react';
import { useEventLifecycle } from '../hooks/useEventLifecycle';
import { analyticsService } from '../services/analyticsService';
import { KpiCard } from './ui/KpiCard';


interface DashboardProps {
   openModal: (type: ModalType) => void;
   onNavigate?: (view: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ openModal }) => {
   const { showToast } = useNotification();
   const [events, setEvents] = React.useState<MinistryEvent[]>([]);
   const [selectedEventId, setSelectedEventId] = React.useState<string>('');

   // Sync initial event selection
   React.useEffect(() => {
      if (!selectedEventId && events && events.length > 0) {
         const first = events.find(e => e.type === 'Event' || e.type === 'Service');
         if (first) setSelectedEventId(first.id);
      }
   }, [events, selectedEventId]);

   const { data: bootstrapData, isLoading: isLoadingBootstrap } = useQuery({
      queryKey: ['dashboard_bootstrap'],
      queryFn: () => analyticsService.fetchDashboardBootstrap(),
      staleTime: 5 * 60 * 1000, // Keep fresh for 5 minutes
   });

   // Sync events when bootstrap data arrives (or from cache)
   React.useEffect(() => {
      if (bootstrapData?.events) {
         setEvents(bootstrapData.events);
      }
   }, [bootstrapData?.events]);

   useEventLifecycle();

   const workflowStats = bootstrapData?.workflowStats || null;
   const isLoadingWorkflow = isLoadingBootstrap;

   return (
      <div className="p-4 md:p-8">
         {/* Header Section */}
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
               <h1 className="text-2xl md:text-3xl font-bold text-ministry-text mb-1">
                  Ministry Overview
               </h1>

            </div>

            <div className="flex flex-wrap gap-3">
               <button
                  onClick={() => openModal(ModalType.AI_INSIGHTS)}
                  className="flex items-center space-x-2 bg-white border border-ministry-neon text-gray-900 px-4 py-2.5 rounded-xl hover:bg-ministry-neon hover:text-black transition-all duration-300 font-medium group shadow-sm flex-1 md:flex-none justify-center"
               >
                  <Sparkles className="w-4 h-4 text-ministry-orange group-hover:text-black group-hover:animate-pulse" />
                  <span>AI Insights</span>
               </button>
               <button
                  className="flex items-center space-x-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors font-medium shadow-sm flex-1 md:flex-none justify-center"
                  onClick={() => { showToast("Report Exported Successfully!", 'success'); }}
               >
                  <Download className="w-4 h-4" />
                  <span>Export Report</span>
               </button>
            </div>
         </div>

         {/* Monitor Content */}
         <>
            {/* System Workflows Summary */}
            <div className="mb-8">
               <h2 className="text-xl font-bold text-ministry-text mb-4">System Workflows Summary</h2>
               <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                  <KpiCard 
                     label="Workplans Pending Admin" 
                     value={workflowStats?.workplans_pending_admin ?? 0} 
                     icon={FileCheck} 
                     isLoading={isLoadingWorkflow} 
                  />
                  <KpiCard 
                     label="Workplans Approved" 
                     value={workflowStats?.workplans_finalized ?? 0} 
                     icon={CheckCircle} 
                     isLoading={isLoadingWorkflow} 
                  />
                  <KpiCard 
                     label="Requisitions Pending Admin" 
                     value={workflowStats?.requisitions_pending_admin ?? 0} 
                     icon={ClipboardList} 
                     isLoading={isLoadingWorkflow} 
                  />
                  <KpiCard 
                     label="Requisitions Awaiting Finance" 
                     value={workflowStats?.requisitions_awaiting_finance ?? 0} 
                     icon={DollarSign} 
                     isLoading={isLoadingWorkflow} 
                  />
               </div>
            </div>

            {/* KPI Section */}
            <KPIGrid eventId={selectedEventId} initialData={bootstrapData?.kpiStats} />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">

               {/* Left Column: Analytics */}
               <div className="xl:col-span-3 space-y-8">
                  <AnalyticsCharts 
                     initialAttendanceData={bootstrapData?.attendanceData} 
                     initialSoulsData={bootstrapData?.soulsData} 
                  />

                  {/* Attendance Trend Chart (Replaces Map) */}
                  <AttendanceTrendChart initialAttendanceData={bootstrapData?.attendanceData} />

                  <DepartmentList />
               </div>

               {/* Right Column: Quick Actions & Status */}
               <div className="xl:col-span-1 space-y-6">
                  {/* Quick Actions Card */}
                  <div className="bg-white border border-gray-200 rounded-2xl p-6 sticky top-24 shadow-sm">
                     <h3 className="text-lg font-bold text-ministry-text mb-4">Command Center</h3>
                     <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-1 gap-3">
                        <button onClick={() => openModal(ModalType.CREATE_SERVICE)} className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-all group">
                           <div className="flex items-center space-x-3">
                              <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Plus className="w-5 h-5" /></div>
                              <span className="text-gray-700 font-medium">Create Service</span>
                           </div>
                           <span className="text-gray-400 group-hover:translate-x-1 transition-transform">→</span>
                        </button>

                        <button onClick={() => openModal(ModalType.CREATE_EVENT)} className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-all group">
                           <div className="flex items-center space-x-3">
                              <div className="bg-purple-100 p-2 rounded-lg text-purple-600"><FileText className="w-5 h-5" /></div>
                              <span className="text-gray-700 font-medium">Plan Event</span>
                           </div>
                           <span className="text-gray-400 group-hover:translate-x-1 transition-transform">→</span>
                        </button>

                        <button onClick={() => openModal(ModalType.ASSIGN_USER)} className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-all group">
                           <div className="flex items-center space-x-3">
                              <div className="bg-green-100 p-2 rounded-lg text-green-600"><UserPlus className="w-5 h-5" /></div>
                              <span className="text-gray-700 font-medium">Assign User</span>
                           </div>
                           <span className="text-gray-400 group-hover:translate-x-1 transition-transform">→</span>
                        </button>

                        <button onClick={() => openModal(ModalType.SET_TARGETS)} className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-all group">
                           <div className="flex items-center space-x-3">
                              <div className="bg-orange-100 p-2 rounded-lg text-orange-600"><Target className="w-5 h-5" /></div>
                              <span className="text-gray-700 font-medium">Set Targets</span>
                           </div>
                           <span className="text-gray-400 group-hover:translate-x-1 transition-transform">→</span>
                        </button>
                     </div>

                     {/* Mini Activity Feed */}
                     <div className="mt-8 pt-6 border-t border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wider">Recent Activity</h4>
                        <div className="space-y-4">
                           <div className="flex items-start space-x-3">
                              <div className="w-2 h-2 mt-2 rounded-full bg-ministry-neon border border-gray-300"></div>
                              <div>
                                 <p className="text-sm text-gray-600">New partnership goal set to <span className="text-gray-900 font-semibold">150</span></p>
                                 <p className="text-xs text-gray-400 mt-1">2 mins ago</p>
                              </div>
                           </div>
                           <div className="flex items-start space-x-3">
                              <div className="w-2 h-2 mt-2 rounded-full bg-ministry-orange"></div>
                              <div>
                                 <p className="text-sm text-gray-600">Registration dept updated</p>
                                 <p className="text-xs text-gray-400 mt-1">1 hour ago</p>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </>
      </div>
   );
};

export default Dashboard;
