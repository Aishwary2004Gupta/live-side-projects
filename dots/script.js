import * as THREE from "https://esm.sh/three@0.160.0";
import { OrbitControls } from "https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://esm.sh/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";
import {
    EffectComposer,
    RenderPass,
    EffectPass,
    Effect,
} from "https://esm.sh/postprocessing@6.35.4?deps=three@0.160.0";

/* Layout variables */

const sidebarWidth = 280;
let isPanelOpen = true;

let currentLayoutWidth = window.innerWidth - sidebarWidth;
let targetLayoutWidth = window.innerWidth - sidebarWidth;

const canvasContainer = document.getElementById("canvasContainer");

/* Scene */

const scene = new THREE.Scene();
scene.background = new THREE.Color("#010101");

/* Camera */

const frustumSize = 350;
let camera;

function createCamera(width) {
    const aspect = width / window.innerHeight;

    camera = new THREE.OrthographicCamera(
        (-frustumSize * aspect) / 2,
        (frustumSize * aspect) / 2,
        frustumSize / 2,
        -frustumSize / 2,
        0.01,
        500,
    );

    camera.position.set(0, 0, -5);
    camera.zoom = 140;
    camera.updateProjectionMatrix();
}

createCamera(currentLayoutWidth);

/* Renderer */

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(currentLayoutWidth, window.innerHeight);
canvasContainer.appendChild(renderer.domElement);

/* Composer */

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

/* Controls */

const controls = new OrbitControls(camera, canvasContainer);
controls.enablePan = false;
controls.enableDamping = true;

/* Lights */

scene.add(new THREE.AmbientLight(0xffffff, 0.6));

const dl = new THREE.DirectionalLight(0xffffff, 10);
dl.position.set(5, 10, 0);
scene.add(dl);

/* Model */

const loader = new GLTFLoader();

loader.load(
    "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/CesiumMilkTruck/glTF-Binary/CesiumMilkTruck.glb",
    (g) => {
        const m = g.scene;
        m.scale.setScalar(0.7);
        m.rotation.y = -Math.PI / 2 + 1;
        m.position.y = -1;
        scene.add(m);
    },
);

/* Shaders */

const normalShader = `
precision highp float;
uniform vec2 resolution;
void mainImage(const in vec4 inputColor,const in vec2 uv,out vec4 outputColor){
outputColor=texture2D(inputBuffer,uv);
}
`;

// const wovenShader = `
//         precision highp float;
//         uniform float pixelSize;
//         uniform vec2 resolution;

//         float random(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123); }

//         vec3 rgbToHsv(vec3 c) {
//           vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
//           vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
//           vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
//           float d = q.x - min(q.w, q.y);
//           float e = 1.0e-10;
//           return vec3(abs(q.z + (q.w - q.y) / (6.0*d + e)), d/(q.x+e), q.x);
//         }

//         vec3 hsvToRgb(vec3 c) {
//           vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
//           vec3 p = abs(fract(c.xxx + K.xyz)*6.0 - K.www);
//           return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
//         }

//         float noise(vec2 st){
//           vec2 i=floor(st), f=fract(st);
//           float a=random(i), b=random(i+vec2(1,0)), c=random(i+vec2(0,1)), d=random(i+vec2(1,1));
//           vec2 u=f*f*(3.0-2.0*f);
//           return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
//         }

//         void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
//           vec2 s = pixelSize / resolution;
//           vec2 uvPixel = s * floor(uv / s);
//           vec4 color = texture2D(inputBuffer, uvPixel);

//           float luma = dot(vec3(0.2126,0.7152,0.0722), color.rgb);
//           vec2 cellPos = floor(uv / s);
//           vec2 cellUV = fract(uv / s);

//           if(luma < 0.001){
//             vec2 centered = cellUV - 0.5;
//             float alt = mod(cellPos.x,2.0);
//             float a = alt==0.0 ? radians(-65.0) : radians(65.0);
//             vec2 r = vec2(centered.x*cos(a)-centered.y*sin(a), centered.x*sin(a)+centered.y*cos(a));
//             float ellipse = length(vec2(r.x, r.y*1.55 - 0.075));
//             float pat = smoothstep(0.2, 1.0, 1.0-ellipse) * 0.06;
//             outputColor = vec4(vec3(pat),1.0);
//             return;
//           }

//           float rowOffset = sin((random(vec2(0.0, uvPixel.y)) - 0.5) * 0.25);
//           cellUV.x += rowOffset;
//           vec2 centered = cellUV - 0.5;

//           float noiseAmount = 0.18;
//           vec2 noisyCenter = centered + (vec2(
//             random(cellPos + centered),
//             random(cellPos + centered)
//           ) - 0.5) * noiseAmount;

//           float alt = mod(cellPos.x,2.0);
//           float a = alt==0.0 ? radians(-65.0) : radians(65.0);
//           vec2 r = vec2(noisyCenter.x*cos(a)-noisyCenter.y*sin(a), noisyCenter.x*sin(a)+noisyCenter.y*cos(a));
//           float ellipse = length(vec2(r.x, r.y*1.55 - 0.075));
//           color.rgb *= smoothstep(0.2, 1.0, 1.0-ellipse);

//           float stripeNoise = noise(vec2(centered.x, centered.y * 100.0));
//           color.rgb *= stripeNoise + 0.4;

//           float hueShift = (random(cellPos)-0.5)*0.08;
//           vec3 hsv = rgbToHsv(color.rgb);
//           hsv.x += hueShift;
//           color.rgb = hsvToRgb(hsv);

//           outputColor = color;
//         }
//       `;

const dotsShader = `
        precision highp float;
        uniform float pixelSize;
        uniform vec2 resolution;
        void mainImage(const in vec4 i, const in vec2 uv, out vec4 o) {
          vec2 s = pixelSize / resolution;
          vec2 u = s * floor(uv / s);
          vec4 c = texture2D(inputBuffer, u);

          float l = dot(vec3(0.2126, 0.7152, 0.0722), c.rgb);
          vec2 f = fract(uv / s);

          float radius = l > 0.5 ? 0.3 : l > 0.001 ? 0.12 : 0.075;
          vec2 center = l > 0.5 ? vec2(0.5) : vec2(0.25);
          float d = distance(f, center);
          float m = smoothstep(radius, radius - 0.05, d);

          o = vec4(vec3(m) * max(l, 0.05), 1.0);
        }
      `;


function makeEffect(name, shader, uniforms = {}) {
    const map = new Map();
    for (const k in uniforms) map.set(k, new THREE.Uniform(uniforms[k]));

    return new (class extends Effect {
        constructor() {
            super(name, shader, { uniforms: map });
        }
        update(renderer) {
            if (map.has("resolution")) {
                const c = renderer.domElement;
                map.get("resolution").value.set(c.width, c.height);
            }
        }
    })();
}

const normal = makeEffect("Normal", normalShader, {
    resolution: new THREE.Vector2(innerWidth, innerHeight),
});

const dots = makeEffect("Dots", dotsShader, {
    pixelSize: 10,
    resolution: new THREE.Vector2(innerWidth, innerHeight),
    lightPosition: new THREE.Vector2(0.8, 0.8),
});

const map = { normal, dots };

let pass = null;
switchEffect("dots");
/* Switch effect */

function switchEffect(val) {

    const effect = map[val];

    if (!effect) return;

    // remove old pass
    composer.removePass(pass);

    // dispose old pass (important)
    if (pass && pass.dispose) pass.dispose();

    // create new pass
    pass = new EffectPass(camera, effect);

    // add new pass
    composer.addPass(pass);

    // update UI
    document.getElementById("pixelUI").style.display =
        val === "woven" ? "block" : "none";
}

switchEffect(document.querySelector("#effectList li.active").dataset.value);

document.querySelectorAll("#effectList li").forEach((item) => {
    item.addEventListener("click", () => {
        document
            .querySelectorAll("#effectList li")
            .forEach((li) => li.classList.remove("active"));

        item.classList.add("active");

        switchEffect(item.dataset.value);
    });
});

/* Slider */

document.getElementById("pixelSize").oninput = (e) => {
    woven.uniforms.get("pixelSize").value = +e.target.value;
};

/* Sidebar toggle */

const sidebar = document.getElementById("sidebar");
const toggleBtn = document.getElementById("toggleBtn");
const floatingToggle = document.getElementById("floatingToggle");

function togglePanel() {
    isPanelOpen = !isPanelOpen;

    if (isPanelOpen) {
        sidebar.classList.remove("collapsed");
        toggleBtn.textContent = "—";
        floatingToggle.classList.remove("visible");
        targetLayoutWidth = window.innerWidth - sidebarWidth;
    } else {
        sidebar.classList.add("collapsed");
        toggleBtn.textContent = "+";
        floatingToggle.classList.add("visible");
        targetLayoutWidth = window.innerWidth;
    }
}

document.querySelector("h2").addEventListener("click", togglePanel);
floatingToggle.addEventListener("click", togglePanel);

/* Layout update */

function updateLayout(width) {
    canvasContainer.style.width = width + "px";

    renderer.setSize(width, window.innerHeight);
    composer.setSize(width, window.innerHeight);

    const aspect = width / window.innerHeight;

    camera.left = (-frustumSize * aspect) / 2;
    camera.right = (frustumSize * aspect) / 2;
    camera.updateProjectionMatrix();
}

/* Resize */

window.addEventListener("resize", () => {
    targetLayoutWidth = isPanelOpen
        ? window.innerWidth - sidebarWidth
        : window.innerWidth;
});

/* Compass */

const axisCanvas = document.getElementById("axisCanvas");
const axisCtx = axisCanvas.getContext("2d");

function drawAxis(v, color, label, cx, cy, scale) {
    const ex = cx + v.x * scale;
    const ey = cy - v.y * scale;

    axisCtx.strokeStyle = color;
    axisCtx.fillStyle = color;

    axisCtx.beginPath();
    axisCtx.moveTo(cx, cy);
    axisCtx.lineTo(ex, ey);
    axisCtx.stroke();

    axisCtx.fillText(label, ex + 4, ey + 4);
}

function updateAxisHUD() {
    const w = axisCanvas.width;
    const h = axisCanvas.height;

    axisCtx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const scale = w * 0.35;

    const invQ = camera.quaternion.clone().invert();

    drawAxis(
        new THREE.Vector3(1, 0, 0).applyQuaternion(invQ),
        "#ff4d4d",
        "X",
        cx,
        cy,
        scale,
    );
    drawAxis(
        new THREE.Vector3(0, 1, 0).applyQuaternion(invQ),
        "#46ff7a",
        "Y",
        cx,
        cy,
        scale,
    );
    drawAxis(
        new THREE.Vector3(0, 0, 1).applyQuaternion(invQ),
        "#4da6ff",
        "Z",
        cx,
        cy,
        scale,
    );
}

/* Animation */

function animate() {
    requestAnimationFrame(animate);

    controls.update();

    if (Math.abs(currentLayoutWidth - targetLayoutWidth) > 0.5) {
        currentLayoutWidth += (targetLayoutWidth - currentLayoutWidth) * 0.15;

        updateLayout(currentLayoutWidth);
    }

    updateAxisHUD();

    composer.render();
}

animate();