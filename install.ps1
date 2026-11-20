# Installs the OpenCode CEP panel into the current user's Premiere Pro.
$ErrorActionPreference = "Stop"

$source = Split-Path -Parent $MyInvocation.MyCommand.Path
$extensions = Join-Path $env:APPDATA "Adobe\CEP\extensions"
$target = Join-Path $extensions "com.opencode.panel"

Write-Host "Installing OpenCode panel"
Write-Host "  source : $source"
Write-Host "  target : $target"

# 1. Allow unsigned extensions (sideloaded panels) in every CEP runtime we may meet.
foreach ($v in 11..15) {
  $key = "HKCU:\Software\Adobe\CSXS.$v"
  if (-not (Test-Path $key)) { New-Item -Path $key -Force | Out-Null }
  New-ItemProperty -Path $key -Name "PlayerDebugMode" -Value "1" -PropertyType String -Force | Out-Null
}
Write-Host "  CEP PlayerDebugMode enabled (CSXS.11 - CSXS.15)"

# 2. Create the extensions folder and link the panel in.
if (-not (Test-Path $extensions)) { New-Item -ItemType Directory -Path $extensions -Force | Out-Null }

$sourceFull = [IO.Path]::GetFullPath($source).TrimEnd("\")
$targetFull = [IO.Path]::GetFullPath($target).TrimEnd("\")

if ($sourceFull -eq $targetFull) {
  Write-Host "  panel already lives in the CEP extensions folder; no link needed"
} else {
  if (Test-Path $target) {
    $item = Get-Item $target -Force
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
      $item.Delete()
    } else {
      throw "$target already exists and is not a link. Move it away first."
    }
  }
  New-Item -ItemType Junction -Path $target -Target $source | Out-Null
  Write-Host "  linked panel into CEP extensions"
}

# 3. Sanity checks.
try {
  [xml](Get-Content (Join-Path $source "CSXS\manifest.xml") -Raw) | Out-Null
  Write-Host "  manifest.xml is valid XML"
} catch {
  throw "manifest.xml is not valid XML: $($_.Exception.Message)"
}

Write-Host ""
Write-Host "Done. Restart Premiere Pro, then open Window > Extensions > OpenCode."
