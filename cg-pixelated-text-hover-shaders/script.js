import * as THREE from "https://unpkg.com/three@0.155.0/build/three.module.js";

const textContainer = document.getElementById("textContainer");
const fontLabel = document.getElementById("fontName");
const fontPanel = document.getElementById("fontPanel");

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
   FONT LOADING + PRIMING
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

  // 🔥 PRIME FONT (canvas-safe)
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
   THREE SETUP
======================= */
let scene, camera, renderer, planeMesh;

const vertexShader = `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
}
`;

const fragmentShader = `
varying vec2 vUv;
uniform sampler2D u_texture;
uniform vec2 u_mouse;
uniform vec2 u_prevMouse;
uniform float u_cellCount;

void main(){
  vec2 gridUV = floor(vUv * u_cellCount) / u_cellCount;
  vec2 center = gridUV + vec2(0.5) / u_cellCount;
  vec2 dir = u_mouse - u_prevMouse;
  float d = length(center - u_mouse);
  float strength = smoothstep(0.3,0.0,d);
  gl_FragColor = texture2D(u_texture, vUv - dir * strength * 0.4);
}
`;

function createTextTexture(text, font) {
  const dpr = Math.min(window.devicePixelRatio, 2);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;

  ctx.fillStyle = "#fff";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  let size = Math.min(canvas.width * 0.12, canvas.height * 0.18);
  ctx.font = `100 ${size}px "${font}"`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.fillStyle = "#111";
  ctx.strokeStyle = "#111";
  ctx.lineWidth = size * 0.02;
  ctx.strokeText(text,0,0);
  ctx.fillText(text,0,0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

function initScene(texture) {
  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(-1,1,1,-1,0.1,10);
  camera.position.z = 1;

  planeMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2,2),
    new THREE.ShaderMaterial({
      uniforms:{
        u_texture:{ value:texture },
        u_mouse:{ value:new THREE.Vector2() },
        u_prevMouse:{ value:new THREE.Vector2() },
        u_cellCount:{ value: Math.max(12, window.innerWidth / 20) }
      },
      vertexShader,
      fragmentShader
    })
  );

  scene.add(planeMesh);

  renderer = new THREE.WebGLRenderer({ antialias:true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  renderer.setClearColor(0xffffff,1);

  textContainer.appendChild(renderer.domElement);
}

/* =======================
   APPLY FONT (SINGLE SOURCE OF TRUTH)
======================= */
async function applyFont(index) {
  currentFontIndex = index;
  const font = fonts[index];

  fontLabel.textContent = font;
  await loadFont(font);

  planeMesh.material.uniforms.u_texture.value.dispose();
  planeMesh.material.uniforms.u_texture.value =
    createTextTexture("Distort", font);

  document
    .querySelectorAll(".font-item")
    .forEach((el,i)=>el.classList.toggle("active", i === index));
}

/* =======================
   FONT PANEL UI
======================= */
fonts.forEach((font, i) => {
  const item = document.createElement("div");
  item.className = "font-item";
  item.textContent = font;
  item.style.fontFamily = `"${font}", system-ui`;
  item.onclick = () => applyFont(i);
  fontPanel.appendChild(item);
});

/* =======================
   INPUTS
======================= */
window.addEventListener("keydown", e => {
  if (e.code === "Space" && window.innerWidth >= 768) {
    e.preventDefault();
    applyFont((currentFontIndex + 1) % fonts.length);
  }
});

let lastTap = 0;
textContainer.addEventListener("touchend", () => {
  const now = Date.now();
  if (now - lastTap < 350) {
    applyFont((currentFontIndex + 1) % fonts.length);
  }
  lastTap = now;
});

/* =======================
   START
======================= */
(async () => {
  await loadFont(fonts[0]);
  initScene(createTextTexture("Distort", fonts[0]));
  applyFont(0);
})();
