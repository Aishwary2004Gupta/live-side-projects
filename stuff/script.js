// ---------- Utility functions ----------
function lerp(a, b, t) {
    return a + (b - a) * t;
}

function clamp(min, max, value) {
    return Math.min(Math.max(value, min), max);
}

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Simple spring physics for smooth movement
function spring(from, to, velocity, stiffness = 200, damping = 20, mass = 1) {
    const force = -stiffness * (from - to);
    const acceleration = force / mass;
    const newVelocity = (velocity + acceleration) * (1 - damping / 100);
    const newPosition = from + newVelocity;
    return { position: newPosition, velocity: newVelocity };
}

// ---------- Sticker data ----------
const stickerSymbols = [
    '🙂', '💾', '⌘', '⌥', '🔋', '©', '📄', '☕', '🎨', '⭐', '✏️'
];

// ---------- DOM elements ----------
const container = document.getElementById('stickers-container');
const constraintsArea = document.getElementById('constraints-area');
const resetWrapper = document.getElementById('reset-wrapper');
const resetButton = document.getElementById('reset-btn');

// ---------- State ----------
let stickers = []; // array of sticker objects
let draggingCount = 0; // number of stickers currently being dragged
let animationFrame = null; // for main loop
let isResetting = false; // true during reset animation

// ---------- Screen size detection (similar to original) ----------
function getScreenSize() {
    const w = window.innerWidth;
    if (w <= 768) return 'sm';
    if (w <= 1024) return 'md';
    return 'lg';
}

// ---------- Calculate initial transforms for each sticker ----------
function calculateInitialTransforms() {
    const count = stickerSymbols.length;
    const size = getScreenSize();
    const transforms = [];

    for (let i = 0; i < count; i++) {
        const len = count;
        const isInFirstHalf = i < Math.floor(len / 2);
        const t = i / (len - 1);
        const isOdd = i & 1;

        let x, y, rotate, scale;

        if (size === 'sm') {
            x = Math.sin(lerp(-1, 1, t)) * 150 * -1;
            y = (isOdd ? -1 : 1) * randInt(20, 50);
            scale = 0.7;
        } else if (size === 'md') {
            x = Math.abs(Math.sin(lerp(-1, 1, t))) * 150 * (isInFirstHalf ? -1 : 1);
            y = (isOdd ? -1 : 1) * randInt(20, 50);
            scale = 0.75;
        } else {
            x = Math.abs(Math.sin(lerp(-1, 1, t))) * randInt(300, 500) * (isInFirstHalf ? -1 : 1);
            y = (isOdd ? -1 : 1) * randInt(20, 50);
            scale = 1.25;
        }

        rotate = Math.random() * (Math.sign(Math.sin(Math.random() * 100)) * 30);

        transforms.push({ x, y, rotate, scale });
    }
    return transforms;
}

// ---------- Sticker class/object ----------
class Sticker {
    constructor(index, symbol, initTransform) {
        this.index = index;
        this.symbol = symbol;
        this.initTransform = initTransform; // {x, y, rotate, scale}
        this.current = {
            x: initTransform.x,
            y: initTransform.y,
            rotate: initTransform.rotate,
            scale: initTransform.scale,
            opacity: 0,
            z: 1
        };
        this.target = {
            x: initTransform.x,
            y: initTransform.y,
            rotate: initTransform.rotate,
            scale: initTransform.scale,
            opacity: 1
        };
        this.velocity = { x: 0, y: 0, rotate: 0, scale: 0, opacity: 0 };
        this.dragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.dragOffset = { x: 0, y: 0 };
        this.element = null;
        this.svg = null;

        this.createElement();
    }

    createElement() {
        // Create the DOM element
        this.element = document.createElement('div');
        this.element.className = 'sticker';
        this.element.style.zIndex = 1;

        // Create placeholder SVG (you can replace with actual SVG)
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.setAttribute('viewBox', '0 0 100 100');

        // Simple colored circle with the symbol
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', '50');
        circle.setAttribute('cy', '50');
        circle.setAttribute('r', '45');
        circle.setAttribute('fill', `hsl(${this.index * 30}, 70%, 80%)`);
        circle.setAttribute('stroke', '#333');
        circle.setAttribute('stroke-width', '2');

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', '50');
        text.setAttribute('y', '60');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', '40');
        text.textContent = this.symbol;

        this.svg.appendChild(circle);
        this.svg.appendChild(text);

        this.element.appendChild(this.svg);

        // Set initial transform to center (will be overridden by animation)
        this.element.style.transform = `translate(-50%, -50%) translate(0px, 0px) rotate(0deg) scale(1)`;
        this.element.style.opacity = 0;

        // Event listeners for dragging
        this.element.addEventListener('pointerdown', (e) => this.onPointerDown(e));
        this.element.addEventListener('pointermove', (e) => this.onPointerMove(e));
        this.element.addEventListener('pointerup', (e) => this.onPointerUp(e));
        this.element.addEventListener('pointercancel', (e) => this.onPointerUp(e));

        container.appendChild(this.element);
    }

    // Update DOM based on current state
    updateElementTransform() {
        const { x, y, rotate, scale, opacity, z } = this.current;
        this.element.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${rotate}deg) scale(${scale})`;
        this.element.style.opacity = opacity;
        this.element.style.zIndex = z;
    }

    // Set target values (for animation)
    setTarget(x = this.current.x, y = this.current.y, rotate = this.current.rotate, scale = this.current.scale, opacity = 1) {
        this.target.x = x;
        this.target.y = y;
        this.target.rotate = rotate;
        this.target.scale = scale;
        this.target.opacity = opacity;
    }

    // Immediately set current (for reset)
    snapToInitial() {
        this.current.x = this.initTransform.x;
        this.current.y = this.initTransform.y;
        this.current.rotate = this.initTransform.rotate;
        this.current.scale = this.initTransform.scale;
        this.current.opacity = 1;
        this.velocity = { x: 0, y: 0, rotate: 0, scale: 0, opacity: 0 };
        this.updateElementTransform();
    }

    // Animate one frame towards target
    animateFrame() {
        // Spring physics for each property
        const springX = spring(this.current.x, this.target.x, this.velocity.x, 150, 8);
        const springY = spring(this.current.y, this.target.y, this.velocity.y, 150, 8);
        const springRotate = spring(this.current.rotate, this.target.rotate, this.velocity.rotate, 120, 10);
        const springScale = spring(this.current.scale, this.target.scale, this.velocity.scale, 120, 10);

        // Opacity uses a simple linear approximation
        const opacityDiff = this.target.opacity - this.current.opacity;
        const opacityVelocity = opacityDiff * 0.2;
        const newOpacity = this.current.opacity + opacityVelocity;

        // Update current values
        this.current.x = springX.position;
        this.current.y = springY.position;
        this.current.rotate = springRotate.position;
        this.current.scale = springScale.position;
        this.current.opacity = newOpacity;

        // Update velocities
        this.velocity.x = springX.velocity;
        this.velocity.y = springY.velocity;
        this.velocity.rotate = springRotate.velocity;
        this.velocity.scale = springScale.velocity;
        this.velocity.opacity = opacityVelocity;

        this.updateElementTransform();
    }

    // Check if the sticker is close enough to its target
    isSettled() {
        const dx = Math.abs(this.current.x - this.target.x);
        const dy = Math.abs(this.current.y - this.target.y);
        const dr = Math.abs(this.current.rotate - this.target.rotate);
        const ds = Math.abs(this.current.scale - this.target.scale);
        const do_ = Math.abs(this.current.opacity - this.target.opacity);
        return dx < 0.1 && dy < 0.1 && dr < 0.1 && ds < 0.01 && do_ < 0.01;
    }

    // ---------- Drag handling ----------
    onPointerDown(e) {
        if (isResetting) return;
        e.preventDefault();

        // Bring to front
        this.current.z = Math.max(...stickers.map(s => s.current.z)) + 1;
        this.dragging = true;
        draggingCount++;
        this.element.classList.add('dragging');

        // Record drag start position
        this.dragStart.x = e.clientX;
        this.dragStart.y = e.clientY;
        this.dragOffset.x = this.current.x;
        this.dragOffset.y = this.current.y;

        // Set drag targets: scale up, rotate to 0
        this.target.scale = this.initTransform.scale * 1.2;
        this.target.rotate = 0;

        // Disable reset button while dragging
        resetButton.disabled = true;
        resetWrapper.classList.remove('visible');
    }

    onPointerMove(e) {
        if (!this.dragging) return;
        e.preventDefault();

        const dx = e.clientX - this.dragStart.x;
        const dy = e.clientY - this.dragStart.y;

        let newX = this.dragOffset.x + dx;
        let newY = this.dragOffset.y + dy;

        // Constrain to the constraints area
        const rect = constraintsArea.getBoundingClientRect();
        const stickerWidth = this.element.offsetWidth;
        const stickerHeight = this.element.offsetHeight;

        const minX = rect.left + stickerWidth / 2;
        const maxX = rect.right - stickerWidth / 2;
        const minY = rect.top + stickerHeight / 2;
        const maxY = rect.bottom - stickerHeight / 2;

        newX = clamp(minX, maxX, newX);
        newY = clamp(minY, maxY, newY);

        // Update current immediately for smooth dragging
        this.current.x = newX;
        this.current.y = newY;
        this.current.rotate = 0;
        this.current.scale = this.initTransform.scale * 1.2;
        this.current.opacity = 1;
        this.updateElementTransform();
    }

    onPointerUp(e) {
        if (!this.dragging) return;
        this.dragging = false;
        draggingCount--;
        this.element.classList.remove('dragging');

        // Set target back to scale 1 (animate back)
        this.target.scale = this.initTransform.scale;
        this.target.rotate = 0; // keep rotation 0 after dragging

        // If all dragging ended, enable reset button
        if (draggingCount === 0 && !isResetting) {
            resetButton.disabled = false;
            resetWrapper.classList.add('visible');
        }
    }
}

// ---------- Initialize stickers ----------
function initStickers() {
    const transforms = calculateInitialTransforms();
    stickerSymbols.forEach((symbol, i) => {
        const sticker = new Sticker(i, symbol, transforms[i]);
        stickers.push(sticker);

        // Initially hidden, will animate to initial
        sticker.current.opacity = 0;
        sticker.setTarget(
            transforms[i].x,
            transforms[i].y,
            transforms[i].rotate,
            transforms[i].scale,
            1
        );
        sticker.updateElementTransform();
    });
}

// ---------- Reset all stickers to initial positions ----------
function resetStickers() {
    if (isResetting) return;
    isResetting = true;
    resetButton.disabled = true;
    resetWrapper.classList.remove('visible');

    stickers.forEach(sticker => {
        // Set targets to initial values
        sticker.setTarget(
            sticker.initTransform.x,
            sticker.initTransform.y,
            sticker.initTransform.rotate,
            sticker.initTransform.scale,
            1
        );
    });

    // Wait for all to settle, then re-enable
    setTimeout(() => {
        isResetting = false;
        // Check if any still dragging (should be none)
        if (draggingCount === 0) {
            resetButton.disabled = false;
            resetWrapper.classList.add('visible');
        }
    }, 1500);
}

// ---------- Main animation loop ----------
function animationLoop(time) {
    let allSettled = true;

    stickers.forEach(sticker => {
        if (!sticker.dragging) {
            sticker.animateFrame();
            if (!sticker.isSettled()) {
                allSettled = false;
            }
        }
    });

    // Continue loop if any sticker still animating
    if (!allSettled || isResetting) {
        animationFrame = requestAnimationFrame(animationLoop);
    } else {
        animationFrame = null;
    }
}

// Start animation loop when entering animation
function startAnimation() {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(animationLoop);
}

// ---------- Event listeners ----------
resetButton.addEventListener('click', resetStickers);

// Recalculate on resize (optional, like original doesn't recalc but we do a simple approach)
window.addEventListener('resize', () => {
    // For simplicity, we don't recalc initial positions on resize.
    // Could be added if needed.
});

// ---------- Initialize on page load ----------
window.addEventListener('DOMContentLoaded', () => {
    initStickers();
    startAnimation();
});