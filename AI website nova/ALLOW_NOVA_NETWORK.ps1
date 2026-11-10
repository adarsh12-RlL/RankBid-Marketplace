$ErrorActionPreference = "SilentlyContinue"

$pythonCandidates = @(
    "C:\Python313\python.exe",
    "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe"
)

$pythonExe = $pythonCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $pythonExe) {
    $cmd = Get-Command python -ErrorAction SilentlyContinue
    if ($cmd) { $pythonExe = $cmd.Source }
}

if ($pythonExe) {
    Get-NetFirewallRule -DisplayName "Nova AI Python Internet" -ErrorAction SilentlyContinue | Remove-NetFirewallRule
    New-NetFirewallRule -DisplayName "Nova AI Python Internet" -Direction Outbound -Program $pythonExe -Action Allow -Profile Any | Out-Null
    Write-Host "Allowed outbound internet for: $pythonExe"
} else {
    Write-Host "Python was not found. Install/repair Python first."
}

Get-NetFirewallRule -DisplayName "Nova AI Mobile LAN 8765" -ErrorAction SilentlyContinue | Remove-NetFirewallRule
New-NetFirewallRule -DisplayName "Nova AI Mobile LAN 8765" -Direction Inbound -Protocol TCP -LocalPort 8765 -Action Allow -Profile Private | Out-Null
Write-Host "Allowed mobile LAN access on private networks for port 8765."
Write-Host "Done. Restart Nova after this."
