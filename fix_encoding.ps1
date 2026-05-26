# Read file bytes
$path = "c:\Users\J. Valdivia\SISTEMA PLIXORA\index.html"
$bytes = [System.IO.File]::ReadAllBytes($path)

# Remove UTF-8 BOM if present (EF BB BF)
if ($bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
    $bytes = $bytes[3..($bytes.Length-1)]
    Write-Host "Removed BOM"
}

# Decode as UTF-8 to get current string
$current = [System.Text.Encoding]::UTF8.GetString($bytes)

# Check if still has double-encoded chars by looking for the pattern
# Ã + next byte being a specific value (the Latin-1 approach)
# Instead of the complex re-encoding, do explicit replacements using char codes

$latin1 = [System.Text.Encoding]::GetEncoding(28591) # ISO-8859-1

# Re-encode as latin-1 bytes (each char becomes 1 byte using its Unicode codepoint)
# This works if the string was double-encoded (latin-1 bytes wrapped in UTF-8)
try {
    $latin1Bytes = $latin1.GetBytes($current)
    $recovered = [System.Text.Encoding]::UTF8.GetString($latin1Bytes)
    
    # Check if recovery worked (should not have Ã sequences anymore)
    $brokenCount = ([regex]::Matches($recovered, 'Ã[^\s<>]')).Count
    Write-Host "After recovery: $brokenCount broken sequences"
    
    if ($brokenCount -lt 10) {
        # Save recovered version
        $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText($path, $recovered, $utf8NoBom)
        Write-Host "Saved recovered version"
        
        # Show sample
        $sample = [regex]::Matches($recovered, '.{10}(ó|ñ|é|á|ú|í).{10}')
        if ($sample.Count -gt 0) {
            Write-Host "Sample with correct chars: $($sample[0].Value)"
        }
    }
} catch {
    Write-Host "Error in recovery: $_"
    # Fallback: just remove BOM and save
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($path, $current, $utf8NoBom)
    Write-Host "Saved without BOM (no char recovery)"
}
