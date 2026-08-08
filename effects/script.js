
import * as THREE from "https://esm.sh/three@0.160.0";
import { OrbitControls } from "https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://esm.sh/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "https://esm.sh/three@0.160.0/examples/jsm/loaders/OBJLoader.js";
// import { USDZLoader } from "https://esm.sh/three@0.160.0/examples/jsm/loaders/USDZLoader.js";
import { AsciiEffect } from "https://esm.sh/three@0.160.0/examples/jsm/effects/AsciiEffect.js";
/*
use this for coverting the extentions and compressing the modes
https://convert3d.org/app/compress
*/

import {
    EffectComposer,
    RenderPass,
    EffectPass,
    Effect,
} from "https://esm.sh/postprocessing@6.35.4?deps=three@0.160.0";

import {
    normalShader,
    dotsShader,
    linesShader,
    ditherShader,
    halftoneShader,
    wovenShader,
    legoShader,
    complexShader,
    contourShader,
    edgeShader,
    blockifyShader,
    crosshatchShader,
    waveLinesShader,
    noiseShader,
    voronoiShader,
    vhsShader,
    heatMapShader,
    minecraftShader,
    tetrisShader,
    sketchShader,
    clayShader,
    liquidChromeShader,
    chromeRippleShader,
} from "./shaders.js";

const handsFocusPoint = new THREE.Vector3(0, 0, 0);

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
            if (map.has("time"))
                map.get("time").value = performance.now() / 1000;
        }
    })();
}

/* ================= SCENE SETUP ================= */
const scene = new THREE.Scene();
scene.background = new THREE.Color("#010101");

const baseFrustumSize = 350;
let camera;

let isPanelOpen = true;
let isLeftPanelOpen = true;
const sidebarWidth = 280;

/* Animated layout values — lerped each frame */
let currentLayoutWidth = window.innerWidth - sidebarWidth * 2;
let targetLayoutWidth = currentLayoutWidth;
let currentLeftOffset = sidebarWidth;
let targetLeftOffset = sidebarWidth;

function updateCamera() {
    const aspect = currentLayoutWidth / window.innerHeight;
    camera.left = (-baseFrustumSize * aspect) / 2;
    camera.right = (baseFrustumSize * aspect) / 2;
    camera.top = baseFrustumSize / 2;
    camera.bottom = -baseFrustumSize / 2;
    camera.updateProjectionMatrix();
}

camera = new THREE.OrthographicCamera(0, 0, 0, 0, 0.01, 500);
camera.position.set(0, 0, -5);
camera.zoom = 140;
camera.lookAt(handsFocusPoint);
updateCamera();

const canvasContainer = document.getElementById("canvasContainer");

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(currentLayoutWidth, window.innerHeight);
renderer.domElement.style.position = "absolute";
canvasContainer.appendChild(renderer.domElement);

const ascii = new AsciiEffect(renderer, " .:-=+*#%@", { invert: true });
ascii.domElement.style.position = "absolute";
ascii.domElement.style.color = "white";
ascii.domElement.style.background = "black";
ascii.domElement.style.display = "none";
canvasContainer.appendChild(ascii.domElement);

/* ================= MATRIX RAIN CLASS ================= */
class MatrixRainEffect {
    constructor(renderer, camera) {
        this.renderer = renderer;
        this.camera = camera;
        this.canvas = document.createElement("canvas");
        this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
        this.domElement = this.canvas;
        this.domElement.style.position = "absolute";
        this.domElement.style.top = "0";
        this.domElement.style.left = "0";
        this.domElement.style.display = "none";
        this.domElement.style.pointerEvents = "none";
        this.chars = "ｦｧｨｩｪｫｬｭｮｯ012789";
        this.cols = 0;
        this.rows = 0;
        this.drops = [];
        this.speeds = [];
        this.fontSize = 8;
        this.fontFamily = "monospace";
        this.setSize(currentLayoutWidth, window.innerHeight);
        this.renderTarget = new THREE.WebGLRenderTarget(
            currentLayoutWidth,
            window.innerHeight,
            { format: THREE.RGBAFormat },
        );
        this.maskTarget = new THREE.WebGLRenderTarget(1, 1, {
            format: THREE.RGBAFormat,
        });
        this.maskTarget.texture.minFilter = THREE.NearestFilter;
        this.maskTarget.texture.magFilter = THREE.NearestFilter;
        this._maskBuffer = null;
        this.cellCharacter = [];
    }

    setSize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.domElement.style.width = width + "px";
        this.domElement.style.height = height + "px";
        this.ctx.font = `${this.fontSize}px ${this.fontFamily}`;
        this.cols = Math.floor(width / (this.fontSize * 0.6));
        this.rows = Math.floor(height / this.fontSize);
        this.drops = Array(this.cols)
            .fill(0)
            .map(() => -(Math.random() * this.rows));
        this.speeds = Array(this.cols)
            .fill(0)
            .map(() => 0.3 + Math.random() * 0.6);
        this.cellCharacter = new Array(this.cols * this.rows)
            .fill(0)
            .map(
                () => this.chars[Math.floor(Math.random() * this.chars.length)],
            );
        if (this.renderTarget) this.renderTarget.setSize(width, height);
        if (this.maskTarget && this.cols > 0 && this.rows > 0) {
            this.maskTarget.setSize(this.cols, this.rows);
            this._maskBuffer = new Uint8Array(this.cols * this.rows * 4);
        }
    }

    render(scene, camera) {
        const oldTarget = this.renderer.getRenderTarget();
        this.renderer.setRenderTarget(this.maskTarget);
        this.renderer.render(scene, camera);
        this.renderer.setRenderTarget(oldTarget);
        this.ctx.fillStyle = "black";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        const maskBuf = this._maskBuffer;
        if (this.maskTarget && maskBuf) {
            try {
                this.renderer.readRenderTargetPixels(
                    this.maskTarget,
                    0,
                    0,
                    this.maskTarget.width,
                    this.maskTarget.height,
                    maskBuf,
                );
            } catch (err) {
                maskBuf.fill(0);
            }
        }
        for (let i = 0; i < this.cols; i++) {
            this.drops[i] += this.speeds[i];
            if (Math.random() > 0.8) {
                const y = Math.max(0, Math.floor(this.drops[i])) % this.rows;
                this.cellCharacter[y * this.cols + i] =
                    this.chars[Math.floor(Math.random() * this.chars.length)];
            }
            if (this.drops[i] >= this.rows + 20) {
                this.drops[i] = -(Math.random() * 20);
                this.speeds[i] = 0.3 + Math.random() * 0.6;
            }
        }
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const sampleY = this.maskTarget.height - 1 - y;
                const idx = (sampleY * this.maskTarget.width + x) * 4;
                const brightness =
                    (maskBuf[idx] + maskBuf[idx + 1] + maskBuf[idx + 2]) / 3;
                const drawX = x * (this.fontSize * 0.6);
                const drawY = y * this.fontSize;
                if (brightness > 15) {
                    if (brightness > 180)
                        this.ctx.fillStyle = `rgba(200, 255, 200, 0.95)`;
                    else if (brightness > 100)
                        this.ctx.fillStyle = `rgba(40, 200, 60, 0.85)`;
                    else this.ctx.fillStyle = `rgba(10, 110, 20, 0.7)`;
                    this.ctx.fillText(
                        this.cellCharacter[y * this.cols + x],
                        drawX,
                        drawY,
                    );
                } else {
                    const dropY = this.drops[x];
                    const distance = dropY - y;
                    if (distance >= 0 && distance < 25) {
                        if (distance < 1)
                            this.ctx.fillStyle = `rgba(100, 200, 100, 0.6)`;
                        else {
                            const alpha = 0.4 * (1.0 - distance / 25);
                            this.ctx.fillStyle = `rgba(0, 120, 20, ${alpha})`;
                        }
                        let char = this.cellCharacter[y * this.cols + x];
                        if (Math.random() > 0.95)
                            char =
                                this.chars[Math.floor(Math.random() * this.chars.length)];
                        this.ctx.fillText(char, drawX, drawY);
                    }
                }
            }
        }
    }
}

const matrix = new MatrixRainEffect(renderer, camera);
canvasContainer.appendChild(matrix.domElement);

/* ================= EFFECTS ================= */
const normal = makeEffect("Normal", normalShader, {
    resolution: new THREE.Vector2(innerWidth, innerHeight),
});
const dots = makeEffect("Dots", dotsShader, {
    pixelSize: 10.0,
    resolution: new THREE.Vector2(innerWidth, innerHeight),
});
const lines = makeEffect("Lines", linesShader, {
    pixelSize: 10.0,
    resolution: new THREE.Vector2(innerWidth, innerHeight),
});
const complex = makeEffect("Complex", complexShader, {
    pixelSize: 10.0,
    resolution: new THREE.Vector2(innerWidth, innerHeight),
    // pattern: 0, // 0 = Stripes/Cross, 1 = Sine Wave
});
const woven = makeEffect("Woven", wovenShader, {
    pixelSize: 10.0,
    resolution: new THREE.Vector2(innerWidth, innerHeight),
});
const lego = makeEffect("Lego", legoShader, {
    pixelSize: 10.0,
    resolution: new THREE.Vector2(innerWidth, innerHeight),
    lightPosition: new THREE.Vector2(0.8, 0.8),
});
const dither = makeEffect("Dither", ditherShader, {
    resolution: new THREE.Vector2(innerWidth, innerHeight),
});
const halftone = makeEffect("Halftone", halftoneShader, {
    pixelSize: 10.0,
    resolution: new THREE.Vector2(innerWidth, innerHeight),
});
const contour = makeEffect("Contour", contourShader, {
    resolution: new THREE.Vector2(innerWidth, innerHeight),
});
const blockify = makeEffect("Blockify", blockifyShader, {
    pixelSize: 8.0,
    resolution: new THREE.Vector2(innerWidth, innerHeight),
});
const edge = makeEffect("Edge", edgeShader, {
    resolution: new THREE.Vector2(innerWidth, innerHeight),
});
const crosshatch = makeEffect("Crosshatch", crosshatchShader, {
    resolution: new THREE.Vector2(innerWidth, innerHeight),
});
const waveLines = makeEffect("WaveLines", waveLinesShader, {
    time: 0.0,
    resolution: new THREE.Vector2(innerWidth, innerHeight),
});
const noise = makeEffect("Noise", noiseShader, {
    time: 0.0,
    resolution: new THREE.Vector2(innerWidth, innerHeight),
});
const voronoi = makeEffect("Voronoi", voronoiShader, {
    time: 0.0,
    resolution: new THREE.Vector2(innerWidth, innerHeight),
});
const vhs = makeEffect("VHS", vhsShader, {
    time: 0.0,
    resolution: new THREE.Vector2(innerWidth, innerHeight),
});
const heatMap = makeEffect("HeatMap", heatMapShader, { // <--- CREATE INSTANCE
    resolution: new THREE.Vector2(innerWidth, innerHeight),
});
const minecraft = makeEffect("Minecraft", minecraftShader, {
    pixelSize: 12.0, // Default block size
    resolution: new THREE.Vector2(innerWidth, innerHeight),
});
const tetris = makeEffect("Tetris", tetrisShader, {
    pixelSize: 10.0,
    resolution: new THREE.Vector2(innerWidth, innerHeight),
});
const sketch = makeEffect("Sketch", sketchShader, {
    time: 0.0,
    resolution: new THREE.Vector2(innerWidth, innerHeight),
});
const clay = makeEffect("Clay", clayShader, {
    resolution: new THREE.Vector2(innerWidth, innerHeight),
});
const liquidChrome = makeEffect("LiquidChrome", liquidChromeShader, {
    time: 0.0,
    resolution: new THREE.Vector2(innerWidth, innerHeight),
});
const chromeRipple = makeEffect("ChromeRipple", chromeRippleShader, {
    time: 0.0,
    resolution: new THREE.Vector2(innerWidth, innerHeight),
});

const map = {
    normal,
    dots,
    lines,
    complex,
    woven,
    lego,
    dither,
    halftone,
    contour,
    blockify,
    edge,
    crosshatch,
    waveLines,
    noise,
    voronoi,
    vhs,
    heatMap,
    minecraft,
    tetris,
    sketch,
    clay,
    liquidChrome,
    chromeRipple,
};

/* ================= CONTROLS ================= */
let controls = new OrbitControls(camera, canvasContainer);
controls.enablePan = false;
controls.enableDamping = true;
controls.target.copy(handsFocusPoint);
controls.update();

/* ================= LIGHTS ================= */
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dl = new THREE.DirectionalLight(0xffffff, 10);
dl.position.set(5, 10, 0);
scene.add(dl);

/* ================= MODELS ================= */
const gltfLoader = new GLTFLoader();
const objLoader = new OBJLoader();
let currentModel = null;

const MODELS = {
    fox: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/Fox.glb",
        scale: 0.02,
        rotation: { x: 0, y: -Math.PI / 2 + 4, z: 0 },
        position: { x: 0, y: -0.8, z: 0 },
    },
    duck: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/Duck.glb",
        scale: 1.2,
        rotation: { x: 0, y: 0.5, z: 0 },
        position: { x: 0, y: -1, z: 0 },
    },
    avocado: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/Avocado.glb",
        scale: 30.0,
        rotation: { x: 0, y: Math.PI, z: 0 },
        position: { x: 0, y: -1, z: 0 },
    },
    lamp: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/LightsPunctualLamp.glb",
        scale: 1.0,
        rotation: { x: 0, y: Math.PI, z: 0 },
        position: { x: 0, y: -1, z: 0 },
    },
    skull: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/ScatteringSkull.glb",
        scale: 8.0,
        rotation: { x: -0.2, y: -Math.PI / 2 - 1.9, z: 0 },
        position: { x: 0, y: -0.9, z: 0 },
    },
    astronaut: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/ThreeJS_visuals/main/assets/astronaut.obj",
        scale: 0.5,
        rotation: { x: 0, y: -Math.PI / 2 - 1.9, z: 0 },
        position: { x: 0, y: -1, z: 0 },
    },
    hand: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/ThreeJS_visuals/main/assets/hand.obj",
        scale: 1,
        rotation: { x: 0, y: -1.5, z: 0 },
        position: { x: 0, y: -1, z: 0 },
    },
    horse: {
        url: "https://raw.githubusercontent.com/pichiliani/ModelsOBJ/master/horse.obj",
        scale: 10,
        rotation: { x: Math.PI / 2, y: 3.2, z: 2 },
        position: { x: 0, y: 0, z: 0 },
    },
    dragon: {
        url: "https://raw.githubusercontent.com/pichiliani/ModelsOBJ/master/dragon.obj",
        scale: 10,
        rotation: { x: 0, y: -3, z: 0 },
        position: { x: 0, y: -1.2, z: 0 },
    },
    dragon2: {
        url: "http://raw.githubusercontent.com/alecjacobson/common-3d-test-models/refs/heads/master/data/xyzrgb_dragon.obj",
        scale: 0.02,
        rotation: { x: 0, y: 0.5, z: 0 },
        position: { x: 0, y: -0.2, z: 0 },
    },
    milkTruck: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/CesiumMilkTruck.glb",
        scale: 0.5,
        rotation: { x: 0, y: Math.PI / 2 + 1, z: 0 },
        position: { x: 0, y: -0.8, z: 0 },
    },
    cesiumMan: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/CesiumMan.glb",
        scale: 1,
        rotation: { x: 0, y: Math.PI, z: 0 },
        position: { x: 0, y: -0.8, z: 0 },
    },
    sofa: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/GlamVelvetSofa.glb",
        scale: 1.5,
        rotation: { x: 0, y: Math.PI, z: 0 },
        position: { x: 0, y: -0.7, z: 0 },
    },
    olives: {
        url: "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/IridescentDishWithOlives/glTF/IridescentDishWithOlives.gltf",
        scale: 5,
        rotation: { x: -0.65, y: Math.PI, z: 0 },
        position: { x: 0, y: -0.3, z: 0 },
    },
    lantern: {
        url: "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Lantern/glTF/Lantern.gltf",
        scale: 0.09,
        rotation: { x: 0, y: Math.PI, z: 0 },
        position: { x: 0, y: -1.2, z: 0 },
    },
    shoe: {
        url: "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/MaterialsVariantsShoe/glTF/MaterialsVariantsShoe.gltf",
        scale: 10,
        rotation: { x: Math.PI / -6, y: 2.4, z: 0 },
        position: { x: 0, y: -0.6, z: 0 },
    },
    chair: {
        url: "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/SheenChair/glTF/SheenChair.gltf",
        scale: 2.5,
        rotation: { x: -0.25, y: Math.PI, z: 0 },
        position: { x: 0, y: -0.9, z: 0 },
    },
    tableLamp: {
        url: "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/StainedGlassLamp/glTF/StainedGlassLamp.gltf",
        scale: 3,
        rotation: { x: -0.25, y: Math.PI, z: 0 },
        position: { x: 0, y: -0.9, z: 0 },
    },
    chessBoard: {
        url: "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/ABeautifulGame/glTF/ABeautifulGame.gltf",
        scale: 3,
        rotation: { x: -Math.PI / 2 - 6, y: 0, z: 0 },
        position: { x: 0, y: 0, z: 0 },
    },
    teapot: {
        url: "https://raw.githubusercontent.com/alecjacobson/common-3d-test-models/refs/heads/master/data/teapot.obj",
        scale: 0.5,
        rotation: { x: 0, y: Math.PI, z: 0 },
        position: { x: 0, y: -0.8, z: 0 },
    },
    cow: {
        url: "https://raw.githubusercontent.com/alecjacobson/common-3d-test-models/refs/heads/master/data/cow.obj",
        scale: 0.3,
        rotation: { x: 0, y: Math.PI, z: 0 },
        position: { x: 0, y: -0.06, z: 0 },
    },
    tv: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/TV.glb",
        scale: 1.5,
        rotation: { x: 0, y: Math.PI / 2 + 0.2, z: 0 },
        position: { x: 0, y: -0.3, z: 0 },
    },
    visionPro: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/apple-vision-pro.glb",
        scale: 3,
        rotation: { x: 0, y: Math.PI / 2, z: -0.3 },
        position: { x: 0, y: -0.3, z: 0 },
    },
    airpods: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/airpods_4.glb",
        scale: 20,
        rotation: { x: 0, y: Math.PI, z: 0 },
        position: { x: 0, y: -0.3, z: 0 },
    },
    house: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/american_house.glb",
        scale: 0.19,
        rotation: { x: 0, y: Math.PI, z: 0 },
        position: { x: -0.3, y: -1, z: 0 },
    },
    rifle: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/honey_badger.glb",
        scale: 0.03,
        rotation: { x: 0, y: Math.PI, z: 0 },
        position: { x: 0, y: -0.2, z: 0 },
    },
    car: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/bmw_m4_widebody__www.vecarz.com.glb",
        scale: 0.17,
        rotation: { x: 0, y: Math.PI / 2, z: 0 },
        position: { x: 0, y: -0.6, z: 0 },
    },
    truck: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/cat_skidder_545d.glb",
        scale: 0.3,
        rotation: { x: 0, y: Math.PI / 2, z: -0.1 },
        position: { x: 0.3, y: -0.6, z: 0 },
    },
    sword: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/katana_with_dragon.glb",
        scale: 2,
        rotation: { x: -0.5, y: -Math.PI / 2, z: 0 },
        position: { x: -0.7, y: -0.2, z: 0 },
    },
    piano: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/electronic_piano_keyboard.glb",
        scale: 3,
        rotation: { x: -1, y: Math.PI, z: 0 },
        position: { x: 0, y: 0, z: 0 },
    },
    lambo: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/2019_lamborghini_huracan_evo.glb",
        scale: 75,
        rotation: { x: -0.5, y: 2.5, z: 0 },
        position: { x: 0, y: -0.4, z: 0 },
    },
    hoverBike: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/hover_bike.glb",
        scale: 0.009,
        rotation: { x: 0, y: Math.PI / 2, z: 0 },
        position: { x: 0, y: -0.6, z: 0 },
    },
    harleyBike: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/harley_custom_bike_v1.2 (1).glb",
        scale: 0.1,
        rotation: { x: 0, y: Math.PI / 2, z: 0 },
        position: { x: 0.2, y: -0.4, z: 0 },
    },
    rayfieldCaliburn: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/rayfield_caliburn__www.vecarz.com.glb",
        scale: 0.7,
        rotation: { x: -0.5, y: 2.5, z: 0 },
        position: { x: 0, y: -0.4, z: 0 },
    },
    cyberpunkBike: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/cyberpunk_bike.glb",
        scale: 0.0037,
        rotation: { x: -0.2, y: Math.PI / 2 + 8, z: 0 },
        position: { x: 1.2, y: -0.8, z: 0 },
    },
    train: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/queensland_railways_1200_class_diesel_locomotive.glb",
        scale: 0.2,
        rotation: { x: -0.5, y: 2.5, z: 0 },
        position: { x: 0, y: -0.4, z: 0 },
    },
    chinese_dragon: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/chinese_dragon.glb",
        scale: 0.002,
        rotation: { x: 0, y: Math.PI, z: 0 },
        position: { x: 0.4, y: -1, z: 0 },
    },
    shenron: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/shenron_dragon_ball.glb",
        scale: 0.003,
        rotation: { x: 0, y: Math.PI, z: 0 },
        position: { x: 0, y: -1.3, z: 0 },
    },
    samurai_helmet: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/samurai_helmet.glb",
        scale: 0.055,
        rotation: { x: 0, y: Math.PI, z: 0 },
        position: { x: 0, y: 0, z: 0 },
    },
    toy_rocket: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/space_rocket.glb",
        scale: 1,
        rotation: { x: 0, y: Math.PI, z: 0 },
        position: { x: 0, y: 0, z: 0 },
    },
    earth: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/earth.glb",
        scale: 5,
        rotation: { x: -0.55, y: Math.PI + 9.6, z: 0 },
        position: { x: 0, y: 0, z: 0 },
    },
    rocket: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/rocket.glb",
        scale: 0.16,
        rotation: { x: 0, y: Math.PI + 0.5, z: 0.4 },
        position: { x: 0, y: -2.05, z: 0 },
    },
    samurai: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/Shadowflame_Samurai.glb",
        scale: 0.02,
        rotation: { x: 0, y: Math.PI, z: 0 },
        position: { x: 0, y: -1.2, z: 0 },
    },
    old_controller: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/dualshock_4_playstation_controller.glb",
        scale: 0.1,
        rotation: { x: 0, y: Math.PI, z: 0 },
        position: { x: 0, y: -0.9, z: 0 },
    },
    playstation_5_controller: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/playstation_5_controller.glb",
        scale: 0.5,
        rotation: { x: 0, y: Math.PI, z: 0 },
        position: { x: 0, y: 0, z: 0 },
    },
    tree: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/stylized_tree.glb",
        scale: 4.5,
        rotation: { x: 0, y: 0, z: 0 },
        position: { x: 0, y: -1.25, z: 0 },
    },
    spaceship: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/light_fighter_spaceship.glb",
        scale: 0.25,
        rotation: { x: -1, y: Math.PI - 1, z: 0 },
        position: { x: 0, y: -0.2, z: 0 },
    },
    ufo: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/ufo2.glb",
        scale: 0.23,
        rotation: { x: 0.2, y: Math.PI, z: -0.3 },
        position: { x: 0, y: -0.2, z: 0 },
    },
    tank: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/t-72a_obr._1980.glb",
        scale: 0.5,
        rotation: { x: 0, y: Math.PI - 1, z: 0 },
        position: { x: 0, y: -0.7, z: 0 },
    },
    hands: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/creation-of-adam.glb",
        scale: 3.2,
        rotation: { x: -0.1, y: -Math.PI / 2 + 0.08, z: 0 },
        position: { x: 1.8, y: -1.4, z: 0 },
    },
    pistol: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/pistol.glb",
        scale: 0.75,
        rotation: { x: 0, y: Math.PI + 1.2, z: 0 },
        position: { x: 0.6, y: -0.2, z: 0 },
    },
    gun: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/gun.glb",
        scale: 0.023,
        rotation: { x: -0.4, y: Math.PI, z: 0 },
        position: { x: 0, y: -0.5, z: 0 },
    },
    butterfly: { //make sure to pin this model before making the site live
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/blue_monarch_butterfly.glb",
        scale: 1,
        rotation: { x: -1.2, y: Math.PI, z: 0 },
        position: { x: 0, y: -0.2, z: 0 },
    },
    t_rex: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/t_rex.glb",
        scale: 0.1,
        rotation: { x: 0, y: Math.PI + 1.3, z: 0 },
        position: { x: -0.7, y: 0, z: 0 },
    },
    pepsi_can: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/soda_can.glb",
        scale: 0.24,
        rotation: { x: 0, y: -0.9, z: 0 },
        position: { x: 0, y: 0, z: 0 },
    },
    coke_can: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/simple_cola_can.glb",
        scale: 0.6,
        rotation: { x: -0.2, y: Math.PI - 10, z: 0 },
        position: { x: 0, y: 0, z: 0 },
    },
    guitar: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/guitar_red.glb",
        scale: 1.7,
        rotation: { x: -1.8, y: -0.5, z: -0.3 },
        position: { x: 0.2, y: 0, z: 0 },
    },
    guitar2: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/electric_guitar_lowpoly_model.glb",
        scale: 0.38,
        rotation: { x: 0, y: Math.PI, z: 0 },
        position: { x: 0.25, y: -1.7, z: 0 },
    },
    binoculars: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/binoculars.glb",
        scale: 0.5,
        rotation: { x: -0.2, y: 2.3, z: 0 },
        position: { x: 0.3, y: -1.7, z: 0 },
    },
    goggles: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/deal_with_it_sunglasses.glb",
        scale: 0.01,
        rotation: { x: 0, y: Math.PI, z: 0 },
        position: { x: 0, y: 0, z: 0 },
    },
    phoenix_bird: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/phoenix_bird.glb",
        scale: 0.0032,
        rotation: { x: 0, y: Math.PI + 1.5, z: 0.6 },
        position: { x: 0, y: -0.1, z: 0 },
    },
    blue_whale: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/blue_whale.glb",
        scale: 0.0025,
        rotation: { x: 0, y: Math.PI + 0.7, z: 0 },
        position: { x: -0.2, y: -0.1, z: 0 },
    },
    apple: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/red_apple_-_realistic_fruit_asset.glb",
        scale: 20,
        rotation: { x: 0, y: Math.PI, z: 0 },
        position: { x: 0, y: 0, z: 0 },
    },
    goku1: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/goku.glb",
        scale: 4,
        rotation: { x: 0, y: 0, z: 0 },
        position: { x: 0, y: -1.15, z: 0 },
    },
    goku2: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/son_goku.glb",
        scale: 0.7,
        rotation: { x: 0, y: Math.PI, z: 0 },
        position: { x: 0, y: -1.1, z: 0 },
    },
    bulbasaur: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/bulbasaur.glb",
        scale: 0.4,
        rotation: { x: 0, y: Math.PI - 0.4, z: 0 },
        position: { x: 0, y: -1.1, z: 0 },
    },
    lucario: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/lucario.glb",
        scale: 1.1,
        rotation: { x: -0.2, y: Math.PI, z: 0 },
        position: { x: 0, y: -1, z: 0 },
    },
    sudowoodo: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/sudowoodo.glb",
        scale: 1.5,
        rotation: { x: -0.2, y: Math.PI, z: 0 },
        position: { x: 0, y: -1.1, z: 0 },
    },
    porygon: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/porygon.glb",
        scale: 0.0045,
        rotation: { x: 0, y: Math.PI + 0.5, z: 0 },
        position: { x: 0, y: 0.7, z: 0 },
    },
    magikarp: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/magikarp.glb",
        scale: 0.23,
        rotation: { x: 0, y: Math.PI + 1.5, z: 0 },
        position: { x: 0, y: -0.02, z: 0 },
    },
    lapras: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/lapras.glb",
        scale: 0.3,
        rotation: { x: 0, y: Math.PI + 0.8, z: 0 },
        position: { x: 0, y: -1, z: 0 },
    },
    mew: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/mew_pokemon.glb",
        scale: 0.03,
        rotation: { x: 0, y: Math.PI, z: 0 },
        position: { x: 0, y: 0, z: 0 },
    },
    girl_with_a_pearl_earring: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/girl_with_a_pearl_earring.glb",
        scale: 0.3,
        rotation: { x: 0, y: Math.PI, z: 0 },
        position: { x: 0, y: -0.2, z: 0 },
    },
    piggy_bank: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/piggy_bank.glb",
        scale: 0.5,
        rotation: { x: -0.3, y: 0.7, z: 0 },
        position: { x: 0, y: -0.2, z: 0 },
    },
    the_starry_night: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/the_starry_night.glb",
        scale: 0.28,
        rotation: { x: 0, y: 2.6, z: 0 },
        position: { x: 0, y: 0, z: 0 },
    },
    the_mona_lisa: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/the_mona_lisa.glb",
        scale: 0.16,
        rotation: { x: 0, y: 2.6, z: 0 },
        position: { x: 0, y: 0, z: 0 },
    },
    goku: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/goku_insane.glb",
        scale: 0.31,
        rotation: { x: 0, y: Math.PI - 1, z: 0 },
        position: { x: 0, y: -1.2, z: 0 },
    },
    money_bag: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/money_bag.glb",
        scale: 0.009,
        rotation: { x: 0, y: 0, z: 0 },
        position: { x: 0, y: -0.8, z: 0 },
    },
    canon_800d: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/canon_800d.glb",
        scale: 17,
        rotation: { x: 0, y: Math.PI - 1.6, z: -0.07 },
        position: { x: 0, y: 0, z: 0 },
    },
    prime_cans: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/prime.glb",
        scale: 6,
        rotation: { x: 0, y: Math.PI, z: 0 },
        position: { x: 0, y: -0.8, z: 0 },
    },
    cannonbolt: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/cannonbolt.glb",
        scale: 0.02,
        rotation: { x: 0, y: Math.PI, z: 0 },
        position: { x: 0, y: -0.8, z: 0 },
    },
    diamondhead: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/diamondhead.glb",
        scale: 1,
        rotation: { x: 0, y: Math.PI, z: 0 },
        position: { x: 0, y: -1.2, z: 0 },
    },
    ghostfreak: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/fantasmatico.glb",
        scale: 0.05,
        rotation: { x: 0, y: Math.PI, z: 0 },
        position: { x: 0, y: 0, z: 0 },
    },
    xlr8: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/xlr8.glb",
        scale: 0.45,
        rotation: { x: 0, y: Math.PI + 0.5, z: 0 },
        position: { x: 0, y: -1.1, z: 0 },
    },
    omnitrix: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/classic_omnitrix.glb",
        scale: 0.3,
        rotation: { x: -0.7, y: Math.PI + 1, z: 0.1 },
        position: { x: 0, y: -0.7, z: 0 },
    },
    omnitrix2: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/omnitrix2.glb",
        scale: 0.35,
        rotation: { x: -1, y: Math.PI + 0.7, z: -0.4 },
        position: { x: 0, y: 0, z: 0 },
    },
    mickey_mouse: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/mickey_mouse.glb",
        scale: 0.7,
        rotation: { x: 0, y: Math.PI, z: 0 },
        position: { x: 0, y: -1.1, z: 0 },
    },
    donald_duck: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/donald_duck.glb",
        scale: 1.1,
        rotation: { x: 0, y: Math.PI + 0.5, z: 0 },
        position: { x: 0, y: -1.2, z: 0 },
    },
    helmet_mandalorian: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/helmet_mandalorian.glb",
        scale: 1,
        rotation: { x: 0, y: Math.PI + 0.6, z: 0 },
        position: { x: 0, y: 0, z: 0 },
    },
    moon: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/the_moon.glb",
        scale: 1,
        rotation: { x: 0, y: Math.PI + 0.6, z: 0 },
        position: { x: 0, y: 0, z: 0 },
    },
    carpet: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/carpet.glb",
        scale: 0.15,
        rotation: { x: -1.5, y: 0, z: 6 },
        position: { x: 0, y: 0, z: 0 },
    },
    try: {
        url: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/cannonbolt.glb",
        scale: 0.02,
        rotation: { x: 0, y: Math.PI, z: 0 },
        position: { x: 0, y: -0.8, z: 0 },
    },
};

function disposeModel(root) {
    if (!root) return;
    root.traverse((obj) => {
        if (obj.isMesh) {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material))
                    obj.material.forEach((m) => m.dispose && m.dispose());
                else obj.material.dispose && obj.material.dispose();
            }
        }
    });
}

function loadModel(name) {
    const cfg = MODELS[name] || MODELS["hands"];
    if (currentModel) {
        scene.remove(currentModel);
        disposeModel(currentModel);
        currentModel = null;
    }
    const isObj = cfg.url.toLowerCase().endsWith(".obj");
    const loader = isObj ? objLoader : gltfLoader;
    loader.load(
        cfg.url,
        (result) => {
            let m;
            if (isObj) {
                m = result;
                m.traverse((child) => {
                    if (child.isMesh) {
                        if (
                            !child.material ||
                            child.material.type === "MeshBasicMaterial"
                        ) {
                            child.material = new THREE.MeshStandardMaterial({
                                color: 0xffffff,
                                roughness: 0.5,
                                metalness: 0.5,
                            });
                        }
                    }
                });
            } else {
                m = result.scene;
            }
            m.scale.setScalar(cfg.scale ?? 1.0);
            m.rotation.set(
                cfg.rotation?.x ?? 0,
                cfg.rotation?.y ?? 0,
                cfg.rotation?.z ?? 0,
            );
            m.position.set(
                cfg.position?.x ?? 0,
                cfg.position?.y ?? 0,
                cfg.position?.z ?? 0,
            );
            scene.add(m);
            currentModel = m;
            controls.target.copy(handsFocusPoint);
            controls.update();
            camera.lookAt(handsFocusPoint);
        },
        undefined,
        (err) => {
            console.warn("Failed to load model, fallback to hands", err);
            if (name !== "hands") loadModel("hands");
        },
    );
}

loadModel("try");

/* ================= POST ================= */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
let pass = new EffectPass(camera, normal);
composer.addPass(pass);

/* ================= UI ================= */
const sidebar = document.getElementById("sidebar");
const toggleBtn = document.getElementById("toggleBtn");
const floatingToggle = document.getElementById("floatingToggle");
const leftSidebar = document.getElementById("leftSidebar");
const leftToggleBtn = document.getElementById("leftToggleBtn");
const floatingToggleLeft = document.getElementById("floatingToggleLeft");
const listItems = document.querySelectorAll("#effectList li");
const modelListItems = document.querySelectorAll("#modelList li");
const pixelUI = document.getElementById("pixelUI");
const pixelInput = document.getElementById("pixelSize");
const axisCanvas = document.getElementById("axisCanvas");
const axisCtx = axisCanvas.getContext("2d");

function drawAxis(v, color, label, cx, cy, scale) {
    const ex = cx + v.x * scale;
    const ey = cy - v.y * scale;
    const alpha = v.z < 0.0 ? 0.35 : 0.95;
    axisCtx.strokeStyle = color;
    axisCtx.fillStyle = color;
    axisCtx.globalAlpha = alpha;
    axisCtx.lineWidth = 3;
    axisCtx.beginPath();
    axisCtx.moveTo(cx, cy);
    axisCtx.lineTo(ex, ey);
    axisCtx.stroke();
    axisCtx.globalAlpha = 1.0;
    axisCtx.font = "14px 'Fira Code', monospace";
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
    const xV = new THREE.Vector3(1, 0, 0).applyQuaternion(invQ);
    const yV = new THREE.Vector3(0, 1, 0).applyQuaternion(invQ);
    const zV = new THREE.Vector3(0, 0, 1).applyQuaternion(invQ);
    axisCtx.globalAlpha = 0.9;
    axisCtx.strokeStyle = "rgba(255,255,255,0.15)";
    axisCtx.lineWidth = 1;
    axisCtx.beginPath();
    axisCtx.arc(cx, cy, scale, 0, Math.PI * 2);
    axisCtx.stroke();
    drawAxis(xV, "#ff4d4d", "X", cx, cy, scale);
    drawAxis(yV, "#46ff7a", "Y", cx, cy, scale);
    drawAxis(zV, "#4da6ff", "Z", cx, cy, scale);
}

function recalcTargetWidth() {
    targetLayoutWidth =
        window.innerWidth -
        targetLeftOffset -
        (isPanelOpen ? sidebarWidth : 0);
}

function togglePanel() {
    isPanelOpen = !isPanelOpen;
    if (isPanelOpen) {
        sidebar.classList.remove("collapsed");
        toggleBtn.textContent = "—";
        floatingToggle.classList.remove("visible");
    } else {
        sidebar.classList.add("collapsed");
        toggleBtn.textContent = "+";
        floatingToggle.classList.add("visible");
    }
    recalcTargetWidth();
}

function toggleLeftPanel() {
    isLeftPanelOpen = !isLeftPanelOpen;
    if (isLeftPanelOpen) {
        leftSidebar.classList.remove("collapsed");
        leftToggleBtn.textContent = "—";
        floatingToggleLeft.classList.remove("visible");
    } else {
        leftSidebar.classList.add("collapsed");
        leftToggleBtn.textContent = "+";
        floatingToggleLeft.classList.add("visible");
    }
    targetLeftOffset = isLeftPanelOpen ? sidebarWidth : 0;
    recalcTargetWidth();
}

document
    .querySelector("#sidebar h2")
    .addEventListener("click", togglePanel);
document
    .querySelector("#leftSidebar h2")
    .addEventListener("click", toggleLeftPanel);
floatingToggle.addEventListener("click", togglePanel);
floatingToggleLeft.addEventListener("click", toggleLeftPanel);

// Mode Toggle Functionality
const modeToggle = document.getElementById("modeToggle");
const savedTheme = localStorage.getItem("theme");
let isDarkMode = savedTheme === "dark" || savedTheme === null;

function initializeTheme() {
    if (!isDarkMode) {
        document.body.classList.add("light-mode");
        modeToggle.textContent = "☀";
        scene.background = new THREE.Color("#ffffff");
    } else {
        document.body.classList.remove("light-mode");
        modeToggle.textContent = "☽";
        scene.background = new THREE.Color("#010101");
    }
}

function toggleMode() {
    isDarkMode = !isDarkMode;
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");

    if (isDarkMode) {
        document.body.classList.remove("light-mode");
        modeToggle.textContent = "☽";
        scene.background = new THREE.Color("#010101");
    } else {
        document.body.classList.add("light-mode");
        modeToggle.textContent = "☀";
        scene.background = new THREE.Color("#ffffff");
    }
}

modeToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMode();
});

initializeTheme();

function switchEffect(val) {
    composer.removePass(pass);
    renderer.domElement.style.display = "none";
    ascii.domElement.style.display = "none";
    matrix.domElement.style.display = "none";

    if (val === "ascii") {
        ascii.domElement.style.display = "block";
        ascii.setSize(currentLayoutWidth, window.innerHeight);
        pixelUI.style.display = "none";
        return;
    }
    if (val === "matrix") {
        matrix.domElement.style.display = "block";
        matrix.setSize(currentLayoutWidth, window.innerHeight);
        pixelUI.style.display = "none";
        return;
    }

    renderer.domElement.style.display = "block";
    pass = new EffectPass(camera, map[val]);
    composer.addPass(pass);

    pixelUI.style.display = [
        "dots",
        "blockify",
        "halftone",
        "complex",
        "woven",
        "lego",
        "lines",
        "minecraft",
        "tetris",
    ].includes(val)
        ? "block"
        : "none";
}

listItems.forEach((item) => {
    item.addEventListener("click", () => {
        listItems.forEach((li) => li.classList.remove("active"));
        item.classList.add("active");
        switchEffect(item.getAttribute("data-value"));
    });
});

modelListItems.forEach((item) => {
    item.addEventListener("click", () => {
        modelListItems.forEach((li) => li.classList.remove("active"));
        item.classList.add("active");
        loadModel(item.getAttribute("data-value"));
    });
});

switchEffect("normal"); //change default effect here

pixelInput.oninput = (e) => {
    const value = +e.target.value;
    [
        "dots",
        "halftone",
        "blockify",
        "complex",
        "woven",
        "lego",
        "lines",
        "minecraft",
        "tetris"
    ].forEach((key) => {
        if (map[key]?.uniforms?.get("pixelSize"))
            map[key].uniforms.get("pixelSize").value = value;
    });
};

function updateLayout(width, leftOffset) {
    const height = window.innerHeight;

    canvasContainer.style.left = leftOffset + "px";
    canvasContainer.style.width = width + "px";
    canvasContainer.style.height = height + "px";

    renderer.setSize(width, height);
    composer.setSize(width, height);

    renderer.domElement.style.width = width + "px";
    renderer.domElement.style.height = height + "px";

    updateCamera();

    Object.values(map).forEach((e) => {
        if (e?.uniforms?.get?.("resolution"))
            e.uniforms.get("resolution").value.set(width, height);
    });

    if (ascii) {
        ascii.setSize(width, height);
        ascii.domElement.style.width = width + "px";
        ascii.domElement.style.height = height + "px";
    }

    if (matrix) {
        matrix.setSize(width, height);
        matrix.domElement.style.width = width + "px";
        matrix.domElement.style.height = height + "px";
    }
}

function handleResize() {
    targetLeftOffset = isLeftPanelOpen ? sidebarWidth : 0;
    recalcTargetWidth();
    currentLayoutWidth = targetLayoutWidth;
    currentLeftOffset = targetLeftOffset;
    updateLayout(currentLayoutWidth, currentLeftOffset);
}

window.addEventListener("resize", handleResize);
window.addEventListener("fullscreenchange", handleResize);
handleResize();

const activeEffectName = () =>
    document
        .querySelector("#effectList li.active")
        ?.getAttribute("data-value");

/* ================= ANIMATE ================= */
function animate() {
    requestAnimationFrame(animate);
    controls.update();

    let needsLayoutUpdate = false;

    if (Math.abs(currentLayoutWidth - targetLayoutWidth) > 0.5) {
        currentLayoutWidth += (targetLayoutWidth - currentLayoutWidth) * 0.15;
        if (Math.abs(currentLayoutWidth - targetLayoutWidth) < 1)
            currentLayoutWidth = targetLayoutWidth;
        needsLayoutUpdate = true;
    }

    if (Math.abs(currentLeftOffset - targetLeftOffset) > 0.5) {
        currentLeftOffset += (targetLeftOffset - currentLeftOffset) * 0.15;
        if (Math.abs(currentLeftOffset - targetLeftOffset) < 1)
            currentLeftOffset = targetLeftOffset;
        needsLayoutUpdate = true;
    }

    if (needsLayoutUpdate) {
        updateLayout(currentLayoutWidth, currentLeftOffset);
    }

    updateAxisHUD();

    const current = activeEffectName();
    if (current === "ascii") {
        ascii.render(scene, camera);
    } else if (current === "matrix") {
        matrix.render(scene, camera);
    } else {
        composer.render();
    }
}

animate();