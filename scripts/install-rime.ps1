# Keep this file saved as UTF-8 with BOM for Windows PowerShell 5.1 compatibility.
param(
  [string]$TargetDir = "$env:APPDATA\Rime",
  [switch]$NoBackup
)

$ErrorActionPreference = "Stop"

# Clears existing Rime files so the new config replaces the old one completely.
function Clear-DirectoryContents {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  $items = Get-ChildItem -LiteralPath $Path -Force -ErrorAction SilentlyContinue
  if ($items) {
    $items | Remove-Item -Recurse -Force
  }
}

$repoRoot = Split-Path $PSScriptRoot -Parent
$sourceDir = Join-Path $repoRoot "rime"

if (-not (Test-Path $sourceDir)) {
  throw "未找到 RIME 配置目录: $sourceDir"
}

if (-not (Test-Path $TargetDir)) {
  New-Item -ItemType Directory -Path $TargetDir | Out-Null
}

$targetItems = Get-ChildItem -LiteralPath $TargetDir -Force -ErrorAction SilentlyContinue

if (-not $NoBackup) {
  $backupRoot = Join-Path (Split-Path $TargetDir -Parent) "Rime-backups"
  $backupDir = Join-Path $backupRoot (Get-Date -Format "yyyyMMdd-HHmmss")
  New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
  if ($targetItems) {
    Copy-Item -Path (Join-Path $TargetDir "*") -Destination $backupDir -Recurse -Force
    Write-Host "已备份当前 RIME 配置到: $backupDir"
  } else {
    Write-Host "目标 RIME 目录为空，跳过备份"
  }
}

# 清空目标目录，确保新配置替换旧配置
Clear-DirectoryContents -Path $TargetDir
Copy-Item -Path (Join-Path $sourceDir "*") -Destination $TargetDir -Recurse -Force

Write-Host "已安装 llm-ime 的 RIME 配置到: $TargetDir"
Write-Host "请重新部署小狼毫（重新部署 / 重新启动）后使用。"
