const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');
code = code.replace(/src="\/src\/main\.tsx\?v=\d+"/, 'src="/src/main.tsx?v=' + Date.now() + '"');
fs.writeFileSync('index.html', code);
