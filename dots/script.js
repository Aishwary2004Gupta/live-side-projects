import * as THREE from "https://esm.sh/three@0.160.0";
import { OrbitControls } from "https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://esm.sh/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "https://esm.sh/three@0.160.0/examples/jsm/loaders/OBJLoader.js";

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
        500
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

/* Controls */

const controls = new OrbitControls(camera, canvasContainer);

controls.enablePan = false;
controls.enableDamping = true;

/* Restrict rotation */

const horizon = Math.PI / 2; // straight horizontal

controls.minPolarAngle = horizon - 0.15;  // slight upward rotation
controls.maxPolarAngle = horizon + 0.15;  // slight downward rotation

controls.minAzimuthAngle = -Infinity; // free horizontal rotation
controls.maxAzimuthAngle = Infinity;

/* Lights */

scene.add(new THREE.AmbientLight(0xffffff, 0.6));

const dl = new THREE.DirectionalLight(0xffffff, 10);
dl.position.set(5, 10, 0);
scene.add(dl);

/* Model Loaders */

const gltfLoader = new GLTFLoader();
const objLoader = new OBJLoader();

function loadModel(url) {

    const ext = url.split(".").pop().toLowerCase();

    if (ext === "gltf" || ext === "glb") {

        gltfLoader.load(url, (gltf) => {

            const model = gltf.scene;

            model.scale.setScalar(0.6);
            model.rotation.y = 0.4;
            model.position.y = -1;

            scene.add(model);

        });

    }
    else if (ext === "obj") {

        objLoader.load(url, (obj) => {

            obj.scale.setScalar(0.6);
            obj.rotation.y = 0.4;
            obj.position.y = -1;

            scene.add(obj);

        });

    }
    else {

        console.error("Unsupported model format:", ext);

    }

}

/* Load example model */

loadModel(
    "https://raw.githubusercontent.com/alecjacobson/common-3d-test-models/refs/heads/master/data/teapot.obj"
);

/* Shaders */

const normalShader = `
precision highp float;
uniform vec2 resolution;
void mainImage(const in vec4 inputColor,const in vec2 uv,out vec4 outputColor){
outputColor=texture2D(inputBuffer,uv);
}
`;

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

    for (const k in uniforms)
        map.set(k, new THREE.Uniform(uniforms[k]));

    return new (class extends Effect {

        constructor() {
            super(name, shader, { uniforms: map });
        }

        update(renderer) {

            if (map.has("resolution")) {

                const c = renderer.domElement;

                map.get("resolution").value.set(
                    c.width,
                    c.height
                );

            }

        }

    })();

}

const normal = makeEffect("Normal", normalShader, {

    resolution: new THREE.Vector2(innerWidth, innerHeight)

});

const dots = makeEffect("Dots", dotsShader, {

    pixelSize: 10,
    resolution: new THREE.Vector2(innerWidth, innerHeight)

});

const map = { normal, dots };

let pass = new EffectPass(camera, dots);
composer.addPass(pass);

/* Switch effect */

function switchEffect(val) {

    composer.removePass(pass);

    pass = new EffectPass(camera, map[val]);

    composer.addPass(pass);

    document.getElementById("pixelUI").style.display =
        val === "dots" ? "block" : "none";

}

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

    dots.uniforms.get("pixelSize").value = +e.target.value;

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

        targetLayoutWidth =
            window.innerWidth - sidebarWidth;

    } else {

        sidebar.classList.add("collapsed");
        toggleBtn.textContent = "+";
        floatingToggle.classList.add("visible");

        targetLayoutWidth = window.innerWidth;

    }

}

document.querySelector("h2")
    .addEventListener("click", togglePanel);

floatingToggle
    .addEventListener("click", togglePanel);

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

const axisCanvas =
    document.getElementById("axisCanvas");

const axisCtx =
    axisCanvas.getContext("2d");

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

    const invQ =
        camera.quaternion.clone().invert();

    drawAxis(
        new THREE.Vector3(1, 0, 0)
            .applyQuaternion(invQ),
        "#ff4d4d",
        "X",
        cx,
        cy,
        scale
    );

    drawAxis(
        new THREE.Vector3(0, 1, 0)
            .applyQuaternion(invQ),
        "#46ff7a",
        "Y",
        cx,
        cy,
        scale
    );

    drawAxis(
        new THREE.Vector3(0, 0, 1)
            .applyQuaternion(invQ),
        "#4da6ff",
        "Z",
        cx,
        cy,
        scale
    );

}

/* Animation */

function animate() {

    requestAnimationFrame(animate);

    controls.update();

    if (
        Math.abs(currentLayoutWidth - targetLayoutWidth) > 0.5
    ) {

        currentLayoutWidth +=
            (targetLayoutWidth - currentLayoutWidth) * 0.15;

        updateLayout(currentLayoutWidth);

    }

    updateAxisHUD();

    composer.render();

}

animate();