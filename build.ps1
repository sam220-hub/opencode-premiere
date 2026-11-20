<#
.SYNOPSIS
  Builds a distributable zip of the panel in dist/.

.DESCRIPTION
  The zip contains a top-level com.opencode.panel folder, so users can extract
  it straight into %APPDATA%\Adobe\CEP\extensions.
  The version is read from CSXS/manifest.xml. When running in GitHub Actions for
  a v* tag, the tag must match the manifest version.
#>
[CmdletBinding()]
param(
  [string]$OutputDir
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

$manifestPath = Join-Path $root "CSXS\manifest.xml"
if (-not (Test-Path $manifestPath)) { throw "CSXS\manifest.xml not found" }

[xml]$manifest = Get-Content $manifestPath -Raw
$version = $manifest.ExtensionManifest.ExtensionBundleVersion
if (-not $version) { throw "ExtensionBundleVersion is missing from the manifest" }

if ($env:GITHUB_REF_NAME -match '^v(.+)$' -and $Matches[1] -ne $version) {
  throw "Tag $env:GITHUB_REF_NAME does not match manifest version $version"
}

if (-not $OutputDir) { $OutputDir = Join-Path $root "dist" }
$stageRoot = Join-Path $OutputDir "com.opencode.panel"
$zip = Join-Path $OutputDir "OpenCode-Premiere-$version.zip"

if (Test-Path $stageRoot) { Remove-Item $stageRoot -Recurse -Force }
New-Item -ItemType Directory -Path $stageRoot -Force | Out-Null

$files = @(
  "app.js",
  "oc.js",
  "host.jsx",
  "index.html",
  "style.css",
  "README.md",
  "LICENSE",
  "CHANGELOG.md",
  "CONTRIBUTING.md",
  "install.ps1",
  "uninstall.ps1"
)

foreach ($file in $files) {
  $src = Join-Path $root $file
  if (-not (Test-Path $src)) { throw "Missing $file" }
  Copy-Item $src $stageRoot
}
Copy-Item (Join-Path $root "CSXS") (Join-Path $stageRoot "CSXS") -Recurse
Copy-Item (Join-Path $root "docs") (Join-Path $stageRoot "docs") -Recurse

if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path $stageRoot -DestinationPath $zip -CompressionLevel Optimal
$hash = (Get-FileHash $zip -Algorithm SHA256).Hash
"$hash  $(Split-Path -Leaf $zip)" | Set-Content "$zip.sha256" -Encoding ASCII

Remove-Item $stageRoot -Recurse -Force

Write-Host ""
Write-Host "Built  $zip"
Write-Host "SHA256 $hash"
