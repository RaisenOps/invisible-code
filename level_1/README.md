# Level 1: Binary Encoding with Invisible Characters

[Back to main](https://github.com/RaisenOps/invisible-code) | [Next: Level 2 →](../level_2/)

---

## Table of Contents

- [What will you learn in this level?](#what-will-you-learn-in-this-level)
- [The technique in 30 seconds](#the-technique-in-30-seconds)
- [Step-by-step example](#step-by-step-example)
- [Why does it work?](#why-does-it-work)
- [Usage](#usage)
- [Efficiency table](#efficiency-table)
- [Where is it invisible?](#where-is-it-invisible)
- [Next level](#next-level)

---

## What will you learn in this level?

- How computers represent text as binary numbers (0s and 1s)
- What Unicode "Zero-Width" characters are and why they are invisible
- How to hide an entire message inside a string that looks empty
- How to decode a hidden message

---

## The technique in 30 seconds

Each letter is converted to its binary code (8 bits of 0s and 1s). Then each bit is replaced by an invisible Unicode character:

| Bit | Unicode Character | Name | Visible on screen? |
|-----|-------------------|------|---------------------|
| `0` | U+200B | Zero Width Space | No, it is invisible |
| `1` | U+200D | Zero Width Joiner | No, it is invisible |

**Result**: a string that looks completely empty but contains an encoded message.

---

## Step-by-step example

We want to hide the word **"hi"** inside a string that looks empty.

### Step 1: Text to numbers (ASCII)

Each letter has an assigned number in the ASCII table:

```
"h" = 104
"i" = 105
```

### Step 2: Numbers to binary

That number is written in binary using 8 digits (bits):

```
104 = 01101000
105 = 01101001
```

### Step 3: Bits to invisible characters

Each `0` becomes U+200B and each `1` becomes U+200D:

```
"h" = 01101000
       ↓↓↓↓↓↓↓↓
       U+200B  U+200D  U+200D  U+200B  U+200D  U+200B  U+200B  U+200B

"i" = 01101001
       ↓↓↓↓↓↓↓↓
       U+200B  U+200D  U+200D  U+200B  U+200D  U+200B  U+200B  U+200D
```

### Step 4: The result

```python
# This looks like an empty string:
secret = ''

# But between those quotes there are 16 invisible characters
# encoding "hi". No editor shows them.
```

In any text editor (Notepad, VS Code, Sublime, Vim, etc.), the quotes appear flush together as if the string were empty. But it is not.

---

## Why does it work?

The characters U+200B and U+200D exist in Unicode for a legitimate purpose:

- **U+200B (Zero Width Space)**: indicates a point where a long word can be broken for line wrapping, without adding a visible space.
- **U+200D (Zero Width Joiner)**: joins characters that should be displayed together (for example, compound emojis like the family emoji: 👨‍👩‍👧).

Because their visual width is **zero**, no editor draws them on screen. But they are still valid characters that occupy space in memory and can be read by a program.

---

## Usage

Open the script in your editor and study the code. Look for anything suspicious in the `hidden_message` string. You won't find anything visible. Then run it:

```bash
# With Python:
cd level_1
python level1_python.py

# With JavaScript (Node.js):
cd level_1
node level1_node.js
```

The output proves that the string that appeared empty contains "hello world" hidden in 80 invisible characters.

---

## Efficiency table

| Message | Bytes | Invisible characters |
|---------|-------|-----------------------|
| `"hi"` | 2 | 16 |
| `"hello world"` | 11 | 88 |
| `"A longer text message"` | 21 | 168 |

**Formula**: invisible characters = text bytes x 8

Each byte of the message requires 8 invisible characters (one per bit).

---

## Where is it invisible?

| Environment | Invisible? | Notes |
|-------------|------------|-------|
| Windows Notepad | Yes | Completely invisible |
| VS Code | Yes | Completely invisible |
| Sublime Text | Yes | Completely invisible |
| GitHub (web) | Yes | Completely invisible |
| Browsers | Yes | Completely invisible |

**Advantage of this technique**: it works in absolutely ALL environments without exception. No conventional text editor displays these characters.

**Disadvantage**: the invisible string produced by this technique is 8 times longer than the original message. For large payloads (such as a reverse shell), this generates very long strings — though they remain invisible everywhere.

---

## Next level

In **Level 2** you will learn about **Variation Selectors**: a technique that uses only **1 invisible character per byte** instead of 8. It is 8 times more compact than Level 1, but it has a tradeoff you will discover when you get there.

[Go to Level 2 →](../level_2/)
