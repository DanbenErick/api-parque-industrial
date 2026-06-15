const fs = require('fs');
const content = fs.readFileSync('src/controllers/reciboController.ts', 'utf8');
const lines = content.split('\n');

const getLines = (startStr, endStr, includeEnd = true) => {
  const start = lines.findIndex(l => l.includes(startStr));
  if(start === -1) return [];
  
  let brackets = 0;
  let started = false;
  let end = -1;
  
  for(let i=start; i<lines.length; i++) {
    const l = lines[i];
    if(l.includes('{')) {
       brackets += (l.match(/\{/g) || []).length;
       started = true;
    }
    if(l.includes('}')) {
       brackets -= (l.match(/\}/g) || []).length;
    }
    if(started && brackets === 0) {
       end = i;
       break;
    }
  }
  return lines.slice(start, end + 1);
};

// We will just do a simple line-based extraction to be safe, because the user file has exactly these line numbers.
// But the line numbers might have shifted! I will just use regex or findIndex.

