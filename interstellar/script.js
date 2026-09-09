const canvas = document.getElementById("canvas");
const editorPanel = document.getElementById("editorPanel");
const codeEditor = document.getElementById("codeEditor");
const errorField = document.getElementById("error");

const btnToggleView = document.getElementById("btnToggleView");
const btnTogglePause = document.getElementById("btnTogglePause");
const btnReset = document.getElementById("btnReset");

const defaultShader = normalizeShaderSource(
    document.getElementById("fragmentShader").textContent
);

const COMPILE_DELAY = 600;

let renderer = null;
let activeShaderSource = defaultShader;

let animationFrame = null;
let lastTimestamp = null;
let animationTime = 0;

let paused = false;
let contextLost = false;
let compileTimer = null;

let sizeDirty = true;
let previousDPR = 0;

/*
   Store input in normalized CSS-space units.

   The renderer converts these values to drawing-buffer pixels.
   This keeps movement sensitivity independent of DPR and
   viewport size.
*/
const input = {
    moveX: 0,
    moveY: 0,
    wheelX: 0,
    wheelY: 0
};

const drag = {
    pointerId: null,
    x: 0,
    y: 0
};

function normalizeShaderSource(source) {
    return source
        .replace(/^\uFEFF/, "")
        .replace(/^\s*(#version)/, "$1");
}

function showError(message) {
    errorField.textContent = String(message);
    errorField.hidden = false;
}

function clearError() {
    errorField.textContent = "";
    errorField.hidden = true;
}

/* --------------------------------------------------------- */
/* WebGL renderer                                             */
/* --------------------------------------------------------- */

class Renderer {
    constructor(canvasElement) {
        this.canvas = canvasElement;

        this.gl = canvasElement.getContext("webgl2", {
            alpha: false,
            antialias: false,
            depth: false,
            stencil: false,
            powerPreference: "high-performance"
        });

        if (!this.gl) {
            throw new Error(
                "WebGL2 is required to display these shaders."
            );
        }

        this.program = null;
        this.uniforms = {};

        /*
           One fullscreen triangle.

           No vertex buffer needs to be recreated when the
           fragment shader is edited.
        */
        this.vertexSource = `#version 300 es
precision highp float;

void main()
{
    vec2 position = vec2(-1.0, -1.0);

    if (gl_VertexID == 1)
    {
        position = vec2(3.0, -1.0);
    }
    else if (gl_VertexID == 2)
    {
        position = vec2(-1.0, 3.0);
    }

    gl_Position = vec4(position, 0.0, 1.0);
}
`;

        this.vertexShader = this.compileShader(
            this.gl.VERTEX_SHADER,
            this.vertexSource
        );

        this.vao = this.gl.createVertexArray();

        this.gl.bindVertexArray(this.vao);
        this.gl.disable(this.gl.DEPTH_TEST);
        this.gl.disable(this.gl.BLEND);
        this.gl.disable(this.gl.CULL_FACE);
    }

    compileShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const message =
                gl.getShaderInfoLog(shader) ||
                "Shader compilation failed.";

            gl.deleteShader(shader);

            throw new Error(message);
        }

        return shader;
    }

    setFragmentShader(source) {
        const gl = this.gl;

        /*
           Compile the replacement before deleting the current
           program. Invalid editor code will not destroy the
           last working shader.
        */
        const fragmentShader = this.compileShader(
            gl.FRAGMENT_SHADER,
            source
        );

        const nextProgram = gl.createProgram();

        gl.attachShader(nextProgram, this.vertexShader);
        gl.attachShader(nextProgram, fragmentShader);
        gl.linkProgram(nextProgram);

        const linked = gl.getProgramParameter(
            nextProgram,
            gl.LINK_STATUS
        );

        const linkMessage = gl.getProgramInfoLog(nextProgram);

        gl.detachShader(nextProgram, this.vertexShader);
        gl.detachShader(nextProgram, fragmentShader);
        gl.deleteShader(fragmentShader);

        if (!linked) {
            gl.deleteProgram(nextProgram);

            throw new Error(
                linkMessage || "Shader program linking failed."
            );
        }

        const nextUniforms = {};

        for (const name of ["time", "resolution", "move", "wheel"]) {
            nextUniforms[name] = gl.getUniformLocation(
                nextProgram,
                name
            );
        }

        const oldProgram = this.program;

        this.program = nextProgram;
        this.uniforms = nextUniforms;

        gl.useProgram(this.program);

        if (oldProgram) {
            gl.deleteProgram(oldProgram);
        }
    }

    draw(timeSeconds, controls) {
        const gl = this.gl;

        if (!this.program || gl.isContextLost()) {
            return;
        }

        /*
           These dimensions ALREADY include devicePixelRatio.
           Do not multiply them by DPR again.
        */
        const width = gl.drawingBufferWidth;
        const height = gl.drawingBufferHeight;
        const minDimension = Math.max(1, Math.min(width, height));

        gl.viewport(0, 0, width, height);
        gl.useProgram(this.program);
        gl.bindVertexArray(this.vao);

        const u = this.uniforms;

        if (u.time !== null) {
            gl.uniform1f(u.time, timeSeconds);
        }

        if (u.resolution !== null) {
            gl.uniform2f(u.resolution, width, height);
        }

        if (u.move !== null) {
            gl.uniform2f(
                u.move,
                controls.moveX * minDimension,
                controls.moveY * minDimension
            );
        }

        if (u.wheel !== null) {
            gl.uniform2f(
                u.wheel,
                controls.wheelX * minDimension,
                controls.wheelY * minDimension
            );
        }

        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
}

/* --------------------------------------------------------- */
/* Full native resolution — no quality switch                  */
/* --------------------------------------------------------- */

function resizeNativeCanvas() {
    const dpr = window.devicePixelRatio || 1;

    if (!sizeDirty && dpr === previousDPR) {
        return;
    }

    const rect = canvas.getBoundingClientRect();

    const width = Math.max(
        1,
        Math.round(rect.width * dpr)
    );

    const height = Math.max(
        1,
        Math.round(rect.height * dpr)
    );

    /*
       Only resize when necessary. Assigning these attributes
       every frame would clear/reallocate the drawing buffer.
    */
    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
    }

    previousDPR = dpr;
    sizeDirty = false;
}

function markSizeDirty() {
    sizeDirty = true;
    requestFrame();
}

/*
   Browser zoom and moving the window between monitors can
   change DPR even when the CSS layout looks unchanged.
*/
function watchDevicePixelRatio() {
    const query = window.matchMedia(
        `(resolution: ${window.devicePixelRatio || 1}dppx)`
    );

    query.addEventListener(
        "change",
        () => {
            markSizeDirty();
            watchDevicePixelRatio();
        },
        { once: true }
    );
}

/* --------------------------------------------------------- */
/* Stable animation clock                                     */
/* --------------------------------------------------------- */

function requestFrame() {
    if (
        animationFrame !== null ||
        contextLost ||
        document.hidden ||
        !renderer
    ) {
        return;
    }

    animationFrame = requestAnimationFrame(frame);
}

function cancelFrame() {
    if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }
}

function frame(now) {
    animationFrame = null;

    if (
        contextLost ||
        document.hidden ||
        !renderer
    ) {
        lastTimestamp = null;
        return;
    }

    if (!paused) {
        if (lastTimestamp !== null) {
            /*
               Time is measured in seconds, not frame count.
               Animation speed therefore does not depend on FPS.
            */
            animationTime += Math.max(
                0,
                now - lastTimestamp
            ) * 0.001;
        }

        lastTimestamp = now;
    } else {
        lastTimestamp = null;
    }

    resizeNativeCanvas();
    renderer.draw(animationTime, input);

    if (!paused) {
        requestFrame();
    }
}

/* --------------------------------------------------------- */
/* Controls                                                   */
/* --------------------------------------------------------- */

function updateButtons() {
    const editing = !editorPanel.hidden;

    btnToggleView.textContent = editing ? "👁 View" : "✎ Edit";

    btnToggleView.title = editing
        ? "Hide shader editor"
        : "Show shader editor";

    btnToggleView.setAttribute(
        "aria-expanded",
        String(editing)
    );

    btnTogglePause.textContent = paused
        ? "▶ Resume"
        : "⏸ Pause";

    btnTogglePause.title = paused
        ? "Resume animation — Space"
        : "Pause animation — Space";

    btnTogglePause.setAttribute(
        "aria-pressed",
        String(paused)
    );

    canvas.style.cursor = paused ? "default" : "grab";
}

function releaseDrag() {
    const pointerId = drag.pointerId;
    drag.pointerId = null;

    if (
        pointerId !== null &&
        canvas.hasPointerCapture(pointerId)
    ) {
        canvas.releasePointerCapture(pointerId);
    }

    canvas.style.cursor = paused ? "default" : "grab";
}

function toggleEditor() {
    editorPanel.hidden = !editorPanel.hidden;

    releaseDrag();
    updateButtons();

    if (!editorPanel.hidden) {
        codeEditor.focus();
    }
}

function togglePause() {
    paused = !paused;

    releaseDrag();
    cancelFrame();

    /*
       Keep animationTime unchanged.
       Reset only the real-world timestamp so the paused
       duration is excluded when playback resumes.
    */
    lastTimestamp = null;

    updateButtons();

    /*
       Draw once at the frozen time when pausing.
       Continuous rendering resumes only when unpaused.
    */
    requestFrame();
}

function compileEditor() {
    clearTimeout(compileTimer);
    compileTimer = null;

    if (!renderer || contextLost) {
        return;
    }

    const source = normalizeShaderSource(codeEditor.value);

    try {
        renderer.setFragmentShader(source);
        activeShaderSource = source;

        clearError();

        /*
           Recompiling does not start another render loop
           and does not reset animationTime.
        */
        lastTimestamp = null;

        requestFrame();
    } catch (error) {
        showError(error.message);
    }
}

function scheduleCompile() {
    clearTimeout(compileTimer);

    compileTimer = setTimeout(
        compileEditor,
        COMPILE_DELAY
    );
}

function resetScene() {
    clearTimeout(compileTimer);
    releaseDrag();

    codeEditor.value = defaultShader;

    input.moveX = 0;
    input.moveY = 0;
    input.wheelX = 0;
    input.wheelY = 0;

    animationTime = 0;
    lastTimestamp = null;

    compileEditor();
}

/* --------------------------------------------------------- */
/* Pointer controls                                           */
/* --------------------------------------------------------- */

function cssMinDimension() {
    const rect = canvas.getBoundingClientRect();

    return Math.max(
        1,
        Math.min(rect.width, rect.height)
    );
}

canvas.addEventListener("pointerdown", event => {
    if (
        paused ||
        contextLost ||
        !editorPanel.hidden ||
        drag.pointerId !== null
    ) {
        return;
    }

    if (
        event.pointerType === "mouse" &&
        event.button !== 0
    ) {
        return;
    }

    event.preventDefault();

    drag.pointerId = event.pointerId;
    drag.x = event.clientX;
    drag.y = event.clientY;

    canvas.setPointerCapture(event.pointerId);
    canvas.style.cursor = "grabbing";
});

canvas.addEventListener("pointermove", event => {
    if (
        paused ||
        event.pointerId !== drag.pointerId
    ) {
        return;
    }

    const minDimension = cssMinDimension();

    input.moveX += (
        event.clientX - drag.x
    ) / minDimension;

    input.moveY += (
        drag.y - event.clientY
    ) / minDimension;

    drag.x = event.clientX;
    drag.y = event.clientY;

    requestFrame();
});

function finishPointer(event) {
    if (event.pointerId === drag.pointerId) {
        releaseDrag();
    }
}

canvas.addEventListener("pointerup", finishPointer);
canvas.addEventListener("pointercancel", finishPointer);

canvas.addEventListener("lostpointercapture", event => {
    if (event.pointerId === drag.pointerId) {
        drag.pointerId = null;
        canvas.style.cursor = paused ? "default" : "grab";
    }
});

canvas.addEventListener(
    "wheel",
    event => {
        event.preventDefault();

        if (
            paused ||
            contextLost ||
            !editorPanel.hidden
        ) {
            return;
        }

        const rect = canvas.getBoundingClientRect();
        const minDimension = Math.max(
            1,
            Math.min(rect.width, rect.height)
        );

        // Normalize pixel, line, and page wheel units.
        let unit = 1;

        if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
            unit = 16;
        } else if (
            event.deltaMode === WheelEvent.DOM_DELTA_PAGE
        ) {
            unit = rect.height;
        }

        input.wheelX += event.deltaX * unit / minDimension;
        input.wheelY += event.deltaY * unit / minDimension;

        requestFrame();
    },
    { passive: false }
);

/* --------------------------------------------------------- */
/* Editor and keyboard shortcuts                              */
/* --------------------------------------------------------- */

btnToggleView.addEventListener("click", toggleEditor);
btnTogglePause.addEventListener("click", togglePause);
btnReset.addEventListener("click", resetScene);

codeEditor.addEventListener("input", scheduleCompile);

codeEditor.addEventListener("keydown", event => {
    if (
        (event.ctrlKey || event.metaKey) &&
        event.key === "Enter"
    ) {
        event.preventDefault();
        compileEditor();
        return;
    }

    if (event.key === "Tab" && !event.shiftKey) {
        event.preventDefault();

        codeEditor.setRangeText(
            "  ",
            codeEditor.selectionStart,
            codeEditor.selectionEnd,
            "end"
        );

        scheduleCompile();
    }
});

window.addEventListener("keydown", event => {
    if (event.key === "Escape" && !editorPanel.hidden) {
        event.preventDefault();

        toggleEditor();
        btnToggleView.focus();

        return;
    }

    const target = event.target;

    const interactive = target instanceof Element &&
        target.closest(
            "textarea, input, button, select, " +
            "[contenteditable='true']"
        );

    if (
        event.code === "Space" &&
        !event.repeat &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !interactive
    ) {
        event.preventDefault();
        togglePause();
    }
});

/* --------------------------------------------------------- */
/* Resize / visibility / context handling                      */
/* --------------------------------------------------------- */

window.addEventListener("resize", markSizeDirty);

if (window.visualViewport) {
    window.visualViewport.addEventListener(
        "resize",
        markSizeDirty
    );
}

const resizeObserver = new ResizeObserver(markSizeDirty);
resizeObserver.observe(canvas);

document.addEventListener("visibilitychange", () => {
    cancelFrame();
    lastTimestamp = null;
    releaseDrag();

    if (!document.hidden) {
        sizeDirty = true;
        requestFrame();
    }
});

canvas.addEventListener("webglcontextlost", event => {
    event.preventDefault();

    contextLost = true;

    cancelFrame();
    releaseDrag();
    lastTimestamp = null;

    showError(
        "The graphics context was lost. Waiting for the browser to restore it…"
    );
});

canvas.addEventListener("webglcontextrestored", () => {
    try {
        renderer = new Renderer(canvas);
        renderer.setFragmentShader(activeShaderSource);

        contextLost = false;
        sizeDirty = true;
        lastTimestamp = null;

        clearError();
        requestFrame();
    } catch (error) {
        showError(error.message);
    }
});

/* --------------------------------------------------------- */
/* Start                                                      */
/* --------------------------------------------------------- */

codeEditor.value = defaultShader;
updateButtons();

try {
    renderer = new Renderer(canvas);
    renderer.setFragmentShader(defaultShader);

    resizeNativeCanvas();
    watchDevicePixelRatio();
    requestFrame();
} catch (error) {
    showError(error.message);

    btnTogglePause.disabled = true;
    btnReset.disabled = true;
}