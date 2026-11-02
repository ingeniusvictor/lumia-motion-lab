# L.U.M.I.A. — Visión oficial de convergencia (CVG-00)

**Estado:** plan maestro aprobado conceptualmente; la integración aún NO está implementada. **Fecha:** 2026-11-01.

## Objetivo

Una sola identidad y un solo cerebro conversacional que se manifiesten en **dos experiencias visuales**.

**OPCIÓN 1 — PRIORIDAD ABSOLUTA: LUMIA PORTAL HEAD.** Mantener íntegro el asistente original (portal holográfico/aro, HUD, micrófono, STT, TTS, LLM/proveedores, herramientas, registros y seguridad). En el centro del aro mostrar la **cabeza animada del VRM LUMIA Motion**, grande y expresiva para apreciar ojos, parpadeos, seguimiento ocular, rostro, vocales/visemas y emociones, sincronizados con la voz **real** del proyecto original. No sustituir el cerebro, no convertir el portal en la demo Motion.

**OPCIÓN 2 — DESPUÉS: LUMIA BODY COMPANION.** Reutilizar ese mismo cerebro/eventos en un avatar humanoide completo con gestos, caminatas, composiciones de baile bajo demanda y, posteriormente, un apartamento 3D con puertas, sillas, colisiones y rutinas. Mantener claro que es una IA conversacional, no una persona real.

La Opción 2 no es un requisito para completar la Opción 1.

## Dos líneas, sin confusión de repositorios

**Asistente original:** https://github.com/ingeniusvictor/orbi-jarvis-agent-lab — confirmado. La rama consolidada inspeccionada es feature/lumia-consolidated-release-20261028; verificar HEAD y rama efectiva antes de tocar código.

**Motion:** kit autónomo LUMIA_VITA_NATURAL_V085_R8_NATURAL_CONVERSATION_KIT, procedente del visor Motion; **no hay aún URL de repositorio GitHub Motion confirmada**. No tratar orbi-3d-motion-studio ni lumia-apartment-matterport como si fueran ese repositorio. Una copia documentada del kit Motion se conserva por separado hasta crear/identificar su repositorio propio.

## Baselines y restricciones

- Portal actual: src/scene/LumiaAvatar.tsx carga el GLB actual en /models/lumia/lumia.glb; src/scene/Scene.tsx dibuja reactor, orbits, partículas y luces. El GLB del portal y el VRM de Motion **no son el mismo asset**.
- Motion: VRM visual aprobado LUMIA_VITA_NATURAL_V05.vrm, esqueleto completo, rostro/cabello/cuerpo como mallas diferenciadas, 41 morph targets y 15 grupos de expresiones reportados; 17 FBX esenciales; control de velocidad 35–150 % y compositor de bailes de 1–3 clips **importados solo a demanda**.
- R7 fue visualmente aprobada por el usuario; R8 incorpora puente de voz/sesiones y mezcla de poses, aún pendiente de validación al integrarse con el cerebro real.
- **No modificar el VRM canónico, texturas, diseño de portal, UI, herramientas, claves o baselines sin decisión explícita.**
- **No precargar 34 clips de breakdance** ni traer locomoción al modo Head.
- Primero POC con VRM completo **en memoria** y cuerpo oculto, conservando morphs/huesos; no exportar ni cortar físicamente una nueva cabeza hasta probar paridad facial.
- Un dueño del estado de voz (portal); un dueño por hueso/expresión por cuadro; animaciones deben ser consumidoras de eventos y no una segunda IA.
- Flag de modo legacy/head-vrm propuesto, **no existente todavía**. Legacy debe ser fallback y permanecer idéntico hasta certificación visual.
- Trabajar solo en ramas y PR. No fusionar a main sin autorización, no Codex ni ChatGPT Work sin permiso, no reset --hard.

## Trazabilidad

Leer también 01-PORTAL-REPOSITORIO-PLAN.md, 02-MOTION-REPOSITORIO-PLAN.md, 03-CONTRATO-EVENTOS-Y-ASSETS.md, 04-ROADMAP-QA-ROLLBACK.md y 05-CONTINUIDAD-CHATS.md. Si un chat termina, este conjunto manda sobre recuerdos parciales.


> **Actualización de repositorio (2026-11-01):** el usuario creó `ingeniusvictor/lumia-motion-lab` (público). Esta copia se conserva aquí; la versión anterior que decía “repo sin identificar” refleja el estado histórico y queda sustituida por esta nota. Los recursos .vrm y .fbx no deben publicarse mientras no se hayan comprobado sus derechos de redistribución.
