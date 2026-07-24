<#
.SYNOPSIS
  The ONLY sanctioned way to commit in this repo. Binding on all seven agents.

.DESCRIPTION
  Seven agents share ONE working tree and ONE .git directory. `.git/index` is a
  single global file, so scoped `git add` is NOT sufficient on its own:

      Agent A: git add packages/artifacts        <- stages A's files
      Agent B: git commit -m "..."               <- commits A's files under B
      Agent A: git commit -m "..."               <- index now empty, A loses it

  That is a real race and it already happened to Rigel. This script serializes
  add+commit+push behind one atomic mutex so it cannot happen again.

  The lock is an atomic directory create (NTFS guarantees CreateNew semantics),
  held across the whole add/commit/push and released in a finally block.

  If the lock is held, this script does NO git work and exits 2. That is the
  correct outcome: keep coding and retry at your next checkpoint. Do not wait,
  do not force, do not work around it.

  NEVER pull, rebase, stash, or reset. See docs/agent-briefs/_GIT-PROTOCOL.md.

.EXAMPLE
  pwsh scripts/agent-commit.ps1 -Agent Rigel `
    -Paths packages/artifacts,packages/capability-fixtures,docs/changelog/tracks/E.md `
    -MessageFile .git/msg-rigel.txt

.EXAMPLE
  pwsh scripts/agent-commit.ps1 -Agent Cael -Paths packages/agent-runtime -Message "feat(track-a): ..."
#>
param(
  [Parameter(Mandatory = $true)][string[]]$Paths,
  [string]$MessageFile,
  [string]$Message,
  [Parameter(Mandatory = $true)][string]$Agent,
  [switch]$NoPush
)

$ErrorActionPreference = 'Stop'

# Normalise -Paths. Invoked as `powershell -File ... -Paths a,b,c` the whole
# thing arrives as ONE string rather than an array, so split on commas
# ourselves. This makes the script behave identically whether it is dot-sourced,
# called from pwsh, or run via -File, which is how most agents will call it.
$Paths = $Paths |
  ForEach-Object { $_ -split ',' } |
  ForEach-Object { $_.Trim().Trim('"').Trim("'") } |
  Where-Object { $_ }

if (-not $Paths -or $Paths.Count -eq 0) {
  Write-Output "FAIL: -Paths resolved to nothing."
  exit 1
}

if (-not $MessageFile -and -not $Message) {
  Write-Output "FAIL: supply -MessageFile or -Message."
  exit 1
}

$repo = (& git rev-parse --show-toplevel).Trim()
if (-not $repo) { Write-Output "FAIL: not inside a git repository."; exit 1 }

$lockDir  = Join-Path $repo '.git/agent-commit.lock'
$acquired = $false

# ---- acquire: atomic directory create, single attempt, no waiting -----------
try {
  New-Item -ItemType Directory -Path $lockDir -ErrorAction Stop | Out-Null
  $acquired = $true
}
catch {
  # Stale-lock reclaim: a crashed agent must not wedge the repo forever.
  $stale = $false
  if (Test-Path $lockDir) {
    $ageMin = ((Get-Date) - (Get-Item $lockDir).CreationTime).TotalMinutes
    if ($ageMin -gt 5) {
      $holder = if (Test-Path (Join-Path $lockDir 'owner')) { Get-Content (Join-Path $lockDir 'owner') -Raw } else { 'unknown' }
      Write-Output "STALE LOCK ($([math]::Round($ageMin,1)) min, holder: $($holder.Trim())) - reclaiming."
      Remove-Item $lockDir -Recurse -Force
      try { New-Item -ItemType Directory -Path $lockDir -ErrorAction Stop | Out-Null; $acquired = $true; $stale = $true } catch { }
    }
  }
  if (-not $acquired) {
    $holder = if (Test-Path (Join-Path $lockDir 'owner')) { (Get-Content (Join-Path $lockDir 'owner') -Raw).Trim() } else { 'another agent' }
    Write-Output "LOCK BUSY (held by $holder). NO git performed - this is expected."
    Write-Output "Keep coding. Retry at your next checkpoint. Do NOT run git manually."
    exit 2
  }
}

try {
  Set-Content -Path (Join-Path $lockDir 'owner') -Value $Agent -Encoding ascii

  # ---- stage only the caller's paths --------------------------------------
  & git add -- $Paths
  if ($LASTEXITCODE -ne 0) { Write-Output "FAIL: git add failed."; exit 1 }

  $staged = @(& git diff --cached --name-only)
  if ($staged.Count -eq 0) {
    Write-Output "Nothing staged for $Agent - no commit made."
    exit 0
  }

  # ---- contamination guard: every staged file must sit under a given path --
  $norm = $Paths | ForEach-Object { $_.Replace('\','/').TrimEnd('/') }
  $foreign = $staged | Where-Object {
    $f = $_.Replace('\','/')
    -not ($norm | Where-Object { $f -eq $_ -or $f.StartsWith("$_/") })
  }
  if ($foreign.Count -gt 0) {
    Write-Output "ABORT: $($foreign.Count) staged file(s) fall OUTSIDE your declared scope:"
    $foreign | Select-Object -First 20 | ForEach-Object { Write-Output "    $_" }
    Write-Output "Another agent's work is in the index. Resetting it and making NO commit."
    & git reset -q -- $foreign
    Write-Output "Re-run with corrected -Paths, or report to Node."
    exit 1
  }

  # ---- commit --------------------------------------------------------------
  if ($MessageFile) { & git commit -q -F $MessageFile } else { & git commit -q -m $Message }
  if ($LASTEXITCODE -ne 0) { Write-Output "FAIL: git commit failed."; exit 1 }
  $sha = (& git rev-parse --short HEAD).Trim()
  Write-Output "COMMITTED $sha  ($($staged.Count) file(s), agent: $Agent)"

  # ---- push: NEVER pull, rebase, or stash ---------------------------------
  if (-not $NoPush) {
    # NOTE: do NOT use `2>&1` here. Windows PowerShell 5.1 wraps a native exe's
    # stderr in NativeCommandError and flips $? to false even on exit code 0 —
    # and `git push` writes its normal progress to stderr. Let it write through
    # and trust $LASTEXITCODE, which is the only reliable signal.
    $ErrorActionPreference = 'Continue'
    & git push origin main
    $pushCode = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
    if ($pushCode -ne 0) {
      Write-Output "PUSH REJECTED (exit $pushCode). Do NOT pull, rebase, or force."
      Write-Output "Your commit is safe locally at $sha. STOP git work and report to Node for a central sync gate."
      exit 3
    }
    Write-Output "PUSHED $sha -> origin/main"
  }
}
finally {
  if ($acquired -and (Test-Path $lockDir)) { Remove-Item $lockDir -Recurse -Force }
}
