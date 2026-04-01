// level2_node.js - Level 2: Steganography with Variation Selectors
// Open this file in your editor and study it.
// The string hiddenMessage LOOKS empty but contains "Hello World I am level 2"
// encoded with Variation Selectors (1 character = 1 byte).
//
// Technique:
//   Byte 0-15   → U+FE00 to U+FE0F   (VS1 to VS16)
//   Byte 16-255 → U+E0100 to U+E01EF  (VS17 to VS256)
//   Each byte = 1 single invisible character (8x more compact than Level 1)
//
// Invisible in: VS Code, IDEs, GitHub.
// In Notepad it may show boxes (supplementary plane).

// This string LOOKS empty but contains "Hello World I am level 2":
const hiddenMessage = '󠄸󠅕󠅜󠅜󠅟󠄐󠅇󠅟󠅢󠅜󠅔󠄐󠄹󠄐󠅑󠅝󠄐󠅜󠅕󠅦󠅕󠅜󠄐󠄢';

// This string IS actually empty (for comparison):
const emptyString = '';

function decode(s) {
    const bytes = [];
    for (const c of s) {
        const cp = c.codePointAt(0);
        if (cp >= 0xFE00 && cp <= 0xFE0F) bytes.push(cp - 0xFE00);
        else if (cp >= 0xE0100 && cp <= 0xE01EF) bytes.push((cp - 0xE0100) + 16);
    }
    return Buffer.from(bytes).toString('utf-8');
}

console.log();
console.log('--- Level 2: Invisibility Test (Variation Selectors) ---');
console.log(`1. Visible content:       "${hiddenMessage}"`);
console.log(`2. Is it empty?            ${hiddenMessage === ''}`);
console.log(`3. Actual length:          ${[...hiddenMessage].length} characters`);
console.log(`4. Decoded message:        "${decode(hiddenMessage)}"`);
console.log(`5. Equal to empty string?  ${hiddenMessage === emptyString}`);
console.log(`6. Comparison: Level 2 = ${[...hiddenMessage].length} chars, Level 1 would need ${[...hiddenMessage].length * 8} chars (8x more compact)`);
console.log('--- End of Level 2 ---');
console.log();
