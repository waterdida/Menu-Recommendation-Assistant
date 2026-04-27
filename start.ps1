param(
    [switch]$SkipDocker,
    [switch]$InstallDeps,
    [switch]$NoFrontend,
    [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$FrontendDir = Join-Path $Root "frontend"
$DataDir = Join-Path $Root "data"
$LogDir = Join-Path $Root "logs"
$BackendLog = Join-Path $LogDir "backend.out.log"
$BackendErr = Join-Path $LogDir "backend.err.log"
$FrontendLog = Join-Path $LogDir "frontend.out.log"
$FrontendErr = Join-Path $LogDir "frontend.err.log"
$BackendPidFile = Join-Path $LogDir "backend.pid"
$FrontendPidFile = Join-Path $LogDir "frontend.pid"
$BackendUrl = "http://127.0.0.1:8000"
$FrontendUrl = "http://127.0.0.1:5173"

function Write-Step($Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-Ok($Message) {
    Write-Host "    $Message" -ForegroundColor Green
}

function Write-Warn($Message) {
    Write-Host "    $Message" -ForegroundColor Yellow
}

function Test-Command($Name) {
    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Test-Port($Port) {
    $connection = Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    return $null -ne $connection
}

function Wait-Port($Port, $Name, $TimeoutSeconds) {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-Port $Port) {
            Write-Ok "$Name is listening on port $Port."
            return $true
        }
        Start-Sleep -Seconds 2
    }

    Write-Warn "$Name did not open port $Port within $TimeoutSeconds seconds. Check logs in $LogDir."
    return $false
}

function Get-PythonCommand {
    $repoVenvPython = Join-Path $Root ".venv\Scripts\python.exe"
    if (Test-Path $repoVenvPython) {
        return "`"$repoVenvPython`""
    }

    if ($env:PYTHON -and (Test-Path $env:PYTHON)) {
        return "`"$env:PYTHON`""
    }

    if (Test-Command "python") {
        return "python"
    }

    if (Test-Command "py") {
        return "py"
    }

    throw "Python was not found. Install Python or set the PYTHON environment variable to python.exe."
}

function Get-NpmCommand {
    if (Test-Command "npm.cmd") {
        return "npm.cmd"
    }

    if (Test-Command "npm") {
        return "npm"
    }

    throw "npm was not found. Install Node.js 18+ and make sure npm is available in PATH."
}

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
Set-Location $Root

Write-Host "Menu Recommendation Assistant launcher" -ForegroundColor Magenta
Write-Host "Root: $Root"

Write-Step "Preparing environment file"
$EnvFile = Join-Path $Root ".env"
$EnvExample = Join-Path $Root ".env.example"
if (-not (Test-Path $EnvFile) -and (Test-Path $EnvExample)) {
    Copy-Item $EnvExample $EnvFile
    Write-Warn ".env was created from .env.example. Please fill MOONSHOT_API_KEY before starting."
} elseif (Test-Path $EnvFile) {
    Write-Ok ".env exists."
} else {
    Write-Warn ".env.example was not found; continuing without creating .env."
}

if (-not $SkipDocker) {
    Write-Step "Starting database services with Docker Compose"
    if (Test-Command "docker") {
        docker compose -f (Join-Path $Root "docker-compose.yml") up -d
        docker compose -f (Join-Path $DataDir "docker-compose.yml") up -d
        Write-Ok "Docker services were requested."
    } else {
        Write-Warn "Docker was not found. Milvus and Neo4j must already be running."
    }
} else {
    Write-Step "Skipping Docker services"
}

if ($InstallDeps) {
    Write-Step "Installing Python dependencies"
    $Python = Get-PythonCommand
    Invoke-Expression "$Python -m pip install -r `"$Root\requirements.txt`""
} else {
    Write-Step "Checking Python virtual environment"
    $VenvPython = Join-Path $Root ".venv\Scripts\python.exe"
    if (-not (Test-Path $VenvPython)) {
        Write-Warn ".venv not found — creating and installing dependencies (first run only)..."
        $Python = Get-PythonCommand
        Invoke-Expression "$Python -m venv `"$Root\.venv`""
        Invoke-Expression "`"$VenvPython`" -m pip install --upgrade pip -q"
        Invoke-Expression "`"$VenvPython`" -m pip install -r `"$Root\requirements.txt`""
        Write-Ok "Dependencies installed."
    } else {
        Write-Ok ".venv exists, skipping install. Use .\start.ps1 -InstallDeps to force reinstall."
    }
}

if (-not $NoFrontend) {
    Write-Step "Skipping Vite frontend (using built-in static server at port 8000)"
    $NoFrontend = $true
}

$FrontendDistDir = Join-Path $FrontendDir "dist"
$FrontendNodeModulesDir = Join-Path $FrontendDir "node_modules"
$Npm = Get-NpmCommand

if ($InstallDeps -or -not (Test-Path $FrontendNodeModulesDir)) {
    Write-Step "Installing frontend dependencies"
    Push-Location $FrontendDir
    try {
        Invoke-Expression "$Npm install"
        Write-Ok "Frontend dependencies installed."
    } finally {
        Pop-Location
    }
}

if (-not (Test-Path $FrontendDistDir)) {
    Write-Step "Building frontend"
    Push-Location $FrontendDir
    try {
        Invoke-Expression "$Npm run build"
        Write-Ok "Frontend build completed."
    } finally {
        Pop-Location
    }
}


Write-Step "Starting backend"
if (Test-Port 8000) {
    Write-Warn "Port 8000 is already in use; assuming backend is already running."
} else {
    $Python = Get-PythonCommand
    $BackendCommand = "Set-Location `"$Root`"; $Python web_server.py"
    $BackendProcess = Start-Process powershell -ArgumentList @("-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $BackendCommand) -RedirectStandardOutput $BackendLog -RedirectStandardError $BackendErr -WindowStyle Hidden -PassThru
    Set-Content -Path $BackendPidFile -Value $BackendProcess.Id
    Write-Ok "Backend process started. Logs: $BackendLog"
}

if (-not $NoFrontend) {
    Write-Step "Starting frontend"
    if (Test-Port 5173) {
        Write-Warn "Port 5173 is already in use; assuming frontend is already running."
    } else {
        $FrontendCommand = "Set-Location `"$FrontendDir`"; npm run dev"
        $FrontendProcess = Start-Process powershell -ArgumentList @("-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $FrontendCommand) -RedirectStandardOutput $FrontendLog -RedirectStandardError $FrontendErr -WindowStyle Hidden -PassThru
        Set-Content -Path $FrontendPidFile -Value $FrontendProcess.Id
        Write-Ok "Frontend process started. Logs: $FrontendLog"
    }
}

Write-Step "Waiting for services"
Wait-Port 8000 "Backend" 180 | Out-Null
if (-not $NoFrontend) {
    Wait-Port 5173 "Frontend" 60 | Out-Null
}

Write-Host ""
Write-Host "Ready." -ForegroundColor Green
if ($NoFrontend) {
    Write-Host "Open: $BackendUrl"
    if (-not $NoBrowser) {
        Start-Process $BackendUrl
    }
} else {
    Write-Host "Open: $FrontendUrl"
    if (-not $NoBrowser) {
        Start-Process $FrontendUrl
    }
}

Write-Host ""
Write-Host "Tips:"
Write-Host "  First run:   .\start.ps1 -InstallDeps"
Write-Host "  No Docker:   .\start.ps1 -SkipDocker"
Write-Host "  Backend only: .\start.ps1 -NoFrontend  (default, frontend served at :8000)"
Write-Host "  Stop app:    .\stop.ps1"
