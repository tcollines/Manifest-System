import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { SOUL_WINNING_DATA, ATTENDANCE_DATA } from '../constants';

const COLORS = ['#ccff00', '#FF5722', '#00C853', '#2979FF'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 p-3 rounded-lg shadow-xl">
        <p className="text-gray-900 font-semibold mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const AnalyticsCharts: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {/* Bar Chart - Attendance/Collections */}
      <div className="lg:col-span-2 bg-ministry-card p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-ministry-text">Service Attendance Analytics</h3>
          <div className="flex space-x-4 text-sm">
             <div className="flex items-center text-gray-600"><span className="w-3 h-3 rounded-full bg-ministry-neon mr-2 border border-gray-300"></span> Sunday</div>
             <div className="flex items-center text-gray-600"><span className="w-3 h-3 rounded-full bg-ministry-orange mr-2"></span> Thursday</div>
          </div>
        </div>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ATTENDANCE_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="name" stroke="#6b7280" tick={{fill: '#6b7280'}} axisLine={false} tickLine={false} />
              <YAxis stroke="#6b7280" tick={{fill: '#6b7280'}} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(0,0,0,0.05)'}} />
              <Bar dataKey="secondaryValue" name="Sunday" fill="#ccff00" stroke="#b3e600" radius={[4, 4, 0, 0]} barSize={20} />
              <Bar dataKey="value" name="Thursday" fill="#FF5722" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pie Chart - Souls Won */}
      <div className="bg-ministry-card p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-ministry-text">Souls Won</h3>
          <button className="text-ministry-orange text-sm hover:underline font-medium">View Details</button>
        </div>
        <div className="h-64 w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={SOUL_WINNING_DATA}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {SOUL_WINNING_DATA.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                 verticalAlign="bottom" 
                 height={36} 
                 iconType="circle"
                 wrapperStyle={{ paddingTop: '20px', fontSize: '12px', color: '#374151' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[calc(50%+20px)] text-center">
             <span className="text-3xl font-bold text-ministry-text">1.5K</span>
             <p className="text-xs text-gray-500">Total Souls</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsCharts;