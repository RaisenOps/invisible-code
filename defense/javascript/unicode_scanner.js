#!/usr/bin/env node
/**
 * unicode_scanner.js — Universal Invisible Unicode Character Detector
 * =========================================================================
 * Scans source code files looking for ALL invisible Unicode characters
 * that could be used to hide malicious code.
 *
 * Detected categories (14):
 *
 *   CRITICAL:
 *     - Variation Selectors  : U+FE00-FE0F, U+E0100-E01EF  (steganography)
 *     - Tags Block           : U+E0001-E007F                (steganography)
 *
 *   HIGH:
 *     - Zero-Width chars     : U+200B-200D    (binary encoding)
 *     - Bidi Overrides       : U+202A-202E, U+2066-2069  (Trojan Source)
 *
 *   MEDIUM:
 *     - Bidi Marks           : U+200E-200F, U+061C  (directional marks)
 *     - Invisible Operators  : U+2060-2064          (invisible operators)
 *
 *   MEDIUM:
 *     - Mongolian Free VS    : U+180B-180D           (limited steganography)
 *     - Hangul Fillers       : U+115F-1160, U+3164, U+FFA0 (invisible)
 *     - Line/Paragraph Sep.  : U+2028-2029           (break JS strings)
 *
 *   LOW:
 *     - Deprecated Format    : U+206A-206F           (deprecated format)
 *     - Interlinear Annot.   : U+FFF9-FFFB           (annotations)
 *     - Musical Formatting   : U+1D173-1D17A         (musical formatting)
 *     - Shorthand Controls   : U+1BCA0-1BCA3         (shorthand)
 *     - Other invisible      : U+00AD, U+034F, U+180E, U+FEFF
 *
 * Usage:
 *   node unicode_scanner.js <file_or_directory>
 *   node unicode_scanner.js --decode file.py
 *   node unicode_scanner.js --exclude dist,vendor .
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// --- Source code extensions --------------------------------------------------

const CODE_EXTENSIONS = new Set([
    '.py', '.js', '.mjs', '.cjs', '.ts', '.cs', '.java', '.go',
    '.rb', '.php', '.c', '.cpp', '.h', '.rs', '.swift', '.kt',
    '.vue', '.jsx', '.tsx', '.sh', '.ps1', '.lua', '.r', '.m',
]);

// --- Directories excluded by default ----------------------------------------

const EXCLUDED_DIRS = new Set([
    'node_modules', '.git', '__pycache__', 'venv', '.venv',
    'bin', 'obj', '.vs', '.idea', '.next', 'dist', 'build',
]);

// --- Invisible character categories -----------------------------------------

const CATEGORIES = [
    {
        name: 'Variation Selectors',
        ranges: [[0xFE00, 0xFE0F], [0xE0100, 0xE01EF]],
        risk: 'CRITICAL',
        desc: 'Steganography — 256 possible values, 1 char = 1 byte',
    },
    {
        name: 'Tags Block',
        ranges: [[0xE0001, 0xE007F]],
        risk: 'CRITICAL',
        desc: 'Steganography — maps 1:1 to ASCII (U+E0000 + ascii)',
    },
    {
        name: 'Zero-Width Characters',
        ranges: [[0x200B, 0x200D]],
        risk: 'HIGH',
        desc: 'ZWSP/ZWNJ/ZWJ — binary encoding (8 chars = 1 byte)',
    },
    {
        name: 'Bidi Overrides',
        ranges: [[0x202A, 0x202E], [0x2066, 0x2069]],
        risk: 'HIGH',
        desc: 'Trojan Source (CVE-2021-42574) — visually reverses code',
    },
    {
        name: 'Bidi Marks',
        ranges: [[0x200E, 0x200F], [0x061C, 0x061C]],
        risk: 'MEDIUM',
        desc: 'LTR/RTL marks — alter code reading direction',
    },
    {
        name: 'Invisible Operators',
        ranges: [[0x2060, 0x2064]],
        risk: 'MEDIUM',
        desc: 'Word Joiner and invisible math operators',
    },
    {
        name: 'Mongolian Free Variation Selectors',
        ranges: [[0x180B, 0x180D]],
        risk: 'MEDIUM',
        desc: 'Mongolian variation selectors — similar to VS, can hide data',
    },
    {
        name: 'Hangul Fillers',
        ranges: [[0x115F, 0x1160], [0x3164, 0x3164], [0xFFA0, 0xFFA0]],
        risk: 'MEDIUM',
        desc: 'Empty Hangul characters — completely invisible in many contexts',
    },
    {
        name: 'Line/Paragraph Separators',
        ranges: [[0x2028, 0x2029]],
        risk: 'MEDIUM',
        desc: 'Invisible separators — can break JavaScript strings and cause injection',
    },
    {
        name: 'Deprecated Format Characters',
        ranges: [[0x206A, 0x206F]],
        risk: 'LOW',
        desc: 'Deprecated format characters — invisible but functional in Unicode',
    },
    {
        name: 'Interlinear Annotations',
        ranges: [[0xFFF9, 0xFFFB]],
        risk: 'LOW',
        desc: 'Interlinear annotation anchors — invisible markers',
    },
    {
        name: 'Musical Invisible Formatting',
        ranges: [[0x1D173, 0x1D17A]],
        risk: 'LOW',
        desc: 'Musical format controls — invisible outside musical context',
    },
    {
        name: 'Shorthand Format Controls',
        ranges: [[0x1BCA0, 0x1BCA3]],
        risk: 'LOW',
        desc: 'Shorthand format controls — zero-width invisible characters',
    },
    {
        name: 'Other Invisible',
        ranges: [[0x00AD, 0x00AD], [0x034F, 0x034F], [0x180E, 0x180E], [0xFEFF, 0xFEFF]],
        risk: 'LOW',
        desc: 'Soft Hyphen, Combining Grapheme Joiner, MVS, BOM',
    },
];

// --- ANSI colors ------------------------------------------------------------

const RED    = '\x1b[31m';
const GREEN  = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN   = '\x1b[36m';
const BOLD   = '\x1b[1m';
const RESET  = '\x1b[0m';

const RISK_COLORS = {
    CRITICAL: RED + BOLD,
    HIGH:     RED,
    MEDIUM:   YELLOW,
    LOW:      YELLOW,
};

// --- Codepoint classification -----------------------------------------------

function classifyCodepoint(cp) {
    for (const cat of CATEGORIES) {
        for (const [start, end] of cat.ranges) {
            if (cp >= start && cp <= end) return cat;
        }
    }
    return null;
}

// --- Decoders ---------------------------------------------------------------

function decodeVariationSelectors(chars) {
    const bytes = [];
    for (const c of chars) {
        const cp = c.codePointAt(0);
        if (cp >= 0xFE00 && cp <= 0xFE0F) bytes.push(cp - 0xFE00);
        else if (cp >= 0xE0100 && cp <= 0xE01EF) bytes.push(cp - 0xE0100 + 16);
    }
    return Buffer.from(bytes);
}

function decodeTagsBlock(chars) {
    const bytes = [];
    for (const c of chars) {
        const cp = c.codePointAt(0);
        if (cp >= 0xE0001 && cp <= 0xE007F) bytes.push(cp - 0xE0000);
    }
    return Buffer.from(bytes);
}

function decodeZeroWidth(chars) {
    const bits = [];
    for (const c of chars) {
        const cp = c.codePointAt(0);
        if (cp === 0x200B) bits.push(0);
        else if (cp === 0x200D) bits.push(1);
        // ZWNJ (0x200C) is ignored — not used in this encoding
    }
    const bytes = [];
    for (let i = 0; i + 7 < bits.length; i += 8) {
        let byte = 0;
        for (let bit = 0; bit < 8; bit++) {
            byte = (byte << 1) | bits[i + bit];
        }
        bytes.push(byte);
    }
    return Buffer.from(bytes);
}

function decodePayload(catName, chars) {
    try {
        if (catName === 'Variation Selectors') {
            return decodeVariationSelectors(chars).toString('utf-8');
        } else if (catName === 'Tags Block') {
            return decodeTagsBlock(chars).toString('ascii');
        } else if (catName === 'Zero-Width Characters') {
            const raw = decodeZeroWidth(chars);
            return raw.length > 0 ? raw.toString('utf-8') : null;
        }
    } catch {
        return `[binary — ${chars.length} characters]`;
    }
    return null;
}

// --- Preview with markers where invisible chars are -------------------------

function previewWithMarkers(text, maxLen = 80) {
    const chars = [...text];
    let result = '';
    let invisCount = 0;
    for (const c of chars) {
        if (classifyCodepoint(c.codePointAt(0)) !== null) {
            invisCount++;
        } else {
            if (invisCount > 0) {
                result += `${RED}<${invisCount} chars>${RESET}`;
                invisCount = 0;
            }
            result += c;
        }
    }
    if (invisCount > 0) {
        result += `${RED}<${invisCount} chars>${RESET}`;
    }
    return result;
}

// --- File analysis ----------------------------------------------------------

function analyzeFile(filePath, decodeFlag = false) {
    const result = {
        path: filePath,
        findings: {},
        totalInvisible: 0,
        error: null,
    };

    let content;
    try {
        content = fs.readFileSync(filePath, 'utf-8');
    } catch (e) {
        result.error = e.message;
        return result;
    }

    const lines = content.split('\n');

    lines.forEach((line, idx) => {
        const num = idx + 1;
        const chars = [...line];

        chars.forEach((c, i) => {
            const cp = c.codePointAt(0);

            // BOM at the start of the file is normal
            if (cp === 0xFEFF && num === 1 && i === 0) return;

            const cat = classifyCodepoint(cp);
            if (!cat) return;

            const name = cat.name;
            if (!result.findings[name]) {
                result.findings[name] = {
                    category: cat,
                    chars: [],
                    lines: {},
                    total: 0,
                };
            }

            const h = result.findings[name];
            h.chars.push(c);
            h.total++;
            result.totalInvisible++;

            if (!h.lines[num]) {
                h.lines[num] = { count: 0, preview: line.replace(/\n$/, '') };
            }
            h.lines[num].count++;
        });
    });

    if (decodeFlag) {
        for (const [name, h] of Object.entries(result.findings)) {
            h.payload = decodePayload(name, h.chars);
        }
    }

    return result;
}

// --- Directory scanning -----------------------------------------------------

function scanDirectory(directory, decodeFlag = false, exclude = EXCLUDED_DIRS) {
    const results = [];

    function walk(dir) {
        let entries;
        try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
        catch { return; }

        for (const entry of entries) {
            const filePath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (!exclude.has(entry.name)) walk(filePath);
            } else if (CODE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
                const r = analyzeFile(filePath, decodeFlag);
                if (Object.keys(r.findings).length > 0 || r.error) {
                    results.push(r);
                }
            }
        }
    }

    walk(directory);
    return results;
}

// --- Formatted output -------------------------------------------------------

function printResult(r) {
    if (r.error) {
        console.log(`${YELLOW}[!] ${r.path}: ${r.error}${RESET}`);
        return;
    }

    if (Object.keys(r.findings).length === 0) return;

    for (const [name, h] of Object.entries(r.findings)) {
        const cat = h.category;
        const color = RISK_COLORS[cat.risk] || RESET;

        console.log(`\n${color}[${cat.risk}] ${r.path}${RESET}`);
        console.log(`  Technique  : ${name}`);
        console.log(`  Risk       : ${cat.risk}`);
        console.log(`  Description: ${cat.desc}`);
        console.log(`  Invisible  : ${BOLD}${h.total}${RESET} characters`);

        const lineNums = Object.keys(h.lines).map(Number).sort((a, b) => a - b);
        console.log(`  Lines      : ${lineNums.length}`);

        lineNums.slice(0, 5).forEach(num => {
            const info = h.lines[num];
            const preview = previewWithMarkers(info.preview);
            console.log(`    Line ${String(num).padStart(4)} (${String(info.count).padStart(3)} chars): ${preview}`);
        });
        if (lineNums.length > 5) {
            console.log(`    ... and ${lineNums.length - 5} more lines`);
        }

        // Decode payload if not done before
        if (!h.payload) {
            h.payload = decodePayload(name, h.chars);
        }

        if (h.payload) {
            console.log(`\n  ${CYAN}-- Decoded payload (${h.payload.length} chars) --${RESET}`);
            h.payload.split('\n').forEach(l => console.log(`  ${CYAN}|${RESET} ${l}`));
            console.log(`  ${CYAN}-- End payload --${RESET}`);
        }
    }
}

// --- Main -------------------------------------------------------------------

const args = process.argv.slice(2);
const decodeFlag = args.includes('--decode');

let excludeExtra = '';
const excludeIdx = args.indexOf('--exclude');
if (excludeIdx !== -1 && args[excludeIdx + 1]) {
    excludeExtra = args[excludeIdx + 1];
}

const target = args.find(a => !a.startsWith('--') && a !== excludeExtra);

const exclude = new Set(EXCLUDED_DIRS);
if (excludeExtra) {
    excludeExtra.split(',').forEach(d => exclude.add(d.trim()));
}

console.log(`${CYAN}\u2554${'\u2550'.repeat(56)}\u2557`);
console.log('\u2551  UNICODE INVISIBLE CHARACTER SCANNER                   \u2551');
console.log('\u2551  Detects 14 categories of invisible characters in code \u2551');
console.log(`\u255a${'\u2550'.repeat(56)}\u255d${RESET}`);
console.log();

if (!target) {
    console.log(`${RED}[!] Usage: node unicode_scanner.js [--decode] [--exclude dirs] <file_or_directory>${RESET}`);
    process.exit(1);
}

let totalInfected = 0;

if (fs.existsSync(target) && fs.statSync(target).isFile()) {
    const r = analyzeFile(target, decodeFlag);
    printResult(r);
    if (Object.keys(r.findings).length === 0 && !r.error) {
        console.log(`${GREEN}[OK] No invisible characters detected.${RESET}`);
    }
    totalInfected = Object.keys(r.findings).length > 0 ? 1 : 0;

} else if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    console.log(`${YELLOW}[*] Scanning: ${target}${RESET}`);
    console.log(`    Excluded: ${[...exclude].sort().join(', ')}`);
    const results = scanDirectory(target, decodeFlag, exclude);
    totalInfected = results.filter(r => Object.keys(r.findings).length > 0).length;

    if (results.length === 0) {
        console.log(`\n${GREEN}[OK] No infected files found.${RESET}`);
    } else {
        results.forEach(printResult);
    }

    console.log(`\n${'\u2550'.repeat(58)}`);
    console.log(`Infected files: ${BOLD}${totalInfected}${RESET}`);

} else {
    console.log(`${RED}[!] Not found: ${target}${RESET}`);
    process.exit(1);
}

console.log();
process.exit(totalInfected === 0 ? 0 : 2);
