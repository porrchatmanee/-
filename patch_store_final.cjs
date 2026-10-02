const fs = require('fs');
let code = fs.readFileSync('src/lib/store.tsx', 'utf8');

const target = `    if ((txArgs.type as any) === 'DISPENSE') {
      txArgs.type = 'ISSUE';
    }`;

const replacement = `    // FORCE FIX FOR CACHED "DISPENSE"
    let safeType = txArgs.type;
    if ((safeType as any) === 'DISPENSE') {
      safeType = 'ISSUE';
    }
`;

const target2 = `        const { error } = await supabase.from('transactions').insert({
          item_id: txArgs.itemId,
          type: txArgs.type,`;

const replacement2 = `        const { error } = await supabase.from('transactions').insert({
          item_id: txArgs.itemId,
          type: safeType,`;

const target3 = `    const newTxLocal: Transaction = {
      ...txArgs,
      id: \`tx_\${Date.now()}_\${Math.random().toString(36).substring(2, 9)}\`,
      timestamp: now,
      operator: txArgs.operator || 'พยาบาล'
    };`;
    
const replacement3 = `    const newTxLocal: Transaction = {
      ...txArgs,
      type: safeType,
      id: \`tx_\${Date.now()}_\${Math.random().toString(36).substring(2, 9)}\`,
      timestamp: now,
      operator: txArgs.operator || 'พยาบาล'
    };`;

code = code.replace(target, replacement);
code = code.replace(target2, replacement2);
code = code.replace(target3, replacement3);
fs.writeFileSync('src/lib/store.tsx', code);
