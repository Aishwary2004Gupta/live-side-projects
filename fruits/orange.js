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

const orangeMaterial = new THREE.MeshPhysicalMaterial({
  color: '#ff9d1f',
  emissive: '#3e1900',
  roughness: 0.7,
  metalness: 0.08,
  clearcoat: 0.38,
  clearcoatRoughness: 0.45,
  reflectivity: 0.7,
});

const orange = new THREE.Mesh(new THREE.SphereGeometry(1.25, 72, 72), orangeMaterial);
orange.castShadow = true;
orange.receiveShadow = true;
orange.scale.set(1.22, 1.08, 1.16);
fruitGroup.add(orange);

const deformation = orange.geometry.attributes.position;
for (let i = 0; i < deformation.count; i++) {
  const x = deformation.getX(i);
  const y = deformation.getY(i);
  const z = deformation.getZ(i);
  const radial = Math.sqrt(x * x + y * y + z * z);
  const wave = Math.sin((x + y * 1.2) * 4.2) * 0.06;
  const offset = (1 + wave) * (radial / 1.25);
  deformation.setXYZ(i, x * offset, y * offset, z * offset);
}
deformation.needsUpdate = true;
orange.geometry.computeVertexNormals();

const top = new THREE.Mesh(
  new THREE.CylinderGeometry(0.18, 0.28, 0.7, 28),
  new THREE.MeshStandardMaterial({ color: '#6b3f1c', roughness: 0.8 })
);
top.position.set(0, 1.22, 0);
top.rotation.z = 0.28;
top.castShadow = true;
fruitGroup.add(top);

const stem = new THREE.Mesh(
  new THREE.CylinderGeometry(0.03, 0.055, 0.65, 16),
  new THREE.MeshStandardMaterial({ color: '#4f2c1a', roughness: 0.9 })
);
stem.position.set(0.05, 1.65, 0.05);
stem.rotation.z = 0.8;
stem.castShadow = true;
fruitGroup.add(stem);

const leafShape = new THREE.Shape();
leafShape.moveTo(0, 0);
leafShape.quadraticCurveTo(0.42, 0.32, 0.12, 0.9);
leafShape.quadraticCurveTo(-0.25, 0.38, 0, 0);

const leaf = new THREE.Mesh(
  new THREE.ShapeGeometry(leafShape),
  new THREE.MeshStandardMaterial({
    color: '#4da64d',
    roughness: 0.9,
    side: THREE.DoubleSide,
  })
);
leaf.position.set(0.6, 1.72, 0.12);
leaf.rotation.z = 1.2;
leaf.rotation.x = 0.6;
leaf.scale.set(1.1, 1.5, 1);
leaf.castShadow = true;
fruitGroup.add(leaf);

fruitGroup.position.y = 0.15;

const clock = new THREE.Clock();

function animate() {
  const t = clock.getElapsedTime();
  orange.rotation.y = t * 0.45;
  orange.rotation.x = Math.sin(t * 0.8) * 0.18;
  fruitGroup.position.y = 0.15 + Math.sin(t * 1.2) * 0.08;
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();

const handleResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
};

window.addEventListener('resize', handleResize);

window.addEventListener('load', () => {
  setTimeout(() => loading.classList.add('done'), 220);
});
