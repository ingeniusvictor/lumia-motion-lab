// L.U.M.I.A. v0.8.5 R6 — 17 animaciones aprobadas.
// Los bailes futuros se importan bajo demanda en el Compositor: no hay FBX de baile preinstalados.
export const motionCatalog=[
  {
    "id": "waving",
    "file": "Waving.fbx",
    "path": "./clips/Waving.fbx",
    "label": "Saludar",
    "category": "conversacion",
    "loop": false,
    "repetitions": 2,
    "fullBody": false
  },
  {
    "id": "talking",
    "file": "Talking.fbx",
    "path": "./clips/Talking.fbx",
    "label": "Hablar · nueva toma",
    "category": "conversacion",
    "loop": true,
    "repetitions": null,
    "fullBody": false
  },
  {
    "id": "idle",
    "file": "Idle.fbx",
    "path": "./clips/Idle.fbx",
    "label": "Reposo natural · nuevo Idle",
    "category": "conversacion",
    "loop": true,
    "repetitions": null,
    "fullBody": false
  },
  {
    "id": "listening",
    "file": "Head Gesture.fbx",
    "path": "./clips/Head%20Gesture.fbx",
    "label": "Escuchando · Head Gesture",
    "category": "conversacion",
    "loop": true,
    "repetitions": null,
    "fullBody": false,
    "includeHead": true
  },
  {
    "id": "nails",
    "file": "Dwarf Idle.fbx",
    "path": "./clips/Dwarf%20Idle.fbx",
    "label": "Revisar las manos · antiguo Idle",
    "category": "conversacion",
    "loop": true,
    "repetitions": null,
    "fullBody": false
  },
  {
    "id": "thinking",
    "file": "Thinking.fbx",
    "path": "./clips/Thinking.fbx",
    "label": "Pensando",
    "category": "conversacion",
    "loop": false,
    "repetitions": 1,
    "fullBody": false
  },
  {
    "id": "pointing",
    "file": "Pointing.fbx",
    "path": "./clips/Pointing.fbx",
    "label": "Señalar",
    "category": "conversacion",
    "loop": false,
    "repetitions": 1,
    "fullBody": false
  },
  {
    "id": "pointinggesture",
    "file": "Pointing Gesture.fbx",
    "path": "./clips/Pointing%20Gesture.fbx",
    "label": "Señalar con gesto",
    "category": "conversacion",
    "loop": false,
    "repetitions": 1,
    "fullBody": false
  },
  {
    "id": "no",
    "file": "No.fbx",
    "path": "./clips/No.fbx",
    "label": "Negar / No",
    "category": "conversacion",
    "loop": false,
    "repetitions": 1,
    "fullBody": false
  },
  {
    "id": "happy",
    "file": "Happy.fbx",
    "path": "./clips/Happy.fbx",
    "label": "Alegría",
    "category": "emociones",
    "loop": false,
    "repetitions": 1,
    "fullBody": false
  },
  {
    "id": "excited",
    "file": "Excited.fbx",
    "path": "./clips/Excited.fbx",
    "label": "Entusiasmo",
    "category": "emociones",
    "loop": false,
    "repetitions": 1,
    "fullBody": false
  },
  {
    "id": "surprised",
    "file": "Surprised.fbx",
    "path": "./clips/Surprised.fbx",
    "label": "Sorpresa",
    "category": "emociones",
    "loop": false,
    "repetitions": 1,
    "fullBody": false
  },
  {
    "id": "clapping",
    "file": "Clapping.fbx",
    "path": "./clips/Clapping.fbx",
    "label": "Aplaudir",
    "category": "emociones",
    "loop": false,
    "repetitions": 3,
    "fullBody": false
  },
  {
    "id": "kiss",
    "file": "Blow A Kiss.fbx",
    "path": "./clips/Blow%20A%20Kiss.fbx",
    "label": "Lanzar un beso",
    "category": "emociones",
    "loop": false,
    "repetitions": 1,
    "fullBody": false
  },
  {
    "id": "walking",
    "file": "Walking in place.fbx",
    "path": "./clips/Walking%20in%20place.fbx",
    "label": "Caminar en sitio · nuevo",
    "category": "movimiento",
    "loop": true,
    "repetitions": null,
    "fullBody": true
  },
  {
    "id": "walkingforward",
    "file": "Walking adelante.fbx",
    "path": "./clips/Walking%20adelante.fbx",
    "label": "Caminar hacia delante",
    "category": "movimiento",
    "loop": false,
    "repetitions": 1,
    "fullBody": true
  },
  {
    "id": "walkingcircle",
    "file": "Walk In Circle.fbx",
    "path": "./clips/Walk%20In%20Circle.fbx",
    "label": "Paseo circular · pensando",
    "category": "movimiento",
    "loop": false,
    "repetitions": 1,
    "fullBody": true
  }
];
export const animationLibrary=Object.fromEntries(motionCatalog.map(c=>[c.id,{...c,repetitions:c.loop?Infinity:c.repetitions}]));
