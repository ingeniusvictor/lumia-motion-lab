# Registro técnico para reanudar el desarrollo de L.U.M.I.A.

**Fuente de verdad:** documentos 00 a 04 en docs/lumia-convergence del mismo commit. **Fecha de referencia:** 2026-11-01.

## Identidad y secuencia

Primera entrega: Opción 1, cabeza VRM facialmente animada dentro del aro holográfico del asistente original, mientras STT, TTS, herramientas, estado, inteligencia y seguridad permanecen en el proyecto cerebral. Segunda entrega futura: Opción 2, cuerpo Motion completo con ese mismo cerebro y, más adelante, apartamento 3D.

## Fuentes concretas

- Cerebro: https://github.com/ingeniusvictor/orbi-jarvis-agent-lab
- Rama consolidada examinada: feature/lumia-consolidated-release-20261028. Se debe verificar su commit actual antes de cualquier intervención.
- Motion: LUMIA_VITA_NATURAL_V085_R8_NATURAL_CONVERSATION_KIT.zip, 17 FBX esenciales, VRM v0.5 y compositor de baile on-demand.
- El repositorio GitHub específico de Motion **no ha sido identificado**. No usar en su lugar orbi-3d-motion-studio ni lumia-apartment-matterport.
- R7 de Motion fue aceptada visualmente; R8 conserva esas funciones y añade sesiones/voz, pero NO se ha conectado todavía al cerebro original.
- Portal original: src/scene/LumiaAvatar.tsx usa el GLB preexistente. No confundirlo con el VRM Motion ni sustituirlo sin respaldo.

## Fase y avance

CVG-00: documentación.
PH-00: baseline portal y pruebas.
MH-00: prueba de cabeza VRM con esqueleto/expresiones intactos.
PH-01: vista reversible legacy/head-vrm.
PH-02: paridad de boca/ojos/cabeza/expresiones.
PH-03: sincronización voz real/interrupciones.
PH-04: optimización.
PH-05: aceptación visual y activación aprobada.
BC-00/01/02: cuerpo y apartamento posteriores.

## Registro obligatorio al cerrar cada sesión

Fecha, objetivo, repositorio, rama base y SHA inicial, rama final y SHA, PR, archivos modificados, implementado frente a planificado, pruebas con evidencia, QA visual real, hashes de assets antes/después, problemas abiertos, próxima acción exacta y zonas protegidas.

## Restricciones vigentes

No modificar directamente main; no fusionar ramas ajenas ni hacer git reset --hard; no usar Codex ni Work sin autorización; no editar VRM/FBX canónicos ni reemplazar la UI aprobada del portal; no reinstalar los 34 FBX breakdance; no declarar aprobadas pruebas visuales que solo pasaron por código.

## Próxima acción técnica

Verificar HEAD y pruebas del portal actual, y luego iniciar PH-00. Mantener el cerebro original como única autoridad, usando el contrato CVG-API-v1 que se describe en el documento 03.

> **Actualización de repositorio (2026-11-01):** el usuario creó `ingeniusvictor/lumia-motion-lab` (público). Esta copia se conserva aquí; la versión anterior que decía “repo sin identificar” refleja el estado histórico y queda sustituida por esta nota. Los recursos .vrm y .fbx no deben publicarse mientras no se hayan comprobado sus derechos de redistribución.
