const fs = require('fs');
let code = fs.readFileSync('src/lib/store.tsx', 'utf8');

const target = `    let safeType = txArgs.type;
    if ((safeType as any) === 'DISPENSE') {
      safeType = 'ISSUE';
    }`;

const replacement = `    let safeType = txArgs.type;
    if (typeof safeType === 'string' && safeType.toUpperCase() === 'DISPENSE') {
      safeType = 'ISSUE' as any;
    }`;

code = code.replace(target, replacement);
fs.writeFileSync('src/lib/store.tsx', code);
