const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components/schools/EventsTab.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// The file literally contains \` and \${ in the code due to write_to_file escaping them
// We only want to replace \` with ` and \${ with ${ where it ruins JS syntax string literals
content = content.replace(/\\`/g, '`').replace(/\\\${/g, '${');

fs.writeFileSync(filePath, content);
console.log('Fixed escaping in EventsTab.tsx');
