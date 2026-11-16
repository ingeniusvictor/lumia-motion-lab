# Motion R9-02 — Gestor de personajes (VRM, GLB y FBX)

## Alcance del laboratorio independiente

Nueva sección **Motion R9-02 · Cambiar personaje** en el panel derecho del visor Motion R8. Esta implementación no toca el cerebro, el portal principal ni las mejoras de visión de LUMIA.

- **VRM** con rig humanoide reconocido: permite probar los gestos y las animaciones Motion R8/R9 sobre el personaje recién cargado.
- **GLB/FBX** genéricos: visor independiente con encuadre normalizado y reproducción de clips propios; no se fuerza el retarget de FBX de Lumia sobre un rig desconocido.
- **FBX animado**: requiere malla (With Skin) para ser un personaje. Los FBX solo de animaciones (Without Skin) siguen entrando en el panel Mixamo original.
- **Selector de clips propios**: reproducir, detener, repetir y velocidad.
- **Rotación X, Y y Z**: girar por pasos de 90 grados y recuperar orientación inicial en FBX/GLB.
- **Galería temporal**: seleccionar hasta doce modelos cargados durante la misma pestaña, sin tener que buscar su archivo otra vez. El visor libera la GPU del avatar anterior al cambiar y vuelve a analizar el archivo cuando se selecciona.
- **Restaurar LUMIA Natural V0.5**: el avatar aprobado permanece como referencia original; no se modifica.
- **Texturas opcionales**: cuando un FBX necesite imágenes externas, el usuario puede seleccionar esas texturas adicionales localmente antes de cargar el modelo. No se hacen peticiones a URL externas incluidas en el archivo.

## Preparar actualización sobre la copia QA existente

Ejecutar en otra terminal PowerShell:

    Set-Location "$env:USERPROFILE\LUMIA-MOTION-R9-LAB"
    git status --short
    git pull --ff-only origin feat/motion-r9-independent-lab-20261114
    node test-avatar-lab-r9.mjs

Si el visor Python sigue funcionando, basta con abrir su URL impresa (normalmente http://127.0.0.1:5190/) y pulsar Ctrl+F5. Si Python se detuvo, ejecutar el mismo script PREPARAR_LUMIA_MOTION_R9_LAB.ps1 con -Mode Launch -Port 5190.

No requiere arranque de Node, bridge, Ollama, Whisper ni Kokoro.

## Protecciones de funcionamiento

- La selección abre archivos con la API File del navegador. No hay subida de archivos ni copias del usuario a disco.
- El cambio de personaje descarta animaciones, poses y clips en memoria asociados al avatar anterior, sin modificar los FBX originales.
- Cuando se reproduce una animación integrada en un VRM, se suspende temporalmente el director R8/R9 para que no compitan dos mixers por los mismos huesos.
- Fallos de lectura mantienen el personaje que se estaba mostrando.
- El avatar original conserva sus quaterniones de pose base al restaurarse.
- No guardar en GitHub público archivos de modelos o texturas propietarios.

## Validación física pendiente

Se deben comprobar varios VRM, GLB y FBX auténticos en el ASUS para evaluar orientación, texturas, clips, huesos, expresiones, restauración del original y estabilidad de la GPU. Las pruebas unitarias sin activos 3D no sustituyen esta evaluación.

## Futuras mejoras (no incluidas)

Mapeo de esqueletos no-VRM, retarget seguro de los diecisiete clips R8 a rigs GLB/FBX arbitrarios, y tabla editable de expresiones/visemas por avatar. Estos puntos requieren certificación individual de cada modelo.
