const fs = require('fs');
const path = 'components/GlobalSchedulesView.tsx';
let content = fs.readFileSync(path, 'utf8');

const regex = /const handleGenerate = async \(\) => \{[\s\S]*?fetchData\(\);\s*\} else \{\s*showToast\(res\.message[^;]*;\s*\}\s*\} catch \(err\) \{/;
const replacement = `const handleGenerate = async () => {
      if (!newTitle || !newWeekStart) return;
      setIsGenerating(true);
      try {
          const res = await ServiceScheduleStore.generateGlobal({ title: newTitle, weekStart: newWeekStart });
          if (res.status === 'success') {
              const msg = res.data?.message || '';
              if (msg.includes('already have a schedule')) {
                  showToast('A schedule has already been generated for this week.', 'error');
              } else {
                  showToast(msg || 'Schedules generated successfully!', 'success');
                  setNewTitle('');
                  setNewWeekStart('');
                  fetchData();
              }
          } else {
              showToast(res.message || 'Failed to generate schedules', 'error');
          }
      } catch (err) {`;

content = content.replace(regex, replacement);

fs.writeFileSync(path, content);
console.log('Successfully updated GlobalSchedulesView.tsx');
