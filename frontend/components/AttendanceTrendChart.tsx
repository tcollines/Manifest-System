import React, { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Activity } from 'lucide-react';

interface AttendanceTrendChartProps {
  initialAttendanceData?: any[];
}

const AttendanceTrendChart: React.FC<AttendanceTrendChartProps> = ({ initialAttendanceData }) => {
  const [attendanceData, setAttendanceData] = React.useState<any[]>(initialAttendanceData || []);
  const [selectedMonth, setSelectedMonth] = React.useState<string>('All');
  const [selectedServiceType, setSelectedServiceType] = React.useState<string>('All');
  const [availableMonths, setAvailableMonths] = React.useState<string[]>([]);

  React.useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const { analyticsService } = await import('../services/analyticsService');
        
        let attData = initialAttendanceData;
        if (!attData) {
            attData = await analyticsService.fetchAttendanceAnalytics();
        }

        if (isMounted && attData && attData.length > 0) {
          // Sort the data by fullDate to ensure the trendline is chronological
          const sortedData = [...attData].sort((a: any, b: any) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());
          setAttendanceData(sortedData);

          const months = Array.from(new Set(sortedData.map((item: any) => {
            return item.name.split(' ')[0]; // Gets 'Jan', 'Feb', etc.
          })));
          setAvailableMonths(['All', ...months]);
        }
      } catch (error) {
        console.error("Failed to load attendance trends:", error);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, []);

  const filteredData = React.useMemo(() => {
    let result = attendanceData;

    // Filter by Service Type
    if (selectedServiceType !== 'All') {
      result = result.filter((item: any) => {
        const title = item.title || '';
        
        if (selectedServiceType === 'Phaneroo Thursday Service') {
          // Starts with P and a number (or just P) but prevent mix-up with Prayer Evening
          return title.startsWith('P') && !title.toLowerCase().startsWith('prayer');
        }
        if (selectedServiceType === 'Sunday Service') {
          return title.startsWith('S');
        }
        if (selectedServiceType === 'Prayer Evening') {
          return title.toLowerCase().startsWith('prayer evening');
        }
        return true;
      });
    }

    // Filter by Month
    if (selectedMonth !== 'All') {
      result = result.filter((item: any) => item.name.startsWith(selectedMonth));
    }
    
    return result;
  }, [attendanceData, selectedMonth, selectedServiceType]);

  return (
    <div className="bg-ministry-card rounded-2xl border border-gray-200 shadow-sm overflow-hidden mt-8">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center space-x-2">
          <Activity className="w-5 h-5 text-ministry-orange" />
          <h3 className="text-lg font-bold text-ministry-text">Service Attendance Trend</h3>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedServiceType}
            onChange={(e) => setSelectedServiceType(e.target.value)}
            className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-ministry-purple focus:border-ministry-purple block p-2 px-3 outline-none"
          >
            <option value="All">All Service Types</option>
            <option value="Phaneroo Thursday Service">Thursday Service (P)</option>
            <option value="Sunday Service">Sunday Service (S)</option>
            <option value="Prayer Evening">Prayer Evenings</option>
          </select>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-ministry-purple focus:border-ministry-purple block p-2 px-3 outline-none"
          >
            {availableMonths.map(month => (
              <option key={month} value={month}>{month === 'All' ? 'All Months' : month}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="p-6 h-80 w-full bg-gray-50/30">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filteredData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis 
              dataKey="title" 
              stroke="#6b7280" 
              tick={{ fill: '#6b7280', fontSize: 12 }} 
              axisLine={false} 
              tickLine={false}
              angle={-25}
              textAnchor="end"
            />
            <YAxis stroke="#6b7280" tick={{ fill: '#6b7280' }} axisLine={false} tickLine={false} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white border border-gray-200 p-3 rounded-lg shadow-xl">
                      <p className="text-gray-900 font-semibold mb-1">{data.title}</p>
                      {data.description && <p className="text-gray-600 text-xs mb-1 italic">{data.description}</p>}
                      {data.serviceNumber && <p className="text-gray-500 text-xs mb-1">Service #{data.serviceNumber}</p>}
                      <p className="text-gray-600 text-sm mb-2">{data.name}</p>
                      <p className="text-ministry-orange font-bold">
                        Attendance: {data.value}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#FF5722" 
              strokeWidth={3} 
              dot={{ r: 5, fill: '#FF5722', stroke: '#fff', strokeWidth: 2 }}
              activeDot={{ r: 7 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default React.memo(AttendanceTrendChart);
