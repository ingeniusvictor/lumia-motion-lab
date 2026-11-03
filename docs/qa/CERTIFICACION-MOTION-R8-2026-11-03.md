# Certificación de L.U.M.I.A. Motion R8 — 2026-11-03

**Estado:** certificación de código e integridad de assets; QA visual del portal pendiente.

## Referencias
- Rama: `feat/motion-r8-source-20261101`
- Commit importado: `32291de1606fd3d05ae7328f1b74283b9478b53e`
- PR de fuentes: #2, basado en la rama de documentación #1.
- Kit original: `LUMIA_VITA_NATURAL_V085_R8_NATURAL_CONVERSATION_KIT.zip`.
- Manifiesto: `docs/lumia-convergence/06-BASELINE-ASSETS.json`.

## Evidencia ejecutada localmente
| Validación | Resultado |
|---|---|
| Scripts Node test-*.mjs del kit completo | **18/18 PASS** |
| Scripts del código publicable sin assets 3D | **17/18 PASS** |
| Excepción esperada del código público | `test-motion-r6.mjs` necesita `clips/` (ENOENT), excluida de CI público |
| SHA-256 del VRM aprobado | **1/1 PASS** |
| SHA-256 de FBX esenciales | **17/17 PASS** |
| GitHub: código frente a rama documental | **62 archivos**, un commit adelantado, sin divergencia |
| Binarios VRM/FBX/GLB publicados | **0** |
| Integración con el cerebro original | **NO realizada** |
| Prueba visual en Windows | **NO realizada en esta certificación** |

Entorno: Node v22.16.0, Python 3.13.5, Git 2.47.3. La automatización del repositorio debe ejecutar solo las 17 pruebas que **no** requieren assets y rechazar binarios 3D. Los 18 scripts completos se ejecutan localmente con el kit privado.

## Advertencia documental
`LEEME_PRIMERO.txt` mantiene referencias a R7 aunque el motor sea R8. Es una inconsistencia documental, no una falla de reproducción demostrada.

## Protección
- No publicar VRM, FBX, GLB ni bundles de respaldo privados sin revisar las licencias.
- No introducir los 34 breakdance en la distribución base.
- No modificar los 17 movimientos aprobados ni el compositor de hasta tres clips.
- No fusionar PR #2 directamente a main sin antes revisar documentación #1 y esta certificación.

**Próximo paso:** ejecutar PH-00 del portal original (baseline, TTS real, secuencias y UI). Después iniciar POC reversible de cabeza VRM manteniendo el motor de IA en `orbi-jarvis-agent-lab`.
