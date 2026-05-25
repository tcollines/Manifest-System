const fs = require('fs');
const path = require('path');

const walk = (dir) => {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('Layout.tsx')) {
            results.push(file);
        }
    });
    return results;
};

const files = walk('d:/Manifest System/frontend/modules');
let updatedCount = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Make sure we have React in scope
    if (!content.includes('import React') && !content.includes('import { Suspense }')) {
        content = "import React from 'react';\n" + content;
    }

    if (content.includes('<Outlet />') && !content.includes('<React.Suspense')) {
        content = content.replace(/<Outlet \/>/g, '<React.Suspense fallback={<div className="flex items-center justify-center h-full w-full min-h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ministry-orange"></div></div>}>\n<Outlet />\n</React.Suspense>');
        fs.writeFileSync(file, content, 'utf8');
        console.log('Updated', file);
        updatedCount++;
    }
});

console.log('Total layouts updated:', updatedCount);
