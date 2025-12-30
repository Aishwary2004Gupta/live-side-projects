const textContainer = document.getElementById("textContainer");
const fontLabel = document.getElementById("fontName");

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

void main() {
  vec2 gridUV = floor(vUv * 40.0) / 40.0;
  vec2 center = gridUV + vec2(1.0 / 40.0);

  vec2 mouseDir = u_mouse - u_prevMouse;
  float dist = length(center - u_mouse);
  float strength = smoothstep(0.3, 0.0, dist);

  vec2 uvOffset = strength * -mouseDir * 0.4;
  gl_FragColor = texture2D(u_texture, vUv - uvOffset);
}
`;

/* =======================
   GOOGLE FONT LOADER
======================= */
async function loadAnyGoogleFont(fontName) {
  const id = "gf-" + fontName.replace(/\s+/g, "-");

  if (!document.getElementById(id)) {
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=" +
      fontName.replace(/\s+/g, "+") +
      "&display=swap";
    document.head.appendChild(link);
  }

  await document.fonts.load(`16px "${fontName}"`);
}

/* =======================
   CANVAS TEXTURE
======================= */
function createTextTexture(text, font) {
  const dpr = Math.max(1, window.devicePixelRatio);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let fontSize = canvas.width * 0.12;
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

  return new THREE.CanvasTexture(canvas);
}

/* =======================
   FONT LIST
======================= */
const fonts = [
  "Nosifer",
  "Creepster",
  "Butcherman",
  "Eater",
  "Rubik Glitch",
  "Rubik Glitch Pop",
  "Bungee",
  "Bungee Inline",
  "Bungee Shade",
  "Luckiest Guy",
  "Black Ops One",
  "Wallpoet",
  "Monoton",
  "Faster One"
];

let currentFontIndex = 0;

/* =======================
   SCENE
======================= */
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
        u_texture: { value: texture }
      },
      vertexShader,
      fragmentShader
    })
  );

  scene.add(planeMesh);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

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
   LOOP
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

// Mouse move (desktop)
textContainer.addEventListener("mousemove", e => {
  easeFactor = 0.035;
  const r = textContainer.getBoundingClientRect();
  prevPosition = { ...targetMousePosition };
  targetMousePosition.x = (e.clientX - r.left) / r.width;
  targetMousePosition.y = (e.clientY - r.top) / r.height;
});

// Double click (desktop)
textContainer.addEventListener("dblclick", () => changeFont(1));

// Spacebar (desktop)
window.addEventListener("keydown", e => {
  if (e.code === "Space") {
    e.preventDefault();
    changeFont(1);
  }
});

// Tap (mobile)
textContainer.addEventListener("touchend", () => {
  changeFont(1);
});

// Resize
window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  changeFont(0);
});

/* =======================
   START
======================= */
(async () => {
  fontLabel.textContent = fonts[0];
  await loadAnyGoogleFont(fonts[0]);
  initScene(createTextTexture("Distort", fonts[0]));
  animate();
})();
