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
   ⚡ FAST FONT LOADER
======================= */
const loadedFonts = new Set();

// Common system fonts that are already available on most OSes — loading these is fast and deterministic
const SYSTEM_FONTS = new Set([
  'system-ui', 'Arial', 'Helvetica', 'Verdana', 'Tahoma', 'Georgia', 'Times New Roman', 'Courier New'
]);

async function loadAnyGoogleFont(fontName) {
  if (loadedFonts.has(fontName)) return;

  // If the font is a system font, just wait for the font to be ready (should resolve quickly)
  if (SYSTEM_FONTS.has(fontName)) {
    try {
      await document.fonts.load(`16px "${fontName}"`);
    } catch (e) {
      // ignore — system font availability failures are extremely rare
    }
    loadedFonts.add(fontName);
    return;
  }

  const id = "gf-" + fontName.replace(/\s+/g, "-");
  const familyParam = fontName.replace(/\s+/g, "+");
  const url = `https://fonts.googleapis.com/css2?family=${familyParam}&display=swap`;

  // Try to fetch the CSS and load the actual font file (woff2) via FontFace API for deterministic loading
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (res.ok) {
      const css = await res.text();

      // Prefer woff2 URL if available
      let match = css.match(/url\((https:[^)]+\.woff2[^)]*)\)\s+format\('woff2'\)/i);
      if (!match) {
        // fallback: take the first url(...) occurrence
        match = css.match(/url\((https?:\/\/[^)]+)\)/i);
      }

      if (match) {
        const woffUrl = match[1].replace(/"|'/g, "");

        try {
          const fontFace = new FontFace(fontName, `url(${woffUrl})`, {
            style: 'normal',
            weight: '400',
            display: 'swap'
          });

          // Retry load up to 2 times for transient network failures
          let loaded = false;
          for (let attempt = 0; attempt < 3 && !loaded; attempt++) {
            try {
              await fontFace.load();
              loaded = true;
            } catch (lfErr) {
              if (attempt < 2) await new Promise(r => setTimeout(r, 200 * (attempt + 1)));
            }
          }

          if (loaded) {
            document.fonts.add(fontFace);
            loadedFonts.add(fontName);

            // Also add stylesheet link for normal browser usage (non-blocking)
            if (!document.getElementById(id)) {
              const link = document.createElement('link');
              link.id = id;
              link.rel = 'stylesheet';
              link.href = url;
              link.crossOrigin = 'anonymous';
              document.head.appendChild(link);
            }

            return; // success
          }
        } catch (innerErr) {
          // continue to fallback path
          console.warn('FontFace load failed for', fontName, innerErr);
        }
      }
    }
  } catch (err) {
    console.warn('Failed to fetch Google Fonts CSS for', fontName, err);
  }

  // Fallback: inject stylesheet and wait for the font to be available
  if (!document.getElementById(id)) {
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = url;
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
  }

  // Wait specifically for this font to be usable, then mark it loaded
  try {
    await document.fonts.load(`16px "${fontName}"`);
    await document.fonts.ready;
  } catch (e) {
    console.warn('document.fonts.load failed for', fontName, e);
  }

  loadedFonts.add(fontName);
} 

/* 🔥 Warm preload (non-blocking) — no delay if delay is 0 */
function preloadFontsInBackground(fonts, delay = 0) {
  fonts.forEach((font, i) => {
    if (delay > 0) {
      setTimeout(() => loadAnyGoogleFont(font), i * delay);
    } else {
      // Load immediately, don't defer
      loadAnyGoogleFont(font);
    }
  });
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

  ctx.font = `400 ${fontSize}px "${font}"`;
  while (ctx.measureText(text).width > canvas.width * 0.8) {
    fontSize *= 0.95;
    ctx.font = `400 ${fontSize}px "${font}"`;
  }

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.fillStyle = "#111";
  ctx.strokeStyle = "#111";
  ctx.lineWidth = fontSize * 0.02;

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
  // System fonts — instant availability, no network required
  'system-ui', 'Arial', 'Helvetica', 'Verdana', 'Tahoma', 'Georgia', 'Times New Roman', 'Courier New',

  // Decorative/Google fonts (remain available and are warm-preloaded)
  "Bungee Shade",
  "VT323",
  "Permanent Marker",
  "Lobster",
  "Orbitron",
  "Cinzel",
  "Nosifer",
  "Creepster",
  "Butcherman",
  "Eater",
  "Rubik Glitch",
  "Rubik Glitch Pop",
  "Bungee",
  // "Bungee Inline",
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
textContainer.addEventListener("mousemove", e => {
  easeFactor = 0.035;
  const r = textContainer.getBoundingClientRect();
  prevPosition = { ...targetMousePosition };
  targetMousePosition.x = (e.clientX - r.left) / r.width;
  targetMousePosition.y = (e.clientY - r.top) / r.height;
});

textContainer.addEventListener("dblclick", () => changeFont(1));

window.addEventListener("keydown", e => {
  if (e.code === "Space") {
    e.preventDefault();
    changeFont(1);
  }
});

textContainer.addEventListener("touchend", () => changeFont(1));

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  changeFont(0);
});

/* =======================
   START
======================= */
(async () => {
  fontLabel.textContent = fonts[0];

  // Load first font immediately and ensure it's ready (so the initial canvas uses the correct font)
  await loadAnyGoogleFont(fonts[0]);

  // No-delay warm-preload of remaining fonts (start immediately, fire-and-forget)
  preloadFontsInBackground(fonts.slice(1), 0);

  // Initialize the scene right away — the primary font is guaranteed to be available above
  initScene(createTextTexture("Distort", fonts[0]));
  animate();

  // Warm-preload already started above
})();
