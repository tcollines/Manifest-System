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
  const [attendanceData, setAttendanceData] = React.useState<any[]>(ATTENDANCE_DATA);
  const [soulsData, setSoulsData] = React.useState<any[]>(SOUL_WINNING_DATA);
  const [totalSouls, setTotalSouls] = React.useState<number>(0);
  const [selectedMonth, setSelectedMonth] = React.useState<string>('All');
  const [availableMonths, setAvailableMonths] = React.useState<string[]>([]);

  // Fetch data on mount
  React.useEffect(() => {
    const loadData = async () => {
      try {
        const { analyticsService } = await import('../services/analyticsService');
        const attData = await analyticsService.fetchAttendanceAnalytics();
        const sData = await analyticsService.fetchSoulWinningAnalytics();

        if (attData && attData.length > 0) {
          setAttendanceData(attData);

          // Extract unique months from data (assuming name format "Jan 4", "Feb 1", etc. or fullDate)
          const months = Array.from(new Set(attData.map((item: any) => {
            // item.name is like "Jan 1" (week) or "Jan 4" (date) 
            // Logic: Extract "Jan", "Feb" etc.
            const month = item.name.split(' ')[0];
            return month;
          })));
          setAvailableMonths(['All', ...months]);
        }

        if (sData && sData.length > 0) {
          setSoulsData(sData);
          const total = sData.reduce((acc: number, curr: any) => acc + (curr.value || 0), 0);
          setTotalSouls(total);
        }
      } catch (error) {
        console.error("Failed to load analytics data:", error);
      }
    };

    loadData();
  }, []);

  const filteredData = React.useMemo(() => {
    if (selectedMonth === 'All') return attendanceData;
    return attendanceData.filter((item: any) => item.name.startsWith(selectedMonth));
  }, [attendanceData, selectedMonth]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {/* Bar Chart - Attendance/Collections */}
      <div className="lg:col-span-2 bg-ministry-card p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-ministry-text">Service Attendance Analytics</h3>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-ministry-purple focus:border-ministry-purple block p-2.5"
          >
            {availableMonths.map(month => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
        </div>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="name" stroke="#6b7280" tick={{ fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis stroke="#6b7280" tick={{ fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                shared={false}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white border border-gray-200 p-3 rounded-lg shadow-xl">
                        <p className="text-gray-900 font-semibold mb-1">{data.title}</p>
                        {data.description && <p className="text-gray-600 text-xs mb-1 italic">{data.description}</p>}
                        {data.serviceNumber && <p className="text-gray-500 text-xs mb-1">Service #{data.serviceNumber}</p>}
                        <p className="text-gray-600 text-sm mb-2">{data.name}</p>
                        <p className="text-ministry-purple font-bold">
                          Attendance: {data.value}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={20}>
                {filteredData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={['#00C853', '#FF5722', '#FFC107', '#2979FF'][index % 4]} />
                ))}
              </Bar>
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
                data={soulsData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {soulsData.map((entry, index) => (
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
            <span className="text-3xl font-bold text-ministry-text">
              {totalSouls > 0 ? (totalSouls > 1000 ? (totalSouls / 1000).toFixed(1) + 'K' : totalSouls) : '1.5K'}
            </span>
            <p className="text-xs text-gray-500">Total Souls</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsCharts;