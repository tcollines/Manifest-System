const fs = require('fs');
const path = 'types.ts';
let content = fs.readFileSync(path, 'utf8');

const regex = /(export interface ServiceSchedule\s*\{[\s\S]*?status:\s*'Draft'\s*\|\s*'Published';)/;
content = content.replace(regex, `$1\n    publicSlug?: string;`);

fs.writeFileSync(path, content);
console.log('Successfully updated types.ts');
