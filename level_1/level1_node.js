characters// level1_node.js - Level 1: Steganography with Zero-Width Characters
// Open this file in your editor and study it.
// The string hiddenMessage LOOKS empty but contains "hello world"
// encoded in binary with Zero-Width characters.
//
// Technique:
//   U+200B (Zero Width Space) = bit 0
//   U+200D (Zero Width Joiner) = bit 1
//   Each byte of text = 8 invisible characters
//
// These characters are invisible in: Notepad, VS Code, GitHub, everywhere.

// This string LOOKS empty but contains "hello world":
const hiddenMessage = '​‍‍​‍​​​​‍‍​​‍​‍​‍‍​‍‍​​​‍‍​‍‍​​​‍‍​‍‍‍‍​​‍​​​​​​‍‍‍​‍‍‍​‍‍​‍‍‍‍​‍‍‍​​‍​​‍‍​‍‍​​​‍‍​​‍​​';

// This string IS actually empty (for comparison):
const emptyString = '';

function decode(s) {
    const bits = [];
    for (const c of s) {
        if (c === String.fromCharCode(0x200B)) bits.push(0);
        else if (c === String.fromCharCode(0x200D)) bits.push(1);
    }
    const bytes = [];
    for (let i = 0; i < bits.length; i += 8) {
        const g = bits.slice(i, i + 8);
        if (g.length === 8) {
            let byte = 0;
            for (const b of g) byte = (byte << 1) | b;
            bytes.push(byte);
        }
    }
    return Buffer.from(bytes).toString('utf-8');
}

console.log();
console.log('--- Level 1: Invisibility Test (Zero-Width Binary) ---');
console.log(`1. Visible content:       "${hiddenMessage}"`);
console.log(`2. Is it empty?            ${hiddenMessage === ''}`);
console.log(`3. Actual length:          ${hiddenMessage.length} characters`);
console.log(`4. Decoded message:        "${decode(hiddenMessage)}"`);
console.log(`5. Equal to empty string?  ${hiddenMessage === emptyString}`);
console.log('--- End of Level 1 ---');
console.log();
