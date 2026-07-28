// slider
class Slider {
  constructor({ element, elements, titles }) {
    this.element = element;
    this.elements = [...elements];
    this.titles = [...titles];
    this.scroll = { ease: 0.1, current: 0, target: 0, last: 0, speed: 0 };
    this.touch = { start: 0, current: 0 };
    this.isDragging = false;

    this.SliderHeight = this.element.clientHeight;
    this.SlideHeight = this.elements[0].clientHeight;
    this.wrapHeight = this.SliderHeight * this.elements.length;

    this.handleOnCheck = _.debounce(this.onCheck.bind(this), 100);

    this.dispose(0);
    this.addEvents();
    this.render();
  }

  lerp(a, b, n) { return (1 - n) * a + n * b; }

  dispose(scroll) {
    gsap.set(this.elements, {
      y: (i) => i * this.SlideHeight + scroll,
      modifiers: {
        y: (y) => {
          const s = gsap.utils.wrap(-this.SlideHeight, this.wrapHeight - this.SlideHeight, parseInt(y));
          return `${s}px`;
        },
      },
    });
  }

  handleMouseWheel(e) {
    this.scroll.target -= e.deltaY * 2;
    this.handleOnCheck();
  }

  handleTouchStart(e) {
    this.touch.start = e.clientY || e.touches[0].clientY;
    this.isDragging = true;
    this.element.classList.add("is-dragging");
  }

  handleTouchMove(e) {
    if (this.isDragging) {
      this.touch.current = e.clientY || e.touches[0].clientY;
      this.scroll.target += (this.touch.current - this.touch.start) * 4;
      this.touch.start = this.touch.current;
    }
  }

  handleTouchEnd() {
    this.isDragging = false;
    this.element.classList.remove("is-dragging");
    this.handleOnCheck();
  }

  addEvents() {
    this.element.addEventListener("wheel", this.handleMouseWheel.bind(this), { passive: true });
    this.element.addEventListener("touchstart", this.handleTouchStart.bind(this), { passive: true });
    this.element.addEventListener("touchmove", this.handleTouchMove.bind(this), { passive: true });
    this.element.addEventListener("touchend", this.handleTouchEnd.bind(this), { passive: true });
    this.element.addEventListener("mousedown", this.handleTouchStart.bind(this), { passive: true });
    this.element.addEventListener("mousemove", this.handleTouchMove.bind(this), { passive: true });
    this.element.addEventListener("mouseup", this.handleTouchEnd.bind(this), { passive: true });
    this.element.addEventListener("selectstart", () => false);
    window.addEventListener("resize", this.onResize.bind(this));
  }

  onCheck() {
    const itemIndex = Math.round(Math.abs(this.scroll.target) / this.SlideHeight);
    const item = this.SlideHeight * itemIndex;
    gsap.to(this.scroll, {
      target: this.scroll.target < 0 ? -item : item,
      duration: 0.5,
      ease: "elastic.out(1, 1)",
    });
  }

  onResize() {
    this.SliderHeight = this.element.clientHeight;
    this.SlideHeight = this.elements[0].clientHeight + 100;
    this.wrapHeight = this.SliderHeight * this.elements.length;
  }

  render() {
    this.scroll.current = this.lerp(this.scroll.current, this.scroll.target, this.scroll.ease);
    this.dispose(this.scroll.current);
    this.scroll.speed = this.scroll.current - this.scroll.last;
    this.scroll.last = this.scroll.current;
    this.currentIndex = Math.round(Math.abs(this.scroll.current) / this.SlideHeight) % this.elements.length;

    gsap.set(this.titles, {
      y: (i) => i * this.SlideHeight + this.scroll.current,
      modifiers: {
        y: (y) => {
          const s = gsap.utils.wrap(-this.SlideHeight, this.wrapHeight - this.SlideHeight, parseInt(y));
          return `${s}px`;
        },
      },
    });

    requestAnimationFrame(this.render.bind(this));
  }
}

function map(valueToMap, inMin, inMax, outMin, outMax) {
  return gsap.utils.mapRange(inMin, inMax, outMin, outMax, valueToMap);
}

const _SHADERS = {
  vertex: document.querySelector("#vertex").textContent,
  fragment: document.querySelector("#fragment").textContent,
};

class PlaneSmooth {
  constructor({ element, scene }) {
    this.element = element;
    this.scene = scene;
    this.image = this.element.querySelector("img");
    this.vert = _SHADERS.vertex;
    this.frag = _SHADERS.fragment;
    this.sizes = new THREE.Vector2(0, 0);
    this.offset = new THREE.Vector2(0, 0);
    this.clock = new THREE.Clock();
    this.mouse = {
      current: new THREE.Vector2(0, 0),
      follow: new THREE.Vector2(0, 0),
      prev: new THREE.Vector2(0, 0),
      speed: 0,
      targetSpeed: 0,
    };
    this.createMesh();
    this.mouseMove();
  }

  mouseMove() {
    window.addEventListener("mousemove", (e) => {
      this.mouse.current.x = e.clientX / window.innerWidth;
      this.mouse.current.y = 1 - e.clientY / window.innerHeight;
    });
    this.element.addEventListener("mouseenter", () => gsap.to(this.element, { rotate: 2.5 }));
    this.element.addEventListener("mouseleave", () => gsap.to(this.element, { rotate: 0 }));
  }

  getDimension() {
    const { width, height, top, left } = this.image.getBoundingClientRect();
    this.sizes.set(width, height);
    this.offset.set(
      left - window.innerWidth / 2 + width / 2,
      -top + window.innerHeight / 2 - height / 2
    );
  }

  createMesh() {
    this.geometry = new THREE.PlaneGeometry(1, 1, 100, 100);
    this.imageTexture = new THREE.TextureLoader().load(this.image.src);
    this.imageTexture.minFilter = THREE.LinearFilter;
    this.imageTexture.generateMipmaps = false;
    this.uniforms = {
      uTexture: { value: this.imageTexture },
      uOffset: { value: new THREE.Vector2(0, 0) },
      uAlpha: { value: 1 },
      uTime: { value: 0 },
      uPlaneSizes: { value: [0, 0] },
      uImageSizes: { value: [0, 0] },
      uViewportSizes: { value: [window.innerWidth, window.innerHeight] },
      uZoom: { value: 0.85 },
      uParallax: { value: 0 },
      uProgress: { value: 0 },
      uResolution: { value: new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2) },
      uQuadSize: { value: new THREE.Vector2(300, 300) },
      uTextureSize: { value: new THREE.Vector2(100, 100) },
      uCorners: { value: new THREE.Vector4(0, 0, 0, 0) },
      uStrength: { value: 0 },
      uMouse: { value: new THREE.Vector2(-10, -10) },
      uVelo: { value: 0 },
      uMouseSize: { value: new THREE.Vector2(1, window.innerHeight / window.innerWidth) },
    };
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: this.vert,
      fragmentShader: this.frag,
      transparent: true,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.getDimension();
    this.mesh.position.set(this.offset.x, this.offset.y, this.z);
    this.mesh.scale.set(this.sizes.x, this.sizes.y, 1);
    this.scene.add(this.mesh);
  }

  getSpeed() {
    this.speed = Math.sqrt(
      (this.mouse.prev.x - this.mouse.current.x) ** 2 +
      (this.mouse.prev.y - this.mouse.current.y) ** 2
    );
    this.mouse.targetSpeed -= 0.1 * (this.mouse.targetSpeed - this.speed);
    this.mouse.follow.x -= 0.1 * (this.mouse.follow.x - this.mouse.current.x);
    this.mouse.follow.y -= 0.1 * (this.mouse.follow.y - this.mouse.current.y);
    this.mouse.prev.x = this.mouse.current.x;
    this.mouse.prev.y = this.mouse.current.y;
  }

  render(scroll) {
    this.scroll = scroll;
    this.scrollSpeed = (this.scroll.target - this.scroll.current) * 0.001;
    this.uniforms.uStrength.value = Math.abs(this.scrollSpeed);
    const positionInViewport = (this.mesh.position.y - this.scroll.current / 100) * 0.05;
    this.uniforms.uParallax.value = map(positionInViewport, -1.1, 1.1, -0.005, 0.005);
    this.uniforms.uPlaneSizes.value = [this.mesh.scale.x, this.mesh.scale.y];
    this.getDimension();
    this.getSpeed();
    this.mesh.position.set(this.offset.x, this.offset.y, this.z);
    this.mesh.scale.set(this.sizes.x, this.sizes.y, 1);
    this.uniforms.uOffset.value.set(0, -this.scrollSpeed);
    this.uniforms.uImageSizes.value = [this.image.naturalWidth, this.image.naturalHeight];
    this.uniforms.uMouse.value = this.mouse.follow;
    this.uniforms.uVelo.value = Math.min(this.mouse.targetSpeed, 0.05);
    this.mouse.targetSpeed *= 0.999;
    this.time = this.clock.getElapsedTime();
    this.uniforms.uTime.value = this.time;
  }
}

class Webgl {
  constructor({ canvas, elements, scroll }) {
    this.canvas = canvas;
    this.elements = [...elements];
    this.scroll = scroll;
    this.meshItems = [];
    this.createSetup();
    this.createMeshItems();
    this.render();
  }

  get viewport() {
    let width = window.innerWidth;
    let height = window.innerHeight;
    let aspectRatio = width / height;
    return { width, height, aspectRatio };
  }

  createSetup() {
    this.scene = new THREE.Scene();
    this.camera = null;
    this.renderer = new THREE.WebGL1Renderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setClearColor(0x000000, 0);
    this.perspective = 1000;
    this.fov = (180 * (2 * Math.atan(window.innerHeight / 2 / this.perspective))) / Math.PI;
    this.camera = new THREE.PerspectiveCamera(this.fov, this.viewport.aspectRatio, 1, this.perspective);
    this.camera.position.set(0, 0, this.perspective);
    this.renderer.sortObjects = false;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.setSize(this.viewport.width, this.viewport.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    window.addEventListener("resize", this.onWindowResize.bind(this), false);
  }

  onWindowResize() {
    this.camera.aspect = this.viewport.aspectRatio;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.viewport.width, this.viewport.height);
  }

  createMeshItems() {
    this.elements.forEach((element) => {
      const meshItem = new PlaneSmooth({ element: element, scene: this.scene });
      this.meshItems.push(meshItem);
    });
  }

  render() {
    for (let i = 0; i < this.meshItems.length; i++) {
      this.meshItems[i].render(this.scroll);
    }
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.render.bind(this));
  }
}

// ==========================================
// LOADER: Continuous Sine Wave Animation
// Mimics the vertex shader: sin(uv * PI + time)
// ==========================================
class WaveLoader {
  constructor() {
    this.loader = document.querySelector(".loader");
    this.letters = document.querySelectorAll(".loader-text span");
    this.progressBar = document.querySelector(".loader-progress-bar");
    this.startTime = performance.now();
    this.duration = 3000; // 3 seconds
    this.isComplete = false;

    // Wave parameters (matches shader uniforms feel)
    this.amplitude = 30;        // How high letters bounce (px)
    this.frequency = 2.5;       // Wave density across letters
    this.speed = 3;             // Wave traveling speed
    this.rotationAmp = 8;       // Rotation in degrees

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  animate(now) {
    const elapsed = (now - this.startTime) / 1000; // seconds
    const progress = Math.min((now - this.startTime) / this.duration, 1);

    // Update progress bar
    if (this.progressBar) {
      this.progressBar.style.width = `${progress * 100}%`;
    }

    // Apply continuous sine wave to each letter
    // Formula: y = amplitude * sin(letterIndex * frequency - time * speed)
    // This creates a wave that travels across the text
    const totalLetters = this.letters.length;

    this.letters.forEach((letter, i) => {
      // Normalized position of letter (0 to 1) - like UV coordinate
      const uv = i / (totalLetters - 1);

      // Sine wave displacement (mimics deformationCurve in vertex shader)
      const wave = Math.sin(uv * Math.PI * this.frequency - elapsed * this.speed);
      const wave2 = Math.sin(uv * Math.PI * this.frequency - elapsed * this.speed + Math.PI / 4);

      const y = wave * this.amplitude;
      const rotation = wave2 * this.rotationAmp;
      const scale = 1 + Math.abs(wave) * 0.1;

      letter.style.transform = `translateY(${y}px) rotate(${rotation}deg) scale(${scale})`;
    });

    if (!this.isComplete) {
      requestAnimationFrame(this.animate);
    }
  }

  finish() {
    this.isComplete = true;
    // Smooth wind-down: animate all letters back to rest position
    gsap.to(this.letters, {
      y: 0,
      rotation: 0,
      scale: 1,
      duration: 0.6,
      ease: "power2.out",
      stagger: 0.02,
      onComplete: () => {
        this.loader.classList.add("is-loaded");
        setTimeout(() => this.loader.remove(), 800);
      }
    });
  }
}

// custom selectors
const select = (e) => document.querySelector(e);
const selectAll = (e) => document.querySelectorAll(e);

const slider = select(".slider");
const slides = selectAll(".slider-slide");
const titles = selectAll(".slider-title");
const canvas = select(".webgl-canvas");

// Initialize loader immediately (doesn't wait for images)
const waveLoader = new WaveLoader();

// Track timing - ensure loader shows for AT LEAST 3 seconds
const loaderStart = performance.now();
const MIN_LOADER_TIME = 3000;

imagesLoaded(document.body, () => {
  console.log("images loaded");

  // Initialize slider + WebGL (so they're ready behind loader)
  const newSlider = new Slider({
    element: slider,
    elements: slides,
    titles: titles,
  });

  const WEBGL = new Webgl({
    canvas: canvas,
    elements: slides,
    scroll: newSlider.scroll,
  });

  // Calculate how much time has passed; wait if needed to hit 3s minimum
  const elapsed = performance.now() - loaderStart;
  const remaining = Math.max(MIN_LOADER_TIME - elapsed, 0);

  setTimeout(() => {
    waveLoader.finish();
    document.body.style.overflow = 'auto';
  }, remaining);
});