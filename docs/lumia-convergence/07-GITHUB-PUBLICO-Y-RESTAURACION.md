# GitHub publico y restauracion Motion R8

**Repo Motion oficial:** https://github.com/ingeniusvictor/lumia-motion-lab

**Situacion:** rama y PR documental de borrador. El repositorio es publico: NO incluye archivos FBX de Mixamo ni el VRM original, cuya redistribucion requiere verificar licencias.

## Baselines de respaldo (conservados localmente)

- LUMIA_VITA_NATURAL_V085_R8_NATURAL_CONVERSATION_KIT.zip: kit original funcional.
- LUMIA_MOTION_R8_BASELINE_DOCUMENTADO_2026-11-01.zip: kit documentado.
- LUMIA_MOTION_R8_GIT_RESCATE_2026-11-01.bundle: historial Git recuperable CON VRM/FBX; NO subir a repositorio publico.
- 06-BASELINE-ASSETS.json: verificacion de integridad.

## Publicacion del codigo sin binarios

Paquete preparado: LUMIA_MOTION_R8_CODIGO_PUBLICABLE_2026-11-01.zip. Contiene fuentes JS/HTML/Python, tests y scripts, pero NO recursos VRM/FBX. Incluye PUBLICAR_CODIGO_R8.ps1 para ejecutar en Windows con Git autenticado:

1. Clonar el repositorio.
2. Crear rama desde la rama documental.
3. Copiar codigo del kit R8 sin binarios.
4. Verificar staged y rechazar archivos .fbx, .vrm, .glb, .zip, .bundle.
5. Crear commit/push a rama; no a main.
6. Crear PR y revisar antes de fusionar.

La herramienta conectada pudo registrar los documentos pero no transferir archivos locales grandes directamente; el script permite terminar la importacion del codigo local sin exponer los assets. Si se decide compartir los recursos 3D, primero evaluar los derechos y preferir almacenamiento privado.

## Pruebas

- node test-motion-r8.mjs funciona sin FBX ni VRM.
- node test-motion-r6.mjs requiere restaurar localmente los 17 FBX en clips/.
- El visor requiere localmente LUMIA_VITA_NATURAL_V05.vrm y 17 clips.
- Evitar confundir pruebas unitarias con validacion visual en el navegador.

## Limites

El codigo R8 NO esta integrado todavia con el cerebro original; la Opcion 1 Portal Head es prioridad. No subir las 34 animaciones breakdance ni convertir el repo de apartamento en el repo Motion.
