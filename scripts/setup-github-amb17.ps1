param(
  [string]$RepoName = "trend-hijacker",
  [ValidateSet("public", "private")]
  [string]$Visibility = "public",
  [string]$GithubOwner = "AMB-17",
  [string]$CronApiUrl = "",
  [string]$CronSecret = ""
)

$ErrorActionPreference = "Stop"

function Write-Step($message) {
  Write-Host "[setup] $message" -ForegroundColor Cyan
}

function Ensure-Command($path, $name) {
  if (-not (Test-Path $path)) {
    throw "$name not found at $path"
  }
}

function Invoke-Checked {
  param(
    [string]$File,
    [string[]]$ArgList,
    [string]$ErrorMessage
  )

  & $File @ArgList
  if ($LASTEXITCODE -ne 0) {
    throw $ErrorMessage
  }
}

function New-SecureToken {
  param([int]$Length = 48)

  $bytes = New-Object byte[] $Length
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  $rng.GetBytes($bytes)
  return [Convert]::ToBase64String($bytes)
}

$workspaceRoot = Split-Path -Parent $PSScriptRoot
Set-Location $workspaceRoot

$ghPath = "C:\Program Files\GitHub CLI\gh.exe"
Ensure-Command -path $ghPath -name "GitHub CLI"

Write-Step "Checking git repository"
git rev-parse --is-inside-work-tree *> $null
$insideRepo = ($LASTEXITCODE -eq 0)

if (-not $insideRepo) {
  Write-Step "Initializing git repository"
  Invoke-Checked -File "git" -ArgList @("init") -ErrorMessage "Failed to initialize git repository"
}

Write-Step "Switching branch to main"
Invoke-Checked -File "git" -ArgList @("checkout", "-B", "main") -ErrorMessage "Failed to switch to main branch"

$gitUserNameRaw = git config --get user.name
$gitUserName = "$gitUserNameRaw".Trim()
if ([string]::IsNullOrWhiteSpace($gitUserName)) {
  $autoUserName = if (-not [string]::IsNullOrWhiteSpace($env:GITHUB_USER)) { $env:GITHUB_USER } else { $env:USERNAME }
  $gitUserName = "$autoUserName".Trim()
  if ([string]::IsNullOrWhiteSpace($gitUserName)) {
    $gitUserName = "AMB-17"
  }
  Write-Step "Setting local git user.name to '$gitUserName'"
  Invoke-Checked -File "git" -ArgList @("config", "user.name", $gitUserName) -ErrorMessage "Failed to set git user.name"
}

$gitUserEmailRaw = git config --get user.email
$gitUserEmail = "$gitUserEmailRaw".Trim()
if ([string]::IsNullOrWhiteSpace($gitUserEmail)) {
  $gitUserEmail = "$gitUserName@users.noreply.github.com"
  Write-Step "Setting local git user.email to '$gitUserEmail'"
  Invoke-Checked -File "git" -ArgList @("config", "user.email", $gitUserEmail) -ErrorMessage "Failed to set git user.email"
}

Write-Step "Ensuring GitHub authentication"
$null = & $ghPath auth status
$authOk = ($LASTEXITCODE -eq 0)

if (-not $authOk) {
  Write-Step "Starting GitHub web login"
  Invoke-Checked -File $ghPath -ArgList @("auth", "login", "--hostname", "github.com", "--web", "--git-protocol", "https") -ErrorMessage "GitHub authentication failed"

  $null = & $ghPath auth status
  if ($LASTEXITCODE -ne 0) {
    throw "GitHub authentication is still not active. Run gh auth login and retry."
  }
}

Write-Step "Staging project files"
Invoke-Checked -File "git" -ArgList @("add", "-A") -ErrorMessage "Failed to stage files"

git rev-parse --verify HEAD *> $null
$hasCommit = ($LASTEXITCODE -eq 0)

if (-not $hasCommit) {
  Write-Step "Creating initial commit"
  Invoke-Checked -File "git" -ArgList @("commit", "-m", "chore: prepare free-tier deployment automation") -ErrorMessage "Initial commit failed"
} else {
  $pending = git status --porcelain
  if (-not [string]::IsNullOrWhiteSpace($pending)) {
    Write-Step "Creating commit for pending changes"
    Invoke-Checked -File "git" -ArgList @("commit", "-m", "chore: update deployment automation") -ErrorMessage "Commit failed"
  }
}

$repoFull = "$GithubOwner/$RepoName"

Write-Step "Creating or reusing GitHub repo $repoFull"
$repoExists = $false
try {
  & $ghPath repo view $repoFull --json name *> $null
  $repoExists = ($LASTEXITCODE -eq 0)
} catch {
  $repoExists = $false
}

if (-not $repoExists) {
  Invoke-Checked -File $ghPath -ArgList @("repo", "create", $repoFull, "--$Visibility", "--source", ".", "--remote", "origin", "--push") -ErrorMessage "Failed to create and push GitHub repository"
} else {
  git remote get-url origin *> $null
  $hasOrigin = ($LASTEXITCODE -eq 0)

  if (-not $hasOrigin) {
    Invoke-Checked -File "git" -ArgList @("remote", "add", "origin", "https://github.com/$repoFull.git") -ErrorMessage "Failed to add git origin"
  }

  Invoke-Checked -File "git" -ArgList @("push", "-u", "origin", "main") -ErrorMessage "Failed to push main branch"
}

if ([string]::IsNullOrWhiteSpace($CronApiUrl) -or $CronApiUrl -like "*your-deploy-url*") {
  if (-not [string]::IsNullOrWhiteSpace($env:DEPLOY_URL)) {
    $CronApiUrl = $env:DEPLOY_URL.Trim()
    Write-Step "Using DEPLOY_URL from environment for CRON_API_URL"
  } else {
    $CronApiUrl = "https://$RepoName.vercel.app"
    Write-Step "CRON_API_URL not provided; defaulting to '$CronApiUrl'"
  }
}

$CronApiUrl = $CronApiUrl.Trim().TrimEnd('/')

if ([string]::IsNullOrWhiteSpace($CronSecret) -or $CronSecret -like "*your-long-secret*") {
  $CronSecret = New-SecureToken
  Write-Step "CRON_SECRET not provided; generated a secure secret automatically"
}

if (-not [string]::IsNullOrWhiteSpace($CronApiUrl)) {
  Write-Step "Setting GitHub Actions secret CRON_API_URL"
  Invoke-Checked -File $ghPath -ArgList @("secret", "set", "CRON_API_URL", "--repo", $repoFull, "--body", $CronApiUrl) -ErrorMessage "Failed to set CRON_API_URL secret"
}

if (-not [string]::IsNullOrWhiteSpace($CronSecret)) {
  Write-Step "Setting GitHub Actions secret CRON_SECRET"
  Invoke-Checked -File $ghPath -ArgList @("secret", "set", "CRON_SECRET", "--repo", $repoFull, "--body", $CronSecret) -ErrorMessage "Failed to set CRON_SECRET secret"
}

Write-Step "Setup completed for https://github.com/$repoFull"
