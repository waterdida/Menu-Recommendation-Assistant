$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogDir = Join-Path $Root "logs"
$PidFiles = @(
    Join-Path $LogDir "frontend.pid"
    Join-Path $LogDir "backend.pid"
)

Write-Host "Stopping Menu Recommendation Assistant..." -ForegroundColor Cyan

foreach ($PidFile in $PidFiles) {
    if (-not (Test-Path $PidFile)) {
        continue
    }

    $PidValue = (Get-Content $PidFile -ErrorAction SilentlyContinue | Select-Object -First 1).Trim()
    if (-not $PidValue) {
        Remove-Item $PidFile -Force
        continue
    }

    $Process = Get-Process -Id ([int]$PidValue) -ErrorAction SilentlyContinue
    if ($Process) {
        taskkill /PID $Process.Id /T /F | Out-Null
        Write-Host "Stopped process $($Process.Id)." -ForegroundColor Green
    }

    Remove-Item $PidFile -Force
}

Write-Host "Done." -ForegroundColor Green
