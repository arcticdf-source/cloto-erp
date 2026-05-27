$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$envFile = Join-Path $scriptDir '.env.local'

if (-not (Test-Path $envFile)) {
    throw "Missing env file: $envFile"
}

Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith('#')) {
        return
    }

    $parts = $line -split '=', 2
    if ($parts.Count -eq 2) {
        [System.Environment]::SetEnvironmentVariable($parts[0], $parts[1], 'Process')
    }
}

Set-Location $projectRoot
node auth-server.js