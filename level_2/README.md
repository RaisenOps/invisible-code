# Level 2: Steganography with Variation Selectors

[Back to main](../) | [← Level 1](../level_1/) | [Level 3 →](../level_3/)

---

## Table of Contents

- [What will you learn in this level?](#what-will-you-learn-in-this-level)
- [The problem with Level 1](#the-problem-with-level-1)
- [The technique: Variation Selectors](#the-technique-variation-selectors)
- [Step-by-step example](#step-by-step-example)
- [The complete mapping](#the-complete-mapping)
- [The tradeoff](#the-tradeoff)
  - [Where are Variation Selectors invisible?](#where-are-variation-selectors-invisible)
  - [Why do attackers prefer Variation Selectors?](#why-do-attackers-prefer-variation-selectors)
- [Usage](#usage)
- [Next level](#next-level)

---

## What will you learn in this level?

- What Unicode Variation Selectors are and why they exist
- How to map 1 full byte to 1 single invisible character
- Why this technique is 8 times more compact than Level 1
- The tradeoff between compactness and universal invisibility

**Prerequisite**: having completed [Level 1](../level_1/) to understand binary encoding.

---

## The problem with Level 1

In Level 1 you learned to encode text using 2 invisible characters (bit 0 and bit 1). It works perfectly, but it has a limitation:

```
1 byte = 8 bits = 8 invisible characters
```

For a 100-byte message, you need 800 invisible characters. For a real payload (a reverse shell, for example), the hidden string would have thousands of characters. Although they are invisible, they take up space in the file and make it suspiciously heavy.

**Question**: is there a way to use fewer characters?

---

## The technique: Variation Selectors

### What are they?

**Variation Selectors** are 256 Unicode characters whose original purpose is to indicate which visual variant to use for an emoji or CJK (Chinese/Japanese/Korean) character. For example, an emoji may have a color or no-color version, and the Variation Selector indicates which one to display.

But when they stand alone or appear next to regular text, **they are completely invisible**.

### Where are they in Unicode?

| Group | Range | Count | Unicode Plane |
|-------|-------|-------|---------------|
| VS1-VS16 | U+FE00 to U+FE0F | 16 | BMP (Plane 0) |
| VS17-VS256 | U+E0100 to U+E01EF | 240 | Plane 14 (supplementary) |
| **Total** | | **256** | |

### Why does 256 matter?

A byte can hold values from 0 to 255 — exactly **256 possibilities**. This means every possible byte value has its own Variation Selector. No binary conversion needed: we map directly.

---

## Step-by-step example

We want to hide the word **"Hi"**.

### Step 1: Text to bytes

```
"H" = byte 72
"i" = byte 105
```

### Step 2: Byte to Variation Selector (direct mapping)

```
Byte 72  → U+E0100 + (72 - 16) = U+E0138    (1 character)
Byte 105 → U+E0100 + (105 - 16) = U+E0159   (1 character)
```

Only 2 invisible characters for 2 letters.

### Comparison with Level 1

| | Level 1 (binary) | Level 2 (Var. Selectors) |
|--|-------------------|--------------------------|
| `"Hi"` | 16 characters | 2 characters |
| `"hello world"` | 88 characters | 11 characters |
| `"full payload..."` | ~31,000 characters | ~3,900 characters |

**Level 2 is 8 times more compact.**

---

## The complete mapping

```
Byte    0 → U+FE00  (VS1)
Byte    1 → U+FE01  (VS2)
   ...
Byte   15 → U+FE0F  (VS16)
Byte   16 → U+E0100 (VS17)
Byte   17 → U+E0101 (VS18)
   ...
Byte  255 → U+E01EF (VS256)
```

**Rule**:
- If the byte is < 16: use `U+FE00 + byte`
- If the byte is >= 16: use `U+E0100 + (byte - 16)`

To decode, reverse the operation.

---

## The tradeoff

No technique is perfect. Each one has advantages and disadvantages:

| Feature | Level 1 (Zero-Width) | Level 2 (Var. Selectors) |
|---------|---------------------|--------------------------|
| Chars per byte | 8 | 1 |
| Invisible in Notepad | Yes | Partial* |
| Invisible in VS Code | Yes | Yes |
| Invisible in GitHub | Yes | Yes |
| Invisible in browsers | Yes | Yes |
| Compactness | Low | High |

**\*** The supplementary plane Variation Selectors (U+E0100+, which are 240 of the 256) may show boxes in some environments. The 16 BMP ones (U+FE00-FE0F) are invisible everywhere.

### Where are Variation Selectors invisible?

Variation Selectors are Unicode category **Mn** (Mark, Nonspacing) = zero-width by standard. But the reality depends on the renderer:

| Editor/Platform | Invisible? | Why |
|-----------------|------------|-----|
| VS Code, Sublime, IntelliJ | Yes | They respect the Mn category = zero-width |
| GitHub (web) | Yes | The browser respects the Unicode category |
| Chrome, Firefox, Edge | Yes | Modern rendering engines |
| vim, nano (terminal) | Yes | Terminals respect Unicode |
| Terminal (script output) | No | The terminal shows boxes for Plane 14 code points |
| Notepad (Windows) | No | Shows replacement boxes for Plane 14 code points |

**Why do boxes appear in Notepad and the terminal?** The rendering engine (DirectWrite on Windows 11) does not render supplementary code points as zero-width; instead, it shows the `.notdef` glyph (boxes with X). The 16 BMP characters (U+FE00-FE0F) are invisible in Notepad because they are in the basic plane.

> **Note**: if you see boxes in the terminal when running scripts from this level, that is normal. Those same characters are **completely invisible** in the source code. Open the file in your editor and verify for yourself.

### Why do attackers prefer Variation Selectors?

In real attacks, malicious code is reviewed in:
- **IDEs** (VS Code, IntelliJ, etc.) → Variation Selectors are invisible
- **GitHub/GitLab** (web) → Variation Selectors are invisible
- **CI/CD tools** → do not display Unicode characters

Nobody opens source code in Notepad for review, and the terminal only shows boxes when *running* the script (not when reading the source code). That is why the compactness of Variation Selectors is preferred by attackers.

---

## Usage

Open the script in your editor and study the code. Look for anything suspicious in the `hidden_message` string. You won't find anything visible. Then run it:

```bash
# With Python:
cd level_2
python level2_python.py

# With JavaScript (Node.js):
cd level_2
node level2_node.js
```

The output proves that the string that appeared empty contains "Hello World I am level 2" hidden in only 24 invisible characters, and compares the efficiency with Level 1.

---

## Next level

In **Level 3** you will see how this technique is used in a real (controlled and educational) attack: a full **reverse shell** hidden inside code files that work normally. You will also learn how to **detect and defend** against these attacks.

[Go to Level 3 →](../level_3/)
