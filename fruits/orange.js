import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const canvas = document.getElementById('app');
const loading = document.getElementById('loading');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor('#111111', 1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#111111');
scene.fog = new THREE.Fog('#111111', 7, 16);

const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.2, 5.4);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = true;
controls.enableZoom = true;
controls.enableRotate = true;
controls.rotateSpeed = 0.9;
controls.panSpeed = 0.8;
controls.zoomSpeed = 0.9;
controls.dampingFactor = 0.08;
controls.minDistance = 2.6;
controls.maxDistance = 9;
controls.minPolarAngle = 0.6;
controls.maxPolarAngle = Math.PI * 0.78;
controls.target.set(0, 0.75, 0);

const ambient = new THREE.HemisphereLight('#f8d4a6', '#111111', 1.75);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight('#fff5d9', 2.2);
keyLight.position.set(3, 5, 5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
keyLight.shadow.bias = -0.0002;
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight('#8ec8ff', 1.2);
rimLight.position.set(-4, 2, -3);
scene.add(rimLight);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(6, 64),
  new THREE.MeshStandardMaterial({
    color: '#181818',
    roughness: 0.95,
    metalness: 0.04,
  })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.7;
floor.receiveShadow = true;
scene.add(floor);

const fruitGroup = new THREE.Group();
scene.add(fruitGroup);

function createPumpkinSkinTextures() {
  const width = 1024;
  const height = 512;
  const colorCanvas = document.createElement('canvas');
  const bumpCanvas = document.createElement('canvas');
  colorCanvas.width = bumpCanvas.width = width;
  colorCanvas.height = bumpCanvas.height = height;

  const colorContext = colorCanvas.getContext('2d');
  const bumpContext = bumpCanvas.getContext('2d');
  const colorPixels = colorContext.createImageData(width, height);
  const bumpPixels = bumpContext.createImageData(width, height);

  for (let y = 0; y < height; y++) {
    const v = y / height;
    for (let x = 0; x < width; x++) {
      const u = x / width;
      const angle = u * Math.PI * 2;
      const broadMottle = Math.sin(angle * 3 + Math.sin(v * 13) * 0.7)
        + Math.sin(angle * 7 - v * 11) * 0.45
        + Math.sin(v * 37 + angle * 2) * 0.2;
      const grain = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      const noise = (grain - Math.floor(grain) - 0.5) * 12;
      const ribShade = Math.cos(angle * 10 + Math.sin(v * 8) * 0.12);
      const pigment = broadMottle * 5 + noise + ribShade * 3;
      const index = (y * width + x) * 4;

      colorPixels.data[index] = 211 + pigment;
      colorPixels.data[index + 1] = 76 + broadMottle * 4 + noise * 0.42;
      colorPixels.data[index + 2] = 17 + broadMottle * 1.3 + noise * 0.12;
      colorPixels.data[index + 3] = 255;

      const skinGrain = 142 + noise * 3 + broadMottle * 5 + ribShade * 9;
      bumpPixels.data[index] = skinGrain;
      bumpPixels.data[index + 1] = skinGrain;
      bumpPixels.data[index + 2] = skinGrain;
      bumpPixels.data[index + 3] = 255;
    }
  }

  colorContext.putImageData(colorPixels, 0, 0);
  bumpContext.putImageData(bumpPixels, 0, 0);

  const colorTexture = new THREE.CanvasTexture(colorCanvas);
  colorTexture.colorSpace = THREE.SRGBColorSpace;
  colorTexture.wrapS = THREE.RepeatWrapping;
  colorTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const bumpTexture = new THREE.CanvasTexture(bumpCanvas);
  bumpTexture.wrapS = THREE.RepeatWrapping;
  bumpTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  return { colorTexture, bumpTexture };
}

function createPumpkinGeometry() {
  const radialSegments = 144;
  const verticalSegments = 112;
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let row = 0; row <= verticalSegments; row++) {
    const theta = (row / verticalSegments) * Math.PI;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    for (let column = 0; column <= radialSegments; column++) {
      const u = column / radialSegments;
      const phi = u * Math.PI * 2;
      const rib = Math.cos(phi * 10 + 0.08 * Math.sin(theta * 5));
      const poleSoftening = Math.pow(Math.max(sinTheta, 0), 0.55);
      const fineRib = Math.sin(phi * 20 + theta * 4) * 0.009 * poleSoftening;
      const radius = sinTheta * (1 + rib * 0.105 * poleSoftening + fineRib);
      const x = Math.cos(phi) * radius * 1.28;
      const z = Math.sin(phi) * radius * 1.16;
      const crownIndent = 0.12 * Math.exp(-Math.pow(radius / 0.23, 2)) * Math.pow(Math.max(cosTheta, 0), 4);
      const baseIndent = 0.065 * Math.exp(-Math.pow(radius / 0.27, 2)) * Math.pow(Math.max(-cosTheta, 0), 4);
      const y = cosTheta * 0.86 - crownIndent + baseIndent;

      positions.push(x, y, z);
      uvs.push(u, 1 - row / verticalSegments);
    }
  }

  for (let row = 0; row < verticalSegments; row++) {
    for (let column = 0; column < radialSegments; column++) {
      const a = row * (radialSegments + 1) + column;
      const b = a + radialSegments + 1;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createStemGeometry() {
  const rings = 24;
  const radialSegments = 16;
  const positions = [];
  const indices = [];

  for (let row = 0; row <= rings; row++) {
    const t = row / rings;
    const radius = 0.155 * (1 - t * 0.48) * (1 + Math.sin(t * 22) * 0.035);
    const centerX = 0.18 * t * t;
    const centerZ = 0.025 * Math.sin(t * Math.PI);

    for (let column = 0; column <= radialSegments; column++) {
      const angle = (column / radialSegments) * Math.PI * 2;
      const rib = 1 + Math.cos(angle * 6) * 0.055;
      positions.push(
        centerX + Math.cos(angle) * radius * rib,
        t * 0.62,
        centerZ + Math.sin(angle) * radius * rib,
      );
    }
  }

  for (let row = 0; row < rings; row++) {
    for (let column = 0; column < radialSegments; column++) {
      const a = row * (radialSegments + 1) + column;
      const b = a + radialSegments + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

const { colorTexture, bumpTexture } = createPumpkinSkinTextures();
const pumpkinMaterial = new THREE.MeshPhysicalMaterial({
  map: colorTexture,
  bumpMap: bumpTexture,
  bumpScale: 0.035,
  roughness: 0.82,
  metalness: 0,
  clearcoat: 0.12,
  clearcoatRoughness: 0.72,
});

const pumpkin = new THREE.Mesh(createPumpkinGeometry(), pumpkinMaterial);
pumpkin.castShadow = true;
pumpkin.receiveShadow = true;
fruitGroup.add(pumpkin);

const stemMaterial = new THREE.MeshStandardMaterial({
  color: '#594126',
  roughness: 0.94,
});
const stem = new THREE.Mesh(createStemGeometry(), stemMaterial);
stem.position.set(-0.08, 0.73, 0);
stem.rotation.z = -0.14;
stem.castShadow = true;
fruitGroup.add(stem);

const stemCollar = new THREE.Mesh(
  new THREE.TorusGeometry(0.19, 0.035, 10, 48),
  new THREE.MeshStandardMaterial({ color: '#74602d', roughness: 0.9 }),
);
stemCollar.rotation.x = Math.PI / 2;
stemCollar.position.set(0, 0.82, 0);
stemCollar.castShadow = true;
fruitGroup.add(stemCollar);

fruitGroup.position.y = 0.15;

const presetConfigs = {
  default: { target: new THREE.Vector3(0, 0.75, 0), position: new THREE.Vector3(0, 1.2, 5.4) },
  close: { target: new THREE.Vector3(0.15, 0.8, 0), position: new THREE.Vector3(0.9, 1.1, 2.8) },
  top: { target: new THREE.Vector3(0, 1.2, 0), position: new THREE.Vector3(0, 4.8, 1.2) },
  wide: { target: new THREE.Vector3(0, 0.6, 0), position: new THREE.Vector3(4.6, 1.4, 4.6) },
};

let autoSpin = true;
let activePreset = 'default';

function updateButtonState(selector, value) {
  document.querySelectorAll(selector).forEach((button) => {
    button.classList.toggle('active', button.dataset[selector.replace('[data-', '').replace(']', '')] === value);
  });
}

function applyPreset(name) {
  const preset = presetConfigs[name] || presetConfigs.default;
  activePreset = name;
  camera.position.copy(preset.position);
  controls.target.copy(preset.target);
  controls.update();
}

const spinButton = document.querySelector('[data-action="spin"]');
const resetButton = document.querySelector('[data-action="reset"]');
const presetButtons = document.querySelectorAll('[data-preset]');
const qualityButtons = document.querySelectorAll('[data-quality]');

spinButton.addEventListener('click', () => {
  autoSpin = !autoSpin;
  spinButton.textContent = autoSpin ? 'Pause spin' : 'Resume spin';
  spinButton.classList.toggle('active', autoSpin);
});

resetButton.addEventListener('click', () => {
  applyPreset(activePreset || 'default');
});

presetButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const presetName = button.dataset.preset;
    applyPreset(presetName);
    presetButtons.forEach((presetButton) => {
      presetButton.classList.toggle('active', presetButton === button);
    });
  });
});

qualityButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const quality = button.dataset.quality;
    if (quality === 'low') renderer.setPixelRatio(1);
    else if (quality === 'high') renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    else renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    qualityButtons.forEach((qualityButton) => {
      qualityButton.classList.toggle('active', qualityButton === button);
    });
  });
});

const clock = new THREE.Clock();

function animate() {
  const t = clock.getElapsedTime();
  if (autoSpin) {
    pumpkin.rotation.y += 0.012;
  }
  pumpkin.rotation.x = Math.sin(t * 0.9) * 0.08;
  fruitGroup.position.y = 0.15 + Math.sin(t * 1.2) * 0.08;
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

const handleResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
};

window.addEventListener('resize', handleResize);

applyPreset('default');
spinButton.classList.add('active');
presetButtons.forEach((button) => {
  button.classList.toggle('active', button.dataset.preset === 'default');
});
qualityButtons.forEach((button) => {
  button.classList.toggle('active', button.dataset.quality === 'medium');
});

window.addEventListener('load', () => {
  setTimeout(() => loading.classList.add('done'), 220);
  setTimeout(() => loading.remove(), 700);
});

animate();
