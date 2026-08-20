const fs = require('fs');
let code = fs.readFileSync('src/lib/store.tsx', 'utf8');

const target = `const processTransaction = async (txArgs: Omit<Transaction, 'id' | 'timestamp'> & { operator?: string }) => {`;

const replacement = `const processTransaction = async (txArgs: Omit<Transaction, 'id' | 'timestamp'> & { operator?: string }) => {
    // FORCE FIX FOR CACHED "DISPENSE"
    if ((txArgs.type as any) === 'DISPENSE') {
      txArgs.type = 'ISSUE';
    }`;

code = code.replace(target, replacement);
fs.writeFileSync('src/lib/store.tsx', code);
