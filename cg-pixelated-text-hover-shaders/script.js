import * as THREE from "https://unpkg.com/three@0.155.0/build/three.module.js";

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
   ⚡ FONT LOADER
======================= */
const loadedFonts = new Set();

async function loadAnyGoogleFont(fontName, timeout = 5000) {
  if (loadedFonts.has(fontName)) return;

  const id = "gf-" + fontName.replace(/\s+/g, "-");
  if (!document.getElementById(id)) {
    const url =
      "https://fonts.googleapis.com/css2?family=" +
      fontName.replace(/\s+/g, "+") +
      "&display=swap";

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
    link.media = "print";
    link.onload = () => (link.media = "all");
    document.head.appendChild(link);
  }

  try {
    await Promise.race([
      (async () => {
        await document.fonts.load(`16px "${fontName}"`);
        await document.fonts.ready;
      })(),
      new Promise((_, reject) =>
        setTimeout(() => reject("Font load timeout"), timeout)
      ),
    ]);
  } catch (e) {
    console.warn(`Font "${fontName}" load issue`, e);
  }

  loadedFonts.add(fontName);
}

/* =======================
   🔥 FONT PRIMER (CRITICAL)
======================= */
function primeFont(font) {
  const span = document.createElement("span");
  span.textContent = "Distort";
  span.style.position = "absolute";
  span.style.opacity = "0";
  span.style.pointerEvents = "none";
  span.style.fontFamily = `"${font}"`;
  span.style.fontSize = "100px";
  document.body.appendChild(span);

  // Force layout & glyph rasterization
  span.offsetWidth;

  document.body.removeChild(span);
}

/* =======================
   CANVAS TEXTURE
======================= */
function createTextTexture(text, font) {
  const dpr = Math.min(Math.max(1, window.devicePixelRatio), 2);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

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

  ctx.strokeText(text, 0, 0);
  ctx.fillText(text, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;

  return tex;
}


/* =======================
   FONT LIST
======================= */
const fonts = [
  "Diplomata SC",
  "Rampart One",
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

/* =======================
   SCENE
======================= */
function computeCellCount() {
  return Math.max(12, Math.round(window.innerWidth / 20));
}

function initScene(texture) {
  scene = new THREE.Scene();

  const aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.OrthographicCamera(-1, 1, 1 / aspect, -1 / aspect, 0.1, 10);
  camera.position.z = 1;

  planeMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms: {
        u_mouse: { value: new THREE.Vector2() },
        u_prevMouse: { value: new THREE.Vector2() },
        u_texture: { value: texture },
        u_cellCount: { value: computeCellCount() },
      },
      vertexShader,
      fragmentShader,
    })
  );

  scene.add(planeMesh);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0xffffff, 1);

  textContainer.appendChild(renderer.domElement);
}

/* =======================
   CHANGE FONT
======================= */
async function changeFont(step = 1) {
  currentFontIndex =
    (currentFontIndex + step + fonts.length) % fonts.length;

  const font = fonts[currentFontIndex];
  fontLabel.textContent = font;

  await loadAnyGoogleFont(font);
  primeFont(font);

  planeMesh.material.uniforms.u_texture.value.dispose();
  planeMesh.material.uniforms.u_texture.value =
    createTextTexture("Distort", font);
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
   EVENTS
======================= */
textContainer.addEventListener("pointermove", (e) => {
  const r = textContainer.getBoundingClientRect();
  prevPosition = { ...targetMousePosition };
  targetMousePosition.x = (e.clientX - r.left) / r.width;
  targetMousePosition.y = (e.clientY - r.top) / r.height;
});

window.addEventListener("keydown", (e) => {
  if (e.code === "Space" && window.innerWidth >= 768) {
    e.preventDefault();
    changeFont(1);
  }
});

let lastTap = 0;
textContainer.addEventListener("touchend", () => {
  if (window.innerWidth > 767) return;
  const now = Date.now();
  if (now - lastTap < 350) changeFont(1);
  lastTap = now;
});

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  planeMesh.material.uniforms.u_cellCount.value = computeCellCount();
  changeFont(0);
});

/* =======================
   START (FIXED)
======================= */
(async () => {
  fontLabel.textContent = fonts[0];

  await loadAnyGoogleFont(fonts[0]);
  primeFont(fonts[0]);

  preloadFontsInBackground(fonts.slice(1), 0);

  initScene(createTextTexture("Distort", fonts[0]));
  animate();
})();
