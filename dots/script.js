
import * as THREE from "https://esm.sh/three@0.160.0";
import { OrbitControls } from "https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://esm.sh/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "https://esm.sh/three@0.160.0/examples/jsm/loaders/OBJLoader.js";
import {
EffectComposer,
RenderPass,
EffectPass,
Effect
} from "https://esm.sh/postprocessing@6.35.4?deps=three@0.160.0";

/* Layout */

const sidebarWidth = 280;
let isPanelOpen = true;

let currentLayoutWidth = window.innerWidth - sidebarWidth;
let targetLayoutWidth = window.innerWidth - sidebarWidth;

const canvasContainer = document.getElementById("canvasContainer");

/* Scene */

const scene = new THREE.Scene();
scene.background = new THREE.Color("#000000");

/* Camera */

const frustumSize = 350;

const camera = new THREE.OrthographicCamera(
(-frustumSize*(currentLayoutWidth/window.innerHeight))/2,
(frustumSize*(currentLayoutWidth/window.innerHeight))/2,
frustumSize/2,
-frustumSize/2,
0.01,
500
);

camera.position.set(0,0,-5);
camera.zoom = 140;
camera.updateProjectionMatrix();

/* Renderer */

const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(currentLayoutWidth,window.innerHeight);
canvasContainer.appendChild(renderer.domElement);

/* Composer */

const composer = new EffectComposer(renderer);

const renderPass = new RenderPass(scene,camera);
composer.addPass(renderPass);

/* Controls */

const controls = new OrbitControls(camera,canvasContainer);
controls.enablePan = false;
controls.enableDamping = true;

controls.rotateSpeed = 0.7;
controls.dampingFactor = 0.08;

/* slight vertical rotation */

controls.minPolarAngle = Math.PI/2 - 0.35;
controls.maxPolarAngle = Math.PI/2 + 0.35;

/* Lights */

scene.add(new THREE.AmbientLight(0xffffff,.6));

const dl = new THREE.DirectionalLight(0xffffff,10);
dl.position.set(5,10,0);
scene.add(dl);

/* Loaders */

const gltfLoader = new GLTFLoader();
const objLoader = new OBJLoader();

let currentModel=null;

/* Dispose */

function disposeModel(root){

if(!root) return;

root.traverse(o=>{
if(o.isMesh){

if(o.geometry) o.geometry.dispose();

if(o.material){
if(Array.isArray(o.material)){
o.material.forEach(m=>m.dispose());
}else{
o.material.dispose();
}
}

}
});

}

/* Setup */

function setupModel(m){

m.scale.setScalar(.6);
m.rotation.y=.5;
m.position.y=-1;

scene.add(m);

}

/* Universal loader */

function loadModel(url){

if(currentModel){
scene.remove(currentModel);
disposeModel(currentModel);
}

const ext=url.split(".").pop().toLowerCase();

if(ext==="glb"||ext==="gltf"){

gltfLoader.load(url,g=>{
currentModel=g.scene;
setupModel(currentModel);
});

}

if(ext==="obj"){

objLoader.load(url,obj=>{

currentModel=obj;

currentModel.traverse(c=>{
if(c.isMesh&&!c.material){
c.material=new THREE.MeshStandardMaterial({color:0xcccccc});
}
});

setupModel(currentModel);

});

}

}

/* Load example */

loadModel("https://raw.githubusercontent.com/alecjacobson/common-3d-test-models/master/data/teapot.obj");

/* Shaders */

const dotsShader=`
precision highp float;
uniform float pixelSize;
uniform vec2 resolution;

void mainImage(const in vec4 i,const in vec2 uv,out vec4 o){

vec2 s=pixelSize/resolution;
vec2 u=s*floor(uv/s);

vec4 c=texture2D(inputBuffer,u);

float l=dot(vec3(.2126,.7152,.0722),c.rgb);

vec2 f=fract(uv/s);

float radius=l>.5?.3:l>.001?.12:.075;

vec2 center=l>.5?vec2(.5):vec2(.25);

float d=distance(f,center);

float m=smoothstep(radius,radius-.05,d);

o=vec4(vec3(m)*max(l,.05),1.);

}
`;

/* Effect */

function makeEffect(name,shader,uniforms={}){

const map=new Map();

for(const k in uniforms)
map.set(k,new THREE.Uniform(uniforms[k]));

return new(class extends Effect{

constructor(){
super(name,shader,{uniforms:map});
}

update(renderer){
if(map.has("resolution")){
const c=renderer.domElement;
map.get("resolution").value.set(c.width,c.height);
}
}

})();

}

const dots=makeEffect("Dots",dotsShader,{
pixelSize:10,
resolution:new THREE.Vector2(innerWidth,innerHeight)
});

/* EffectPass */

const effectPass=new EffectPass(camera,dots);
effectPass.enabled=true;

composer.addPass(effectPass);

/* Effect switching */

function switchEffect(name){

if(name==="normal"){

effectPass.enabled=false;

}

if(name==="dots"){

effectPass.enabled=true;
effectPass.effects=[dots];

}

}

/* UI */

document.querySelectorAll("#effectList li").forEach(item=>{

item.addEventListener("click",()=>{

document.querySelectorAll("#effectList li")
.forEach(li=>li.classList.remove("active"));

item.classList.add("active");

switchEffect(item.dataset.value);

});

});

/* Init */

switchEffect(document.querySelector("#effectList li.active").dataset.value);

/* Slider */

document.getElementById("pixelSize").oninput=e=>{
dots.uniforms.get("pixelSize").value=+e.target.value;
};

/* Sidebar */

const sidebar=document.getElementById("sidebar");
const toggleBtn=document.getElementById("toggleBtn");
const floatingToggle=document.getElementById("floatingToggle");

function togglePanel(){

isPanelOpen=!isPanelOpen;

if(isPanelOpen){

sidebar.classList.remove("collapsed");
toggleBtn.textContent="—";
floatingToggle.classList.remove("visible");

targetLayoutWidth=window.innerWidth-sidebarWidth;

}else{

sidebar.classList.add("collapsed");
toggleBtn.textContent="+";
floatingToggle.classList.add("visible");

targetLayoutWidth=window.innerWidth;

}

}

document.querySelector("h2").addEventListener("click",togglePanel);
floatingToggle.addEventListener("click",togglePanel);

/* Layout */

function updateLayout(width){

canvasContainer.style.width=width+"px";

renderer.setSize(width,window.innerHeight);
composer.setSize(width,window.innerHeight);

const aspect=width/window.innerHeight;

camera.left=(-frustumSize*aspect)/2;
camera.right=(frustumSize*aspect)/2;

camera.updateProjectionMatrix();

}

/* Resize */

window.addEventListener("resize",()=>{

targetLayoutWidth=isPanelOpen
?window.innerWidth-sidebarWidth
:window.innerWidth;

});

/* Animation */

function animate(){

requestAnimationFrame(animate);

controls.update();

if(Math.abs(currentLayoutWidth-targetLayoutWidth)>.5){

currentLayoutWidth+=(targetLayoutWidth-currentLayoutWidth)*.15;
updateLayout(currentLayoutWidth);

}

composer.render();

}

animate();
