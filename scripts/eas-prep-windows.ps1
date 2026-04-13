# Quita Solo lectura que OneDrive suele poner en carpetas.
# Si no, el tar del upload conserva permisos y en Linux EAS no puede crear src/config (Permission denied).
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root
Get-ChildItem -Directory | Where-Object { $_.Name -notin @('node_modules', '.git') } | ForEach-Object {
  cmd /c "attrib -R `"$($_.FullName)`" /S /D"
}
Get-ChildItem -File | ForEach-Object { $_.IsReadOnly = $false }
Write-Host "Read-only cleared under: $root"
