# PLIXORA.BO — BUILD ANDROID APK
Write-Host "=== PLIXORA.BO - BUILD ANDROID APK ===" -ForegroundColor Cyan

$ROOT = (Get-Location).Path

# 1. Copiar archivos fuente a www/
Write-Host "[1/4] Copiando archivos..." -ForegroundColor Yellow
$files = "index.html","style.css","login.css","analytics.css","group-accounts.css","config.js","firebase-config.js","auth.js","catalog-data.js","sales-core.js","dashboard.js","contacts.js","history-actions.js","replace-account.js","app.js","netflix.js","analytics.js","group-accounts.js","shader-bg.js","logo.jpg","netflix-instrucciones.png","package.json"
foreach ($f in $files) { Copy-Item -Path "$ROOT\$f" -Destination "$ROOT\www\$f" -Force }

# 2. Appended android-app/app-android.js a www/app.js
Write-Host "[2/4] Aplicando parche Android a app.js..." -ForegroundColor Yellow
$ajs = Get-Content "$ROOT\android-app\app-android.js" -Raw
$wjs = Get-Content "$ROOT\www\app.js" -Raw
$wjs + "`r`n" + $ajs | Set-Content "$ROOT\www\app.js" -NoNewline

# 3. Appended android-app/android.css a www/style.css (si tiene contenido)
Write-Host "[3/4] Aplicando parche Android a style.css..." -ForegroundColor Yellow
$acs = Get-Content "$ROOT\android-app\android.css" -Raw
if ($acs.Trim() -ne '') {
    $wcs = Get-Content "$ROOT\www\style.css" -Raw
    $wcs + "`r`n" + $acs | Set-Content "$ROOT\www\style.css" -NoNewline
}

# 4. Sync y build
Write-Host "[4/4] Compilando APK..." -ForegroundColor Yellow
Set-Location "$ROOT"
npx cap sync android
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: Sync fallo" -ForegroundColor Red; exit 1 }

$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot"
Set-Location "$ROOT\android"
.\gradlew.bat assembleDebug
if ($LASTEXITCODE -eq 0) {
    Set-Location "$ROOT"
    Write-Host "=== APK GENERADA ===" -ForegroundColor Green
    Write-Host "Ruta: android\app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor White
} else {
    Set-Location "$ROOT"
    Write-Host "ERROR: Build fallo" -ForegroundColor Red; exit 1
}
