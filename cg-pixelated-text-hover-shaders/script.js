const textContainer = document.getElementById("textContainer");
let easeFactor = 0.02;
let scene, camera, renderer, planeMesh;
let mousePosition = { x: 0.5, y: 0.5 };
let targetMousePosition = { x: 0.5, y: 0.5 };
let prevPosition = { x: 0.5, y: 0.5 };

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
    vec2 gridUV = floor(vUv * vec2(40.0, 40.0)) / vec2(40.0, 40.0);
    vec2 centerOfPixel = gridUV + vec2(1.0/40.0, 1.0/40.0);

    vec2 mouseDirection = u_mouse - u_prevMouse;

    vec2 pixelToMouseDirection = centerOfPixel - u_mouse;
    float pixelDistanceToMouse = length(pixelToMouseDirection);
    float strength = smoothstep(0.3, 0.0, pixelDistanceToMouse);

    vec2 uvOffset = strength * -mouseDirection * 0.4;
    vec2 uv = vUv - uvOffset;

    vec4 color = texture2D(u_texture, uv);
    gl_FragColor = color;
  }
`;

function createTextTexture(text, font, size, color, fontWeight = "100") {
  // create high-DPR canvas
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const cssWidth = window.innerWidth;
  const cssHeight = window.innerHeight;

  canvas.width = Math.floor(cssWidth * dpr);
  canvas.height = Math.floor(cssHeight * dpr);

  // background
  ctx.fillStyle = color || "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // initial font size based on canvas width (allows fonts to differ naturally)
  let fontSizePx = Math.max(12, Math.floor(canvas.width * 0.12));

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // max allowed width so it doesn't touch edges (keep margins)
  const maxAllowedWidth = canvas.width * 0.8; // 10% margin each side

  // reduce font size until width fits
  ctx.font = `${fontWeight} ${fontSizePx}px "${font || "Blanquotey"}"`;
  let metrics = ctx.measureText(text);
  while (metrics.width > maxAllowedWidth && fontSizePx > 10) {
    fontSizePx = Math.floor(fontSizePx * 0.95);
    ctx.font = `${fontWeight} ${fontSizePx}px "${font || "Blanquotey"}"`;
    metrics = ctx.measureText(text);
  }

  // center drawing
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);

  // stroke + fill with sizes proportional to fontSizePx
  ctx.strokeStyle = "#1a1a1a";
  ctx.fillStyle = "#1a1a1a";
  ctx.lineWidth = Math.max(1, fontSizePx * 0.02);

  // draw strokes and fill
  for (let i = 0; i < 2; i++) {
    ctx.strokeText(text, 0, 0);
  }
  ctx.fillText(text, 0, 0);

  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;

  return tex;
}

const fonts = [
  "Luckiest Guy",
  "Nosifer",
  "Abril Fatface",
  "Press Start 2P",
  "UnifrakturCook",
  "Playball",
  "Pacifico",
  "Bebas Neue",
  "Space Mono",
  "Rubik",
  "Cinzel",
  "Orbitron",
  "Lobster",
  "Permanent Marker",
  "VT323",
  "Monoton",
  "Fredericka the Great",
  "Rye",
  "IM Fell English SC",
  "Major Mono Display",
];


let currentFontIndex = 0;

function initializeScene(texture) {
  scene = new THREE.Scene();

  const aspectRatio = window.innerWidth / window.innerHeight;
  camera = new THREE.OrthographicCamera(
    -1,
    1,
    1 / aspectRatio,
    -1 / aspectRatio,
    0.1,
    1000
  );
  camera.position.z = 1;

  let shaderUniforms = {
    u_mouse: { type: "v2", value: new THREE.Vector2() },
    u_prevMouse: { type: "v2", value: new THREE.Vector2() },
    u_texture: { type: "t", value: texture },
  };

  planeMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms: shaderUniforms,
      vertexShader,
      fragmentShader,
    })
  );

  scene.add(planeMesh);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setClearColor(0xffffff, 1);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  textContainer.appendChild(renderer.domElement);
}

function reloadTexture(font) {
  // dispose previous texture (if any) to avoid leaks
  const prevTexture = planeMesh.material.uniforms.u_texture.value;
  if (prevTexture && prevTexture.dispose) {
    prevTexture.dispose();
  }

  const newTexture = createTextTexture("Distort", font, null, "#ffffff", "100");
  newTexture.needsUpdate = true;
  planeMesh.material.uniforms.u_texture.value = newTexture;
  planeMesh.material.needsUpdate = true;
}

initializeScene(
  createTextTexture("Distort", fonts[currentFontIndex], null, "#ffffff", "100")
);

function animateScene() {
  requestAnimationFrame(animateScene);

  mousePosition.x += (targetMousePosition.x - mousePosition.x) * easeFactor;
  mousePosition.y += (targetMousePosition.y - mousePosition.y) * easeFactor;

  planeMesh.material.uniforms.u_mouse.value.set(
    mousePosition.x,
    1.0 - mousePosition.y
  );

  planeMesh.material.uniforms.u_prevMouse.value.set(
    prevPosition.x,
    1.0 - prevPosition.y
  );

  renderer.render(scene, camera);
}

animateScene();

textContainer.addEventListener("mousemove", handleMouseMove);
textContainer.addEventListener("mouseenter", handleMouseEnter);
textContainer.addEventListener("mouseleave", handleMouseLeave);

textContainer.addEventListener("dblclick", () => {
  changeFont(1);
});

window.addEventListener("keydown", (e) => {
  if (e.code === "Space" && window.innerWidth >= 768) {
    e.preventDefault();
    changeFont(1);
  }
});

function handleMouseMove(event) {
  easeFactor = 0.035;
  let rect = textContainer.getBoundingClientRect();
  prevPosition = { ...targetMousePosition };

  targetMousePosition.x = (event.clientX - rect.left) / rect.width;
  targetMousePosition.y = (event.clientY - rect.top) / rect.height;
}

function handleMouseEnter(event) {
  easeFactor = 0.01;
  let rect = textContainer.getBoundingClientRect();

  mousePosition.x = targetMousePosition.x =
    (event.clientX - rect.left) / rect.width;
  mousePosition.y = targetMousePosition.y =
    (event.clientY - rect.top) / rect.height;
}

function handleMouseLeave() {
  easeFactor = 0.01;
  targetMousePosition = { ...prevPosition };
}

async function changeFont(step = 1) {
  currentFontIndex = (currentFontIndex + step + fonts.length) % fonts.length;
  const fontName = fonts[currentFontIndex];

  // attempt to ensure font is ready for canvas rendering
  try {
    await document.fonts.load(`16px "${fontName}"`);
  } catch (err) {
    // ignore load errors, still attempt to render
  }

  reloadTexture(fontName);
}

window.addEventListener("resize", onWindowResize, false);

function onWindowResize() {
  const aspectRatio = window.innerWidth / window.innerHeight;
  camera.left = -1;
  camera.right = 1;
  camera.top = 1 / aspectRatio;
  camera.bottom = -1 / aspectRatio;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  reloadTexture(fonts[currentFontIndex]);
}
