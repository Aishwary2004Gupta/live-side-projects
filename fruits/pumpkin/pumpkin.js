import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.177.0/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.177.0/examples/jsm/controls/OrbitControls.js";
import GUI from "https://cdn.jsdelivr.net/npm/lil-gui@0.20.0/dist/lil-gui.esm.js";

const canvas = document.getElementById("app");
const loading = document.getElementById("loading");
const scene = new THREE.Scene();
scene.background = new THREE.Color("#d7d2cc");

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const camera = new THREE.PerspectiveCamera(
  34,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);
camera.position.set(3.15, 2.85, 5.3);

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 1.05, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 3.2;
controls.maxDistance = 9;
controls.maxPolarAngle = Math.PI * 0.49;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.45;

scene.add(new THREE.HemisphereLight("#fff3df", "#69503b", 2.05));

const keyLight = new THREE.DirectionalLight("#fff0d7", 4.1);
keyLight.position.set(-3.8, 6.4, 4.2);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.left = -3.5;
keyLight.shadow.camera.right = 3.5;
keyLight.shadow.camera.top = 4;
keyLight.shadow.camera.bottom = -3;
keyLight.shadow.bias = -0.00025;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight("#f5b98a", 1.15);
fillLight.position.set(4, 2.4, -4);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight("#fff8eb", 2.1);
rimLight.position.set(0.4, 5.2, -4.5);
scene.add(rimLight);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({ color: "#d7d2cc", roughness: 0.92 }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.015;
ground.receiveShadow = true;
scene.add(ground);

const shadowTexture = new THREE.CanvasTexture(
  window.pumpkinAssets.makeGroundShadow(),
);
const contactShadow = new THREE.Mesh(
  new THREE.PlaneGeometry(4.2, 2.7),
  new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  }),
);
contactShadow.rotation.x = -Math.PI / 2;
contactShadow.position.set(0, 0.002, 0);
scene.add(contactShadow);

const maps = window.pumpkinAssets.makeRindMaps();
const textureLoader = new THREE.TextureLoader();
const rindMap = textureLoader.load(maps.color.toDataURL());
const bumpMap = textureLoader.load(maps.bump.toDataURL());
const roughnessMap = textureLoader.load(maps.roughness.toDataURL());
rindMap.colorSpace = THREE.SRGBColorSpace;
for (const texture of [rindMap, bumpMap, roughnessMap]) {
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
}

const rindMaterial = new THREE.MeshStandardMaterial({
  map: rindMap,
  bumpMap,
  bumpScale: 0.012,
  roughnessMap,
  roughness: 0.72,
  color: "#fff7e9",
});

const stemCanvas = window.pumpkinAssets.makeStemTexture();
const stemMap = new THREE.CanvasTexture(stemCanvas);
stemMap.colorSpace = THREE.SRGBColorSpace;

const stemMaterial = new THREE.MeshStandardMaterial({
  map: stemMap,
  color: "#eee0c4",
  roughness: 0.88,
  bumpMap: stemMap,
  bumpScale: 0.035,
});

const pumpkin = new THREE.Group();
scene.add(pumpkin);

const options = {
  lobes: 9,
  ribDepth: 0.13,
  width: 1,
  height: 1,
  roughness: 0.72,
  stemHeight: 0.68,
  stemWidth: 1,
  keyLight: keyLight.intensity,
  autoRotate: true,
};

function createBodyGeometry() {
  const segments = 192;
  const rings = 112;
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let row = 0; row <= rings; row++) {
    const v = row / rings;
    const theta = v * Math.PI;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);
    for (let column = 0; column <= segments; column++) {
      const u = column / segments;
      const phi = u * Math.PI * 2;
      const rib = Math.cos(options.lobes * phi + 0.12 * Math.sin(theta * 2));
      const valley = (1 - rib) * 0.5;
      const radial =
        1.36 *
        Math.pow(Math.max(0, sinTheta), 0.82) *
        (1 - options.ribDepth * valley * (0.62 + 0.38 * sinTheta));
      const uneven =
        1 +
        0.008 * Math.sin(phi * 3 + theta * 2.5) +
        0.004 * Math.sin(phi * 13 - theta * 7);
      const radius = radial * uneven * options.width;
      const crownDimple =
        Math.exp(-Math.pow(radial / 0.27, 2)) * (cosTheta > 0 ? 0.17 : -0.08);
      const shoulder = Math.exp(-Math.pow((radial - 0.3) / 0.1, 2));
      const y =
        0.88 * cosTheta * (0.92 + 0.08 * sinTheta) -
        crownDimple +
        shoulder * Math.max(0, cosTheta) * 0.035;

      positions.push(
        Math.cos(phi) * radius,
        y * options.height,
        Math.sin(phi) * radius,
      );
      uvs.push(u, 1 - v);
      if (row < rings && column < segments) {
        const a = row * (segments + 1) + column;
        const b = a + segments + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createStemGeometry() {
  const radialSegments = 48;
  const heightSegments = 32;
  const positions = [];
  const uvs = [];
  const indices = [];
  const stemHeight = options.stemHeight;

  for (let row = 0; row <= heightSegments; row++) {
    const t = row / heightSegments;
    const centerX = 0.075 * Math.sin(t * 1.35);
    const centerZ = 0.035 * (1 - Math.cos(t * 1.7));
    const flare = Math.exp(-Math.pow(t / 0.16, 2));
    const radius = options.stemWidth * (0.092 * (1 - 0.3 * t) + 0.067 * flare);
    for (let column = 0; column <= radialSegments; column++) {
      const u = column / radialSegments;
      const angle = u * Math.PI * 2;
      const ridges = 1 + 0.09 * Math.cos(angle * 7 + t * 1.6);
      positions.push(
        centerX + Math.cos(angle) * radius * ridges,
        t * stemHeight,
        centerZ + Math.sin(angle) * radius * ridges,
      );
      uvs.push(u, t);
      if (row < heightSegments && column < radialSegments) {
        const a = row * (radialSegments + 1) + column;
        const b = a + radialSegments + 1;
        indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

let body;
let stem;

function rebuildPumpkin() {
  if (body) {
    pumpkin.remove(body);
    body.geometry.dispose();
  }
  if (stem) {
    pumpkin.remove(stem);
    stem.geometry.dispose();
  }

  body = new THREE.Mesh(createBodyGeometry(), rindMaterial);
  body.position.y = 0.91 * options.height;
  body.castShadow = true;
  body.receiveShadow = true;
  pumpkin.add(body);

  stem = new THREE.Mesh(createStemGeometry(), stemMaterial);
  stem.position.y = body.position.y + 0.69 * options.height;
  stem.castShadow = true;
  pumpkin.add(stem);
  contactShadow.scale.set(options.width, 1, options.width);
}

rebuildPumpkin();

const gui = new GUI({ title: "Pumpkin", width: 320 });
const shape = gui.addFolder("Shape");
shape
  .add(options, "lobes", 6, 12, 1)
  .name("ribs")
  .onChange(rebuildPumpkin);
shape
  .add(options, "ribDepth", 0.04, 0.2, 0.005)
  .name("rib depth")
  .onChange(rebuildPumpkin);
shape.add(options, "width", 0.82, 1.16, 0.01).onChange(rebuildPumpkin);
shape.add(options, "height", 0.82, 1.18, 0.01).onChange(rebuildPumpkin);
shape.add(options, "stemHeight", 0.35, 0.95, 0.01).onChange(rebuildPumpkin);
shape.add(options, "stemWidth", 0.7, 1.4, 0.01).onChange(rebuildPumpkin);
shape.close();

const surface = gui.addFolder("Surface");
surface
  .add(options, "roughness", 0.35, 0.95, 0.01)
  .name("rind roughness")
  .onChange((value) => {
    rindMaterial.roughness = value;
  });
surface.close();

const lighting = gui.addFolder("Lighting");
lighting
  .add(options, "keyLight", 1, 7, 0.05)
  .name("key intensity")
  .onChange((value) => {
    keyLight.intensity = value;
  });
lighting.close();

gui
  .add(options, "autoRotate")
  .name("auto rotate")
  .onChange((value) => {
    controls.autoRotate = value;
  });
gui.add({ reset: () => controls.reset() }, "reset").name("reset view");

const clock = new THREE.Clock();
function render() {
  requestAnimationFrame(render);
  controls.update(clock.getDelta());
  renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
});

loading.classList.add("done");
window.pumpkin = { camera, controls, gui, options, renderer, scene };
render();
