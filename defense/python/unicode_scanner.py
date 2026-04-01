"""
unicode_scanner.py — Universal Invisible Unicode Character Detector
=========================================================================
Scans source code files looking for ALL invisible Unicode characters
that could be used to hide malicious code.

Detected categories (14):

  CRITICAL:
    - Variation Selectors  : U+FE00-FE0F, U+E0100-E01EF  (steganography)
    - Tags Block           : U+E0001-E007F                (steganography)

  HIGH:
    - Zero-Width chars     : U+200B-200D    (binary encoding)
    - Bidi Overrides       : U+202A-202E, U+2066-2069  (Trojan Source)

  MEDIUM:
    - Bidi Marks           : U+200E-200F, U+061C  (directional marks)
    - Invisible Operators  : U+2060-2064          (invisible operators)

  MEDIUM:
    - Mongolian Free VS    : U+180B-180D           (limited steganography)
    - Hangul Fillers       : U+115F-1160, U+3164, U+FFA0 (invisible)
    - Line/Paragraph Sep.  : U+2028-2029           (break JS strings)

  LOW:
    - Deprecated Format    : U+206A-206F           (deprecated format)
    - Interlinear Annot.   : U+FFF9-FFFB           (annotations)
    - Musical Formatting   : U+1D173-1D17A         (musical formatting)
    - Shorthand Controls   : U+1BCA0-1BCA3         (shorthand)
    - Other invisible      : U+00AD, U+034F, U+180E, U+FEFF

Usage:
    python unicode_scanner.py <file_or_directory>
    python unicode_scanner.py --decode file.py
    python unicode_scanner.py --exclude dist,vendor .
"""

import sys
import os
import argparse

sys.stdout.reconfigure(encoding='utf-8')

# --- Source code extensions ---------------------------------------------------

CODE_EXTENSIONS = {
    '.py', '.js', '.mjs', '.cjs', '.ts', '.cs', '.java', '.go',
    '.rb', '.php', '.c', '.cpp', '.h', '.rs', '.swift', '.kt',
    '.vue', '.jsx', '.tsx', '.sh', '.ps1', '.lua', '.r', '.m',
}

# --- Directories excluded by default -----------------------------------------

EXCLUDED_DIRS = {
    'node_modules', '.git', '__pycache__', 'venv', '.venv',
    'bin', 'obj', '.vs', '.idea', '.next', 'dist', 'build',
}

# --- Invisible character categories ------------------------------------------
# Each category groups an attack type with its risk level.
# Ranges are inclusive: (start, end).

CATEGORIES = [
    {
        'name': 'Variation Selectors',
        'ranges': [(0xFE00, 0xFE0F), (0xE0100, 0xE01EF)],
        'risk': 'CRITICAL',
        'desc': 'Steganography — 256 possible values, 1 char = 1 byte',
    },
    {
        'name': 'Tags Block',
        'ranges': [(0xE0001, 0xE007F)],
        'risk': 'CRITICAL',
        'desc': 'Steganography — maps 1:1 to ASCII (U+E0000 + ascii)',
    },
    {
        'name': 'Zero-Width Characters',
        'ranges': [(0x200B, 0x200D)],
        'risk': 'HIGH',
        'desc': 'ZWSP/ZWNJ/ZWJ — binary encoding (8 chars = 1 byte)',
    },
    {
        'name': 'Bidi Overrides',
        'ranges': [(0x202A, 0x202E), (0x2066, 0x2069)],
        'risk': 'HIGH',
        'desc': 'Trojan Source (CVE-2021-42574) — visually reverses code',
    },
    {
        'name': 'Bidi Marks',
        'ranges': [(0x200E, 0x200F), (0x061C, 0x061C)],
        'risk': 'MEDIUM',
        'desc': 'LTR/RTL marks — alter code reading direction',
    },
    {
        'name': 'Invisible Operators',
        'ranges': [(0x2060, 0x2064)],
        'risk': 'MEDIUM',
        'desc': 'Word Joiner and invisible math operators',
    },
    {
        'name': 'Mongolian Free Variation Selectors',
        'ranges': [(0x180B, 0x180D)],
        'risk': 'MEDIUM',
        'desc': 'Mongolian variation selectors — similar to VS, can hide data',
    },
    {
        'name': 'Hangul Fillers',
        'ranges': [(0x115F, 0x1160), (0x3164, 0x3164), (0xFFA0, 0xFFA0)],
        'risk': 'MEDIUM',
        'desc': 'Empty Hangul characters — completely invisible in many contexts',
    },
    {
        'name': 'Line/Paragraph Separators',
        'ranges': [(0x2028, 0x2029)],
        'risk': 'MEDIUM',
        'desc': 'Invisible separators — can break JavaScript strings and cause injection',
    },
    {
        'name': 'Deprecated Format Characters',
        'ranges': [(0x206A, 0x206F)],
        'risk': 'LOW',
        'desc': 'Deprecated format characters — invisible but functional in Unicode',
    },
    {
        'name': 'Interlinear Annotations',
        'ranges': [(0xFFF9, 0xFFFB)],
        'risk': 'LOW',
        'desc': 'Interlinear annotation anchors — invisible markers',
    },
    {
        'name': 'Musical Invisible Formatting',
        'ranges': [(0x1D173, 0x1D17A)],
        'risk': 'LOW',
        'desc': 'Musical format controls — invisible outside musical context',
    },
    {
        'name': 'Shorthand Format Controls',
        'ranges': [(0x1BCA0, 0x1BCA3)],
        'risk': 'LOW',
        'desc': 'Shorthand format controls — zero-width invisible characters',
    },
    {
        'name': 'Other Invisible',
        'ranges': [(0x00AD, 0x00AD), (0x034F, 0x034F), (0x180E, 0x180E), (0xFEFF, 0xFEFF)],
        'risk': 'LOW',
        'desc': 'Soft Hyphen, Combining Grapheme Joiner, MVS, BOM',
    },
]

# --- ANSI colors -------------------------------------------------------------

RED    = '\033[31m'
GREEN  = '\033[32m'
YELLOW = '\033[33m'
CYAN   = '\033[36m'
BOLD   = '\033[1m'
RESET  = '\033[0m'

RISK_COLORS = {
    'CRITICAL': RED + BOLD,
    'HIGH':     RED,
    'MEDIUM':   YELLOW,
    'LOW':      YELLOW,
}

# --- Codepoint classification ------------------------------------------------

def classify_codepoint(cp):
    """Returns the category for the codepoint, or None if not invisible."""
    for cat in CATEGORIES:
        for start, end in cat['ranges']:
            if start <= cp <= end:
                return cat
    return None


# --- Decoders ----------------------------------------------------------------
# Each decodable technique has its inverse function.

def decode_variation_selectors(chars):
    """VS -> bytes: FE00+n -> byte n (0-15), E0100+n -> byte n+16 (16-255)."""
    result = []
    for c in chars:
        cp = ord(c)
        if 0xFE00 <= cp <= 0xFE0F:
            result.append(cp - 0xFE00)
        elif 0xE0100 <= cp <= 0xE01EF:
            result.append(cp - 0xE0100 + 16)
    return bytes(result)


def decode_tags_block(chars):
    """Tags -> ASCII: U+E00xx -> chr(xx)."""
    result = []
    for c in chars:
        cp = ord(c)
        if 0xE0001 <= cp <= 0xE007F:
            result.append(cp - 0xE0000)
    return bytes(result)


def decode_zero_width(chars):
    """ZW Binary -> bytes: ZWSP(200B)=0, ZWJ(200D)=1, 8 bits = 1 byte."""
    bits = []
    for c in chars:
        cp = ord(c)
        if cp == 0x200B:
            bits.append(0)
        elif cp == 0x200D:
            bits.append(1)
        # ZWNJ (0x200C) is ignored — not used in this encoding
    result = []
    for i in range(0, len(bits) - 7, 8):
        byte = 0
        for bit in range(8):
            byte = (byte << 1) | bits[i + bit]
        result.append(byte)
    return bytes(result)


def decode_payload(cat_name, chars):
    """Attempts to decode the invisible chars according to the technique."""
    try:
        if cat_name == 'Variation Selectors':
            return decode_variation_selectors(chars).decode('utf-8')
        elif cat_name == 'Tags Block':
            return decode_tags_block(chars).decode('ascii', errors='replace')
        elif cat_name == 'Zero-Width Characters':
            raw = decode_zero_width(chars)
            if raw:
                return raw.decode('utf-8', errors='replace')
            return None
    except Exception:
        return f'[binary — {len(chars)} characters]'
    return None


# --- File analysis -----------------------------------------------------------

def analyze_file(path_str, decode_flag=False):
    """Analyzes a file. Returns dict with categorized findings."""
    result = {
        'path': path_str,
        'findings': {},
        'total_invisible': 0,
        'error': None,
    }

    try:
        with open(path_str, 'r', encoding='utf-8', errors='replace') as f:
            lines = f.readlines()
    except OSError as e:
        result['error'] = str(e)
        return result

    for num, line in enumerate(lines, 1):
        for i, c in enumerate(line):
            cp = ord(c)

            # BOM at the start of the file is normal, do not alert
            if cp == 0xFEFF and num == 1 and i == 0:
                continue

            cat = classify_codepoint(cp)
            if cat is None:
                continue

            name = cat['name']
            if name not in result['findings']:
                result['findings'][name] = {
                    'category': cat,
                    'chars': [],
                    'lines': {},
                    'total': 0,
                }

            h = result['findings'][name]
            h['chars'].append(c)
            h['total'] += 1
            result['total_invisible'] += 1

            if num not in h['lines']:
                h['lines'][num] = {'count': 0, 'preview': line.rstrip('\n')}
            h['lines'][num]['count'] += 1

    if decode_flag:
        for name, h in result['findings'].items():
            h['payload'] = decode_payload(name, h['chars'])

    return result


# --- Directory scanning ------------------------------------------------------

def scan_directory(directory, decode_flag=False, exclude=None):
    """Recursive scan with directory exclusion."""
    if exclude is None:
        exclude = EXCLUDED_DIRS

    results = []
    for root, dirs, files in os.walk(directory):
        dirs[:] = [d for d in dirs if d not in exclude]
        for name in files:
            ext = os.path.splitext(name)[1].lower()
            if ext in CODE_EXTENSIONS:
                file_path = os.path.join(root, name)
                r = analyze_file(file_path, decode_flag)
                if r['findings'] or r['error']:
                    results.append(r)
    return results


# --- Formatted output --------------------------------------------------------

def preview_with_markers(text):
    """Shows the text with red markers where invisible chars are."""
    result = ''
    invis_count = 0
    for c in text:
        if classify_codepoint(ord(c)) is not None:
            invis_count += 1
        else:
            if invis_count > 0:
                result += f'{RED}<{invis_count} chars>{RESET}'
                invis_count = 0
            result += c
    if invis_count > 0:
        result += f'{RED}<{invis_count} chars>{RESET}'
    return result


def print_result(r):
    if r['error']:
        print(f'{YELLOW}[!] {r["path"]}: {r["error"]}{RESET}')
        return

    if not r['findings']:
        return

    for name, h in r['findings'].items():
        cat = h['category']
        color = RISK_COLORS.get(cat['risk'], RESET)

        print(f'\n{color}[{cat["risk"]}] {r["path"]}{RESET}')
        print(f'  Technique  : {name}')
        print(f'  Risk       : {cat["risk"]}')
        print(f'  Description: {cat["desc"]}')
        print(f'  Invisible  : {BOLD}{h["total"]}{RESET} characters')
        print(f'  Lines      : {len(h["lines"])}')

        lines_list = sorted(h['lines'].items())[:5]
        for num, info in lines_list:
            preview = preview_with_markers(info['preview'])
            print(f'    Line {num:4d} ({info["count"]:3d} chars): {preview}')
        if len(h['lines']) > 5:
            print(f'    ... and {len(h["lines"]) - 5} more lines')

        # Decode payload if not done before
        if not h.get('payload'):
            h['payload'] = decode_payload(name, h['chars'])

        if h.get('payload'):
            print(f'\n  {CYAN}-- Decoded payload ({len(h["payload"])} chars) --{RESET}')
            for line in h['payload'].splitlines():
                print(f'  {CYAN}|{RESET} {line}')
            print(f'  {CYAN}-- End payload --{RESET}')


# --- Main --------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description='Detects ALL invisible Unicode characters in source code'
    )
    parser.add_argument('target', help='File or directory to scan')
    parser.add_argument('--decode', action='store_true',
                        help='Decode and show hidden payloads')
    parser.add_argument('--exclude', type=str, default='',
                        help='Extra directories to exclude (comma-separated)')
    args = parser.parse_args()

    exclude = set(EXCLUDED_DIRS)
    if args.exclude:
        exclude.update(d.strip() for d in args.exclude.split(','))

    target = args.target

    print(f'{CYAN}{"=" * 56}')
    print(f'  UNICODE INVISIBLE CHARACTER SCANNER                   ')
    print(f'  Detects 14 categories of invisible characters in code ')
    print(f'{"=" * 56}{RESET}')
    print()

    if os.path.isfile(target):
        r = analyze_file(target, args.decode)
        print_result(r)
        if not r['findings'] and not r['error']:
            print(f'{GREEN}[OK] No invisible characters detected.{RESET}')
        total = 1 if r['findings'] else 0

    elif os.path.isdir(target):
        print(f'{YELLOW}[*] Scanning: {target}{RESET}')
        print(f'    Excluded: {", ".join(sorted(exclude))}')
        results = scan_directory(target, args.decode, exclude)
        total = sum(1 for r in results if r['findings'])

        if not results:
            print(f'\n{GREEN}[OK] No infected files found.{RESET}')
        else:
            for r in results:
                print_result(r)

        print(f'\n{"=" * 58}')
        print(f'Infected files: {BOLD}{total}{RESET}')
    else:
        print(f'{RED}[!] Not found: {target}{RESET}')
        sys.exit(1)

    print()
    sys.exit(0 if total == 0 else 2)


if __name__ == '__main__':
    main()
