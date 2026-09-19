var container;
var camera, scene, renderer;
var controls;

var shaderUniforms, shaderAttributes;
var particleSystem;

var imageWidth = 640;
var imageHeight = 360;
var imageData = null;

var animationTime = 0;
var animationDelta = 0.03;
var isPlaying = true;
var motionProgress;
var motionValue;
var playToggle;
var playToggleIcon;
var playToggleLabel;

function init() {
    createScene();
    createControls();
    createPixelData();
    createAnimationPanel();

    window.addEventListener('resize', onWindowResize, false);
}

function createAnimationPanel() {
    motionProgress = document.getElementById('motionProgress');
    motionValue = document.getElementById('motionValue');
    playToggle = document.getElementById('playToggle');
    playToggleIcon = document.getElementById('playToggleIcon');
    playToggleLabel = document.getElementById('playToggleLabel');
    updatePlayToggle();

    playToggle.addEventListener('click', function () {
        isPlaying = !isPlaying;
        updatePlayToggle();
    });

    motionProgress.addEventListener('input', function () {
        animationTime = progressToTime(Number(motionProgress.value));
        updateMotionReadout();
        updateAmplitude();
    });
}

function createScene() {
    container = document.getElementById('container');

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(20, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.z = 3000;
    camera.lookAt(scene.position);

    renderer = new THREE.WebGLRenderer({
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 1);

    container.appendChild(renderer.domElement);
}

function createControls() {
    controls = new THREE.TrackballControls(camera);
    controls.rotateSpeed = 1.0;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;
    controls.noZoom = false;
    controls.noPan = true;
    controls.staticMoving = true;
    controls.dynamicDampingFactor = 0.3;
}

function createPixelData() {
    var image = document.createElement("img");
    var canvas = document.createElement("canvas");
    var context = canvas.getContext("2d");

    image.crossOrigin = "Anonymous";
    image.onload = function () {
        canvas.width = imageWidth;
        canvas.height = imageHeight;

        // FIXED: Use drawImage instead of fillPattern
        context.drawImage(image, 0, 0, imageWidth, imageHeight);

        imageData = context.getImageData(0, 0, imageWidth, imageHeight).data;

        createParticles(); // FIXED: Typo was "createPaticles"
        tick();
    };

    image.onerror = function () {
        console.error("Failed to load image. Check CORS policy.");
    };

    image.src = "https://plus.unsplash.com/premium_photo-1724372238882-7b0170a37ada";
}

function createParticles() {
    var weights = [0.2126, 0.7152, 0.0722];
    var c = 0;
    var x, y;
    var zRange = 400;

    var geometry = new THREE.Geometry();
    geometry.dynamic = false;

    x = imageWidth * -0.5;
    y = imageHeight * 0.5;

    shaderAttributes = {
        vertexColor: {
            type: "c",
            value: []
        }
    };

    shaderUniforms = {
        amplitude: {
            type: "f",
            value: 0.5
        }
    };

    var shaderMaterial = new THREE.ShaderMaterial({
        attributes: shaderAttributes,
        uniforms: shaderUniforms,
        vertexShader: document.getElementById("vertexShader").textContent,
        fragmentShader: document.getElementById("fragmentShader").textContent
    });

    for (var i = 0; i < imageHeight; i++) {
        for (var j = 0; j < imageWidth; j++) {
            var color = new THREE.Color();
            color.setRGB(imageData[c] / 255, imageData[c + 1] / 255, imageData[c + 2] / 255);
            shaderAttributes.vertexColor.value.push(color);

            var weight = color.r * weights[0] + color.g * weights[1] + color.b * weights[2];
            var vertex = new THREE.Vector3();

            vertex.x = x;
            vertex.y = y;
            vertex.z = (zRange * -0.5) + (zRange * weight);

            geometry.vertices.push(vertex);

            c += 4;
            x++;
        }
        x = imageWidth * -0.5;
        y--;
    }

    console.log("Particles created:", geometry.vertices.length);

    particleSystem = new THREE.ParticleSystem(geometry, shaderMaterial);
    scene.add(particleSystem);
}

function tick() {
    requestAnimationFrame(tick);
    update();
    render();
}

function update() {
    if (isPlaying) {
        animationTime += animationDelta;
        animationTime %= Math.PI * 2;
        updateMotionReadout();
    }
    updateAmplitude();
    controls.update();
}

function updateAmplitude() {
    shaderUniforms.amplitude.value = Math.sin(animationTime);
}

function progressToTime(progress) {
    return (progress / 100) * Math.PI * 2;
}

function updateMotionReadout() {
    var progress = (animationTime / (Math.PI * 2)) * 100;
    motionProgress.value = progress;
    motionValue.textContent = Math.round(progress) + '%';
}

function updatePlayToggle() {
    playToggle.setAttribute('aria-pressed', isPlaying ? 'true' : 'false');
    playToggleIcon.innerHTML = isPlaying ? '&#10074;&#10074;' : '&#9654;';
    playToggleLabel.textContent = isPlaying ? 'Pause' : 'Play';
}

function render() {
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}