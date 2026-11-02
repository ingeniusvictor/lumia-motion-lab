# Colocar recursos 3D del kit R8 original SOLO en el equipo local.
param([Parameter(Mandatory=$true)][string]$KitR8)
$ErrorActionPreference='Stop'
$src=(Resolve-Path -LiteralPath $KitR8).Path
$dst=$PSScriptRoot
$vrm=Join-Path $src 'LUMIA_VITA_NATURAL_V05.vrm'
$clips=Join-Path $src 'clips'
if(-not (Test-Path -LiteralPath $vrm -PathType Leaf)){throw "No existe VRM en: $vrm"}
if(-not (Test-Path -LiteralPath $clips -PathType Container)){throw "No existe carpeta clips en: $clips"}
Copy-Item -LiteralPath $vrm -Destination $dst -Force
Copy-Item -LiteralPath $clips -Destination (Join-Path $dst 'clips') -Recurse -Force
Write-Host 'Recursos locales copiados. .gitignore los excluye de GitHub.' -ForegroundColor Green
Write-Host 'Verifica con: git status --short; no debe mostrar VRM o FBX.'
