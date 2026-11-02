# CVG-API-v1 — Contrato Portal (cerebro/voz) -> Motion (rostro/cuerpo)

**Versión propuesta**, pendiente de implementar; no afirmar que el portal la emite hoy.

## Flujo
Usuario (texto/voz) -> Portal original (STT + LLM + herramientas + TTS) -> adaptador CVG-API-v1 -> visual HEAD de Motion. Futuro: mismo adaptador -> visual BODY. El HUD/halo recibe fases desde el Portal como siempre. **Un solo cerebro, un solo origen de TTS, dos posibles representaciones.**

## Tipos y campos recomendados
Cada evento incluye:
- version: "lumia-visual-v1"
- source: "portal-brain"
- type: phase | speech-start | speech-boundary | speech-end | speech-interrupt | emotion | reset
- turnId: id único de turno
- sessionId: id único de reproducción TTS (obligatorio para speech-*)
- sequence: contador monotónico por emisor
- timestampMs: diagnóstico, no autoridad de orden
- phase: idle | listening | thinking | speaking | tooling (cuando aplica)
- text: respuesta final que realmente se va a pronunciar (si aplica)
- charIndex: índice opcional del motor de voz, jamás inventar un evento real
- emotion: neutral | happy | sad | surprised | curious | angry
- intensity: número entre 0 y 1, validado por consumidor
- reason: completed | interrupted | error

## Tabla fases del portal -> Motion
- offline / boot: ocultar o visual de arranque, no mover labios.
- dormant: idle / parpadeo, mirada suave.
- waking / listening: escuchar, atención, mirada, Head Gesture si hay driver compatible.
- thinking / tooling: reflexionar sin fingir TTS; se permite indicar uso de herramienta visual.
- speaking: hablar solo en presencia de audio TTS real; visemas sobre el texto confirmado y tiempo reproducido.

## Reglas no negociables
1. **speech-start al empezar PLAYBACK**, no al recibir texto del LLM, ni cuando el TTS empieza a generarse.
2. speech-boundary si existe un callback de palabra; si no, aproximación etiquetada.
3. speech-end solamente si coincide con sessionId vigente.
4. barge-in invalida sesión, detiene TTS real en el Portal y manda speech-interrupt a visual.
5. descartar eventos atrasados por sessionId y sequence, nunca cerrar respuesta nueva por un ended viejo.
6. no generar respuestas ni solicitar API keys desde el renderer Motion.
7. los gestures semánticos nunca sustituyen abruptamente Talking ni duplican visemas.
8. la autoridad del sistema de permisos del asistente permanece en su bridge original.

## Adaptación a R8 existente

R8 expone LUMIAConversation.startThinking(), beginExternalSpeech({text,emotion,intensity}), externalSpeechBoundary(index,sessionId), endExternalSpeech(sessionId), interruptAndListen(). Se propone un wrapper tipado, **sin asumir que el sessionId del portal es idéntico al devuelto por R8**: mantener mapa de sesiones.

Para audio HTML5, R8 documenta attachAudioElement y setExternalAudioText; enlazar únicamente al audio real. Para comunicación entre ventanas, validar event.origin, version y tamaño del mensaje y evitar postMessage con destino wildcard para producción. Preferir adaptador local con React cuando sea posible.

## Pruebas obligatorias
- mensaje de texto sin TTS; hablar solo cuando audio comienza;
- STT parcial mientras escucha;
- TTS normal y streaming;
- reproducción finalizada, pausada, cancelada y fallida;
- interrupción inmediata con ended atrasado;
- dos turnos seguidos;
- cambio de modo visual mientras habla;
- reload y fallback;
- herramientas con permisos no alterados.

**Criterio PASS:** nunca mover boca por sonido no iniciado o cancelado, nunca reproducir dos voces a la vez y no perder preguntas ni romper el portal.


> **Actualización de repositorio (2026-11-01):** el usuario creó `ingeniusvictor/lumia-motion-lab` (público). Esta copia se conserva aquí; la versión anterior que decía “repo sin identificar” refleja el estado histórico y queda sustituida por esta nota. Los recursos .vrm y .fbx no deben publicarse mientras no se hayan comprobado sus derechos de redistribución.
