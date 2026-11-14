# Laboratorio independiente LUMIA Motion R8 -> R9
# Nunca arranca ORBI/JARVIS ni conecta Ollama, Whisper, Kokoro o vision.
# Reutiliza los archivos privados VRM/17 FBX desde la instalacion ASUS.
# No borra, sobrescribe ni publica modelos.
[CmdletBinding()]
param(
    [ValidateSet('Prepare','Launch')]
    [string]$Mode = 'Prepare',
    [string]$Source = (Join-Path $env:USERPROFILE 'LUMIA-ASUS\public\models\lumia-motion'),
    [ValidateRange(1024,65525)]
    [int]$Port = 5190
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$root = $PSScriptRoot
$vrmFile = 'LUMIA_VITA_NATURAL_V05.vrm'
$clips = @(
    'Blow A Kiss.fbx', 'Clapping.fbx', 'Dwarf Idle.fbx', 'Excited.fbx',
    'Happy.fbx', 'Head Gesture.fbx', 'Idle.fbx', 'No.fbx',
    'Pointing Gesture.fbx', 'Pointing.fbx', 'Surprised.fbx', 'Talking.fbx',
    'Thinking.fbx', 'Walk In Circle.fbx', 'Walking adelante.fbx',
    'Walking in place.fbx', 'Waving.fbx'
)
function File-Exists([string]$Path,[string]$Name) {
    if (-not [IO.File]::Exists($Path)) {
        throw ("No se encontro " + $Name + ": " + $Path)
    }
}
function Copy-Private([string]$From,[string]$To,[string]$Name) {
    File-Exists $From $Name
    if ((Get-Item -LiteralPath $From).Length -lt 1024) {
        throw ("Recurso demasiado pequeno: " + $Name)
    }
    if ([IO.File]::Exists($To)) {
        $a = (Get-FileHash -LiteralPath $From -Algorithm SHA256).Hash
        $b = (Get-FileHash -LiteralPath $To -Algorithm SHA256).Hash
        if ($a -ne $b) {
            throw ("El archivo existente difiere del origen; no se sobrescribe: " + $Name)
        }
        Write-Host ("Verificado sin sobrescribir: " + $Name)
        return
    }
    New-Item -ItemType Directory -Path (Split-Path -Parent $To) -Force | Out-Null
    Copy-Item -LiteralPath $From -Destination $To -ErrorAction Stop
    $a = (Get-FileHash -LiteralPath $From -Algorithm SHA256).Hash
    $b = (Get-FileHash -LiteralPath $To -Algorithm SHA256).Hash
    if ($a -ne $b) {
        Remove-Item -LiteralPath $To -Force
        throw ("Copia no coincide con el original: " + $Name)
    }
    Write-Host ("Copiado correctamente: " + $Name) -ForegroundColor Green
}
if ($Mode -eq 'Prepare') {
    if (-not [IO.Directory]::Exists($Source)) {
        throw ("Carpeta de assets no encontrada: " + $Source + ". Proporciona -Source con la carpeta correcta.")
    }
    if ([IO.Path]::GetFullPath($Source).TrimEnd('\') -eq
        [IO.Path]::GetFullPath($root).TrimEnd('\')) {
        throw 'No copiar assets sobre el mismo origen.'
    }
    Copy-Private (Join-Path $Source $vrmFile) (Join-Path $root $vrmFile) $vrmFile
    foreach ($name in $clips) {
        Copy-Private (Join-Path $Source ('clips\' + $name)) (Join-Path $root ('clips\' + $name)) $name
    }
    Write-Host 'Laboratorio Motion preparado: 1 VRM y 17 FBX. No se modifico LUMIA-ASUS.' -ForegroundColor Green
    Write-Host 'Ejecutar ahora con -Mode Launch. La base visual es R8; R9 continua en desarrollo.' -ForegroundColor Cyan
} else {
    File-Exists (Join-Path $root $vrmFile) 'VRM del laboratorio'
    foreach ($name in $clips) {
        File-Exists (Join-Path $root ('clips\' + $name)) $name
    }
    File-Exists (Join-Path $root 'INICIAR_LUMIA_SERVIDOR.py') 'servidor local Motion R8'
    Write-Host ('Iniciando portal Motion AISLADO desde puerto ' + $Port) -ForegroundColor Cyan
    Write-Host 'Este programa no arranca LUMIA, su bridge, Ollama, Whisper ni Kokoro.' -ForegroundColor Green
    $python = Get-Command py -ErrorAction SilentlyContinue
    Push-Location $root
    try {
        if ($python) {
            & py -3 'INICIAR_LUMIA_SERVIDOR.py' --port $Port
        } else {
            $python = Get-Command python -ErrorAction SilentlyContinue
            if (-not $python) { throw 'No se encontro py ni python. Se requiere Python 3 para el servidor independiente.' }
            & python 'INICIAR_LUMIA_SERVIDOR.py' --port $Port
        }
        if ($LASTEXITCODE -ne 0) {
            throw ('El visor independiente termino con codigo ' + $LASTEXITCODE)
        }
    } finally {
        Pop-Location
    }
}
