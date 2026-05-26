const fs = require('fs');
const path = 'c:\\Users\\J. Valdivia\\SISTEMA PLIXORA\\index.html';

// Read raw bytes
const raw = fs.readFileSync(path);

// The file has double-encoded UTF-8: was read as latin-1 then saved as UTF-8
// Fix: decode as UTF-8 (gets garbled), encode each char as latin-1 byte, then decode those bytes as UTF-8
const garbled = raw.toString('utf8');

// Re-encode garbled string as latin-1 bytes
const latin1Bytes = Buffer.from(garbled, 'latin1');

// Now decode those bytes as UTF-8
const fixed = latin1Bytes.toString('utf8');

fs.writeFileSync(path, fixed, 'utf8');

// Verify
const remaining = (fixed.match(/Ã[a-zA-Z\xb0-\xff]/g) || []).length;
console.log('Done! Remaining broken sequences:', remaining);
if (remaining > 0) {
    const samples = (fixed.match(/Ã[a-zA-Z\xb0-\xff]/g) || []).slice(0, 5);
    console.log('Samples:', samples);
} else {
    console.log('All Spanish characters restored correctly!');
}
