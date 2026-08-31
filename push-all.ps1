# Commits all current work (including real .env files) and force-pushes to origin/main.
# Run from PowerShell:  .\push-all.ps1

$ErrorActionPreference = 'Stop'
Set-Location "C:\Users\abhin\Downloads\FaultX (3)\FaultX"

# 1. Clear the stale index.lock left by a crashed git process
if (Test-Path .git\index.lock) {
    Write-Host "Removing stale .git\index.lock ..." -ForegroundColor Yellow
    Remove-Item .git\index.lock -Force
}

# 2. Stage everything that isn't gitignored
git add -A

# 3. Force-add the two .env files (they are matched by .gitignore).
#    NOTE: once force-added they stay tracked, so future local secret
#    changes will show up as normal modifications.
git add -f backend/.env frontend/.env.local

# 4. Show exactly what is about to be committed, then confirm
git status --short
Write-Host ""
$reply = Read-Host "Commit and FORCE PUSH the above to origin/main? (yes/no)"
if ($reply -ne 'yes') { Write-Host "Aborted. Nothing committed." -ForegroundColor Red; exit 1 }

# 5. Commit
git commit -m "Add simulator, Exotel notifications, line map, ESP32 firmware updates"

# 6. Force push, but refuse if someone else has pushed since your last fetch
git push --force-with-lease origin main
