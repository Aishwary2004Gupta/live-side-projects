import * as THREE from 'https://unpkg.com/three@0.155.0/build/three.module.js';

const textContainer = document.getElementById("textContainer");
const fontLabel = document.getElementById("fontName");

/* =======================
   STATE
======================= */
let scene, camera, renderer, planeMesh;
let easeFactor = 0.02;

let mousePosition = { x: 0.5, y: 0.5 };
let targetMousePosition = { x: 0.5, y: 0.5 };
let prevPosition = { x: 0.5, y: 0.5 };

/* =======================
   SHADERS
======================= */
const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/* Modified fragment shader: use adaptive cell count (u_cellCount) and center calculation */
const fragmentShader = `
varying vec2 vUv;
uniform sampler2D u_texture;
uniform vec2 u_mouse;
uniform vec2 u_prevMouse;
uniform float u_cellCount;

void main() {
  vec2 gridUV = floor(vUv * u_cellCount) / u_cellCount;
  vec2 center = gridUV + vec2(0.5) / u_cellCount;

  vec2 mouseDir = u_mouse - u_prevMouse;
  float dist = length(center - u_mouse);
  float strength = smoothstep(0.3, 0.0, dist);

  vec2 uvOffset = strength * -mouseDir * 0.4;
  gl_FragColor = texture2D(u_texture, vUv - uvOffset);
}
`;

/* =======================
   ⚡ FAST FONT LOADER
======================= */
const loadedFonts = new Set();

/**
 * Load a Google Font by injecting its stylesheet and waiting for the font to be available.
 * Adds a timeout so a missing font won't block the app indefinitely.
 */
async function loadAnyGoogleFont(fontName, timeout = 5000) {
  if (loadedFonts.has(fontName)) return;

  const id = "gf-" + fontName.replace(/\s+/g, "-");
  if (!document.getElementById(id)) {
    const url =
      "https://fonts.googleapis.com/css2?family=" +
      fontName.replace(/\s+/g, "+") +
      "&display=swap";

    // Request the font ASAP using preload and swap to stylesheet on load.
    const preload = document.createElement("link");
    preload.rel = "preload";
    preload.as = "style";
    preload.href = url;
    preload.crossOrigin = "anonymous";
    document.head.appendChild(preload);

    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = url;
    link.crossOrigin = "anonymous";
    // Prevent render-blocking until it's loaded
    link.media = "print";
    link.onload = () => {
      link.media = "all";
    };
    document.head.appendChild(link);

    // Fallback for no-JS
    const noscript = document.createElement("noscript");
    noscript.innerHTML = `<link rel="stylesheet" href="${url}">`;
    document.head.appendChild(noscript);
  }

  try {
    // Wait for this specific font to be available, but don't wait forever.
    await Promise.race([
      (async () => {
        await document.fonts.load(`16px "${fontName}"`);
        await document.fonts.ready;
      })(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("font load timeout")), timeout)
      ),
    ]);
  } catch (err) {
    console.warn(`Font "${fontName}" failed to load within ${timeout}ms:`, err);
  }

  // Mark as attempted so we don't keep retrying forever.
  loadedFonts.add(fontName);

  // Notify any UI (if created) that font load state changed
  if (typeof updateControlOptionsLoaded === "function") {
    updateControlOptionsLoaded();
  }
}

/* 🔥 Warm preload (returns a promise that resolves when all requested fonts finish attempting to load) */
function preloadFontsInBackground(fonts, delay = 0) {
  if (delay > 0) {
    // Staggered load with delays
    return Promise.all(
      fonts.map(
        (font, i) =>
          new Promise((resolve) =>
            setTimeout(() => loadAnyGoogleFont(font).finally(resolve), i * delay)
          )
      )
    );
  } else {
    // Load in parallel and wait for completion
    return Promise.all(fonts.map((font) => loadAnyGoogleFont(font)));
  }
}

/* =======================
   CANVAS TEXTURE
======================= */
function createTextTexture(text, font) {
  // Clamp DPR so mobile devices don't create enormous textures
  const dpr = Math.min(Math.max(1, window.devicePixelRatio), 2);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // font sizing responsive to both width and height so it looks good on tall phones
  let fontSize = Math.min(canvas.width * 0.12, canvas.height * 0.18);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.font = `100 ${fontSize}px "${font}"`;
  while (ctx.measureText(text).width > canvas.width * 0.8) {
    fontSize *= 0.95;
    ctx.font = `100 ${fontSize}px "${font}"`;
  }

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.fillStyle = "#111";
  ctx.strokeStyle = "#111";
  ctx.lineWidth = fontSize * 0.02;

  // Keep text crisp
  if (ctx.imageSmoothingEnabled !== undefined) ctx.imageSmoothingEnabled = false;

  ctx.strokeText(text, 0, 0);
  ctx.fillText(text, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/* =======================
   FONT LIST
======================= */
const fonts = [
  "Rampart One",
  "Diplomata SC",
  "Honk",
  "Plaster",
  "Kavoon",
  "Fascinate Inline",
  "Asset",
  "Rammetto One",
  "Sekuya",
  "Bungee Shade",
  "Nosifer",
  "Monoton",
  "Eater",
  "Ultra",
  "Climate Crisis",
  "Black Ops One",
  "Rubik Gemstones",
  "Faster One",
  "BBH Bartle",
  "Danfo",
];

let currentFontIndex = 0;
let controlsSelect = null;
let controlsPanel = null;

/* =======================
   SCENE
======================= */

/* helper: pick sensible cell count based on width */
function computeCellCount() {
  // Fewer cells on small screens for more visible distortion; more on large screens.
  return Math.max(12, Math.round(window.innerWidth / 20));
}

function initScene(texture) {
  scene = new THREE.Scene();

  const aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.OrthographicCamera(
    -1, 1,
    1 / aspect,
    -1 / aspect,
    0.1,
    10
  );
  camera.position.z = 1;

  planeMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms: {
        u_mouse: { value: new THREE.Vector2() },
        u_prevMouse: { value: new THREE.Vector2() },
        u_texture: { value: texture },
        u_cellCount: { value: computeCellCount() }
      },
      vertexShader,
      fragmentShader
    })
  );

  scene.add(planeMesh);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Ensure clear color is white so the whole page stays white even if something doesn't cover it.
  renderer.setClearColor(0xffffff, 1);
  renderer.domElement.style.backgroundColor = "#ffffff";

  textContainer.appendChild(renderer.domElement);
}

/* =======================
   CONTROL PANEL + FONT SELECT
======================= */

function updateControlOptionsLoaded() {
  if (!controlsSelect) return;
  Array.from(controlsSelect.options).forEach((opt, i) => {
    const f = fonts[i];
    const loaded = loadedFonts.has(f);
    opt.text = f + (loaded ? " ✓" : "");
  });
  controlsSelect.value = currentFontIndex;
}

async function selectFont(index) {
  const idx = ((index % fonts.length) + fonts.length) % fonts.length;
  currentFontIndex = idx;
  const fontName = fonts[currentFontIndex];
  fontLabel.textContent = fontName;
  if
