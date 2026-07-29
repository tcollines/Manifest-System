const fs = require('fs');

const bboxes = {
  "bus-1": { id: "_x31_", x: 184, y: 108, width: 189, height: 147 },
  "bus-2": { id: "_x32_", x: 229, y: 25, width: 192, height: 142 },
  "taxi-1": { id: "_x33_", x: 31, y: 259, width: 85, height: 67 },
  "taxi-2": { id: "_x34__1_", x: 129, y: 266, width: 87, height: 61 },
  "car-1": { id: "_x35__2_", x: 235, y: 270, width: 92, height: 64 },
  "car-2": { id: "_x36__1_", x: 328, y: 273, width: 96, height: 61 },
  "boda-1": { id: "_x37_", x: 31, y: 345, width: 84, height: 71 },
  "boda-2": { id: "_x38_", x: 127, y: 351, width: 85, height: 75 },
};

const content = fs.readFileSync('frontend/public/3D Car Nav.svg', 'utf8');

function extractGroup(id) {
  const startTag = `<g id="${id}">`;
  let startIndex = content.indexOf(startTag);
  if (startIndex === -1) return null;
  
  let depth = 0;
  let i = startIndex;
  while (i < content.length) {
    if (content.startsWith('<g', i)) {
       depth++;
       i += 2;
    } else if (content.startsWith('</g>', i)) {
       depth--;
       i += 4;
       if (depth === 0) {
          return content.substring(startIndex, i);
       }
    } else {
       i++;
    }
  }
  return null;
}

Object.entries(bboxes).forEach(([type, box]) => {
  const groupStr = extractGroup(box.id);
  if (!groupStr) {
      console.log(`Failed to find ${box.id}`);
      return;
  }
  
  const svgTpl = `<?xml version="1.0" encoding="utf-8"?>
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
     viewBox="${box.x} ${box.y} ${box.width} ${box.height}">
  ${groupStr}
</svg>`;

  fs.writeFileSync(`frontend/public/icon-${type}.svg`, svgTpl);
  console.log(`Cleanly extracted icon-${type}.svg from ${box.id}`);
});
