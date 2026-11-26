$ErrorActionPreference = 'Stop'
$source = Join-Path $PSScriptRoot 'noma-roguelite'
$dataRoot = Join-Path $env:LOCALAPPDATA 'FoundryVTT/Data'
$systemTarget = Join-Path $dataRoot 'systems/noma-roguelite'
if (-not (Test-Path -LiteralPath $dataRoot)) { throw 'No se encuentra el directorio de datos de Foundry.' }
New-Item -ItemType Directory -Path $systemTarget -Force | Out-Null
Copy-Item -Path (Join-Path $source '*') -Destination $systemTarget -Recurse -Force
$worldTarget = Join-Path $dataRoot 'worlds/noma-roguelite-lab'
if (-not (Test-Path -LiteralPath $worldTarget)) {
  New-Item -ItemType Directory -Path $worldTarget | Out-Null
  @{
    id='noma-roguelite-lab'; title='NOMA · Roguelite'; system='noma-roguelite'; coreVersion='14.361';
    systemVersion='0.1.0'; compatibility=@{minimum='14';verified='14.361'};
    description='<p>El laboratorio jugable de NOMA. Abre el mundo y selecciona un personaje para comenzar.</p>';
    background='systems/noma-roguelite/assets/arena.svg'
  } | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $worldTarget 'world.json') -Encoding utf8
}
Write-Output "Sistema instalado en $systemTarget. El mundo Prueba permanece separado."
