const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            results.push(file);
        }
    });
    return results;
}

const targetDir = path.join(__dirname, 'frontend/modules/sales');
const files = walk(targetDir);

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    // Regex to match tailwind dark mode classes e.g. dark:bg-gray-800 dark:hover:bg-gray-700
    // Also handling arbitrary values if any like dark:bg-[#123]
    const newContent = content.replace(/dark:[^\s"']+/g, '');
    
    if (content !== newContent) {
        // Clean up any double spaces created by the removal
        const cleanedContent = newContent.replace(/  +/g, ' ').replace(/ "/g, '"').replace(/" /g, '"');
        fs.writeFileSync(file, cleanedContent, 'utf8');
        console.log(`Updated ${file}`);
    }
});
console.log('Done stripping dark mode classes!');
