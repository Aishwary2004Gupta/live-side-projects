import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';

// Calculate screen state (wipe amount and brightness) based on closed amount (0 = flat/open, 1 = closed)
export function screenState(closedAmount, isOuter) {
  const t = Math.min(1, Math.max(0, 1 - closedAmount));
  const brightness = isOuter
    ? 1
    : t <= 1 / 3
      ? 0.15 + 0.3 * t
      : 0.25 + (t - 1 / 3) * 1.125;
  return {
    wipe: isOuter ? (1 - Math.abs(2 * t - 1)) / 2 : Math.min(1, (1 - t) * 1.2),
    brightness
  };
}

// Shader for bicubic filtering and wipe blur
const bicubicFragmentShader = `
uniform sampler2D map;
uniform float wipeAmount;
uniform float wipePosition;
uniform vec2 blurBounds;
varying vec2 vUv;

float w0(float a) { return (1.0/6.0)*(a*(a*(-a + 3.0) - 3.0) + 1.0); }
float w1(float a) { return (1.0/6.0)*(a*a*(3.0*a - 6.0) + 4.0); }
float w2(float a) { return (1.0/6.0)*(a*(a*(-3.0*a + 3.0) + 3.0) + 1.0); }
float w3(float a) { return (1.0/6.0)*(a*a*a); }

float g0(float a) { return w0(a) + w1(a); }
float g1(float a) { return w2(a) + w3(a); }
float h0(float a) { return -1.0 + w1(a) / (w0(a) + w1(a)); }
float h1(float a) { return 1.0 + w3(a) / (w2(a) + w3(a)); }

vec4 bicubic(sampler2D tex, vec2 uv, vec4 texelSize, vec2 fullSize, float lod) {
  uv = uv * texelSize.zw + 0.5;
  vec2 iuv = floor(uv);
  vec2 fuv = fract(uv);

  float g0x = g0(fuv.x);
  float g1x = g1(fuv.x);
  float h0x = h0(fuv.x);
  float h1x = h1(fuv.x);
  float h0y = h0(fuv.y);
  float h1y = h1(fuv.y);

  vec2 p0 = (vec2(iuv.x + h0x, iuv.y + h0y) - 0.5) * texelSize.xy;
  vec2 p1 = (vec2(iuv.x + h1x, iuv.y + h0y) - 0.5) * texelSize.xy;
  vec2 p2 = (vec2(iuv.x + h0x, iuv.y + h1y) - 0.5) * texelSize.xy;
  vec2 p3 = (vec2(iuv.x + h1x, iuv.y + h1y) - 0.5) * texelSize.xy;

  return g0(fuv.y) * (g0x * textureLod(tex, p0, lod) + g1x * textureLod(tex, p1, lod)) +
         g1(fuv.y) * (g0x * textureLod(tex, p2, lod) + g1x * textureLod(tex, p3, lod));
}

vec4 textureBicubic(sampler2D s, vec2 uv, float lod) {
  vec2 lodSizeFloor = vec2(textureSize(s, int(lod)));
  vec2 lodSizeCeil = vec2(textureSize(s, int(lod + 1.0)));
  vec2 fullSize = vec2(textureSize(s, 0));
  vec4 floorSample = bicubic(s, uv, vec4(1.0 / lodSizeFloor.x, 1.0 / lodSizeFloor.y, lodSizeFloor.x, lodSizeFloor.y), fullSize, floor(lod));
  vec4 ceilSample = bicubic(s, uv, vec4(1.0 / lodSizeCeil.x, 1.0 / lodSizeCeil.y, lodSizeCeil.x, lodSizeCeil.y), fullSize, ceil(lod));
  return mix(floorSample, ceilSample, fract(lod));
}

float remap(float minValue, float maxValue, float value) {
  return (value - minValue) / (maxValue - minValue);
}

void main() {
  float distanceToWipe = distance(vUv.x, wipePosition);
  float blurArea = remap(0.0, 0.75, clamp(remap(blurBounds.x, blurBounds.y, distanceToWipe) * wipeAmount * 2.5, 0.0, 1.0));
  vec3 shade = vec3(smoothstep(1.3, 0.9, blurArea) * smoothstep(1.0, 0.9, distance(vUv.y, 0.5) * 2.0));
  gl_FragColor = textureBicubic(map, vUv, min(blurArea * 8.0, log2(float(min(textureSize(map, 0).x, textureSize(map, 0).y))) - 1.0)) * vec4(shade, 1.0);
}
`;

export function createScreenBlur(renderer, isOuter, width, height) {
  const rtOptions = {
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
    type: THREE.UnsignedByteType,
    depthBuffer: false
  };

  const outputRt = new THREE.WebGLRenderTarget(width, height, rtOptions);
  const blurPingRt = new THREE.WebGLRenderTarget(width, height, rtOptions);
  outputRt.texture.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
  blurPingRt.texture.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());

  const compositeRt = new THREE.WebGLRenderTarget(width, height, rtOptions);

  const compositeUniforms = {
    wallpaper: { value: null },
    ui: { value: null },
    zoom: { value: 1 },
    screenAspect: { value: width / height },
    cornerRadius: { value: 110 / (isOuter ? 1291 : 1878) },
    isOuter: { value: isOuter ? 1 : 0 }
  };

  const compositeMaterial = new THREE.ShaderMaterial({
    uniforms: compositeUniforms,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `
      varying vec2 vUv;
      uniform sampler2D wallpaper;
      uniform sampler2D ui;
      uniform float zoom;
      uniform float screenAspect;
      uniform float cornerRadius;
      uniform float isOuter;
      void main() {
        vec2 uv = (vUv - 0.5) / 0.9 + 0.5;
        vec4 photo = texture2D(wallpaper, (uv - 0.5) / zoom + 0.5);
        vec4 art = texture2D(ui, uv);
        vec2 halfSize = vec2(screenAspect, 1.0) * 0.5;
        float radius = (isOuter > 0.5 && uv.x < 0.5) ? 0.0 : cornerRadius;
        vec2 q = abs((uv - 0.5) * vec2(screenAspect, 1.0)) - halfSize + radius;
        float sdf = min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - radius;
        float aa = 2.0 / ${Math.min(width, height)}.0;
        float frame = smoothstep(0.0, aa, -sdf);
        gl_FragColor = vec4(mix(photo.rgb, art.rgb, art.a) * frame, 1.0);
      }
    `
  });

  const blurUniforms = {
    map: { value: null },
    wipeAmount: { value: 0 },
    wipePosition: { value: isOuter ? 0 : 1 },
    blurBounds: { value: new THREE.Vector2(isOuter ? 0 : 0.45, isOuter ? 0.9 : 1.0) }
  };

  const blurMaterial = new THREE.ShaderMaterial({
    uniforms: blurUniforms,
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: bicubicFragmentShader,
    depthTest: false,
    depthWrite: false,
    toneMapped: false
  });

  const quadGeom = new THREE.PlaneGeometry(2, 2);
  const quadScene = new THREE.Scene();
  const quadMesh = new THREE.Mesh(quadGeom, blurMaterial);
  quadScene.add(quadMesh);
  const quadCamera = new THREE.Camera();

  let sourceReady = false;
  let lastClosed = -1;
  let lastZoom = -1;

  return {
    texture: outputRt.texture,
    setSource(wallpaperTex, uiTex) {
      sourceReady = true;
      compositeUniforms.wallpaper.value = wallpaperTex;
      compositeUniforms.ui.value = uiTex;
      lastClosed = -1;
    },
    update(closedAmount, zoom = 1) {
      if (!sourceReady || (closedAmount === lastClosed && zoom === lastZoom)) return;
      lastZoom = zoom;
      lastClosed = closedAmount;

      blurUniforms.wipeAmount.value = screenState(closedAmount, isOuter).wipe;
      const prevRt = renderer.getRenderTarget();

      compositeUniforms.zoom.value = isOuter ? 1 : zoom;
      quadMesh.material = compositeMaterial;
      renderer.setRenderTarget(compositeRt);
      renderer.render(quadScene, quadCamera);

      quadMesh.material = blurMaterial;
      blurUniforms.map.value = compositeRt.texture;
      renderer.setRenderTarget(blurPingRt);
      renderer.render(quadScene, quadCamera);

      blurUniforms.map.value = blurPingRt.texture;
      renderer.setRenderTarget(outputRt);
      renderer.render(quadScene, quadCamera);

      renderer.setRenderTarget(prevRt);
    },
    dispose() {
      compositeRt.dispose();
      compositeMaterial.dispose();
      outputRt.dispose();
      blurPingRt.dispose();
      quadGeom.dispose();
      blurMaterial.dispose();
    }
  };
}

export function createViewer(container, getState, onError) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  } catch (err) {
    onError?.('WebGL is unavailable. Enable hardware acceleration and reload.');
    return {
      dispose() {},
      camera() {},
      async upload() {},
      resetImages() {}
    };
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  // Screen Manager
  const screenManager = (function(glRenderer) {
    const controllers = new Map();
    const duoMaterials = new Map();
    const blurPasses = new Map();
    const inverseWorldMatrix = new THREE.Matrix4();
    const originalEmissiveMaps = new Set();
    const defaultImages = new Map();
    const customBitmaps = new Map();
    const lockscreenImgs = new Map();
    const wallpaperTextures = new Map();
    const uiTextures = new Map();

    let springPos = -1;
    let springVelocity = 0;
    let lastTime = 0;
    let springAccum = 0;
    let isDisposed = false;
    let uploadVersion = { inner: 0, outer: 0 };
    let screenConfig = { clock: true, brightness: 1, fit: 'Cover' };

    function renderScreen(screenType) {
      const mat = duoMaterials.get(screenType);
      const wallpaperSource = customBitmaps.get(screenType) ?? defaultImages.get(screenType);
      if (!mat || !wallpaperSource || isDisposed) return;

      const width = screenType === 'inner' ? 2670 : 1291;
      const height = 1878;

      // Wallpaper canvas
      const wallCanvas = document.createElement('canvas');
      wallCanvas.width = width;
      wallCanvas.height = height;
      const ctxWall = wallCanvas.getContext('2d');
      ctxWall.imageSmoothingQuality = 'high';

      const imgW = wallpaperSource instanceof HTMLImageElement ? wallpaperSource.naturalWidth : wallpaperSource.width;
      const imgH = wallpaperSource instanceof HTMLImageElement ? wallpaperSource.naturalHeight : wallpaperSource.height;
      const scale = screenConfig.fit === 'Contain'
        ? Math.min(width / imgW, height / imgH)
        : Math.max(width / imgW, height / imgH);

      ctxWall.fillStyle = '#080808';
      ctxWall.fillRect(0, 0, width, height);
      ctxWall.drawImage(wallpaperSource, (width - imgW * scale) / 2, (height - imgH * scale) / 2, imgW * scale, imgH * scale);

      // Lockscreen UI canvas
      const uiCanvas = document.createElement('canvas');
      uiCanvas.width = width;
      uiCanvas.height = height;
      const ctxUi = uiCanvas.getContext('2d');
      const lockOverlay = lockscreenImgs.get(screenType);

      if (screenConfig.clock && lockOverlay) {
        const aspect = (width / height) / (lockOverlay.naturalWidth / lockOverlay.naturalHeight);
        const dw = width / (1.012 * Math.max(aspect, 1));
        const dh = height / (1.012 * Math.max(1 / aspect, 1));
        ctxUi.drawImage(lockOverlay, (width - dw) / 2, (height - dh) / 2, dw, dh);

        // Dynamic clock color adaptation for custom wallpaper
        if (customBitmaps.has(screenType)) {
          (function(uiCtx, wallCvs) {
            const thumb = document.createElement('canvas');
            thumb.width = thumb.height = 24;
            const tCtx = thumb.getContext('2d');
            tCtx.drawImage(wallCvs, 0, 0, 24, 24);
            const raw = tCtx.getImageData(0, 0, 24, 24).data;

            const sample = (u, v) => {
              const sx = Math.min(23, Math.max(0, 24 * u - 0.5));
              const sy = Math.min(23, Math.max(0, 24 * v - 0.5));
              const fx = Math.floor(sx), fy = Math.floor(sy);
              const cx = Math.min(23, fx + 1), cy = Math.min(23, fy + 1);
              const hx = sx - fx, hy = sy - fy;
              return [0, 1, 2].map(c =>
                (raw[(24 * fy + fx) * 4 + c] * (1 - hx) + raw[(24 * fy + cx) * 4 + c] * hx) * (1 - hy) +
                (raw[(24 * cy + fx) * 4 + c] * (1 - hx) + raw[(24 * cy + cx) * 4 + c] * hx) * hy
              );
            };

            const avgColor = [0, 0, 0];
            for (let y = 2; y < 10; y++) {
              for (let x = 7; x < 17; x++) {
                sample(x / 24, y / 24).forEach((v, idx) => { avgColor[idx] += v / 80; });
              }
            }

            const getLum = c => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
            const uiData = uiCtx.getImageData(0, 0, wallCvs.width, wallCvs.height);
            for (let i = 0; i < uiData.data.length; i += 4) {
              if (!uiData.data[i + 3]) continue;
              const px = (i / 4) % wallCvs.width;
              const py = Math.floor(i / 4 / wallCvs.width);
              const localSamp = sample(px / wallCvs.width, py / wallCvs.height);
              const isRightSide = px / wallCvs.width > 0.82;
              const lum = getLum([uiData.data[i], uiData.data[i + 1], uiData.data[i + 2]]);
              if (lum < 0.01 && uiData.data[i + 3] < 64) {
                uiData.data[i + 3] = 0;
                continue;
              }
              const isAccent = isRightSide && lum < 0.82;
              for (let c = 0; c < 3; c++) {
                const val = isAccent
                  ? 0.36 * localSamp[c] + 16
                  : isRightSide
                    ? 248
                    : (216 + 0.15 * (0.7 * avgColor[c] + 0.3 * localSamp[c])) * (0.96 + 0.04 * lum);
                uiData.data[i + c] = Math.round(val);
              }
            }
            uiCtx.putImageData(uiData, 0, 0);
          })(ctxUi, wallCanvas);
        }
      }

      const uiTexture = new THREE.CanvasTexture(uiCanvas);
      uiTexture.colorSpace = THREE.SRGBColorSpace;
      uiTexture.flipY = false;
      uiTextures.get(screenType)?.dispose();
      uiTextures.set(screenType, uiTexture);

      const wallTexture = new THREE.CanvasTexture(wallCanvas);
      wallTexture.colorSpace = THREE.SRGBColorSpace;
      wallTexture.flipY = false;
      wallTexture.anisotropy = Math.min(8, glRenderer.capabilities.getMaxAnisotropy());

      const origMap = mat.emissiveMap;
      if (origMap) {
        wallTexture.channel = origMap.channel;
        wallTexture.wrapS = origMap.wrapS;
        wallTexture.wrapT = origMap.wrapT;
        wallTexture.repeat.copy(origMap.repeat);
        wallTexture.offset.copy(origMap.offset);
        wallTexture.center.copy(origMap.center);
        wallTexture.rotation = origMap.rotation;
      }
      wallpaperTextures.get(screenType)?.dispose();
      wallpaperTextures.set(screenType, wallTexture);

      let blurPass = blurPasses.get(screenType);
      if (!blurPass) {
        blurPass = createScreenBlur(glRenderer, screenType === 'outer', width, height);
        blurPasses.set(screenType, blurPass);
      }
      blurPass.setSource(wallTexture, uiTexture);

      mat.emissiveMap = blurPass.texture;
      mat.emissive.set(0xffffff);
      mat.emissiveIntensity = screenConfig.brightness;
      mat.toneMapped = false;
      mat.needsUpdate = true;
    }

    // Load default wallpapers and lockscreens
    ['inner', 'outer'].forEach(type => {
      const img = new Image();
      img.onload = () => { if (!isDisposed) { defaultImages.set(type, img); renderScreen(type); } };
      img.src = `./screens/${type}-default.png`;

      const lock = new Image();
      lock.onload = () => { if (!isDisposed) { lockscreenImgs.set(type, lock); renderScreen('inner'); renderScreen('outer'); } };
      lock.src = `./screens/lockscreenUi${type === 'inner' ? 'Inner' : 'Outer'}.avif`;
    });

    return {
      attach(modelScene) {
        modelScene.traverse(obj => {
          if (!(obj instanceof THREE.Mesh)) return;
          const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const mat of materials) {
            const screenType = ['UBwioVSWewZpuRX', 'pkUBCyCvYJYVzTr', 'screenTexture_usd_shd_lts'].includes(mat.name)
              ? 'inner'
              : ['bVtHVUZGvQeXwdh', 'screenTextureOuterDisplay_usd_shd_lts'].includes(mat.name)
                ? 'outer'
                : null;

            if (screenType && mat instanceof THREE.MeshStandardMaterial) {
              if (mat.emissiveMap) originalEmissiveMaps.add(mat.emissiveMap);
              duoMaterials.set(screenType, mat);

              controllers.set(
                screenType,
                (function(meshMaterial, isOuterDisplay, parentMesh) {
                  const uniforms = {
                    duoModelInverse: { value: new THREE.Matrix4() },
                    duoClosed: { value: 1 },
                    duoBrightness: { value: isOuterDisplay ? 1 : 0.15 },
                    duoWipe: { value: isOuterDisplay ? 0 : 1 },
                    duoOuter: { value: isOuterDisplay ? 1 : 0 }
                  };

                  const origBeforeRender = parentMesh.onBeforeRender;
                  parentMesh.onBeforeRender = function(...args) {
                    origBeforeRender.apply(this, args);
                    uniforms.duoModelInverse.value.copy(parentMesh.matrixWorld).invert();
                  };

                  meshMaterial.onBeforeCompile = shader => {
                    Object.assign(shader.uniforms, uniforms);
                    shader.vertexShader = shader.vertexShader
                      .replace('#include <common>', '#include <common>\nvarying vec3 vDuoLocal;')
                      .replace('#include <project_vertex>', '#include <project_vertex>\nvDuoLocal = transformed;');

                    shader.fragmentShader = shader.fragmentShader
                      .replace(
                        '#include <common>',
                        `#include <common>
                        varying vec3 vDuoLocal;
                        uniform mat4 duoModelInverse;
                        uniform float duoClosed;
                        uniform float duoBrightness;
                        uniform float duoWipe;
                        uniform float duoOuter;`
                      )
                      .replace(
                        '#include <emissivemap_fragment>',
                        `#ifdef USE_EMISSIVEMAP
                          float opening = 1.0 - duoClosed;
                          float amount = duoWipe;
                          vec3 eye = (duoModelInverse * vec4(cameraPosition, 1.0)).xyz;
                          vec3 direction = normalize(vDuoLocal - eye);
                          vec3 origin = mix(vec3(0.0), vec3(4.1, 0.8, 0.0), duoOuter);
                          float det = -direction.y;
                          float safeDet = (det < 0.0 ? -1.0 : 1.0) * max(abs(det), 0.05);
                          vec3 hit = vDuoLocal + direction * ((vDuoLocal.y - origin.y) / safeDet);
                          vec2 basis = vec2(hit.x - origin.x, -hit.z);
                          float scale = mix(1.9816, 0.9894, duoOuter);
                          float zoom = mix(7.95, 7.68, duoOuter);
                          float aspect = mix(2670.0 / 1878.0, 1291.0 / 1878.0, duoOuter);
                          vec2 lookup = basis / (scale * zoom) * vec2(1.0, aspect) * 0.988 + vec2(0.5 + amount * 0.24 * duoOuter, 0.5);
                          float rest = smoothstep(0.45, 1.0, opening) * duoOuter;
                          vec2 uv = mix(lookup, vec2(vEmissiveMapUv.x, 1.0 - vEmissiveMapUv.y), rest);
                          uv = (uv - 0.5) / 1.12 + 0.5;
                          float distanceToWipe = abs(vEmissiveMapUv.x - mix(1.0, 0.0, duoOuter));
                          float wipe = 1.0 - clamp(smoothstep(mix(0.5, 0.0, duoOuter), 1.0, distanceToWipe) * amount * 1.5, 0.0, 1.0);
                          float edges = (1.0 - smoothstep(1.0, 1.1, uv.x)) * smoothstep(-0.1, 0.0, uv.x) *
                                        (1.0 - smoothstep(1.0, 1.1, uv.y)) * smoothstep(-0.1, 0.0, uv.y);
                          if (duoOuter < 0.5) edges *= mix(1.0, smoothstep(0.05, 0.5, uv.x), smoothstep(0.0, 0.55, amount));
                          float cameraShade = 1.0;
                          if (duoOuter < 0.5) {
                            vec2 cameraPoint = vec2(2035.0 / 2853.0, 127.0 / 2007.0) * vec2(aspect, 1.0);
                            float circle = length(vEmissiveMapUv * vec2(aspect, 1.0) - cameraPoint) * 2.0;
                            float aa = 0.7 * length(vec2(dFdx(circle), dFdy(circle)));
                            cameraShade = mix(1.0, 0.95, 1.0 - smoothstep(83.0 / 2007.0 - aa, 83.0 / 2007.0 + aa, circle));
                          }
                          float brightness = smoothstep(0.1, 1.0, duoBrightness) * cameraShade;
                          totalEmissiveRadiance *= brightness * texture2D(emissiveMap, vec2(uv.x, 1.0 - uv.y)).rgb * wipe * edges;
                        #endif`
                      );
                  };
                  meshMaterial.customProgramCacheKey = () => 'duo-original-web-projection-v2';
                  meshMaterial.needsUpdate = true;

                  return {
                    update(closedVal) {
                      uniforms.duoClosed.value = closedVal;
                      const st = screenState(closedVal, isOuterDisplay);
                      uniforms.duoBrightness.value = st.brightness;
                      uniforms.duoWipe.value = st.wipe;
                    }
                  };
                })(mat, screenType === 'outer', obj)
              );
              renderScreen(screenType);
            }
          }
        });
      },

      animate(closedVal, modelObj) {
        modelObj.parent?.updateMatrixWorld(true);
        inverseWorldMatrix.copy(modelObj.parent?.matrixWorld ?? modelObj.matrixWorld).invert();

        const target = THREE.MathUtils.clamp((1 - closedVal - 0.11) / 0.89, 0, 1);
        const now = performance.now();
        if (springPos < 0) {
          springPos = target;
          lastTime = now;
        }
        springAccum += Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;

        const omega = (2 * Math.PI) / (3 / 7);
        while (springAccum >= 1 / 30) {
          const accel = -omega * omega * (springPos - target) - 2.6 * omega * springVelocity;
          springVelocity += accel / 30;
          springPos = THREE.MathUtils.clamp(springPos + springVelocity / 30, 0, 1);
          if (Math.abs(springVelocity) < 0.001 && Math.abs(springPos - target) < 0.001) {
            springPos = target;
            springVelocity = 0;
          }
          springAccum -= 1 / 30;
        }

        const zoomFactor = THREE.MathUtils.lerp(0.83, 0.356996, springPos) *
                           THREE.MathUtils.lerp(1.30246313, 1.7525, springPos) / 0.62563549;

        blurPasses.forEach(pass => pass.update(closedVal, zoomFactor));
        controllers.forEach(ctrl => ctrl.update(closedVal));
      },

      configure(cfg) {
        if (cfg.clock !== screenConfig.clock || cfg.fit !== screenConfig.fit) {
          screenConfig = { ...cfg };
          renderScreen('inner');
          renderScreen('outer');
        } else if (cfg.brightness !== screenConfig.brightness) {
          screenConfig = { ...cfg };
          duoMaterials.forEach(m => { m.emissiveIntensity = cfg.brightness; });
        }
      },

      async upload(file, targetDisplay = 'both') {
        if (!/^image\/(png|jpeg|webp|avif)$/.test(file.type)) {
          throw new Error('Choose a PNG, JPG, WebP, or AVIF image.');
        }
        if (file.size > 26214400) {
          throw new Error('Choose an image smaller than 25 MB.');
        }
        const targets = targetDisplay === 'both' ? ['inner', 'outer'] : [targetDisplay];
        const versions = targets.map(t => ++uploadVersion[t]);

        const bmp = await createImageBitmap(file);
        for (let i = 0; i < targets.length; i++) {
          const t = targets[i];
          if (isDisposed || versions[i] !== uploadVersion[t]) continue;
          const clonedBmp = await createImageBitmap(bmp);
          if (isDisposed || versions[i] !== uploadVersion[t]) {
            clonedBmp.close();
            continue;
          }
          const prev = customBitmaps.get(t);
          if (prev instanceof ImageBitmap) prev.close();
          customBitmaps.set(t, clonedBmp);
          renderScreen(t);
        }
        bmp.close();
      },

      reset() {
        ['inner', 'outer'].forEach(t => {
          uploadVersion[t]++;
          const prev = customBitmaps.get(t);
          if (prev instanceof ImageBitmap) prev.close();
          customBitmaps.delete(t);
          renderScreen(t);
        });
      },

      dispose() {
        isDisposed = true;
        customBitmaps.forEach(bmp => { if (bmp instanceof ImageBitmap) bmp.close(); });
        wallpaperTextures.forEach(tex => tex.dispose());
        uiTextures.forEach(tex => tex.dispose());
        blurPasses.forEach(pass => pass.dispose());
      }
    };
  })(renderer);

  // Scene & Camera
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(getState().studio.background);

  const camera = new THREE.PerspectiveCamera(35, 1, 0.25, 50);
  const controls = new OrbitControls(camera, renderer.domElement);

  function setCameraView(viewName) {
    if (viewName === 'back') {
      camera.position.set(0, 0, -6);
    } else {
      camera.position.set(0, 0, 6);
    }
    controls.target.set(0, 0, 0);
    controls.update();
  }

  controls.enableDamping = true;
  controls.minDistance = 1.5;
  controls.maxDistance = 15;
  controls.autoRotateSpeed = 1;
  setCameraView('front');

  // Apple Lighting Rig
  const lightingRig = (function(glRenderer, errCallback) {
    const pmremGenerator = new THREE.PMREMGenerator(glRenderer);
    const envScenes = new Map();
    const exrTextures = new Map();
    const pmremTargets = new Set();
    const envSubScenes = [];
    const matLayers = new Map();
    let materialsConfig = {};
    let isDisposed = false;
    let loadedCount = 0;
    let lastDir = -1;
    let lastAngle = Infinity;
    let lastClosed = Infinity;
    const directions = ['front', 'frontRight', 'right', 'backRight', 'back', 'backLeft', 'left', 'frontLeft'];

    function disposeScene(scn) {
      const texs = new Set();
      scn.traverse(obj => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const m of mats) {
            for (const val of Object.values(m)) {
              if (val instanceof THREE.Texture) texs.add(val);
            }
            m.dispose();
          }
        }
      });
      texs.forEach(t => t.dispose());
    }

    (async function() {
      try {
        const matRes = await fetch('./models/apple-web/materials.json');
        materialsConfig = await matRes.json();

        const gltfLoader = new GLTFLoader();
        const exrLoader = new EXRLoader();

        // 3 lighting subscenes
        const rigFiles = ['lxfmQjvBiFmqVSB', 'HIBNFTIRMmbKPzu', 'aPBhICIQRrndUTh'];
        await Promise.all([
          ...rigFiles.map(async (file, idx) => {
            const [gltfData, variantsData] = await Promise.all([
              gltfLoader.loadAsync(`./models/apple-web/${file}.gltf`),
              fetch(`./models/apple-web/${idx}-env-variants.json`).then(r => r.json())
            ]);
            if (isDisposed) {
              disposeScene(gltfData.scene);
              return;
            }
            const s = new THREE.Scene();
            s.background = new THREE.Color(0);
            s.add(gltfData.scene);
            envSubScenes.push(gltfData.scene);
            envScenes.set(idx, { scene: s, variants: variantsData });
            loadedCount++;
          }),
          ...[[4, 'ADsFgCxkeKZYiww'], [5, 'SfFEyQuyjAgUwjH']].map(async ([layerIdx, exrFile]) => {
            const exrTex = await exrLoader.loadAsync(`./models/apple-web/${exrFile}.exr`);
            if (isDisposed) {
              exrTex.dispose();
              return;
            }
            const pmrem = pmremGenerator.fromEquirectangular(exrTex);
            exrTex.dispose();
            pmremTargets.add(pmrem);
            exrTextures.set(Number(layerIdx), pmrem.texture);
            loadedCount++;
          })
        ]);
      } catch (e) {
        if (!isDisposed) {
          console.warn('Apple lighting could not load, using fallback lights:', e.message);
          // Fallback lighting if files fail
          const amb = new THREE.AmbientLight(0xffffff, 1.8);
          scene.add(amb);
          const dir1 = new THREE.DirectionalLight(0xffffff, 2.5);
          dir1.position.set(5, 10, 7);
          scene.add(dir1);
          const dir2 = new THREE.DirectionalLight(0xffffff, 1.5);
          dir2.position.set(-5, -5, -7);
          scene.add(dir2);
        }
      }
    })();

    return {
      update(modelScene, cam, closedVal) {
        if (isDisposed || Object.keys(materialsConfig).length === 0) return;
        const rawAngle = (Math.atan2(cam.position.x, cam.position.z) / (Math.PI / 4) + 8) % 8;
        if (loadedCount === lastDir && Math.abs(rawAngle - lastAngle) < 0.025 && Math.abs(closedVal - lastClosed) < 0.005) {
          return;
        }
        lastAngle = rawAngle;
        lastClosed = closedVal;
        lastDir = loadedCount;

        const baseIdx = Math.floor(rawAngle);
        const frac = rawAngle - baseIdx;

        envScenes.forEach(entry => {
          const dirPair = [directions[baseIdx], directions[(baseIdx + 1) % 8]];
          const weights = [
            (1 - frac) * closedVal,
            frac * closedVal,
            (1 - frac) * (1 - closedVal),
            frac * (1 - closedVal)
          ];
          const statesToFind = [...dirPair, ...dirPair.map(d => d + '_Open')];
          const activeVariants = statesToFind.map(stateName =>
            entry.variants.find(v => v['@states']?.includes(stateName))
          );

          entry.scene.traverse(obj => {
            const objs = [obj];
            if (obj instanceof THREE.Mesh) {
              const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
              objs.push(...mats);
            }
            for (const item of objs) {
              const blendedProps = {};
              activeVariants.forEach((variant, vIdx) => {
                const spec = variant?.[item.name];
                if (spec && !Array.isArray(spec)) {
                  for (const [propName, propVal] of Object.entries(spec)) {
                    blendedProps[propName] = (blendedProps[propName] ?? 0) + propVal * weights[vIdx];
                  }
                }
              });

              (function(targetObj, props) {
                const transforms = {};
                for (const [k, v] of Object.entries(props)) {
                  const m = /^(position|rotation|scale|color|emissive)([XYZRGB])$/.exec(k);
                  if (m && (targetObj instanceof THREE.Object3D || targetObj instanceof THREE.Material)) {
                    const targetProp = m[1];
                    const comp = m[2].toLowerCase();
                    if (targetObj[targetProp]) {
                      targetObj[targetProp][comp] = v;
                    }
                  } else if (
                    targetObj instanceof THREE.MeshStandardMaterial &&
                    ['opacity', 'roughness', 'metalness', 'emissiveIntensity'].includes(k)
                  ) {
                    targetObj[k] = v;
                  }
                }
              })(item, blendedProps);
            }
          });

          entry.scene.updateMatrixWorld(true);
          const pmremTarget = pmremGenerator.fromScene(entry.scene, 0, 0.1, 1000, { size: 128 });
          entry.target?.dispose();
          entry.target = pmremTarget;
        });

        modelScene.traverse(obj => {
          if (!(obj instanceof THREE.Mesh)) return;
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const m of mats) {
            if (!(m instanceof THREE.MeshStandardMaterial)) continue;
            const matCfg = materialsConfig[m.name];
            const layer = matCfg?.layer ?? 0;
            const envTexture = exrTextures.get(layer) ?? envScenes.get(layer)?.target?.texture;

            if (envTexture) {
              if (!m.envMap) m.needsUpdate = true;
              m.envMap = envTexture;
            }
            m.envMapIntensity = 1;
            m.envMapRotation.set(0, Math.PI, 0);
            if (layer === 4) m.envMapRotation.set(1, 0.6 + Math.PI, 0);
            if (layer === 5) m.envMapRotation.set(0, 2.09 + Math.PI, 0);

            if (!matLayers.has(m)) {
              matLayers.set(m, layer);
              const expChunk = matCfg?.chunks?.Exposure;
              if (expChunk && expChunk.enableExposure !== false) {
                const origCompile = m.onBeforeCompile;
                const baseKey = m.customProgramCacheKey.bind(m)();
                m.customProgramCacheKey = () => baseKey + ':exposure:' + expChunk.exposure;
                m.onBeforeCompile = function(shader, rend) {
                  origCompile.call(this, shader, rend);
                  shader.fragmentShader = shader.fragmentShader.replace(
                    '#include <opaque_fragment>',
                    `outgoingLight *= ${Math.pow(2, expChunk.exposure).toFixed(8)};\n#include <opaque_fragment>`
                  );
                };
              }
              m.needsUpdate = true;
            }
          }
        });
      },

      dispose() {
        isDisposed = true;
        envScenes.forEach(e => e.target?.dispose());
        pmremTargets.forEach(t => t.dispose());
        envSubScenes.forEach(disposeScene);
        pmremGenerator.dispose();
      }
    };
  })(renderer, onError);

  // Resize handling
  const handleResize = () => {
    const { width, height } = container.getBoundingClientRect();
    if (width === 0 || height === 0) return;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const resizeObserver = new ResizeObserver(handleResize);
  resizeObserver.observe(container);
  handleResize();

  let isViewerDisposed = false;
  let modelRoot;
  let animMixer;
  let animDuration = 2;
  let lastFoldTime = -1;
  let lastWireframe = false;
  const standardMaterials = new Set();
  const bodyMaterialNames = new Set([
    'hpmqrCvWLXWudrz', 'lrXfpZcYrByzvym', 'hAKVdrzztJgljCR',
    'UcYWmlwZxcfqNko', 'stlMkdXkRsspsoE', 'mAvfMvCzYIPKaNG',
    'ZzgLQsGpuSeaQaa', 'jeFtQmHBLCfgIkY', 'NtNSwEIIFmIbXaY'
  ]);
  let bodyColor = new THREE.Color('#ffffff');

  function disposeHierarchy(obj) {
    const texs = new Set();
    obj.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        for (const m of mats) {
          for (const val of Object.values(m)) {
            if (val instanceof THREE.Texture) texs.add(val);
          }
          m.dispose();
        }
      }
    });
    texs.forEach(t => t.dispose());
  }

  // Load Main Model
  const gltfLoader = new GLTFLoader();
  gltfLoader.load(
    './models/apple-web/iphone-duo.gltf',
    gltf => {
      if (isViewerDisposed) {
        disposeHierarchy(gltf.scene);
        return;
      }
      modelRoot = gltf.scene;
      const sliderClip = gltf.animations.find(a => a.name === 'Slider');
      if (!sliderClip) {
        onError?.('The original web model is missing its Slider clip.');
        return;
      }
      animDuration = sliderClip.duration;
      animMixer = new THREE.AnimationMixer(modelRoot);
      const action = animMixer.clipAction(sliderClip);
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.play();

      modelRoot.rotation.x = Math.PI / 2;
      animMixer.setTime(animDuration - 1e-6);
      modelRoot.updateMatrixWorld(true);
      modelRoot.traverse(child => {
        if (child instanceof THREE.SkinnedMesh) child.skeleton.update();
      });

      const bbox = new THREE.Box3().setFromObject(modelRoot, true);
      const size = bbox.getSize(new THREE.Vector3());
      const center = bbox.getCenter(new THREE.Vector3());
      const wrapperGroup = new THREE.Group();
      const scale = 3.3 / Math.max(size.x, size.y, size.z);
      wrapperGroup.scale.setScalar(scale);
      wrapperGroup.position.copy(center).multiplyScalar(-scale);
      wrapperGroup.add(modelRoot);
      scene.add(wrapperGroup);

      const initClosed = getState().closed;
      animMixer.setTime(Math.min((1 - initClosed) * animDuration, animDuration - 1e-6));
      screenManager.attach(modelRoot);

      modelRoot.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.frustumCulled = false;
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          for (const m of mats) {
            if (m instanceof THREE.MeshStandardMaterial) standardMaterials.add(m);
            if (m instanceof THREE.MeshStandardMaterial && bodyMaterialNames.has(m.name)) {
              m.color.copy(bodyColor);
              m.needsUpdate = true;
            }
          }
        }
      });
    },
    undefined,
    err => {
      if (!isViewerDisposed) onError?.(`Model failed to load: ${err.message || String(err)}`);
    }
  );

  let currentDampedClosed = getState().closed;
  let lastTimestamp = performance.now();

  renderer.setAnimationLoop(time => {
    const dt = Math.min((time - lastTimestamp) / 1000, 0.05);
    lastTimestamp = time;
    const currentState = getState();

    currentDampedClosed = THREE.MathUtils.damp(currentDampedClosed, currentState.closed, 28, dt);
    if (Math.abs(currentDampedClosed - currentState.closed) < 1e-5) {
      currentDampedClosed = currentState.closed;
    }

    screenManager.configure(currentState.screens);

    if (animMixer && currentDampedClosed !== lastFoldTime) {
      animMixer.setTime(Math.min((1 - currentDampedClosed) * animDuration, animDuration - 1e-6));
      lastFoldTime = currentDampedClosed;
    }

    if (lastWireframe !== currentState.studio.wireframe) {
      standardMaterials.forEach(m => { m.wireframe = currentState.studio.wireframe; });
      lastWireframe = currentState.studio.wireframe;
    }

    controls.autoRotate = currentState.studio.autoRotate;
    renderer.toneMappingExposure = currentState.studio.exposure;
    scene.background.set(currentState.studio.background);
    controls.update();

    if (modelRoot) {
      if (modelRoot.parent) {
        modelRoot.parent.position.x = -4.1 * currentDampedClosed * modelRoot.parent.scale.x;
      }
      lightingRig.update(modelRoot, camera, currentDampedClosed);
      screenManager.animate(currentDampedClosed, modelRoot);
    }

    renderer.render(scene, camera);
  });

  return {
    camera: setCameraView,
    setBodyColor(color) {
      bodyColor.set(color);
      standardMaterials.forEach(material => {
        if (bodyMaterialNames.has(material.name)) {
          material.color.copy(bodyColor);
          material.needsUpdate = true;
        }
      });
    },
    upload: screenManager.upload,
    resetImages: screenManager.reset,
    setControlsPosition(pos, target) {
      camera.position.copy(pos);
      if (target) controls.target.copy(target);
      controls.update();
    },
    dispose() {
      isViewerDisposed = true;
      resizeObserver.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      if (modelRoot) {
        animMixer?.stopAllAction();
        animMixer?.uncacheRoot(modelRoot);
        disposeHierarchy(modelRoot);
      }
      screenManager.dispose();
      lightingRig.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    }
  };
}
