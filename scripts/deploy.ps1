# One-command Railway deploy for forge-codex (Windows PowerShell).
# Mirrors scripts/deploy.sh.
#
# Usage:
#   pwsh -File scripts/deploy.ps1
#   pwsh -File scripts/deploy.ps1 -SkipVerify -SkipBuild
#   pwsh -File scripts/deploy.ps1 -Services web
#   pwsh -File scripts/deploy.ps1 -BaseUrl https://already-known.up.railway.app
#
# CRITICAL: railway up does NOT assign a public domain.
# This script runs `railway domain` for web AFTER up when needed.

[CmdletBinding()]
param(
  [switch]$SkipVerify,
  [switch]$SkipBuild,
  [string]$Services = "web,worker,foundry",
  [string]$BaseUrl = "",
  [string]$ProjectId = $(if ($env:RAILWAY_PROJECT_ID) { $env:RAILWAY_PROJECT_ID } else { "d43bf9da-63b9-4887-b363-76bd02669240" }),
  [string]$Environment = $(if ($env:RAILWAY_ENVIRONMENT) { $env:RAILWAY_ENVIRONMENT } else { "production" }),
  [int]$WebPort = 3000,
  [int]$WaitTimeoutMs = 300000
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
if (-not $Root) { $Root = (Get-Location).Path }
Set-Location $Root

function Assert-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "missing required command: $Name"
  }
}

Assert-Command railway
Assert-Command node
if (-not $SkipVerify -or -not $SkipBuild) {
  Assert-Command pnpm
}

$serviceList = @($Services.Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ })

Write-Host "==> forge deploy"
Write-Host "    project=$ProjectId env=$Environment services=$($serviceList -join ',')"

if (-not $SkipVerify) {
  Write-Host "==> pnpm verify"
  pnpm verify
  if ($LASTEXITCODE -ne 0) { throw "pnpm verify failed" }
} else {
  Write-Host "==> skip verify"
}

if (-not $SkipBuild) {
  Write-Host "==> pnpm build (local preflight)"
  pnpm build
  if ($LASTEXITCODE -ne 0) { throw "pnpm build failed" }
} else {
  Write-Host "==> skip local build"
}

foreach ($svc in $serviceList) {
  Write-Host "==> railway up --service $svc --detach"
  & railway up --service $svc --detach --project $ProjectId --environment $Environment
  if ($LASTEXITCODE -ne 0) { throw "railway up failed for $svc" }
}

function Get-DomainFromJson([string]$Json) {
  if (-not $Json) { return $null }
  try {
    $data = $Json | ConvertFrom-Json
  } catch {
    return $null
  }
  $arr = @()
  if ($data -is [System.Array]) { $arr = $data }
  elseif ($data.domains) { $arr = @($data.domains) }
  elseif ($data.items) { $arr = @($data.items) }
  foreach ($d in $arr) {
    if ($null -eq $d) { continue }
    if ($d -is [string] -and $d) { return $d }
    if ($d.domain) { return [string]$d.domain }
    if ($d.host) { return [string]$d.host }
  }
  if ($data.domain) { return [string]$data.domain }
  if ($data.host) { return [string]$data.host }
  return $null
}

$resolvedBase = $BaseUrl
if (-not $resolvedBase -and ($serviceList -contains "web")) {
  Write-Host "==> ensure railway domain for web (AFTER up)"
  $listJson = ""
  try {
    $listJson = & railway domain list --service web --project $ProjectId --environment $Environment --json 2>$null | Out-String
  } catch { $listJson = "" }

  $domain = Get-DomainFromJson $listJson
  if (-not $domain) {
    Write-Host "    no domain yet — creating (railway domain --service web --port $WebPort)"
    & railway domain --service web --port $WebPort --project $ProjectId --environment $Environment | Out-Host
    try {
      $listJson = & railway domain list --service web --project $ProjectId --environment $Environment --json 2>$null | Out-String
    } catch { $listJson = "" }
    $domain = Get-DomainFromJson $listJson
  }
  if (-not $domain) {
    try {
      $createJson = & railway domain --service web --port $WebPort --project $ProjectId --environment $Environment --json 2>$null | Out-String
      $domain = Get-DomainFromJson $createJson
    } catch { }
  }
  if (-not $domain) {
    throw "could not resolve web domain; pass -BaseUrl or run: railway domain --service web --port $WebPort"
  }
  $domain = $domain -replace '^https?://', '' -replace '/.*$', ''
  $resolvedBase = "https://$domain"
}

if ($resolvedBase) {
  Write-Host "==> wait-healthy $resolvedBase"
  & node "$Root/scripts/wait-healthy.mjs" $resolvedBase --timeout-ms $WaitTimeoutMs
  if ($LASTEXITCODE -ne 0) { throw "wait-healthy failed" }

  Write-Host "==> smoke $resolvedBase"
  & node "$Root/scripts/smoke.mjs" $resolvedBase
  if ($LASTEXITCODE -ne 0) { throw "smoke failed" }

  Write-Host "==> recent web deployments (record LKG in docs/runbooks/rollback.md)"
  try {
    & railway deployment list --service web --project $ProjectId --environment $Environment --limit 5 --json | Out-Host
  } catch {
    Write-Host "  (deployment list unavailable)"
  }

  Write-Host ""
  Write-Host "DEPLOY OK"
  Write-Host "  url: $resolvedBase"
  Write-Host "  smoke: passed"
} else {
  Write-Host "==> no web service in this deploy; skip domain/smoke"
  Write-Host "DEPLOY OK (partial: $($serviceList -join ','))"
}
