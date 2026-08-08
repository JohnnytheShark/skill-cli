# ==============================================================================
# skill-cli Installer for Windows PowerShell
# Usage: irm https://raw.githubusercontent.com/JohnnytheShark/skill-cli/main/install.ps1 | iex
# ==============================================================================

$ErrorActionPreference = "Stop"

$Repo = "JohnnytheShark/skill-cli"
$GitHubApi = "https://api.github.com/repos/$Repo/releases/latest"

Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "  skill-cli Installer (Windows PowerShell)" -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Cyan

# 1. Architecture Check
$Arch = $env:PROCESSOR_ARCHITECTURE
if ($Arch -ne "AMD64" -and $Arch -ne "ARM64") {
    Write-Warning "Unsupported processor architecture: $Arch. Defaulting to x86_64."
}
$Target = "x86_64-pc-windows-msvc"

# 2. Get Latest Tag
Write-Host "[+] Querying GitHub for latest release..." -ForegroundColor Green
$Tag = "v0.1.0"
try {
    $ReleaseInfo = Invoke-RestMethod -Uri $GitHubApi -Headers @{ "User-Agent" = "skill-cli-installer" }
    if ($ReleaseInfo.tag_name) {
        $Tag = $ReleaseInfo.tag_name
    }
} catch {
    Write-Warning "Could not fetch release tag from GitHub API, fallback to $Tag"
}

$ArchiveName = "skill-cli-$Tag-$Target"
$DownloadUrl = "https://github.com/$Repo/releases/download/$Tag/$ArchiveName.zip"
$InstallDir = Join-Path $HOME ".skill-cli\bin"
$TempZip = Join-Path $env:TEMP "$ArchiveName.zip"
$TempExtract = Join-Path $env:TEMP $ArchiveName

Write-Host "[+] Downloading $ArchiveName.zip ($Tag)..." -ForegroundColor Green
Invoke-WebRequest -Uri $DownloadUrl -OutFile $TempZip -UseBasicParsing

Write-Host "[+] Extracting archive..." -ForegroundColor Green
if (Test-Path $TempExtract) {
    Remove-Item -Recurse -Force $TempExtract
}
Expand-Archive -Path $TempZip -DestinationPath $env:TEMP -Force

if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
}

$ExtractedBinary = Join-Path $TempExtract "skill-cli.exe"
if (-not (Test-Path $ExtractedBinary)) {
    $ExtractedBinary = Join-Path (Join-Path $env:TEMP $ArchiveName) "skill-cli.exe"
}

Copy-Item -Path $ExtractedBinary -Destination (Join-Path $InstallDir "skill-cli.exe") -Force

# Clean up
Remove-Item -Force $TempZip -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force $TempExtract -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "  ✓ Successfully installed skill-cli to: $InstallDir\skill-cli.exe" -ForegroundColor Green
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host ""

# 3. Check and Update User PATH
$UserPath = [Environment]::GetEnvironmentVariable("Path", [EnvironmentVariableTarget]::User)
if ($UserPath -notlike "*$InstallDir*") {
    Write-Host "[+] Adding $InstallDir to your User PATH..." -ForegroundColor Yellow
    [Environment]::SetEnvironmentVariable("Path", "$UserPath;$InstallDir", [EnvironmentVariableTarget]::User)
    $env:Path = "$env:Path;$InstallDir"
    Write-Host "[+] PATH updated. Please restart your terminal if needed." -ForegroundColor Green
}

Write-Host "Run 'skill-cli --help' or 'skill-cli serve' to get started!" -ForegroundColor Cyan
