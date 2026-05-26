$path = "c:\Users\J. Valdivia\SISTEMA PLIXORA\index.html"
$bytes = [System.IO.File]::ReadAllBytes($path)
# Check first 3 bytes for BOM
Write-Host "First 3 bytes: $($bytes[0]) $($bytes[1]) $($bytes[2])"
# Find specific byte sequences for Spanish chars
# ó = C3 B3, ñ = C3 B1, é = C3 A9, á = C3 A1, ú = C3 BA
$found_o = 0; $found_n = 0
for ($i = 0; $i -lt $bytes.Length - 1; $i++) {
    if ($bytes[$i] -eq 0xC3 -and $bytes[$i+1] -eq 0xB3) { $found_o++ }
    if ($bytes[$i] -eq 0xC3 -and $bytes[$i+1] -eq 0xB1) { $found_n++ }
}
Write-Host "Found UTF-8 'o with accent' (ó): $found_o times"
Write-Host "Found UTF-8 'n with tilde' (ñ): $found_n times"
Write-Host "File looks $(if ($found_o -gt 0 -and $found_n -gt 0) {'CORRECT (proper UTF-8)'} else {'possibly wrong'})"
