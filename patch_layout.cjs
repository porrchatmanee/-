const fs = require('fs');
let code = fs.readFileSync('src/components/Layout.tsx', 'utf8');

const target = `onClick={() => window.location.reload()}`;
const replacement = `onClick={() => {
                  // Force a hard bypass of the cache by appending a random query string
                  window.location.href = window.location.pathname + '?t=' + new Date().getTime();
                }}`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/Layout.tsx', code);
