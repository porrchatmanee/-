const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');
code = code.replace('/src/main.tsx', '/src/main.tsx?v=' + Date.now());
fs.writeFileSync('index.html', code);
