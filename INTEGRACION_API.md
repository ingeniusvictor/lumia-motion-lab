# L.U.M.I.A. Motion R8 — Contrato de integración conversacional

## Importante

El kit funciona en modo demostración local. No contiene ni instala el modelo de IA conversacional original de Lumia. Para usar el motor real hay que conectarlo de forma explícita por el bridge o el mismo origen `/api/lumia/chat`.

## Motor de conversación de texto (existente)

```js
LUMIAConversation.setResponder(async ({message,history}) => {
  return {reply:'Texto generado por tu motor', emotion:'curious', intensity:0.5};
});
```

## TTS externo — NUEVO R8

Usa estos eventos en el instante en que **empieza a reproducirse audio**, no cuando se genera el texto:

```js
// Mientras se procesa la respuesta:
LUMIAConversation.startThinking();
// En el evento real de reproducción de audio:
const sessionId=LUMIAConversation.beginExternalSpeech({
  text:'Primero revisemos este resultado.', emotion:'curious', intensity:0.5
});
// Si el motor reporta posiciones de caracteres/word boundaries:
LUMIAConversation.externalSpeechBoundary(8,sessionId);
// En el evento de fin del reproductor:
LUMIAConversation.endExternalSpeech(sessionId);
```

Para interrumpir la respuesta al recibir una orden nueva: `LUMIAConversation.interruptAndListen()`. Esto invalida las señales anteriores. Es importante que el motor externo **detenga realmente su reproducción**; el bridge solo controla estados de Lumia.

Las señales anteriores `semanticSpeechStart(text)`, `semanticSpeechBoundary(index,sessionId)` y `semanticSpeechEnd(sessionId)` siguen disponibles por compatibilidad. Ahora manejan también el estado conversacional. El ID evita que el evento tardío de una respuesta antigua cierre una nueva.

Para un elemento `<audio>` que ya se usa con `attachAudioElement(audio)`, asigna primero `setExternalAudioText(text)` y los eventos HTML5 `playing`, `pause`, `ended` activan o terminan las señales automáticamente.

Para un integrador del mismo origen también funcionan los mensajes `lumia-conversation-v1` con `event: speech-start | speech-boundary | speech-end | interrupt`, y `sessionId` para boundary/end. Si usa postMessage, no se garantiza que el remitente conozca automáticamente el identificador devuelto: es preferible llamar directamente al bridge o establecer un protocolo de confirmación.

## Estado y diagnóstico

```js
LUMIAConversation.getSpeechSession();
LUMIA_BODY.getVoiceSync();
LUMIA_BODY.setPoseBlendEnabled(true);
LUMIA_BODY.getMotionIntelligence();
```

La interpolación de pose dura 0,44 s y se puede desactivar desde el panel R8 para comparar. Solo se activa cuando un FBX corporal sustituye a otro activo; no se aplica sobre el compositor de baile. Velocidad FBX, visemas, expresiones, VRM y 17 FBX esenciales permanecen iguales.
