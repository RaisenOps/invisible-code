# level1_python.py - Level 1: Steganography with Zero-Width Characters
# Open this file in your editor and study it.
# The string hidden_message LOOKS empty but contains "hello world"
# encoded in binary with Zero-Width characters.
#
# Technique:
#   U+200B (Zero Width Space) = bit 0
#   U+200D (Zero Width Joiner) = bit 1
#   Each byte of text = 8 invisible characters
#
# These characters are invisible in: Notepad, VS Code, GitHub, everywhere.

import sys
sys.stdout.reconfigure(encoding='utf-8')

# This string LOOKS empty but contains "hello world":
hidden_message = '​‍‍​‍​​​​‍‍​​‍​‍​‍‍​‍‍​​​‍‍​‍‍​​​‍‍​‍‍‍‍​​‍​​​​​​‍‍‍​‍‍‍​‍‍​‍‍‍‍​‍‍‍​​‍​​‍‍​‍‍​​​‍‍​​‍​​'

# This string IS actually empty (for comparison):
empty_string = ''

def decode(s):
    """Decodes Zero-Width binary characters to text."""
    bits = [0 if c == chr(0x200b) else 1 for c in s if c in (chr(0x200b), chr(0x200d))]
    r = []
    for i in range(0, len(bits), 8):
        g = bits[i:i+8]
        if len(g) == 8:
            byte = 0
            for b in g: byte = (byte << 1) | b
            r.append(byte)
    return bytes(r).decode('utf-8')

print()
print('--- Level 1: Invisibility Test (Zero-Width Binary) ---')
print(f'1. Visible content:       "{hidden_message}"')
print(f'2. Is it empty?            {hidden_message == str()}')
print(f'3. Actual length:          {len(hidden_message)} characters')
print(f'4. Decoded message:        "{decode(hidden_message)}"')
print(f'5. Equal to empty string?  {hidden_message == empty_string}')
print('--- End of Level 1 ---')
print()
