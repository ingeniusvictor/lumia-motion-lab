# CVG Roadmap — Hitos, certificación, checkpoints y recuperación

## Hitos con gates

| ID | Líder | Resultado | Aceptación |
|---|---|---|---|
| CVG-00 | Ambos | Documentación versionada, baselines y checksum | solo documentación; PR revisable |
| PH-00 | Portal | Snapshot SHA + capturas de UI, voz, HUD y rendimiento | regresiones existentes PASS |
| MH-00 | Motion | Head-only visual sin cortar VRM | parpadeo, boca, ojos, cabeza intactos |
| PH-01 | Portal | Toggle legacy / head-vrm y fallback | modo legado idéntico |
| PH-02 | Ambos | Paridad de 5 visemas, blink, mirada, emociones | QA frontal, lateral y con Bloom |
| PH-03 | Portal | Eventos reales con sessionId y barge-in | cero señales tardías reanimando voz |
| PH-04 | Portal | Rendimiento + responsive desktop/móvil | métricas reales sin regresión |
| PH-05 | Portal | Aceptación y default head-vrm | aprobación visual explícita |
| BC-00 | Motion | Reuso interfaz para cuerpo 3D | nada rompe Portal Head |
| BC-01 | Motion | Cuerpo conversa con cerebro original | sin duplicar STT/LLM/TTS |
| BC-02 | Apartamento + Motion | NavMesh, puertas, sentarse, colisiones | QA escena por escena |

**Prioridad estricta:** PH antes que BC. El apartamento se desarrolla por separado.

## QA Portal Head
1. Arranque normal, con VRM y sin VRM (fallback).
2. El aro, partículas, halo, HUD, entrada de texto, micrófono y botones no cambian en legacy.
3. Encuadre 1366x768, 1920x1080 y móvil, cara visible con ojos y boca legibles.
4. Cinco vocales/visemas, blink, mirada en cuatro direcciones, neutral, alegría, sorpresa, tristeza.
5. Giros suaves sin doble escritura de cuello/cabeza.
6. Entrada texto -> pensando; hablar solo con inicio TTS; corte / barge-in -> escuchar.
7. 20 turnos seguidos sin acumulación de timers, WebGL resources ni retrasos.
8. Rendimiento medido en laptop real; reportar FPS y consumo, no inventar valores.
9. Ninguna clave expuesta, ningún cambio en permisos de herramientas, mensajes entre ventanas validados.
10. Capturas de referencia antes y después: aspecto original del aro y portal protegido.

## QA Motion
17 FBX esenciales intactos, reproducir Idle / Head Gesture / Thinking nuevo / Talking / caminar / gestos; velocidad 35-150 %; composiciones de 1-3 FBX bajo demanda; nunca devolver las 34 breakdance al paquete base. No mezclar validación visual R7 con aprobación de R8 integrada.

## Checkpoints y PR
- Trabajo en rama específica desde REF/SHA realmente inspeccionado.
- Sin merge automático a main. Sin reset --hard, clean destructivo, force push ni mezclar ramas por comodidad.
- Etiquetar baseline por commit, prueba PASS/FAIL y hashes de VRM, FBX y archivos de lógica.
- Mantener R8 ZIP original intacto, respaldo local y fichero manifiesto SHA-256.
- En cierre de sesión escribir fecha, repo, base SHA, commit final, PR, cambios, pruebas, bloqueos y siguiente paso.

## Reversión
- El flag sugerido VITE_LUMIA_AVATAR_MODE=legacy|head-vrm **todavía no existe**; una vez implementado, volver a legacy es el rollback visual sin alterar cerebro.
- Cualquier excepción al cargar VRM debe renderizar el GLB anterior (AvatarErrorBoundary) y mantener conversación operativa.
- Reversión de Git mediante commit/PR de corrección, sin borrar la rama experimental ni archivos del usuario.
- Para Motion, reutilizar archivo R8 original y comprobar checksums; NO exportar o sobrescribir el VRM canónico.

## Regla de verdad
Distinguir siempre **PLANIFICADO / IMPLEMENTADO / PROBADO EN CÓDIGO / VALIDADO VISUALMENTE EN PC / PUBLICADO**. Un PASS de pruebas unitarias no es aprobación visual.


> **Actualización de repositorio (2026-11-01):** el usuario creó `ingeniusvictor/lumia-motion-lab` (público). Esta copia se conserva aquí; la versión anterior que decía “repo sin identificar” refleja el estado histórico y queda sustituida por esta nota. Los recursos .vrm y .fbx no deben publicarse mientras no se hayan comprobado sus derechos de redistribución.
