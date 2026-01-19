import * as THREE from "https://unpkg.com/three@0.155.0/build/three.module.js";

/* =======================
   DOM
======================= */
const container = document.getElementById("textContainer");
const fontPanel = document.getElementById("fontPanel");
const fontLabel = document.getElementById("fontName");
const darkModeToggle = document.getElementById("darkModeToggle");

/* =======================
   DARK MODE
======================= */
function initDarkMode() {
  const isDarkMode = localStorage.getItem("darkMode") === "true";
  if (isDarkMode) {
    document.body.classList.add("dark-mode");
  }

  darkModeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    localStorage.setItem("darkMode", isDark);
  });
}

/* =======================
   FONT LIST
======================= */
const fonts = [
  "Rampart One",
  "Sekuya",
  "Bungee Shade",
  "Coral Pixels",
  "Rubik Puddles",
  "Honk",
  "Diplomata SC",
  "Agu Display",
  "Plaster",
  "Kavoon",
  "Oi",
  "Fascinate Inline",
  "Asset",
  "Rammetto One",
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
const loadedFonts = new Set();

/* =======================
   FONT LOAD
======================= */
async function loadFont(font, text = "Distort", maxAttempts = 3) {
  // If it's already verified loaded, short-circuit
  if (loadedFonts.has(font)) return true;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=" +
    font.replace(/\s+/g, "+") +
    "&display=swap";
  document.head.appendChild(link);

  const fontSpec = `100px "${font}"`;

  // Try to load and verify the font a few times before giving up
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // If the font is already available for the given text/size, mark as loaded
    if (document.fonts.check(fontSpec, text)) {
      loadedFonts.add(font);
      return true;
    }

    try {
      await document.fonts.load(fontSpec, text);
    } catch (e) {
      console.warn(`Attempt ${attempt} failed to load font ${font}`, e);
    }

    // Give the browser a couple frames to apply glyphs; increase waits slightly per attempt
    await waitFrames(1 + attempt);
  }

  // Final verification before giving up
  if (document.fonts.check(fontSpec, text)) {
    loadedFonts.add(font);
    return true;
  }

  console.warn(`Font ${font} did not become available after ${maxAttempts} attempts.`);
  return false;
}

/* 🔥 FRAME WAIT (CRITICAL) */
function waitFrames(count = 2) {
  return new Promise(resolve => {
    let i = 0;
    function tick() {
      i++;
      if (i >= count) resolve();
      else requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}

/* =======================
   THREE STATE
======================= */
let scene, camera, renderer, plane;
let mouse = new THREE.Vector2(0.5, 0.5);
let prevMouse = new THREE.Vector2(0.5, 0.5);
let targetMouse = new THREE.Vector2(0.5, 0.5);
const ease = 0.04;

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

const fragmentShader = `
varying vec2 vUv;
uniform sampler2D u_texture;
uniform vec2 u_mouse;
uniform vec2 u_prevMouse;
uniform float u_cellCount;

void main() {
  vec2 grid = floor(vUv * u_cellCount) / u_cellCount;
  vec2 center = grid + vec2(0.5) / u_cellCount;

  vec2 dir = u_mouse - u_prevMouse;
  float d = length(center - u_mouse);
  float strength = smoothstep(0.35, 0.0, d);

  vec2 offset = strength * -dir * 0.5;
  gl_FragColor = texture2D(u_texture, vUv - offset);
}
`;

/* =======================
   TEXTURE
======================= */
function createTextTexture(text, font) {
  const dpr = Math.min(window.devicePixelRatio, 2);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;

  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let size = Math.min(canvas.width * 0.12, canvas.height * 0.18);
  ctx.font = `${size}px "${font}"`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.fillStyle = "#111";
  ctx.strokeStyle = "#111";
  ctx.lineWidth = size * 0.02;
  ctx.strokeText(text, 0, 0);
  ctx.fillText(text, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

/* =======================
   SCENE
======================= */
function initScene(texture) {
  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 1;

  plane = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms: {
        u_texture: { value: texture },
        u_mouse: { value: mouse },
        u_prevMouse: { value: prevMouse },
        u_cellCount: { value: Math.max(12, window.innerWidth / 20) },
      },
      vertexShader,
      fragmentShader,
    })
  );

  scene.add(plane);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0xffffff, 1);

  container.appendChild(renderer.domElement);
}

/* =======================
   APPLY FONT (FIXED)
======================= */
async function applyFont(index) {
  currentFontIndex = index;
  const font = fonts[index];
  fontLabel.textContent = font;

  await loadFont(font);

  // DOM prime
  const span = document.createElement("span");
  span.textContent = "Distort";
  span.style.position = "absolute";
  span.style.opacity = "0";
  span.style.fontFamily = `"${font}"`;
  span.style.fontSize = "100px";
  document.body.appendChild(span);
  span.offsetWidth;
  document.body.removeChild(span);

  // 🔥 WAIT FOR GLYPHS
  await waitFrames(2);

  const oldTex = plane.material.uniforms.u_texture.value;
  if (oldTex) oldTex.dispose();

  plane.material.uniforms.u_texture.value =
    createTextTexture("Distort", font);

  document.querySelectorAll(".font-item").forEach((el, i) =>
    el.classList.toggle("active", i === index)
  );
}

/* =======================
   FONT PANEL
======================= */
fonts.forEach((font, i) => {
  const div = document.createElement("div");
  div.className = "font-item";
  div.textContent = font;
  div.onclick = () => applyFont(i);
  fontPanel.appendChild(div);
});

// Preload remaining fonts in the background so switches are instant
async function preloadAllFonts() {
  for (let i = 0; i < fonts.length; i++) {
    // skip already loaded fonts
    if (!loadedFonts.has(fonts[i])) {
      await loadFont(fonts[i], "Distort");
      await waitFrames(1);
    }
  }
}

/* =======================
   FONT PRELOAD HELPERS (NEW)
======================= */
// Ensure glyphs are available by forcing a layout/paint for the font
async function primeFont(font) {
  const span = document.createElement("span");
  span.textContent = "Distort";
  span.style.position = "absolute";
  span.style.opacity = "0";
  span.style.fontFamily = `"${font}"`;
  span.style.fontSize = "100px";
  document.body.appendChild(span);
  // Force reflow to ensure glyphs are loaded/applied
  span.offsetWidth;
  document.body.removeChild(span);
  await waitFrames(2);
}

// Preconnect + load + prime the first font for the page (improves initial render)
async function preloadFirstFont(font) {
  // Preconnect to Google Fonts endpoints for faster fetch
  const p1 = document.createElement("link");
  p1.rel = "preconnect";
  p1.href = "https://fonts.googleapis.com";
  document.head.appendChild(p1);

  const p2 = document.createElement("link");
  p2.rel = "preconnect";
  p2.href = "https://fonts.gstatic.com";
  p2.crossOrigin = "true";
  document.head.appendChild(p2);

  const ok = await loadFont(font);
  if (ok) {
    await primeFont(font);
    loadedFonts.add(font); // ensure it's marked as loaded
  }
  return ok;
}

/* =======================
   INPUT
======================= */
container.addEventListener("pointermove", (e) => {
  const r = container.getBoundingClientRect();
  prevMouse.copy(targetMouse);
  targetMouse.set(
    (e.clientX - r.left) / r.width,
    1 - (e.clientY - r.top) / r.height
  );
});

window.addEventListener("keydown", (e) => {
  if (e.code === "Space" && window.innerWidth >= 768) {
    e.preventDefault();
    applyFont((currentFontIndex + 1) % fonts.length);
  }
});

let lastTap = 0;
container.addEventListener("touchend", () => {
  const now = Date.now();
  if (now - lastTap < 350) {
    applyFont((currentFontIndex + 1) % fonts.length);
  }
  lastTap = now;
});

/* =======================
   LOOP
======================= */
function animate() {
  requestAnimationFrame(animate);
  mouse.lerp(targetMouse, ease);
  renderer.render(scene, camera);
}

/* =======================
   START (MODIFIED)
======================= */
(async () => {
  // Initialize dark mode
  initDarkMode();
  
  // Preload & prime the first font (Rampart One) before creating the initial texture
  await preloadFirstFont(fonts[0]);
  initScene(createTextTexture("Distort", fonts[0]));
  await applyFont(0);
  animate();
  // Start background preload of all fonts (non-blocking)
  preloadAllFonts();
})();
