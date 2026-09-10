import * as THREE from 'three';
import { createViewer } from './viewer.js';

// Application State
const state = {
  closed: 0.3, // corresponds to 126 deg ( (1 - closed) * 180 = 126 )
  screens: {
    display: 'both',
    fit: 'Cover',
    clock: true,
    brightness: 1.0
  },
  studio: {
    exposure: 1.0,
    background: '#ffffff',
    bodyColor: '#ffffff',
    wireframe: false,
    autoRotate: false
  }
};

let viewer = null;
let isPlaying = false;
let playAnimFrame = null;
let playDirection = 1;

// Helper: show toast
export function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

// Update fold angle
function setFoldAngle(deg, updateInputs = true) {
  deg = Math.max(0, Math.min(180, deg));
  state.closed = 1 - deg / 180;

  if (updateInputs) {
    const angleInput = document.getElementById('foldAngleInput');
    const angleSlider = document.getElementById('foldAngleSlider');
    const tourSlider = document.getElementById('tourFoldSlider');
    const tourProgress = document.getElementById('tourSliderFill');
    const timelineScrubber = document.getElementById('timelineScrubber');
    const timelineTime = document.getElementById('timelineTime');

    const formatted = deg.toFixed(1);
    if (angleInput) angleInput.value = formatted;
    if (angleSlider) angleSlider.value = deg;
    if (tourSlider) {
      // In tour slider, 100% is open (180 deg), 0% is closed (0 deg)
      tourSlider.value = (deg / 180) * 100;
      if (tourProgress) tourProgress.style.width = `${(deg / 180) * 100}%`;
    }
    if (timelineScrubber) timelineScrubber.value = deg;
    if (timelineTime) timelineTime.textContent = `${((1 - state.closed) * 2.0).toFixed(2)}s`;
  }
}

// Play / pause fold animation loop
function startPlay() {
  if (isPlaying) return;
  isPlaying = true;
  document.getElementById('playPauseBtn')?.classList.add('playing');
  document.getElementById('timelinePlayBtn')?.classList.add('playing');

  let lastTime = performance.now();
  function loop(now) {
    if (!isPlaying) return;
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    let currentDeg = (1 - state.closed) * 180;
    currentDeg += playDirection * dt * 65; // ~65 deg/sec

    if (currentDeg >= 180) {
      currentDeg = 180;
      playDirection = -1;
    } else if (currentDeg <= 0) {
      currentDeg = 0;
      playDirection = 1;
    }

    setFoldAngle(currentDeg, true);
    playAnimFrame = requestAnimationFrame(loop);
  }
  playAnimFrame = requestAnimationFrame(loop);
}

function stopPlay() {
  isPlaying = false;
  if (playAnimFrame) cancelAnimationFrame(playAnimFrame);
  document.getElementById('playPauseBtn')?.classList.remove('playing');
  document.getElementById('timelinePlayBtn')?.classList.remove('playing');
}

// Camera animation helper
function animateCameraTo(targetPos, targetLookAt, duration = 1000) {
  if (!viewer) return;
  const startPos = new THREE.Vector3();
  // Animate smoothly
  const startTime = performance.now();
  function anim(now) {
    const elapsed = now - startTime;
    const t = Math.min(1, elapsed / duration);
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

    const currentPos = new THREE.Vector3().lerpVectors(startPos, targetPos, ease);
    viewer.setControlsPosition(currentPos, targetLookAt);

    if (t < 1) requestAnimationFrame(anim);
  }
  // Start from current camera position
  viewer.setControlsPosition(targetPos, targetLookAt);
}

// Setup all event listeners
function initUI() {
  // 1. Fold Angle Controls
  const angleSlider = document.getElementById('foldAngleSlider');
  const angleInput = document.getElementById('foldAngleInput');
  const tourSlider = document.getElementById('tourFoldSlider');
  const tourFill = document.getElementById('tourSliderFill');
  const timelineScrubber = document.getElementById('timelineScrubber');

  angleSlider?.addEventListener('input', e => {
    stopPlay();
    setFoldAngle(parseFloat(e.target.value), true);
  });

  angleInput?.addEventListener('change', e => {
    stopPlay();
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) setFoldAngle(val, true);
  });

  tourSlider?.addEventListener('input', e => {
    stopPlay();
    const pct = parseFloat(e.target.value);
    setFoldAngle((pct / 100) * 180, true);
  });

  timelineScrubber?.addEventListener('input', e => {
    stopPlay();
    setFoldAngle(parseFloat(e.target.value), true);
  });

  // 2. Play / Pause Action Buttons
  document.getElementById('playActionBtn')?.addEventListener('click', () => {
    startPlay();
  });

  document.getElementById('pauseActionBtn')?.addEventListener('click', () => {
    stopPlay();
  });

  document.getElementById('timelinePlayBtn')?.addEventListener('click', () => {
    if (isPlaying) stopPlay();
    else startPlay();
  });

  // 3. Display Select
  const displaySelect = document.getElementById('displaySelect');
  displaySelect?.addEventListener('change', e => {
    state.screens.display = e.target.value;
  });

  // 4. File Upload (Choose image...)
  const fileInput = document.getElementById('screenFileInput');
  document.getElementById('chooseImageBtn')?.addEventListener('click', () => {
    fileInput?.click();
  });

  fileInput?.addEventListener('change', async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const target = state.screens.display === 'inner' ? 'inner' : state.screens.display === 'outer' ? 'outer' : 'both';
      await viewer.upload(file, target);
      showToast('Wallpaper updated successfully');
    } catch (err) {
      alert(err.message || 'Could not load image');
    }
    fileInput.value = '';
  });

  // 5. Restore Wallpapers
  document.getElementById('restoreWallpapersBtn')?.addEventListener('click', () => {
    viewer?.resetImages();
    showToast('Original wallpapers restored');
  });

  // 6. Fit Select
  const fitSelect = document.getElementById('fitSelect');
  fitSelect?.addEventListener('change', e => {
    state.screens.fit = e.target.value;
  });

  // 7. Clock Segmented Toggle
  const clockOff = document.getElementById('clockOffBtn');
  const clockOn = document.getElementById('clockOnBtn');
  clockOff?.addEventListener('click', () => {
    state.screens.clock = false;
    clockOff.classList.add('active');
    clockOn.classList.remove('active');
  });
  clockOn?.addEventListener('click', () => {
    state.screens.clock = true;
    clockOn.classList.add('active');
    clockOff.classList.remove('active');
  });

  // 8. Brightness Slider
  const brightnessSlider = document.getElementById('brightnessSlider');
  const brightnessInput = document.getElementById('brightnessInput');
  brightnessSlider?.addEventListener('input', e => {
    const val = parseFloat(e.target.value);
    state.screens.brightness = val;
    if (brightnessInput) brightnessInput.value = val.toFixed(2);
  });
  brightnessInput?.addEventListener('change', e => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      state.screens.brightness = val;
      if (brightnessSlider) brightnessSlider.value = val;
    }
  });

  // 9. Exposure Slider
  const exposureSlider = document.getElementById('exposureSlider');
  const exposureInput = document.getElementById('exposureInput');
  exposureSlider?.addEventListener('input', e => {
    const val = parseFloat(e.target.value);
    state.studio.exposure = val;
    if (exposureInput) exposureInput.value = val.toFixed(1);
  });
  exposureInput?.addEventListener('change', e => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      state.studio.exposure = val;
      if (exposureSlider) exposureSlider.value = val;
    }
  });

  // 10. Background Color Picker
  const colorInput = document.getElementById('bgColorInput');
  const colorSwatch = document.getElementById('colorSwatch');
  const colorHexLabel = document.getElementById('colorHexLabel');
  colorInput?.addEventListener('input', e => {
    const hex = e.target.value.toUpperCase();
    state.studio.background = hex;
    if (colorSwatch) colorSwatch.style.backgroundColor = hex;
    if (colorHexLabel) colorHexLabel.textContent = hex;
  });

  // 11. Body Colour Select
  const bodyColorSelect = document.getElementById('bodyColorSelect');
  bodyColorSelect?.addEventListener('change', e => {
    state.studio.bodyColor = e.target.value;
    viewer?.setBodyColor(e.target.value);
  });

  // 12. Wireframe Segmented Toggle
  const wireframeOff = document.getElementById('wireframeOffBtn');
  const wireframeOn = document.getElementById('wireframeOnBtn');
  wireframeOff?.addEventListener('click', () => {
    state.studio.wireframe = false;
    wireframeOff.classList.add('active');
    wireframeOn.classList.remove('active');
  });
  wireframeOn?.addEventListener('click', () => {
    state.studio.wireframe = true;
    wireframeOn.classList.add('active');
    wireframeOff.classList.remove('active');
  });

  // 13. Auto Rotate Segmented Toggle
  const autoRotateOff = document.getElementById('autoRotateOffBtn');
  const autoRotateOn = document.getElementById('autoRotateOnBtn');
  autoRotateOff?.addEventListener('click', () => {
    state.studio.autoRotate = false;
    autoRotateOff.classList.add('active');
    autoRotateOn.classList.remove('active');
  });
  autoRotateOn?.addEventListener('click', () => {
    state.studio.autoRotate = true;
    autoRotateOn.classList.add('active');
    autoRotateOff.classList.remove('active');
  });

  // 14. Camera Preset Buttons
  document.getElementById('cameraResetBtn')?.addEventListener('click', () => {
    viewer?.camera('front');
  });
  document.getElementById('cameraFrontBtn')?.addEventListener('click', () => {
    viewer?.camera('front');
  });
  document.getElementById('cameraBackBtn')?.addEventListener('click', () => {
    viewer?.camera('back');
  });

  // 15. Collapsible Section Headers
  document.querySelectorAll('.section-header').forEach(header => {
    header.addEventListener('click', () => {
      header.parentElement.classList.toggle('collapsed');
    });
  });

  // 16. Top Mode Switcher Buttons
  const toggleStudioBtn = document.getElementById('toggleStudioBtn');
  const toggleTourBtn = document.getElementById('toggleTourBtn');
  const studioPanel = document.getElementById('studioPanel');
  const tourPanel = document.getElementById('tourPanel');

  toggleStudioBtn?.addEventListener('click', () => {
    const isHidden = studioPanel.classList.toggle('hidden');
    toggleStudioBtn.classList.toggle('active', !isHidden);
  });

  toggleTourBtn?.addEventListener('click', () => {
    const isHidden = tourPanel.classList.toggle('hidden');
    toggleTourBtn.classList.toggle('active', !isHidden);
  });

  // 17. Tour Preset Buttons (Screenshot 1)
  const tourBtns = document.querySelectorAll('.tour-btn');
  tourBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tourBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const preset = btn.dataset.preset;

      stopPlay();
      if (preset === 'landscape') {
        setFoldAngle(126, true);
        viewer.setControlsPosition(new THREE.Vector3(3.2, 0.8, 4.5), new THREE.Vector3(0, 0, 0));
      } else if (preset === 'portrait') {
        setFoldAngle(180, true);
        viewer.camera('front');
      } else if (preset === 'closed') {
        setFoldAngle(0, true);
        viewer.setControlsPosition(new THREE.Vector3(0.5, 0.2, 5.2), new THREE.Vector3(0, 0, 0));
      } else if (preset === 'seated') {
        setFoldAngle(90, true);
        viewer.setControlsPosition(new THREE.Vector3(2.5, 2.8, 3.8), new THREE.Vector3(0, 0, 0));
      } else if (preset === 'standing') {
        setFoldAngle(60, true);
        viewer.setControlsPosition(new THREE.Vector3(3.2, 1.8, 4.2), new THREE.Vector3(0, 0, 0));
      } else if (preset === 'durability') {
        startPlay();
      }
    });
  });

  // 18. Viewport Drag & Drop File Handler
  const viewport = document.getElementById('viewport');
  viewport?.addEventListener('dragover', e => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  });

  viewport?.addEventListener('drop', async e => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && viewer) {
      try {
        const target = state.screens.display === 'inner' ? 'inner' : state.screens.display === 'outer' ? 'outer' : 'both';
        await viewer.upload(file, target);
        showToast('Wallpaper dropped & applied!');
      } catch (err) {
        alert(err.message);
      }
    }
  });

  // 19. Copy Config Button
  document.getElementById('copyConfigBtn')?.addEventListener('click', () => {
    const config = JSON.stringify(state, null, 2);
    navigator.clipboard.writeText(config).then(() => {
      showToast('Configuration copied to clipboard');
    });
  });

  // 20. Timeline visibility toggle
  const timelineDock = document.getElementById('timelineDock');
  document.getElementById('toggleTimelineBtn')?.addEventListener('click', () => {
    if (timelineDock) {
      const isHidden = timelineDock.style.display === 'none';
      timelineDock.style.display = isHidden ? 'flex' : 'none';
    }
  });

  // Initialize initial angle
  setFoldAngle(126, true);
}

// Bootstrap Application
window.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('viewport');
  const loadingOverlay = document.getElementById('loadingOverlay');

  viewer = createViewer(
    container,
    () => state,
    errMsg => {
      console.error(errMsg);
      showToast(errMsg);
    }
  );

  initUI();

  // Hide loading overlay after short init
  setTimeout(() => {
    if (loadingOverlay) {
      loadingOverlay.classList.add('fade-out');
      setTimeout(() => loadingOverlay.remove(), 600);
    }
  }, 1200);
});
