# Defense — Unicode Invisible Character Scanner

[Back to main](../README.md)

A tool that detects **14 categories** of invisible Unicode characters in source code files. It identifies the technique used, the risk level, the affected lines, and decodes the hidden payload.

---

## USAGE

```bash
# Scan a file:
python defense/python/unicode_scanner.py suspicious_file.py
node defense/javascript/unicode_scanner.js suspicious_file.js

# Scan and decode the hidden payload:
python defense/python/unicode_scanner.py --decode suspicious_file.py
node defense/javascript/unicode_scanner.js --decode suspicious_file.js

# Scan an entire directory:
python defense/python/unicode_scanner.py --decode ./my_project

# Exclude additional directories:
python defense/python/unicode_scanner.py --exclude vendor,tmp ./my_project
```

All commands assume you are at the **project root**.

---

## Options

| Option | Description |
|--------|-------------|
| `--decode` | Decodes and displays the content hidden in the invisible characters |
| `--exclude dir1,dir2` | Additional directories to exclude from scanning |

**Directories excluded by default**: `node_modules`, `.git`, `__pycache__`, `venv`, `.venv`, `bin`, `obj`, `.vs`, `.idea`, `.next`, `dist`, `build`

**Scanned extensions**: `.py`, `.js`, `.mjs`, `.cjs`, `.ts`, `.cs`, `.java`, `.go`, `.rb`, `.php`, `.c`, `.cpp`, `.h`, `.rs`, `.swift`, `.kt`, `.vue`, `.jsx`, `.tsx`, `.sh`, `.ps1`, `.lua`, `.r`, `.m`

---

## Example output

```
[CRITICAL] level_3/python/Bait To Client/bait_emulator.py
  Technique  : Variation Selectors
  Risk       : CRITICAL
  Description: Steganography — 256 possible values, 1 char = 1 byte
  Invisible  : 3875 characters
  Lines      : 1
    Line   16 (3875 chars): empty = '<3875 chars>'

  -- Decoded payload (3867 chars) --
  | import subprocess, sys, platform, shutil, base64
  | LISTENER_IP = '127.0.0.1'
  | PORT = 4444
  | ...
  -- End payload --
```

---

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | No invisible characters detected |
| `2` | Invisible characters found |

For the complete list of all 14 detected categories, see [Invisible Unicode techniques](../README.md#invisible-unicode-techniques) in the main README.
