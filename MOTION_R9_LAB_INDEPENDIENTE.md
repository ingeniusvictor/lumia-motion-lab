# Motion R9: laboratorio independiente (14-11-2026)

Este repositorio **lumia-motion-lab** es el lugar donde continuar R8 → R9.

## Lo que sí es

- Base visual auténtica: `feat/motion-r8-source-20261101`, con el visor `index.html`, `viewer.js`, el VRM y 17 FBX originales instalados localmente.
- Servidor estático Python `INICIAR_LUMIA_SERVIDOR.py`; no ejecuta Node, el bridge, Ollama ni asistentes de visión.
- Controles R8 de expresión facial, gestos semánticos R7, FBX, caminata, visemas y demostración conversacional local sin IA.
- El script `PREPARAR_LUMIA_MOTION_R9_LAB.ps1` es **solo preparador y lanzador aislado**. No afirma que las nuevas modificaciones del director R9 ya estén portadas aquí.

## Lo que no se toca

- `ingeniusvictor/orbi-jarvis-agent-lab`: código de la LUMIA de uso diario y evolución de visión.
- `LUMIA-ASUS`: solo fuente de lectura de los assets privados.
- Ningún modelo de IA, TTS, STT, credencial, otro servicio, puerto existente, ni rama `main`.
- Nada de FBX/VRM privado en GitHub público.

## Preparar una copia nueva en el ASUS

~~~powershell
$lab = Join-Path $env:USERPROFILE 'LUMIA-MOTION-R9-LAB'
if (Test-Path -LiteralPath $lab) {
  throw 'LUMIA-MOTION-R9-LAB ya existe. No sobrescribir.'
}
git clone --single-branch --branch feat/motion-r9-independent-lab-20261114 https://github.com/ingeniusvictor/lumia-motion-lab.git $lab
if ($LASTEXITCODE -ne 0) { throw 'Falló la clonación.' }
Set-Location $lab
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\PREPARAR_LUMIA_MOTION_R9_LAB.ps1 -Mode Prepare
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\PREPARAR_LUMIA_MOTION_R9_LAB.ps1 -Mode Launch
~~~

El visor abre `http://127.0.0.1:5190/` cuando el 5190 está libre; si está ocupado, usa el siguiente puerto libre hasta el 5200. El navegador recibe la URL exacta. No se usa 5173, 5183 ni 8787 por defecto.

## Próxima integración: R9 visual sobre R8, no sobre LUMIA principal

1. Medir y comparar los gestos semánticos R7 existentes antes de sustituirlos o duplicarlos.
2. Adaptar **solo el contrato/planificador y el mezclador seguros** del prototipo R9 a la API existente del visor R8. Nunca traer `src/App.tsx`, React, servidor Node, Ollama ni el bridge.
3. Activación/desactivación en la UI del visor para comparar R8 y R9, con control de intensidad y observabilidad sin texto sensible.
4. QA VRM + 17 FBX reales en ASUS, sin deformaciones, verificando prioridades manuales e interrupción de voz.
5. Integrar al portal principal solo cuando el propietario apruebe explícitamente ese paso. Hasta entonces, trabajo autónomo de Motion.

El prototipo anterior en `orbi-jarvis-agent-lab`, PR #84, queda como **referencia congelada**, no como destino de desarrollo ni paquete para instalar sobre la versión diaria.
