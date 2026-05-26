import re

path = r'c:\Users\J. Valdivia\SISTEMA PLIXORA\index.html'

# Read as bytes first, then try to fix the double-encoding
with open(path, 'rb') as f:
    raw = f.read()

# The file was encoded as UTF-8, but then re-read as latin-1 and saved again as UTF-8
# This causes double-encoding. To fix: decode as latin-1, then encode as latin-1 bytes, then decode as UTF-8
try:
    # Method: decode as UTF-8 (gets the garbled string), encode as latin-1 (gets original bytes), decode as UTF-8
    content_utf8 = raw.decode('utf-8')
    # Try to recover original by encoding garbled text as latin-1
    original_bytes = content_utf8.encode('latin-1', errors='replace')
    content_fixed = original_bytes.decode('utf-8', errors='replace')
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content_fixed)
    
    # Check
    broken = re.findall(r'Ã[a-z\xb0-\xff]', content_fixed)
    print(f"Fixed! Remaining broken chars: {len(broken)}")
    if broken:
        print("Still broken:", set(broken))
    else:
        print("All characters restored correctly!")
        
except Exception as e:
    print(f"Error: {e}")
    # Fallback: just do string replacements on the raw content
    content = raw.decode('utf-8', errors='replace')
    replacements = {
        'Ã³': 'ó', 'Ã±': 'ñ', 'Ã©': 'é', 'Ã¡': 'á', 
        'Ãº': 'ú', 'Ã­': 'í', 'âœ•': '✕',
        'CataÌlogo': 'Catálogo',
    }
    for bad, good in replacements.items():
        content = content.replace(bad, good)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Used fallback replacements")
