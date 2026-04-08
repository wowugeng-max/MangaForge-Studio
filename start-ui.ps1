$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverDir = Join-Path $repoRoot 'ui/server'
$webDir = Join-Path $repoRoot 'ui/web'

Write-Host 'Starting MangaForge Studio (Server + Web)...' -ForegroundColor Green

Start-Process powershell -ArgumentList @(
  '-NoExit',
  '-Command',
  "Set-Location '$serverDir'; bun install; bun run dev"
)

Start-Process powershell -ArgumentList @(
  '-NoExit',
  '-Command',
  "Set-Location '$webDir'; bun install; bun run dev"
)

Write-Host 'Launched two terminals:' -ForegroundColor Cyan
Write-Host "- Server: $serverDir"
Write-Host "- Web:    $webDir"
Write-Host 'Open the Vite URL shown in the web terminal.' -ForegroundColor Yellow
