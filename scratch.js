const fs = require('fs');
const content = fs.readFileSync('frontend/public/3D Car Nav.svg', 'utf8');
const regex = /<g id="([^"]+)"/g;
let match;
while ((match = regex.exec(content)) !== null) {
  console.log(match[1]);
}
