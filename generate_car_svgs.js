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

const originalSvg = fs.readFileSync('frontend/public/3D Car Nav.svg', 'utf8');

const allIds = [
  '_x31_', '_x32_', '_x33_', '_x34__1_', '_x35__2_', '_x36__2_', '_x36__1_',
  '_x37_', '_x38_', '_x39_', '_x31_0', '_x31_1', '_x31_2'
].map(id => `#${id}`).join(', ');

Object.entries(bboxes).forEach(([type, box]) => {
  let modified = originalSvg.replace(
    /viewBox="[^"]+"/,
    `viewBox="${box.x} ${box.y} ${box.width} ${box.height}"`
  );
  
  const styleBlock = `
<style>
  ${allIds} { display: none; }
  #${box.id} { display: inline !important; }
</style>
`;
  
  modified = modified.replace(/<svg[^>]+>/, match => match + styleBlock);
  fs.writeFileSync(`frontend/public/icon-${type}.svg`, modified);
  console.log(`Generated icon-${type}.svg`);
});
