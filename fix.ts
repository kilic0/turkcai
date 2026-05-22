import fs from 'fs';
const content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');
const start = 137; // Line 138 (0-indexed 137)
const numLinesToDelete = 3; 
lines.splice(start, numLinesToDelete);
fs.writeFileSync('src/App.tsx', lines.join('\n'), 'utf8');
console.log('Fixed lines!');
