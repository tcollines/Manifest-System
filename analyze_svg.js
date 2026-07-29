const fs = require('fs');
const content = fs.readFileSync('frontend/public/3D Car Nav.svg', 'utf8');

const groups = ['_x31_', '_x32_', '_x33_'];

groups.forEach(id => {
  const groupRegex = new RegExp(`<g id="${id}">([\\s\\S]*?)</g>`, 'g');
  const match = groupRegex.exec(content);
  if (match) {
    const groupContent = match[1];
    // Find all x, y, points, d
    const coords = [...groupContent.matchAll(/(?:d="M|points=")([\d\.\s,-]+)/g)];
    let count = 0;
    let minX = 9999, maxX = -9999, minY = 9999, maxY = -9999;
    
    coords.forEach(c => {
       const nums = c[1].split(/[\s,-]+/).filter(n => n).map(Number);
       for(let i=0; i<nums.length; i+=2) {
          if (!isNaN(nums[i]) && !isNaN(nums[i+1])) {
             if (nums[i] < minX) minX = nums[i];
             if (nums[i] > maxX) maxX = nums[i];
             if (nums[i+1] < minY) minY = nums[i+1];
             if (nums[i+1] > maxY) maxY = nums[i+1];
          }
       }
    });
    console.log(`Group ${id}: X(${minX} to ${maxX}), Y(${minY} to ${maxY})`);
  }
});
