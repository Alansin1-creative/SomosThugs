$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
if (-not (Test-Path server)) { exit 1 }
Set-Location server
node index.js
