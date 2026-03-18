$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
if (Test-Path .expo) { Remove-Item -Recurse -Force .expo }
if (Test-Path node_modules\.cache) { Remove-Item -Recurse -Force node_modules\.cache }
npx expo start --web --clear
