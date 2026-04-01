# level2_python.py - Level 2: Steganography with Variation Selectors
# Open this file in your editor and study it.
# The string hidden_message LOOKS empty but contains "Hello World I am level 2"
# encoded with Variation Selectors (1 character = 1 byte).
#
# Technique:
#   Byte 0-15   → U+FE00 to U+FE0F   (VS1 to VS16)
#   Byte 16-255 → U+E0100 to U+E01EF  (VS17 to VS256)
#   Each byte = 1 single invisible character (8x more compact than Level 1)
#
# Invisible in: VS Code, IDEs, GitHub.
# In Notepad it may show boxes (supplementary plane).

import sys
sys.stdout.reconfigure(encoding='utf-8')

# This string LOOKS empty but contains "Hello World I am level 2":
hidden_message = '󠄸󠅕󠅜󠅜󠅟󠄐󠅇󠅟󠅢󠅜󠅔󠄐󠄹󠄐󠅑󠅝󠄐󠅜󠅕󠅦󠅕󠅜󠄐󠄢'

# This string IS actually empty (for comparison):
empty_string = ''

def decode(s):
    """Decodes Variation Selectors to text."""
    r = []
    for c in s:
        cp = ord(c)
        if 0xFE00 <= cp <= 0xFE0F:
            r.append(cp - 0xFE00)
        elif 0xE0100 <= cp <= 0xE01EF:
            r.append((cp - 0xE0100) + 16)
    return bytes(r).decode('utf-8')

print()
print('--- Level 2: Invisibility Test (Variation Selectors) ---')
print(f'1. Visible content:       "{hidden_message}"')
print(f'2. Is it empty?            {hidden_message == str()}')
print(f'3. Actual length:          {len(hidden_message)} characters')
print(f'4. Decoded message:        "{decode(hidden_message)}"')
print(f'5. Equal to empty string?  {hidden_message == empty_string}')
print(f'6. Comparison: Level 2 = {len(hidden_message)} chars, Level 1 would need {len(hidden_message) * 8} chars (8x more compact)')
print('--- End of Level 2 ---')
print()
