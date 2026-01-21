
import React from 'react';
import KPIGrid from './KPIGrid';
import AnalyticsCharts from './AnalyticsCharts';
import DepartmentList from './DepartmentList';
import { ModalType } from '../types';
import { Plus, UserPlus, Target, FileText, Download, Sparkles, Map, Maximize2, Package } from 'lucide-react';
import { useEventLifecycle } from '../hooks/useEventLifecycle';


interface DashboardProps {
   openModal: (type: ModalType) => void;
   onNavigate: (view: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ openModal, onNavigate }) => {
   useEventLifecycle();

   return (
      <div className="p-4 md:p-8">
         {/* Header Section */}
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
               <h1 className="text-3xl font-bold text-ministry-text mb-1">
                  Ministry Overview
               </h1>
               <p className="text-gray-500">
                  Welcome back, Administrator. Here's what's happening today.
               </p>
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
                  onClick={() => { alert("Report Exported Successfully!") }}
               >
                  <Download className="w-4 h-4" />
                  <span>Export Report</span>
               </button>
            </div>
         </div>

         {/* Monitor Content */}
         <>
            {/* KPI Section */}
            <KPIGrid />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">

               {/* Left Column: Analytics */}
               <div className="xl:col-span-3 space-y-8">
                  <AnalyticsCharts />

                  {/* Manifest Coverage Map Card */}
                  <div className="bg-ministry-card rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                     <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                           <Map className="w-5 h-5 text-ministry-orange" />
                           <h3 className="text-lg font-bold text-ministry-text">Manifest Coverage Map</h3>
                        </div>
                        <button className="text-sm text-gray-500 hover:text-ministry-orange flex items-center">
                           <Maximize2 className="w-4 h-4 mr-1" />
                           Full View
                        </button>
                     </div>

                     {/* Simulated Map Visual */}
                     <div className="relative h-64 md:h-80 bg-gray-100 w-full overflow-hidden flex items-center justify-center">
                        {/* Background Pattern simulating streets */}
                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#9ca3af 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

                        {/* SVG Polygons for Zones */}
                        <svg viewBox="0 0 800 400" className="w-full h-full text-ministry-text">
                           {/* Zone 1 */}
                           <path d="M150,100 L300,50 L400,150 L250,250 Z" fill="rgba(255, 87, 34, 0.2)" stroke="#FF5722" strokeWidth="2" />
                           <text x="250" y="150" className="text-xs font-bold fill-gray-700" textAnchor="middle">Zone Alpha</text>

                           {/* Zone 2 */}
                           <path d="M420,160 L600,120 L650,250 L500,320 L400,280 Z" fill="rgba(204, 255, 0, 0.2)" stroke="#ccff00" strokeWidth="2" />
                           <text x="520" y="220" className="text-xs font-bold fill-gray-700" textAnchor="middle">Zone Beta</text>

                           {/* Points of Interest */}
                           <circle cx="250" cy="180" r="4" fill="#FF5722" />
                           <circle cx="550" cy="200" r="4" fill="#ccff00" />
                           <circle cx="580" cy="150" r="4" fill="#ccff00" />
                        </svg>

                        {/* Legend Overlay */}
                        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur p-3 rounded-lg border border-gray-200 shadow-sm text-xs">
                           <div className="font-bold mb-2">Coverage Legend</div>
                           <div className="flex items-center mb-1">
                              <span className="w-3 h-3 bg-ministry-orange/40 border border-ministry-orange rounded mr-2"></span>
                              <span>High Activity</span>
                           </div>
                           <div className="flex items-center">
                              <span className="w-3 h-3 bg-ministry-neon/40 border border-ministry-neon rounded mr-2"></span>
                              <span>Growing</span>
                           </div>
                        </div>
                     </div>
                  </div>

                  <DepartmentList onNavigate={onNavigate} />
               </div>

               {/* Right Column: Quick Actions & Status */}
               <div className="xl:col-span-1 space-y-6">
                  {/* Quick Actions Card */}
                  <div className="bg-white border border-gray-200 rounded-2xl p-6 sticky top-24 shadow-sm">
                     <h3 className="text-lg font-bold text-ministry-text mb-4">Command Center</h3>
                     <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
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
