param(
    [switch]$SkipDocker,
    [switch]$InstallDeps,
    [switch]$NoFrontend,
    [switch]$NoBrowser,
    [string]$CondaEnv
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

function Get-CondaExecutable {
    if ($env:CONDA_EXE -and (Test-Path $env:CONDA_EXE)) {
        return $env:CONDA_EXE
    }

    if (Test-Command "conda.exe") {
        return (Get-Command "conda.exe").Source
    }

    if (Test-Command "conda") {
        return (Get-Command "conda").Source
    }

    $commonCondaPaths = @(
        "E:\software\anconda\Scripts\conda.exe",
        "C:\ProgramData\Anaconda3\Scripts\conda.exe",
        "C:\ProgramData\Miniconda3\Scripts\conda.exe",
        (Join-Path $env:USERPROFILE "anaconda3\Scripts\conda.exe"),
        (Join-Path $env:USERPROFILE "miniconda3\Scripts\conda.exe")
    )

    foreach ($candidate in $commonCondaPaths) {
        if ($candidate -and (Test-Path $candidate)) {
            return $candidate
        }
    }

    return $null
}

function Test-Port($Port) {
    $client = [System.Net.Sockets.TcpClient]::new()
    try {
        $async = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
        if (-not $async.AsyncWaitHandle.WaitOne(1000)) {
            return $false
        }

        $client.EndConnect($async)
        return $true
    } catch {
        return $false
    } finally {
        $client.Close()
    }
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
    if ($CondaEnv) {
        if ($env:CONDA_DEFAULT_ENV -eq $CondaEnv -and $env:CONDA_PREFIX) {
            $activeCondaPython = Join-Path $env:CONDA_PREFIX "python.exe"
            if (Test-Path $activeCondaPython) {
                return $activeCondaPython
            }
        }

        $condaExe = Get-CondaExecutable

        if (-not $condaExe) {
            throw "Conda was not found. Install Miniconda/Anaconda or make sure conda is available in PATH."
        }

        $envLines = & $condaExe env list 2>$null
        foreach ($line in $envLines) {
            if ($line -match "^\s*$([regex]::Escape($CondaEnv))\s+(.+?)\s*$") {
                $condaEnvPath = $matches[1].Trim()
                $condaEnvPython = Join-Path $condaEnvPath "python.exe"
                if (Test-Path $condaEnvPython) {
                    return $condaEnvPython
                }
            }
        }

        throw "Conda environment '$CondaEnv' was not found via 'conda env list'."
    }

    if ($env:CONDA_PREFIX) {
        $activeCondaPython = Join-Path $env:CONDA_PREFIX "python.exe"
        if (Test-Path $activeCondaPython) {
            return $activeCondaPython
        }
    }

    $repoVenvPython = Join-Path $Root ".venv\Scripts\python.exe"
    if (Test-Path $repoVenvPython) {
        return $repoVenvPython
    }

    if ($env:PYTHON -and (Test-Path $env:PYTHON)) {
        return $env:PYTHON
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
        return (Get-Command "npm.cmd").Source
    }

    if (Test-Command "npm") {
        return (Get-Command "npm").Source
    }

    $whereNpm = & where.exe npm.cmd 2>$null | Select-Object -First 1
    if ($whereNpm -and (Test-Path $whereNpm)) {
        return $whereNpm
    }

    $commonNpmPaths = @(
        (Join-Path $env:ProgramFiles "nodejs\npm.cmd"),
        (Join-Path ${env:ProgramFiles(x86)} "nodejs\npm.cmd"),
        (Join-Path $env:APPDATA "npm\npm.cmd"),
        (Join-Path $env:LOCALAPPDATA "Programs\nodejs\npm.cmd"),
        "E:\software\nvm\nodejs\npm.cmd"
    )

    foreach ($candidate in $commonNpmPaths) {
        if ($candidate -and (Test-Path $candidate)) {
            return $candidate
        }
    }

    throw "npm was not found. Install Node.js 18+ and make sure npm is available in PATH."
}

function Get-DockerCommand {
    if (Test-Command "docker.exe") {
        return (Get-Command "docker.exe").Source
    }

    if (Test-Command "docker") {
        return (Get-Command "docker").Source
    }

    $commonDockerPath = "C:\Program Files\Docker\Docker\resources\bin\docker.exe"
    if (Test-Path $commonDockerPath) {
        return $commonDockerPath
    }

    throw "Docker was not found. Start Docker Desktop and make sure docker.exe is available in PATH."
}

function Normalize-ProcessPathEnvironment {
    $pathUpper = [System.Environment]::GetEnvironmentVariable("PATH", "Process")
    $pathMixed = [System.Environment]::GetEnvironmentVariable("Path", "Process")
    $machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
    $preferredPath = @($pathMixed, $pathUpper, $machinePath, $userPath) -ne $null -join ";"

    if ($preferredPath) {
        [System.Environment]::SetEnvironmentVariable("Path", $preferredPath, "Process")
    }
    [System.Environment]::SetEnvironmentVariable("PATH", $null, "Process")
}

function Test-PythonImports($PythonCommand, $Modules) {
    $importList = ($Modules | ForEach-Object { "import $_" }) -join "; "
    & $PythonCommand -c $importList *> $null
    if ($LASTEXITCODE -ne 0) {
        return $false
    }

    return $true
}

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
Set-Location $Root
Normalize-ProcessPathEnvironment
$env:PYTHONIOENCODING = "utf-8"
$env:PYTHONUTF8 = "1"

Write-Host "Menu Recommendation Assistant launcher" -ForegroundColor Magenta
Write-Host "Root: $Root"
if ($CondaEnv) {
    Write-Host "Python env: conda/$CondaEnv"
} elseif ($env:CONDA_DEFAULT_ENV) {
    Write-Host "Python env: conda/$($env:CONDA_DEFAULT_ENV)"
}

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
    try {
        $Docker = Get-DockerCommand
        & $Docker compose -f (Join-Path $Root "docker-compose.yml") up -d
        & $Docker compose -f (Join-Path $DataDir "docker-compose.yml") up -d
        Write-Ok "Docker services were requested."
    } catch {
        Write-Warn "Docker was not found. Milvus and Neo4j must already be running."
    }
} else {
    Write-Step "Skipping Docker services"
}

if ($InstallDeps) {
    Write-Step "Installing Python dependencies"
    $Python = Get-PythonCommand
    & $Python -m pip install -r "$Root\requirements.txt"
} else {
    Write-Step "Checking Python environment"
    $VenvPython = Join-Path $Root ".venv\Scripts\python.exe"
    if ($CondaEnv) {
        $Python = Get-PythonCommand
        if (-not (Test-PythonImports $Python @("neo4j", "dotenv"))) {
            Write-Warn "Conda environment '$CondaEnv' is missing required Python packages. Installing dependencies now..."
            & $Python -m pip install -r "$Root\requirements.txt"
            Write-Ok "Dependencies installed."
        } else {
            Write-Ok "Conda environment '$CondaEnv' is available and required Python packages are installed."
        }
    } elseif (-not (Test-Path $VenvPython)) {
        Write-Warn ".venv not found — creating and installing dependencies (first run only)..."
        $Python = Get-PythonCommand
        & $Python -m venv "$Root\.venv"
        & $VenvPython -m pip install --upgrade pip -q
        & $VenvPython -m pip install -r "$Root\requirements.txt"
        Write-Ok "Dependencies installed."
    } else {
        $Python = Get-PythonCommand
        if (-not (Test-PythonImports $Python @("neo4j", "dotenv"))) {
            Write-Warn ".venv exists but required Python packages are missing. Installing dependencies now..."
            & $Python -m pip install -r "$Root\requirements.txt"
            Write-Ok "Dependencies installed."
        } else {
            Write-Ok ".venv exists and required Python packages are available."
        }
    }
}

if (-not $NoFrontend) {
    Write-Step "Skipping Vite frontend (using built-in static server at port 8000)"
    $NoFrontend = $true
}

$FrontendDistDir = Join-Path $FrontendDir "dist"
$FrontendNodeModulesDir = Join-Path $FrontendDir "node_modules"

if ($InstallDeps -or ((-not (Test-Path $FrontendDistDir)) -and (-not (Test-Path $FrontendNodeModulesDir)))) {
    Write-Step "Installing frontend dependencies"
    $Npm = Get-NpmCommand
    Push-Location $FrontendDir
    try {
        & $Npm install
        Write-Ok "Frontend dependencies installed."
    } finally {
        Pop-Location
    }
}

if (-not (Test-Path $FrontendDistDir)) {
    Write-Step "Building frontend"
    $Npm = Get-NpmCommand
    Push-Location $FrontendDir
    try {
        & $Npm run build
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
    $BackendProcess = Start-Process -FilePath $Python -ArgumentList @("web_server.py") -WorkingDirectory $Root -RedirectStandardOutput $BackendLog -RedirectStandardError $BackendErr -WindowStyle Hidden -PassThru
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
$BackendReady = Wait-Port 8000 "Backend" 180
if (-not $BackendReady) {
    throw "Backend failed to start on port 8000. Check $BackendErr for details."
}
if (-not $NoFrontend) {
    $FrontendReady = Wait-Port 5173 "Frontend" 60
    if (-not $FrontendReady) {
        throw "Frontend failed to start on port 5173. Check $FrontendErr for details."
    }
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
Write-Host "  Double click: start.bat"
Write-Host "  PowerShell:   .\start.ps1"
Write-Host "  Reinstall:    .\start.ps1 -InstallDeps"
Write-Host "  No Docker:   .\start.ps1 -SkipDocker"
Write-Host "  Backend only: .\start.ps1 -NoFrontend  (default, frontend served at :8000)"
Write-Host "  Stop app:    .\stop.ps1"
