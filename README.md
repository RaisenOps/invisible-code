# Invisible Unicode, Educational Demo of Attacks and Defense with Invisible Characters

An educational project demonstrating how invisible Unicode characters can be used to hide malicious code within empty variables in seemingly legitimate source files, along with **defense** tools to detect them.

<img width="558" height="148" alt="img" src="https://github.com/user-attachments/assets/b9d7f0bb-29c9-4c32-bf59-470d29efe653" />


---

## Table of Contents

- [What is this?](#what-is-this)
- [Project structure](#project-structure)
- [Learning levels](#learning-levels)
- [The trick: invisible code between quotes](#the-trick-invisible-code-between-quotes)
- [Where do these attacks appear?](#where-do-these-attacks-appear)
- [Invisible Unicode techniques](#invisible-unicode-techniques)
- [Requirements](#requirements)
- [Defense and Detection Strategies](#defense-and-detection-strategies)
- [Disclaimer](#disclaimer)
- [License](#license)

---

## What is this?

This project simulates several real-world cyberattack techniques, though in a benign and controlled manner: concealing a payload within invisible Unicode characters. The malicious code is concealed **between the quotes** of a string that appears to be empty; text editors, web browsers, and even GitHub show nothing there. Anyone opening the file sees normal code with completely empty quotes, but running it launches a hidden background process.

The goal is **educational**: understand how these attacks work so you can defend against them. Learn how these attacks operate in supply chain attacks (Supply Chain Attacks) and other attack types so you can protect CI/CD pipelines, developer workstations, production environments, and even guard against running a seemingly harmless file containing invisible code.

---

## Project structure

```
.
├── level_1/                          # Level 1: Zero-Width binary encoding
│   ├── README.md
│   ├── level1_python.py
│   └── level1_node.js
│
├── level_2/                          # Level 2: Variation Selectors
│   ├── README.md
│   ├── level2_python.py
│   └── level2_node.js
│
├── level_3/                          # Level 3: Full reverse shell
│   ├── README.md
│   ├── python/                       # Generator and listener in Python
│   │   ├── bait_generator.py
│   │   ├── rs_listener.py
│   │   └── Bait To Client/
│   ├── javascript/                   # Generator and listener in JavaScript
│   │   ├── bait_generator.js
│   │   ├── rs_listener.js
│   │   └── Bait To Client/
│   └── csharp/                       # Generator and listener in C#
│       ├── BaitGenerator.cs
│       └── rs_listener.cs
│
└── defense/                          # Detection scanners (14 categories)
    ├── README.md
    ├── python/unicode_scanner.py
    └── javascript/unicode_scanner.js
```

- Each level is **self-contained** with its own code and README
- Each language is **independent**: use Python, JavaScript, or C# without needing the others
- The `defense/` folder contains [scanners](defense/) that detect invisible characters in any file

---

## Learning levels

The project is organized into **3 progressive levels**. Each level is self-contained with its own code, scripts, and README.

| Level | Technique | What you will learn | Difficulty |
|-------|-----------|---------------------|------------|
| [**Level 1**](level_1/) | Zero-Width binary | Binary encoding with invisible characters. 2 characters (U+200B, U+200D) represent bits 0 and 1. Invisible in ALL editors. | Introductory |
| [**Level 2**](level_2/) | Variation Selectors | 256 invisible characters that map 1:1 to bytes. 8x more compact than Level 1. Invisible in IDEs and GitHub. | Basic |
| [**Level 3**](level_3/) | Full reverse shell | Real-world application: a benign reverse shell hidden inside files that look normal. Generators, listeners, and defense. | Basic type II |

**Recommendation**: start with Level 1 even if you already have experience. Each level builds on the previous one, and the progression makes everything clearer.

```bash
# Level 1, try the binary encoding:
cd level_1
python level1_python.py     # or: node level1_node.js

# Level 2, try Variation Selectors:
cd level_2
python level2_python.py     # or: node level2_node.js

# Level 3, the full attack:
cd level_3                  # see level_3/README.md for the step-by-step guide
```

---

## The trick: invisible code between quotes

```python
# This LOOKS like an empty string:
empty = ''

# But between those quotes there are thousands of invisible Unicode characters
# encoding a complete hidden PAYLOAD.
# No editor, IDE, browser, or even GitHub shows ANYTHING between the quotes.
# A 5-line file can weigh 15 KB because of the hidden code.
```

Open any file from the levels in your favorite text editor. Look for the string that appears empty. You will not see anything. Run it, and you will discover that a hidden message was there (levels 1 and 2) or a full reverse shell (level 3).

---

## Where do these attacks appear?

This invisible character technique can be used across multiple attack vectors. It is not just theory: real cases have been found in GitHub projects and npm/PyPI packages.
Recent incidents in npm repositories (e.g., massively popular libraries with millions of downloads) have demonstrated the impact of these vulnerabilities.

### Known attack vectors

| Vector | How it works | Real-world example |
|--------|--------------|--------------------|
| **Supply Chain Attack** | An attacker publishes a package on npm/PyPI with code hidden in invisible characters. Upon installation, the payload executes silently | Malicious npm packages that steal environment variables or tokens |
| **Trojan Source** (CVE-2021-42574) | Bidi characters are used to make code *look* different from what it *actually does*. An `if` appears to guard a function, but in reality it always executes | University of Cambridge research (2021) |
| **Pre-install / Post-install hooks** | In `package.json`, the `preinstall` or `postinstall` fields run a script automatically during `npm install`. The attacker hides the payload there | Typosquatting on npm and CI/CD pipeline attacks |
| **Pull requests with hidden commits** | An attacker opens a PR on an open source project. In some commit, one of the `.js`, `.py`, or `.cs` files hides the payload in "empty" strings. If the reviewer lacks detection tools, the malicious code makes it to production | Malicious commits in projects |
| **Shared files** | A "useful" script is sent to a colleague (hex converter, utility, emulator). The file works normally, but running it also launches a hidden background process | Exactly what this project demonstrates |

### How do they do it in practice?

1. **In a `package.json`**: Using lifecycle hooks like `"preinstall": "node setup.js"` or `"postinstall"`. If `setup.js` has a payload obfuscated with Unicode, the system (or the CI/CD pipeline) will blindly execute it when building the project.

2. **In a GitHub commit**: a `.js` or `.py` file that looks like a normal utility. Inside a string that appears empty (`''` or `` ` ` ``), there are thousands of invisible characters encoding a malicious payload.

3. **In a configuration file**: A `.env` or `.yaml` looks normal but contains a hidden payload that executes when parsed by certain frameworks.

---

## Invisible Unicode techniques

Multiple families of invisible Unicode characters can be exploited. Each one carries a different risk level depending on its potential to conceal code:

| Technique | Unicode Range | Risk | Description |
|-----------|---------------|------|-------------|
| Variation Selectors | U+FE00-FE0F, U+E0100-E01EF | CRITICAL | Steganography: 256 values, 1 char = 1 byte |
| Tags Block | U+E0001-E007F | CRITICAL | Steganography: maps 1:1 to ASCII |
| Zero-Width Characters | U+200B-200D | HIGH | Binary encoding: 8 chars = 1 byte |
| Bidi Overrides | U+202A-202E, U+2066-2069 | HIGH | Trojan Source (CVE-2021-42574) |
| Bidi Marks | U+200E-200F, U+061C | MEDIUM | LTR/RTL direction marks |
| Invisible Operators | U+2060-2064 | MEDIUM | Word Joiner and invisible operators |
| Mongolian Free VS | U+180B-180D | MEDIUM | Mongolian variation selectors |
| Hangul Fillers | U+115F-1160, U+3164, U+FFA0 | MEDIUM | Empty, invisible Hangul characters |
| Line/Paragraph Separators | U+2028-2029 | MEDIUM | Break strings in JavaScript |
| Deprecated Format | U+206A-206F | LOW | Deprecated but functional formatting |
| Interlinear Annotations | U+FFF9-FFFB | LOW | Invisible annotation markers |
| Musical Formatting | U+1D173-1D17A | LOW | Invisible musical formatting |
| Shorthand Controls | U+1BCA0-1BCA3 | LOW | Invisible shorthand formatting |
| Other Invisible | U+00AD, U+034F, U+180E, U+FEFF | LOW | Soft Hyphen, CGJ, MVS, BOM |

The [defense scanners](defense/) in this project detect all 14 categories.

---

## Requirements

You only need **1** of the following languages to use the project:

| Language | Minimum version |
|----------|-----------------|
| Python | 3.6+ |
| Node.js | 14+ |
| C# (.NET) | 6+ |

You do not need all three installed. Use whichever you prefer.

---

## Defense and Detection Strategies

No single method protects against all vectors. Each strategy covers different scenarios:

### 1. Scan files with the Unicode detector (this project)

This project includes scanners that detect invisible characters in **any** source code file. This is the most direct defense against this technique, regardless of how the file arrived (PR, package, shared file, etc.):

```bash
# Python:
python defense/python/unicode_scanner.py --decode suspicious_file.py

# JavaScript:
node defense/javascript/unicode_scanner.js --decode suspicious_file.js
```

> Protects against: **all vectors** (shared files, PRs, packages, hidden commits)

For more details on using the scanner, see the [defense README](defense/).

### 2. Disable automatic script execution in npm/pnpm

This blocks the `preinstall` and `postinstall` fields in `package.json`, preventing code from running automatically when you install a package:

```bash
# For npm:
npm config set ignore-scripts true

# For pnpm:
pnpm config set ignore-scripts true
```

> Protects against: **Supply Chain Attacks via npm/pnpm hooks** only. Does not protect against files you run manually (like the baits in this project) or against hidden code in PRs or commits.

### 3. Check actual file sizes

A file with a hidden payload weighs much more than it appears. For example, a 1 KB visible script can weigh 15 KB on disk because of the invisible characters. If a file with only a few lines weighs more than expected, it is suspicious.

> Protects against: **shared files and PRs**, a quick check before running or merging.

---

## Disclaimer

> **LEGAL WARNING**
>
> This project is **EXCLUSIVELY EDUCATIONAL** and is designed to:
>
> - Demonstrate how invisible Unicode characters can be exploited in real attacks
> - Teach about the multiple attack vectors where this technique appears
> - Provide **DEFENSE** tools to detect these attacks
> - Train cybersecurity professionals in detection techniques
>
> **Using this software for unauthorized access to computer systems is ILLEGAL** and is punishable under:
>
> - Computer Fraud and Abuse Act (CFAA)
> - Computer Misuse Act 1990, United Kingdom
> - And equivalent legislation in each jurisdiction
>
> The author assumes **NO responsibility** for misuse of this software.
> It should only be used in controlled environments, with explicit authorization,
> and for the purposes of learning, research, or authorized penetration testing.
>
> By cloning or downloading this repository, you agree to use it
> solely for educational and legal purposes.

## License

This project is licensed under the [MIT License](LICENSE).

## Share with the community

**Share** with others who might benefit from this tool

[![Share on Reddit](https://img.shields.io/badge/share%20on-reddit-FF4500?logo=reddit&logoColor=white)](https://reddit.com/submit?url=https://github.com/RaisenOps/Windows-Firewall-Manager-Adobe-Manager&title=Windows%20Firewall%20Manager%20for%20Adobe%20Apps)
[![Share on Hacker News](https://img.shields.io/badge/share%20on-hacker%20news-orange?logo=ycombinator)](https://news.ycombinator.com/submitlink?u=https://github.com/RaisenOps/Windows-Firewall-Manager-Adobe-Manager)
[![Share on Twitter](https://img.shields.io/badge/share%20on-twitter-03A9F4?logo=twitter)](https://twitter.com/share?url=https://github.com/RaisenOps/Windows-Firewall-Manager-Adobe-Manager&text=Check%20out%20this%20Windows%20Firewall%20Manager%20for%20Adobe%20Apps!)
[![Share on Facebook](https://img.shields.io/badge/share%20on-facebook-1976D2?logo=facebook)](https://www.facebook.com/sharer/sharer.php?u=https://github.com/RaisenOps/Windows-Firewall-Manager-Adobe-Manager)
[![Share on LinkedIn](https://img.shields.io/badge/share%20on-linkedin-3949AB?logo=linkedin)](https://www.linkedin.com/shareArticle?url=https://github.com/RaisenOps/Windows-Firewall-Manager-Adobe-Manager&title=Windows%20Firewall%20Manager%20for%20Adobe%20Apps)

---

<h1 align="center">⭐ If this helps you, consider giving it a ⭐</h1>
<h3 align="center">Made with ❤️ for you</h3>

