# L.U.M.I.A. MOTION v0.8.5 R8 — Natural Conversation Motion

**Base visual:** Lumia VRM v0.5 aprobada, sin modificaciones. **Base funcional:** R7 Gestos semánticos.

## Novedades R8

1. **Sincronización de voz por sesión:** nuevo `speech-session.js` con eventos identificados de comienzo/avance/fin. Ignora límites de palabra y finales atrasados después de una interrupción.
2. **Audio externo:** `attachAudioElement` ahora emite eventos coherentes con el estado `Hablando`, y el bridge dispone de `beginExternalSpeech`, `externalSpeechBoundary`, `endExternalSpeech`, `interruptAndListen`.
3. **Puente de posturas FBX:** nuevo `pose-transition.js` suaviza 0,44 s el cambio entre un clip corporal activo y otro. Casilla de activación en el panel R8.
4. **Gestos semánticos R7:** permanecen aditivos sobre Talking; la voz no sustituye los FBX durante una respuesta por defecto.
5. **Diagnóstico R8:** estado en pantalla de los eventos de voz y API de consulta para integraciones.

## Lo que permanece intacto

- Modelo visual aprobado, 17 FBX y control de velocidad 35–150 %.
- Idle, Head Gesture, Thinking nuevo, Talking y todas las caminatas.
- Compositor de baile vacío, de 1 a 3 movimientos FBX cargados temporalmente.
- Mirada, parpadeo, expresiones faciales, labios, API previa y modo demo.
- Launcher seguro que inicia el servidor antes del navegador y cambia de puerto si está ocupado.

## Abrir en Windows

1. Descomprimir ZIP en **carpeta nueva**, sin sobrescribir R7.
2. Ejecutar `ABRIR_LUMIA_V085_R8_CONVERSACION_NATURAL.bat`.
3. Mantener abierta la ventana negra; abrir la URL `http://127.0.0.1:8787/` o la indicada si usa otro puerto.
4. Se requiere internet para obtener bibliotecas Three.js y three-vrm del CDN. VRM y clips se cargan desde la propia carpeta.
5. Probar primero «Demo: recorrer estados» y luego escribir y escuchar varias respuestas, incluida la interrupción «Detener».
6. En el panel R8, comparar el suavizado de poses con la casilla activada/desactivada.

## Validación y límites

El sistema `speechSynthesis` del navegador envía comienzo y fin; `onboundary` no es universal, por lo que los gestos semánticos usan una estimación temporal cuando no existen límites de palabras. El modelo principal de IA de Lumia **no está incorporado al ZIP**, solamente está disponible su contrato de integración.

Las transiciones en la escena 3D requieren prueba visual final en tu navegador. La nueva interpolación es experimental; si produce una postura extraña en algún clip, desactívala y conserva R7 como referencia estable.

Ver `INTEGRACION_API.md` para integrar tu verdadero motor de IA y TTS.
