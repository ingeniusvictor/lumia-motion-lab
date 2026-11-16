/**
 * Motion R9-02 · Avatar lab file policy and inspection, independent of THREE.
 * Models are read only by the owner's browser, and never persisted or uploaded.
 */
export const AVATAR_MAX_BYTES = 300 * 1024 * 1024;
const SUPPORTED = Object.freeze(['vrm', 'glb', 'fbx']);

export function avatarFileKind(file) {
  const name = typeof file?.name === 'string' ? file.name : '';
  const match = /\.([a-z0-9]+)$/i.exec(name);
  return match && SUPPORTED.includes(match[1].toLowerCase())
    ? match[1].toLowerCase() : null;
}
export function validateAvatarFile(file, maxBytes = AVATAR_MAX_BYTES) {
  const kind = avatarFileKind(file);
  if (!kind) throw new Error('Selecciona un personaje .vrm, .glb o .fbx.');
  if (!Number.isSafeInteger(file.size) || file.size <= 0)
    throw new Error('El archivo está vacío o su tamaño es inválido.');
  if (file.size > maxBytes)
    throw new Error('El personaje supera el límite de 300 MB de esta prueba. No se cargó.');
  return { kind, bytes: file.size, name: String(file.name).slice(0,180) };
}
export function animationInventory(clips) {
  if (!Array.isArray(clips)) return [];
  return clips.map((clip, index) => ({clip, index}))
    .filter(({clip}) => clip && Number.isFinite(clip.duration)
      && clip.duration > 0 && Array.isArray(clip.tracks) && clip.tracks.length > 0)
    .slice(0, 250)
    .map(({clip, index}) => ({
      index, name: String(clip.name || 'Animación ' + (index + 1)).slice(0, 100),
      seconds: Math.round(clip.duration * 100) / 100, tracks: clip.tracks.length,
    }));
}
export function avatarRigReport(root, vrm = null) {
  let meshes = 0, skinned = 0, bones = 0;
  const morphNames = new Set();
  root?.traverse?.((obj) => {
    if (obj.isMesh) meshes++;
    if (obj.isSkinnedMesh) skinned++;
    if (obj.isBone) bones++;
    for (const name of Object.keys(obj.morphTargetDictionary || {})) morphNames.add(name);
  });
  const humanoid = vrm?.humanoid;
  const mapped = ['hips','spine','chest','neck','head',
    'leftUpperArm','leftLowerArm','leftHand',
    'rightUpperArm','rightLowerArm','rightHand',
    'leftUpperLeg','rightUpperLeg'].filter((name)=>
    !!humanoid?.getNormalizedBoneNode?.(name)).length;
  return {
    meshes, skinned, bones, morphTargets: morphNames.size,
    vrmHumanoid: !!vrm?.scene && mapped >= 7,
    humanoidMapped: mapped,
    faceExpressions: Object.keys(vrm?.expressionManager?.expressionMap || {}).length,
  };
}
export class AvatarLoadGate {
  constructor() { this.version = 0; }
  next() { return ++this.version; }
  isCurrent(token) { return token === this.version; }
}
