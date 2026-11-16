# Motion R9: laboratorio independiente (14-11-2026)

Este repositorio **lumia-motion-lab** es el lugar donde continuar R8 → R9.

## Lo que sí es

- Base visual auténtica: `feat/motion-r8-source-20261101`, con el visor `index.html`, `viewer.js`, el VRM y 17 FBX originales instalados localmente.
- Servidor estático Python `INICIAR_LUMIA_SERVIDOR.py`; no ejecuta Node, el bridge, Ollama ni asistentes de visión.
- Controles R8 de expresión facial, gestos semánticos R7, FBX, caminata, visemas y demostración conversacional local sin IA.
- El script `PREPARAR_LUMIA_MOTION_R9_LAB.ps1` prepara y lanza la copia aislada. **Motion R9-01 está ahora incorporado al visor como piloto opcional, apagado de fábrica**; no se ha certificado aún visualmente en el ASUS.

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

## R9-01 — gestos autónomos durante la voz (piloto aislado)

- R8 queda intacto como modo predeterminado.
- En la sección **Motion Intelligence**, bajo los botones Sí/No/Explicar/Celebración, activar **Gestos autónomos R9** para comparar.
- Los eventos R8 `lumia:speech-motion` (inicio, avance y final) alimentan el adaptador `r9-motion-pilot.js`.
- El adaptador conserva el planificador semántico R7 para evitar duplicados y lo conecta con las funciones puras R9-00/01/02 (`r9/`). Sólo se aplica una de las dos capas semánticas por fotograma, nunca ambas.
- El audio real debe haber comenzado; no se gesticula en silencio, durante un baile ni con control manual. Se limitan los ángulos y se respetan los cambios de voz.
- Sin acceso a red, cámara, Ollama, Whisper, Kokoro o archivos del usuario. Sólo la voz demo del navegador ya existente.
- Pruebas automáticas: `node test-motion-r9.mjs`, además de R7 y R8. Acciones GitHub ejecutan las pruebas en Windows y Ubuntu. La calidad visible del movimiento del avatar **requiere revisión en ASUS**.

### Actualizar un laboratorio ya abierto

Desde **otra** terminal PowerShell, sin borrar los modelos privados locales:

~~~powershell
Set-Location "$env:USERPROFILE\LUMIA-MOTION-R9-LAB"
git pull --ff-only origin feat/motion-r9-independent-lab-20261114
if ($LASTEXITCODE -ne 0) { throw 'No se actualizaron los archivos; revisar git status.' }
~~~

Si el servidor Python sigue abierto, vuelve a la pestaña `http://127.0.0.1:5190/` y pulsa `Ctrl+F5`. No necesitas reiniciar LUMIA ni instalar npm.

### Qué observar

1. Activar la opción R9 y probar los botones Sí / No / Explicar / Celebración. Comparar con la opción desactivada usando las **mismas** frases.
2. Confirmar que se mueven cabeza/brazos/manos de forma suave, sin saltos ni deformaciones.
3. Pulsar una animación FBX manual mientras habla para comprobar que conserva la prioridad.
4. Detener la voz para confirmar que no quedan giros residuales.
5. Registrar diferencias con R8. Esta evaluación decidirá si avanzamos a microgestos de reposo e IK.

**No fusionar R9 a `main` ni al proyecto de visión hasta completar esta revisión.**
