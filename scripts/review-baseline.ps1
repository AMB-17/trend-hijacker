$ErrorActionPreference = 'Continue'

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$outDir = Join-Path $root ("docs\review\evidence\baseline-" + $timestamp)
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function Write-Section($title) {
  "`n=== $title ===`n" | Tee-Object -FilePath (Join-Path $outDir 'summary.txt') -Append | Out-Null
}

function Run-And-Capture($name, $command) {
  Write-Host "Running: $name"
  $file = Join-Path $outDir ($name + '.txt')
  "Command: $command`n" | Out-File -FilePath $file -Encoding utf8
  $global:LASTEXITCODE = 0
  try {
    Invoke-Expression $command 2>&1 | Tee-Object -FilePath $file -Append | Out-Null
    if ($LASTEXITCODE -eq 0) {
      "Status: Completed" | Out-File -FilePath $file -Append -Encoding utf8
      "- ${name}: Completed" | Tee-Object -FilePath (Join-Path $outDir 'summary.txt') -Append | Out-Null
    }
    else {
      "Status: Failed" | Out-File -FilePath $file -Append -Encoding utf8
      "Error: Exit code $LASTEXITCODE" | Out-File -FilePath $file -Append -Encoding utf8
      "- ${name}: Failed (exit code $LASTEXITCODE)" | Tee-Object -FilePath (Join-Path $outDir 'summary.txt') -Append | Out-Null
    }
  }
  catch {
    "Status: Failed" | Out-File -FilePath $file -Append -Encoding utf8
    "Error: $($_.Exception.Message)" | Out-File -FilePath $file -Append -Encoding utf8
    "- ${name}: Failed" | Tee-Object -FilePath (Join-Path $outDir 'summary.txt') -Append | Out-Null
  }
}

Write-Section 'Environment'
Run-And-Capture 'node-version' 'node -v'
Run-And-Capture 'pnpm-version' 'pnpm.cmd -v'

Write-Section 'Monorepo Baseline Checks'
Run-And-Capture 'install' 'pnpm.cmd install --frozen-lockfile'
Run-And-Capture 'type-check' 'pnpm.cmd type-check'
Run-And-Capture 'test' 'pnpm.cmd test'
Run-And-Capture 'coverage' 'pnpm.cmd test:coverage'
Run-And-Capture 'build' 'pnpm.cmd build'

Write-Section 'Security Spot Checks'
Run-And-Capture 'audit' 'pnpm.cmd audit --prod'
Run-And-Capture 'secret-search' 'Select-String -Path "apps\api\src\**\*.ts" -Pattern "secret|password|token"'

Write-Section 'Done'
"Evidence folder: $outDir" | Tee-Object -FilePath (Join-Path $outDir 'summary.txt') -Append | Out-Null
Write-Host "Baseline complete. Evidence: $outDir"
