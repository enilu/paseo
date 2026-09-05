$ErrorActionPreference = "Stop"

# Ensure node_modules/.bin is in PATH
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$env:PATH = "$ScriptDir\..\node_modules\.bin;$env:PATH"

# Derive PASEO_HOME: stable name for worktrees, temporary dir otherwise
if (-not $env:PASEO_HOME) {
    $GitDir = git rev-parse --git-dir 2>$null
    $GitCommonDir = git rev-parse --git-common-dir 2>$null

    if ($GitDir -and $GitCommonDir -and ($GitDir -ne $GitCommonDir)) {
        # Inside a worktree — derive a stable home from the worktree name
        $WorktreeRoot = git rev-parse --show-toplevel
        $WorktreeName = (Split-Path -Leaf $WorktreeRoot).ToLower() -replace '[^a-z0-9-]', '-' -replace '-+', '-' -replace '^-|-$', ''
        $env:PASEO_HOME = "$env:USERPROFILE\.paseo-$WorktreeName"
        New-Item -ItemType Directory -Force -Path $env:PASEO_HOME | Out-Null
    } else {
        $env:PASEO_HOME = Join-Path ([System.IO.Path]::GetTempPath()) "paseo-dev-$([System.Guid]::NewGuid().ToString('N').Substring(0,6))"
        New-Item -ItemType Directory -Force -Path $env:PASEO_HOME | Out-Null
        # Register cleanup on exit
        $TempPaseoHome = $env:PASEO_HOME
        Register-EngineEvent PowerShell.Exiting -Action {
            Remove-Item -Recurse -Force $TempPaseoHome -ErrorAction SilentlyContinue
        } | Out-Null
    }
}

# Share speech models with the main install to avoid duplicate downloads
if (-not $env:PASEO_LOCAL_MODELS_DIR) {
    $env:PASEO_LOCAL_MODELS_DIR = "$env:USERPROFILE\.paseo\models\local-speech"
    New-Item -ItemType Directory -Force -Path $env:PASEO_LOCAL_MODELS_DIR | Out-Null
}

$DaemonPort = if ($env:PASEO_DEV_DAEMON_PORT) { $env:PASEO_DEV_DAEMON_PORT } else { "6768" }
$MetroPort = if ($env:EXPO_PORT) { $env:EXPO_PORT } else { "8081" }

if (-not $env:PASEO_DEV_HOST) {
    $DefaultRoute = Get-NetRoute -AddressFamily IPv4 -DestinationPrefix "0.0.0.0/0" -ErrorAction SilentlyContinue |
        Where-Object { $_.NextHop -ne "0.0.0.0" } |
        Sort-Object RouteMetric, InterfaceMetric |
        Select-Object -First 1
    if ($DefaultRoute) {
        $env:PASEO_DEV_HOST = Get-NetIPAddress -AddressFamily IPv4 -InterfaceIndex $DefaultRoute.InterfaceIndex -ErrorAction SilentlyContinue |
            Where-Object { $_.IPAddress -notlike "169.254.*" } |
            Select-Object -ExpandProperty IPAddress -First 1
    }
}

if (-not $env:PASEO_DEV_HOST) {
    throw "Unable to detect a LAN address. Set PASEO_DEV_HOST before running npm run dev:win."
}

if (-not $env:PASEO_PASSWORD) {
    $LocalEnvPath = Join-Path $ScriptDir "..\.env.local"
    if (Test-Path $LocalEnvPath) {
        $PasswordEntry = Get-Content $LocalEnvPath |
            Where-Object { $_ -match '^\s*PASEO_PASSWORD\s*=' } |
            Select-Object -Last 1
        if ($PasswordEntry) {
            $LocalPassword = ($PasswordEntry -split '=', 2)[1].Trim()
            if (
                ($LocalPassword.StartsWith('"') -and $LocalPassword.EndsWith('"')) -or
                ($LocalPassword.StartsWith("'") -and $LocalPassword.EndsWith("'"))
            ) {
                $LocalPassword = $LocalPassword.Substring(1, $LocalPassword.Length - 2)
            }
            $env:PASEO_PASSWORD = $LocalPassword
        }
    }
}

if (-not $env:PASEO_PASSWORD) {
    throw "PASEO_PASSWORD is required for LAN development. Set it in the environment or in .env.local."
}

if (-not $env:PASEO_LISTEN) {
    $env:PASEO_LISTEN = "0.0.0.0:$DaemonPort"
}

if (-not $env:EXPO_PUBLIC_LOCAL_DAEMON) {
    $env:EXPO_PUBLIC_LOCAL_DAEMON = "$($env:PASEO_DEV_HOST):$DaemonPort"
}

$env:EXPO_PUBLIC_LOCAL_DAEMON_PASSWORD_REQUIRED = "true"

if (-not $env:PASEO_CORS_ORIGINS) {
    $env:PASEO_CORS_ORIGINS = "http://localhost:$MetroPort,http://127.0.0.1:$MetroPort,http://$($env:PASEO_DEV_HOST):$MetroPort"
}

Write-Host @"
======================================================
  Paseo Dev (Windows)
======================================================
  Home:    $($env:PASEO_HOME)
  Models:  $($env:PASEO_LOCAL_MODELS_DIR)
  Web:     http://$($env:PASEO_DEV_HOST):$MetroPort
  Daemon:  $($env:EXPO_PUBLIC_LOCAL_DAEMON)
  Auth:    password enabled
======================================================
"@

# Configure the app to auto-connect to the LAN-reachable development daemon.
$env:APP_VARIANT = "development"
$env:EXPO_PUBLIC_PASEO_DEV_BUILD_LABEL = (git branch --show-current).Trim()
$env:EXPO_PORT = $MetroPort
$env:BROWSER = "none"

# Run both with concurrently
concurrently `
    --names "daemon,metro" `
    --prefix-colors "cyan,magenta" `
    "npm run dev:server:watch" `
    "cd packages/app && npx expo start"
