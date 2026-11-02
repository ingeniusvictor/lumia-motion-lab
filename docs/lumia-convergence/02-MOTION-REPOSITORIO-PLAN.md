# L.U.M.I.A. MOTION — Plan del runtime visual reutilizable

**Fuente hoy:** kit R8 independiente, NO repositorio remoto GitHub confirmado. **Estado:** plan de adaptación.

## Componentes existentes
- LUMIA_VITA_NATURAL_V05.vrm (canónico, no modificar).
- 17 FBX aprobados y rig de 155 huesos; Idle, Dwarf Idle (gesto revisar manos), Head Gesture para escuchar, nuevo Thinking, Talking, gestos, caminatas.
- viewer.js, motion-core.js, emotion-core.js, viseme-core.js, conversation-core.js, conversation-runtime.js, mixamo-retarget.js, body-motion-core.js, motion-intelligence.js, semantic-motion.js, speech-session.js, pose-transition.js.
- dance-choreography.js como compositor de 1-3 FBX importados según necesidad, orden configurable y sin precargar breakdance.
- R8 incluye beginExternalSpeech, externalSpeechBoundary, endExternalSpeech, interruptAndListen; esta interfaz no es todavía una conexión al cerebro original.

## Dos modos del mismo personaje

**HEAD:** mostrar rostro y cabello, mantener humanoide/expresiones/ojos completos y ocultar cuerpo solo en render; consumir eventos del portal para visemas, mirada, emociones y estado. Sin FBX corporales preinstalados ni baile. No poner modelo LLM ni TTS dentro de Motion.

**BODY (futuro):** reutilizar 17 animaciones, retarget 155, root motion, caminatas, control 35-150 y compositor temporal. El apartamento tiene sus propios repositorios y fases; no contaminar este proyecto para completar HEAD.

## Dueños únicos de animación

- Cerebro/TTS y turnId/sessionId: Portal.
- Ojos, blink, visemas, expresiones: Motion.
- Head/neck: un driver con máscara/interpolación definida; FBX escuchar no debe anular el seguimiento ocular.
- Torso/brazos/piernas: motor corporal solo en modo Body.
- Emoción: Portal sugiere semántica, Motion ejecuta intensidad regulada.
- Las interrupciones tienen prioridad absoluta sobre gestos automáticos y sobre los eventos antiguos de voz.

## Trabajo por realizar

1. Un POC head-only SIN exportación destructiva.
2. Un adaptador de eventos versionado por sesión, separado del demo conversational.
3. Paridad de 15 expresiones VRM y 5 visemas en la escena final.
4. Compatibilidad de runtime Motion de Three.js con la escena React Three Fiber del portal; no duplicar canvas, mixers o WebGLContext sin prueba.
5. Lazy load, mecanismos de cache/dispose y benchmarks; especialmente no cargar FBX corporales en HEAD.
6. Suite de regressiones de ambos modos, parpadeo/ojos/voz/cabeza, animaciones aprobadas, compositor y locomoción.
7. Cuando se cree repo Motion, publicar código/documentación y **revisar derechos de redistribución** de VRM/FBX antes de subir binarios a repo público; preferir privado para assets.

## Integridad
Verificar antes/después SHA-256 del VRM, 17 clips, módulos y ZIP base. El paquete original R8 se conserva intacto. No confundir aprobación visual R7 con certificación de R8 en el portal.

**Resultado que Motion entrega a Portal:** un cargador VRM y driver facial modular probado, no el visor de demostración completo.


> **Actualización de repositorio (2026-11-01):** el usuario creó `ingeniusvictor/lumia-motion-lab` (público). Esta copia se conserva aquí; la versión anterior que decía “repo sin identificar” refleja el estado histórico y queda sustituida por esta nota. Los recursos .vrm y .fbx no deben publicarse mientras no se hayan comprobado sus derechos de redistribución.
