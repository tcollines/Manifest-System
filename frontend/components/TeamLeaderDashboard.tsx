

import React, { useEffect, useState } from 'react';
import KPIGrid from './KPIGrid';
import AnalyticsCharts from './AnalyticsCharts';
import { Map, Maximize2, Settings, Users } from 'lucide-react';
import { ManifestStore } from '../database/manifestStore';
import { ManifestDetails } from '../types';
import { useNavigate } from 'react-router-dom';

const TeamLeaderDashboard: React.FC = () => {
  const [manifest, setManifest] = useState<ManifestDetails | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchManifest = async () => {
      const data = await ManifestStore.get();
      setManifest(data);
    };
    fetchManifest();
  }, []);

  return (
    <div className="p-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-ministry-orange rounded-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-ministry-text">Team Leader Dashboard</h1>
          </div>
          <p className="text-gray-500 mt-1">
            Read-only overview of ministry performance.
            {manifest && <span className="font-bold text-ministry-text ml-2">Manifest: {manifest.name}</span>}
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center space-x-2 bg-ministry-text text-white px-5 py-3 rounded-xl hover:bg-gray-800 transition-colors font-bold shadow-lg"
          >
            <Settings className="w-4 h-4" />
            <span>Manifest Settings</span>
          </button>
        </div>
      </div>

      {/* KPI Section (Read Only) */}
      <div className="opacity-90 pointer-events-none select-none">
        <KPIGrid />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">

        {/* Left Column: Analytics & Map */}
        <div className="xl:col-span-4 space-y-8">

          <div className="opacity-90 pointer-events-none select-none">
            <AnalyticsCharts />
          </div>

          {/* Regional Map Card */}
          <div className="bg-ministry-card rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Map className="w-5 h-5 text-ministry-orange" />
                <h3 className="text-lg font-bold text-ministry-text">Regional Coverage Overlay</h3>
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span>Live Data Feed</span>
              </div>
            </div>

            {/* Simulated Map Visual */}
            <div className="relative h-96 bg-gray-900 w-full overflow-hidden flex items-center justify-center">
              {/* Background Pattern simulating streets */}
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(#374151 1px, transparent 1px), linear-gradient(90deg, #374151 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

              {/* Simulated Radar Scan Effect */}
              <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] border border-ministry-neon/30 rounded-full transform -translate-x-1/2 -translate-y-1/2 opacity-30"></div>
              <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] border border-ministry-neon/50 rounded-full transform -translate-x-1/2 -translate-y-1/2 opacity-40"></div>

              {/* SVG Polygons for Zones */}
              <svg viewBox="0 0 800 400" className="w-full h-full text-ministry-text absolute top-0 left-0">
                {/* Zone 1 */}
                <path d="M150,100 L300,50 L400,150 L250,250 Z" fill="rgba(255, 87, 34, 0.2)" stroke="#FF5722" strokeWidth="2" />
                <text x="250" y="150" className="text-xs font-bold fill-white" textAnchor="middle">Zone Alpha</text>

                {/* Zone 2 */}
                <path d="M420,160 L600,120 L650,250 L500,320 L400,280 Z" fill="rgba(204, 255, 0, 0.2)" stroke="#ccff00" strokeWidth="2" />
                <text x="520" y="220" className="text-xs font-bold fill-white" textAnchor="middle">Zone Beta</text>

                {/* Points of Interest */}
                <circle cx="250" cy="180" r="4" fill="#FF5722" className="animate-ping" />
                <circle cx="550" cy="200" r="4" fill="#ccff00" className="animate-ping" style={{ animationDelay: '1s' }} />

                {/* Manifest Location Marker */}
                {manifest && manifest.coordinates && (
                  <g transform="translate(400, 200)">
                    <path d="M0,0 L-10,-20 L10,-20 Z" fill="white" />
                    <circle cx="0" cy="-25" r="5" fill="white" />
                    <text x="0" y="20" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">{manifest.name}</text>
                  </g>
                )}
              </svg>

              {/* Legend Overlay */}
              <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur p-3 rounded-lg border border-gray-700 shadow-sm text-xs text-white">
                <div className="font-bold mb-2 text-gray-400 uppercase">Map Layers</div>
                <div className="flex items-center mb-1">
                  <span className="w-3 h-3 bg-ministry-orange/40 border border-ministry-orange rounded mr-2"></span>
                  <span>High Activity Zone</span>
                </div>
                <div className="flex items-center">
                  <span className="w-3 h-3 bg-ministry-neon/40 border border-ministry-neon rounded mr-2"></span>
                  <span>Expansion Zone</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamLeaderDashboard;
