const fs = require('fs');
const path = 'components/GlobalSchedulesView.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add Trash2 to lucide-react imports
content = content.replace(
    /import \{ Calendar, ChevronDown, ChevronUp, Clock, AlertCircle \} from 'lucide-react';/,
    "import { Calendar, ChevronDown, ChevronUp, Clock, AlertCircle, Trash2 } from 'lucide-react';"
);

// 2. Add handleDeleteWeek and handleDeleteSchedule after handleGenerate
const deleteMethods = `
  const handleDeleteWeek = async (e: React.MouseEvent, week: string, weekSchedules: ServiceSchedule[]) => {
      e.stopPropagation();
      if (!window.confirm(\`Are you sure you want to delete ALL \${weekSchedules.length} schedules for the week of \${formatDateOrdinal(week)}? This cannot be undone.\`)) return;
      
      setIsGenerating(true);
      try {
          await Promise.all(weekSchedules.map(s => ServiceScheduleStore.delete(s.id)));
          showToast('Schedules for the week deleted successfully.', 'success');
          fetchData();
      } catch (err) {
          console.error(err);
          showToast('Failed to delete some schedules.', 'error');
      } finally {
          setIsGenerating(false);
      }
  };

  const handleDeleteSchedule = async (e: React.MouseEvent, id: string, deptName: string) => {
      e.stopPropagation();
      if (!window.confirm(\`Are you sure you want to delete the schedule for \${deptName}? This cannot be undone.\`)) return;
      
      try {
          const res = await ServiceScheduleStore.delete(id);
          if (res.status === 'success') {
              showToast('Schedule deleted successfully.', 'success');
              fetchData();
          } else {
              showToast(res.message || 'Failed to delete schedule.', 'error');
          }
      } catch (err) {
          console.error(err);
          showToast('An error occurred while deleting the schedule.', 'error');
      }
  };

  // Group schedules by Week`;

content = content.replace(/\/\/ Group schedules by Week/, deleteMethods);

// 3. Add Delete Week button to Week Header
const weekHeaderRegex = /<div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 group-hover:bg-gray-100 transition-colors">/;
const weekHeaderReplacement = `<div className="flex items-center gap-2">
                                <button 
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                    onClick={(e) => handleDeleteWeek(e, week, weekSchedules)}
                                    title="Delete all schedules for this week"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 group-hover:bg-gray-100 transition-colors">`;
content = content.replace(weekHeaderRegex, weekHeaderReplacement);

// 4. Add Delete button to individual schedule row
const scheduleHeaderRegex = /<div className="flex items-center justify-center p-1">[\s\S]*?<\/div>/;
const scheduleHeaderReplacement = `<div className="flex items-center gap-2 p-1">
                                                    <button 
                                                        className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                                                        onClick={(e) => handleDeleteSchedule(e, schedule.id, schedule.departmentName || 'Unknown Dept')}
                                                        title="Delete schedule"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                    <div className="flex items-center justify-center">
                                                        {expandedScheduleId === schedule.id ? <ChevronUp className="w-4 h-4 text-blue-500" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                                    </div>
                                                </div>`;
content = content.replace(scheduleHeaderRegex, scheduleHeaderReplacement);

fs.writeFileSync(path, content);
console.log('Successfully added delete options to GlobalSchedulesView.tsx');
