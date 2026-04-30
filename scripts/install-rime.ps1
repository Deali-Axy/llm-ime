param(
  [string]$TargetDir = "$env:APPDATA\Rime",
  [switch]$NoBackup
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path $PSScriptRoot -Parent
$sourceDir = Join-Path $repoRoot "rime"

if (-not (Test-Path $sourceDir)) {
  throw "未找到 RIME 配置目录: $sourceDir"
}

if (-not (Test-Path $TargetDir)) {
  New-Item -ItemType Directory -Path $TargetDir | Out-Null
}

if (-not $NoBackup) {
  $backupRoot = Join-Path (Split-Path $TargetDir -Parent) "Rime-backups"
  $backupDir = Join-Path $backupRoot (Get-Date -Format "yyyyMMdd-HHmmss")
  New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
  if (Get-ChildItem -Path $TargetDir -Force -ErrorAction SilentlyContinue) {
    Copy-Item -Path (Join-Path $TargetDir "*") -Destination $backupDir -Recurse -Force
    Write-Host "已备份当前 RIME 配置到: $backupDir"
  } else {
    Write-Host "目标 RIME 目录为空，跳过备份"
  }
}

Copy-Item -Path (Join-Path $sourceDir "*") -Destination $TargetDir -Recurse -Force

Write-Host "已安装 llm-ime 的 RIME 配置到: $TargetDir"
Write-Host "请重新部署小狼毫（重新部署 / 重新启动）后使用。"
