# Removes the OpenCode CEP panel from the current user's Premiere Pro.
$ErrorActionPreference = "Stop"

$target = Join-Path $env:APPDATA "Adobe\CEP\extensions\com.opencode.panel"

if (-not (Test-Path $target)) {
  Write-Host "OpenCode panel is not installed at $target"
  exit 0
}

$item = Get-Item $target -Force
if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
  $item.Delete()
  Write-Host "Removed panel link: $target"
} else {
  throw "$target is a real folder, not a junction. Move or delete it manually."
}

Write-Host ""
Write-Host "Restart Premiere Pro. Panel preferences in localStorage are kept;"
Write-Host "clear them from Settings > Clear panel prefs if needed."
