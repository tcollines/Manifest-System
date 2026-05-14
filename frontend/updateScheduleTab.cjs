const fs = require('fs');
const path = 'modules/generic-dept/tabs/ScheduleTab.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
    /const handleShareLink = \(scheduleId: string\) => \{[\s\S]*?navigator\.clipboard\.writeText\(url\)/,
    `const handleShareLink = (scheduleId: string, publicSlug?: string) => {
        const url = \`\${window.location.origin}/schedule/\${publicSlug || scheduleId}\`;
        navigator.clipboard.writeText(url)`
);

content = content.replace(
    /onClick=\{\(\) => handleShareLink\(schedule.id\)\}/g,
    `onClick={() => handleShareLink(schedule.id, schedule.publicSlug)}`
);

fs.writeFileSync(path, content);
console.log('Successfully updated ScheduleTab.tsx');
