# check-claude-map.ps1
# Claude Code 2.1.88 sourcemap 检查脚本（语法完全修复版）

$mapFile = "I:\AI\MyProject\claude-code-sourcemap\package\cli.js.map"
$srcDir  = "I:\AI\MyProject\claude-code-sourcemap\restored-src"

Write-Host "=== cli.js.map 文件信息 ===" -ForegroundColor Green

if (Test-Path $mapFile) {
    $file = Get-Item $mapFile
    Write-Host "文件名: $($file.Name)"
    Write-Host "精确大小: $($file.Length) 字节 (约 $([math]::Round($file.Length / 1MB, 2)) MiB)" -ForegroundColor Yellow
    Write-Host "官方参考值 (2.1.88 版本): 59,766,257 字节" -ForegroundColor Cyan
} else {
    Write-Host "错误: 找不到 cli.js.map 文件！" -ForegroundColor Red
}

Write-Host "`n=== map 文件本身行数 ===" -ForegroundColor Green
if (Test-Path $mapFile) {
    $mapLines = (Get-Content $mapFile -Raw -ErrorAction SilentlyContinue | Measure-Object -Line).Lines
    Write-Host "map 文件行数: $mapLines 行 （通常只有几行，因为是压缩的 JSON）"
}

Write-Host "`n=== 提取后源码统计 ===" -ForegroundColor Green
if (Test-Path $srcDir) {
    # 排除 node_modules，避免权限拒绝和无用依赖
    $tsFiles = Get-ChildItem -Path $srcDir -Recurse -Include *.ts,*.tsx,*.js -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notlike "*\node_modules\*" }}

    if ($tsFiles.Count -gt 0) {
        $totalLines = 0
        foreach ($file in $tsFiles) {
            try {
                $content = Get-Content $file.FullName -ErrorAction Stop
                $totalLines += ($content | Measure-Object -Line).Lines
            } catch {
                # 跳过极少数仍有权限问题的文件
            }
        }
        Write-Host "TypeScript/JS 文件总数: $($tsFiles.Count) 个（已排除 node_modules）" -ForegroundColor Yellow
        Write-Host "总代码行数: $totalLines 行 （社区参考核心源码 ≈ 51.2 万行）" -ForegroundColor Yellow
    } else {
        Write-Host "未找到任何 .ts / .tsx / .js 文件（或全部被排除）。" -ForegroundColor Yellow
    }
} else {
    Write-Host "未找到 restored-src 文件夹，请确认已正确从 GitHub 仓库提取源码。" -ForegroundColor Yellow
}

Write-Host "`n检查完成！" -ForegroundColor Green