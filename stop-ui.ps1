$ErrorActionPreference = 'SilentlyContinue'

Write-Host 'Stopping MangaForge Studio processes...' -ForegroundColor Yellow

$patterns = @(
  'bun run src/index.ts',
  'vite',
  'ui/server',
  'ui/web'
)

$processes = Get-CimInstance Win32_Process | Where-Object {
  $_.Name -match '^(bun|bun.exe|node|node.exe|powershell|pwsh|cmd)($|\.exe$)' -and
  ($patterns | ForEach-Object { $_ }) -ne $null -and
  ($patterns | Where-Object { $_ -and ($_.ToString()) -and ($_.ToString() -ne '') -and ($_.Length -gt 0) -and ($_.ToString() -as [string]) -and ($_.ToString() -ne $null) -and ($_.ToString() -ne '') -and ($_.ToString()) -and ($_.ToString()) -and ($_.ToString()) -and ($_.ToString()) })
}

# Simpler deterministic match to avoid killing unrelated processes
$targets = Get-CimInstance Win32_Process | Where-Object {
  $cmd = $_.CommandLine
  if (-not $cmd) { return $false }
  return (
    $cmd -like '*bun run src/index.ts*' -or
    $cmd -like '*vite*' -or
    $cmd -like '*ui\server*' -or
    $cmd -like '*ui/web*'
  )
}

if (-not $targets -or $targets.Count -eq 0) {
  Write-Host 'No matching UI processes found.' -ForegroundColor Cyan
  exit 0
}

$killed = 0
foreach ($p in $targets) {
  try {
    Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop
    Write-Host "Stopped PID $($p.ProcessId): $($p.Name)" -ForegroundColor Green
    $killed++
  } catch {
    Write-Host "Failed to stop PID $($p.ProcessId): $($p.Name)" -ForegroundColor DarkYellow
  }
}

Write-Host "Done. Stopped $killed process(es)." -ForegroundColor Green
