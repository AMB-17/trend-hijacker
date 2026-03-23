# GitHub Setup for AMB-17

This project now includes a one-run setup script.

## Prerequisites

- Git installed
- GitHub CLI installed at `C:\Program Files\GitHub CLI\gh.exe`
- You can authenticate to GitHub in browser

## One Command

Run from workspace root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-github-amb17.ps1 -RepoName trend-hijacker -Visibility public -GithubOwner AMB-17 -CronApiUrl "https://your-deploy-url" -CronSecret "your-long-secret"
```

## What the script does

1. Initializes git repo if missing.
2. Creates/switches to `main` branch.
3. Opens `gh auth login --web` if not logged in.
4. Commits local files.
5. Creates or reuses `AMB-17/<RepoName>`.
6. Pushes code to `origin/main`.
7. Sets Actions secrets:
- `CRON_API_URL`
- `CRON_SECRET`

## If commit fails

Set git identity once and rerun:

```powershell
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```
