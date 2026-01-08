import * as THREE from "https://unpkg.com/three@0.155.0/build/three.module.js";

/* =======================
   DOM
======================= */
const container = document.getElementById("textContainer");
const fontPanel = document.getElementById("fontPanel");
const fontLabel = document.getElementById("fontName");

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
const loadedFonts = new Set();

/* =======================
   FONT LOAD + PRIME
======================= */
async function loadFont(font) {
  if (!loadedFonts.has(font)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=" +
      font.replace(/\s+/g, "+") +
      "&display=swap";
    document.head.appendChild(link);

    await document.fonts.load(`16px "${font}"`);
    await document.fonts.ready;
    loadedFonts.add(font);
  }

  // Prime font for canvas
  const span = document.createElement("span");
  span.textContent = "Distort";
  span.style.position = "absolute";
  span.style.opacity = "0";
  span.style.fontFamily = `"${font}"`;
  span.style.fontSize = "100px";
  document.body.appendChild(span);
  span.offsetWidth;
  document.body.removeChild(span);
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
  ctx.font = `100 ${size}px "${font}"`;
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
   APPLY FONT (single source)
======================= */
async function applyFont(index) {
  currentFontIndex = index;
  const font = fonts[index];
  fontLabel.textContent = font;

  await loadFont(font);

  plane.material.uniforms.u_texture.value.dispose();
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
  div.style.fontFamily = `"${font}", system-ui`;
  div.onclick = () => applyFont(i);
  fontPanel.appendChild(div);
});

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
   START
======================= */
(async () => {
  await loadFont(fonts[0]);
  initScene(createTextTexture("Distort", fonts[0]));
  await applyFont(0);
  animate();
})();
