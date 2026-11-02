# LUMIA PORTAL HEAD — Plan de trabajo del asistente original

**Repo:** ingeniusvictor/orbi-jarvis-agent-lab. **Prioridad:** Opción 1. **Estado:** diseño, no implementación.

## Inventario confirmado en rama consolidada

- src/scene/LumiaAvatar.tsx: componente existente con useGLTF('/models/lumia/lumia.glb'), perfil faceOnly, calibración óptica y movimiento de root.
- src/scene/Scene.tsx: React Three Fiber Canvas; Core, Particles, Orbits, avatar, Bloom/postproceso; AvatarErrorBoundary ya existe.
- src/store.ts: fases offline / boot / dormant / waking / listening / thinking / tooling / speaking.
- src/lib/voice.ts: voz/recepción/STT, interrumpir o barge-in; src/lib/tts.ts: salida hablada; revisar los puntos efectivos de reproducción en src/App.tsx y bridge/server.mjs antes de emitir eventos.

## Implementación por etapas

### PH-00 — Congelar baseline
Anotar SHA y rama efectiva, guardar capturas del portal actual (incluyendo las medidas visuales del aro y busto), ejecutar build y pruebas de conversación, despertar, STT, TTS, herramientas, paneles e interrupciones. Preservar el aspecto del GLB aprobado. Medir FPS y consumo en la máquina objetivo; no inventar umbrales.

### PH-01 — Head POC reversible
Crear un componente NUEVO de carga VRM con GLTFLoader + VRMLoaderPlugin (@pixiv/three-vrm), comprobar compatibilidad de dependencia con Three.js existente y R3F. Proponer un router de avatar con VITE_LUMIA_AVATAR_MODE=legacy|head-vrm (flag nuevo a implementar, legacy por defecto). No eliminar LumiaAvatar.tsx.

Aislar visualmente Face.baked y Hair001.baked **sin desarmar esqueleto ni quitar morph targets**. Ocultar Body.baked solo en la instancia visual; comprobar si el cuello/escote están en la malla Body y solucionar el corte con máscara/crop reversible, no cortando el VRM original.

Mantener exactamente la composición del reactor/halo. Ajustar encuadre óptico de la cabeza grande y clara, preservar FPS y garantizar fallback a GLB legado si el VRM falla. No cargar todos los FBX de Motion en el portal.

### PH-02 — Paridad facial
Comprobar cinco vocales, blink automático, mirada a las cuatro direcciones, cabeza/cuello, expresiones happy/surprised/sad/angry/neutral y recuperación de neutral. Integrar solo **un director** de cabeza y ojos por frame. Evitar doble escritura entre movimiento de root del portal, VRM lookAt y FBX Head Gesture.

### PH-03 — Sincronizar cerebro real
Emitir eventos normalizados de fases de conversación y TTS REAL desde el asistente existente. Texto enviado = thinking, no speaking; TTS playing = speaking; TTS terminado = reposo o escucha; barge-in invalida sesión antigua y detiene audio real. No iniciar un motor de IA distinto, ni mover secretos, ni sustituir providers.

### PH-04 — Naturalidad
Gestos semánticos suaves de cabeza/rostro vinculados al contenido pronunciado; no cambiar FBX corporales entre palabras. Si hay índices de palabra del TTS, sincronizarlos; si no, estimación declarada y no tratarla como evento real.

### PH-05 — QA y aceptación
Verificar escritorio 16:9 y móvil 9:16, no tapar controles y input, coherencia del HUD, Bloom sin lavar el rostro, rendimiento, retorno a modo legacy y seguridad. Solicitar aprobación visual antes de hacer head-vrm predeterminado.

## Archivos NUEVOS propuestos, NO existentes
src/scene/LumiaPortalHead.tsx, src/scene/LumiaAvatarRouter.tsx, src/scene/lumia-head/loadVrm.ts, isolateHead.ts, facialDriver.ts; src/lumia-integrations/motionEventAdapter.ts y tests. Los nombres finales deben respetar el código vigente.

## Prohibiciones
No reemplazar el GLB vigente, no alterar testigos de seguridad/permissions, no editar el portal en main, no incrustar el visor index.html de Motion, no recortar físicamente cabeza/VRM por adelantado, no abrir otra cadena STT/TTS paralela.

**Gate:** portal legado visualmente intacto + Head VRM facial validado + voz real e interrupciones correctas + QA y aprobación explícita.


> **Actualización de repositorio (2026-11-01):** el usuario creó `ingeniusvictor/lumia-motion-lab` (público). Esta copia se conserva aquí; la versión anterior que decía “repo sin identificar” refleja el estado histórico y queda sustituida por esta nota. Los recursos .vrm y .fbx no deben publicarse mientras no se hayan comprobado sus derechos de redistribución.
