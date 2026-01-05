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
   ⚡ FAST FONT LOADER (IMPROVED)
   - Inject a single combined stylesheet for all families (fewer RTTs)
   - Use the Font Loading API and track successes (don't mark failed fonts as "loaded")
   - Deduplicate concurrent requests with a promises map
======================= */
const loadedFonts = new Set();
const fontLoadPromises = new Map();

/**
 * Inject a single combined Google Fonts stylesheet for all requested families.
 * This reduces the number of round trips and makes @font-face rules available early.
 */
function injectCombinedGoogleFonts(families) {
  if (document.getElementById("gf-bundle")) return;
  const base = "https://fonts.googleapis.com/css2?display=swap";
  const familiesParam = families
    .map((f) => "&family=" + encodeURIComponent(f.replace(/\s+/g, "+")))
    .join("");
  const url = base + familiesParam;

  // Preload stylesheet ASAP to prioritize it
  const preload = document.createElement("link");
  preload.rel = "preload";
  preload.as = "style";
  preload.href = url;
  preload.crossOrigin = "anonymous";
  document.head.appendChild(preload);

  const link = document.createElement("link");
  link.id = "gf-bundle";
  link.rel = "stylesheet";
  link.href = url;
  link.crossOrigin = "anonymous";
  // Prevent blocking render until the stylesheet finishes
  link.media = "print";
  link.onload = () => {
    link.media = "all";
  };
  document.head.appendChild(link);
}

/**
 * Load a single font; returns true if successfully loaded, false otherwise.
 * Uses document.fonts.load and respects a timeout. Promises are deduplicated.
 */
async function loadAnyGoogleFont(fontName, timeout = 10000) {
  if (loadedFonts.has(fontName)) return true;
  if (fontLoadPromises.has(fontName)) return fontLoadPromises.get(fontName);

  // Ensure bundle exists so @font-face rules are declared early
  injectCombinedGoogleFonts(fonts);

  const p = (async () => {
    try {
      const loaded = await Promise.race([
        document.fonts.load(`16px "${fontName}"`),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("font load timeout")), timeout)
        ),
      ]);

      // document.fonts.load resolves to an array; if empty => treat as failure
      if (!loaded || loaded.length === 0) throw new Error("font not available after load");
      await document.fonts.ready;
      loadedFonts.add(fontName);
      return true;
    } catch (err) {
      console.warn(`Font "${fontName}" failed to load within ${timeout}ms:`, err);
      return false;
    } finally {
      fontLoadPromises.delete(fontName);
    }
  })();

  fontLoadPromises.set(fontName, p);
  return p;
}

/* 🔥 Warm preload (returns a promise that resolves when all requested fonts finish attempting to load) */
function preloadFontsInBackground(fontsList, delay = 0) {
  // Make sure the combined stylesheet is injected once
  injectCombinedGoogleFonts(fontsList);

  if (delay > 0) {
    // Staggered load with delays
    return Promise.all(
      fontsList.map(
        (font, i) =>
          new Promise((resolve) =>
            setTimeout(() => loadAnyGoogleFont(font).finally(resolve), i * delay)
          )
      )
    );
  } else {
    // Load in parallel and wait for completion
    return Promise.all(fontsList.map((font) => loadAnyGoogleFont(font)));
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
  "Honk",
  "Diplomata SC",
  "Plaster",
  "Kavoon",
  "Fascinate Inline",
  "Asset",
  "Rammetto One",
  // "Oi",
  "Sekuya",
  "Bungee Shade",
  "Nosifer",
  "Monoton",
  "Eater",
  "Ultra",
  // "Rubik Glitch",
  "Climate Crisis",
  // "Rubik Glitch Pop",
  "Black Ops One",
  "Luckiest Guy",
  "Rubik Gemstones",
  "Faster One",
  "BBH Bartle",
  "Danfo",
];

let currentFontIndex = 0;

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
   CHANGE FONT (USER ONLY)
======================= */
async function changeFont(step = 1) {
  currentFontIndex =
    (currentFontIndex + step + fonts.length) % fonts.length;

  const fontName = fonts[currentFontIndex];
  fontLabel.textContent = fontName;

  await loadAnyGoogleFont(fontName);

  const oldTex = planeMesh.material.uniforms.u_texture.value;
  oldTex.dispose();

  planeMesh.material.uniforms.u_texture.value =
    createTextTexture("Distort", fontName);
}

/* =======================
   RENDER LOOP
======================= */
function animate() {
  requestAnimationFrame(animate);

  mousePosition.x += (targetMousePosition.x - mousePosition.x) * easeFactor;
  mousePosition.y += (targetMousePosition.y - mousePosition.y) * easeFactor;

  planeMesh.material.uniforms.u_mouse.value.set(
    mousePosition.x,
    1 - mousePosition.y
  );
  planeMesh.material.uniforms.u_prevMouse.value.set(
    prevPosition.x,
    1 - prevPosition.y
  );

  renderer.render(scene, camera);
}

/* =======================
   EVENTS (DESKTOP + MOBILE)
======================= */

/* Replace mousemove with pointermove which works for mouse/touch/pen */
textContainer.addEventListener("pointermove", e => {
  easeFactor = 0.035;
  const r = textContainer.getBoundingClientRect();
  prevPosition = { ...targetMousePosition };
  targetMousePosition.x = (e.clientX - r.left) / r.width;
  targetMousePosition.y = (e.clientY - r.top) / r.height;
});

/* Touch handlers: update positions and prevent default scrolling (body overflow is hidden but safer) */
let _touchStartPos = null;
let _touchMoved = false;
let _lastTapTime = 0;
let _lastTapPos = { x: 0, y: 0 };
const DOUBLE_TAP_DELAY = 350; // ms
const DOUBLE_TAP_MAX_DIST = 30; // px

function isPhone() {
  return (('ontouchstart' in window) || navigator.maxTouchPoints > 0) && window.innerWidth <= 767;
}

function isLargeScreen() {
  return window.innerWidth >= 768;
}

textContainer.addEventListener("touchstart", e => {
  const t = e.touches[0];
  if (!t) return;
  // mark potential tap start
  _touchStartPos = { x: t.clientX, y: t.clientY };
  _touchMoved = false;

  e.preventDefault();
  easeFactor = 0.045;
  const r = textContainer.getBoundingClientRect();
  prevPosition = { ...targetMousePosition };
  targetMousePosition.x = (t.clientX - r.left) / r.width;
  targetMousePosition.y = (t.clientY - r.top) / r.height;
});

textContainer.addEventListener("touchmove", e => {
  const t = e.touches[0];
  if (!t) return;
  const dx = t.clientX - (_touchStartPos ? _touchStartPos.x : t.clientX);
  const dy = t.clientY - (_touchStartPos ? _touchStartPos.y : t.clientY);
  if (Math.hypot(dx, dy) > 8) _touchMoved = true; // small threshold to cancel tap
  e.preventDefault();
  easeFactor = 0.03;
  const r = textContainer.getBoundingClientRect();
  prevPosition = { ...targetMousePosition };
  targetMousePosition.x = (t.clientX - r.left) / r.width;
  targetMousePosition.y = (t.clientY - r.top) / r.height;
});

textContainer.addEventListener("touchend", e => {
  // On phones, require double-tap to change fonts. On non-phone devices, touches don't change fonts.
  const t = e.changedTouches && e.changedTouches[0];
  if (!t) return;
  if (_touchMoved) {
    _touchMoved = false;
    _touchStartPos = null;
    return;
  }

  if (!isPhone()) {
    // Not a phone — don't change fonts via touch
    _touchStartPos = null;
    return;
  }

  const now = Date.now();
  const tapPos = { x: t.clientX, y: t.clientY };
  const dt = now - _lastTapTime;
  const dist = Math.hypot(tapPos.x - _lastTapPos.x, tapPos.y - _lastTapPos.y);

  if (dt <= DOUBLE_TAP_DELAY && dist <= DOUBLE_TAP_MAX_DIST) {
    // Double-tap detected -> change font
    changeFont(1);
    _lastTapTime = 0;
    _lastTapPos = { x: 0, y: 0 };
  } else {
    // Store this tap as a candidate for a second tap
    _lastTapTime = now;
    _lastTapPos = tapPos;
  }

  _touchStartPos = null;
});

// Spacebar changes font only on large screens
window.addEventListener("keydown", e => {
  if (e.code === "Space" && isLargeScreen()) {
    e.preventDefault();
    changeFont(1);
  }
});

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  if (planeMesh && planeMesh.material && planeMesh.material.uniforms.u_cellCount) {
    planeMesh.material.uniforms.u_cellCount.value = computeCellCount();
  }
  changeFont(0); // regenerate texture to match new size
});

/* =======================
   START
======================= */
(async () => {
  fontLabel.textContent = fonts[0];

  // Inject combined stylesheet ASAP to start fetching @font-face rules quickly
  injectCombinedGoogleFonts(fonts);

  // Load first font immediately and ensure it's ready (so the initial canvas uses the correct font)
  await loadAnyGoogleFont(fonts[0]);

  // Start warm-preload of remaining fonts in background (don't block initial render)
  preloadFontsInBackground(fonts.slice(1), 0);

  // Initialize the scene now that the initial font is available
  initScene(createTextTexture("Distort", fonts[0]));
  animate();

  // Warm-preload continues in background
})();
