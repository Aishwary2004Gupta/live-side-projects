class SignatureAnim {
  constructor(container, options = {}) {
    this.container =
      typeof container === "string"
        ? document.getElementById(container)
        : container;

    if (!this.container) {
      throw new Error("Signature container was not found.");
    }

    this.text = options.text ?? "Signature";
    this.color = options.color ?? "var(--signature-color)";
    this.fontSize = options.fontSize ?? 100;
    this.duration = options.duration ?? 1.5;
    this.delay = options.delay ?? 0;
    this.letterDelay = options.letterDelay ?? 0.16;
    this.fontUrl = options.fontUrl ?? "./LastoriaBoldRegular.otf";

    this.font = null;
    this.maskId = `signature-reveal-${SignatureAnim.uid()}`;

    this.init();
  }

  static uid() {
    return Math.random().toString(36).slice(2);
  }

  static escapeAttr(value) {
    return String(value).replace(/[&<>"']/g, (char) => {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[char];
    });
  }

  static async loadFont(url) {
    if (!window.opentype || typeof window.opentype.parse !== "function") {
      throw new Error("opentype.js is not loaded.");
    }

    const response = await fetch(url, { mode: "cors" });

    if (!response.ok) {
      throw new Error(`Font request failed: ${response.status} for ${url}`);
    }

    const buffer = await response.arrayBuffer();
    const font = window.opentype.parse(buffer);

    if (!font || typeof font.charToGlyph !== "function") {
      throw new Error("Invalid font file.");
    }

    return font;
  }

  async init() {
    this.container.innerHTML = `<div class="signature-loading">Loading...</div>`;

    const candidates = [
      this.fontUrl,
      "./LastoriaBoldRegular.otf",
      "./fonts/LastoriaBoldRegular.otf",
      "/LastoriaBoldRegular.otf",
      "/fonts/LastoriaBoldRegular.otf",
    ];

    const uniqueUrls = [...new Set(candidates)];
    let lastError = null;

    for (const url of uniqueUrls) {
      try {
        this.font = await SignatureAnim.loadFont(url);
        this.fontUrl = url;
        this.render();
        this.play();
        return;
      } catch (error) {
        lastError = error;
      }
    }

    console.error("Signature font load error:", lastError);
    this.container.innerHTML = `
      <div class="signature-error">
        Failed to load LastoriaBoldRegular.otf<br>
        Make sure the file path is correct and you are using Live Server.
      </div>
    `;
  }

  buildPaths() {
    const font = this.font;
    const fontSize = Number(this.fontSize) || 100;
    const unitsPerEm = font.unitsPerEm || 1000;
    const scale = fontSize / unitsPerEm;

    const horizontalPadding = fontSize * 0.15;
    const baseline = fontSize * 1.8;
    const height = fontSize * 2.8;

    let x = horizontalPadding;
    const items = [];
    const chars = Array.from(String(this.text ?? ""));

    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      const glyph = font.charToGlyph(char);
      const glyphPath = glyph.getPath(x, baseline, fontSize);
      const d = glyphPath.toPathData(3);

      if (d && d.trim().length > 0) {
        items.push({ d, delayIndex: i });
      }

      const advanceWidth = Number.isFinite(glyph.advanceWidth)
        ? glyph.advanceWidth
        : unitsPerEm * 0.5;

      let kerning = 0;
      if (typeof font.getKerningValue === "function" && chars[i + 1]) {
        const nextGlyph = font.charToGlyph(chars[i + 1]);
        kerning = font.getKerningValue(glyph, nextGlyph) || 0;
      }

      x += (advanceWidth + kerning) * scale;
    }

    return {
      items,
      width: Math.ceil(Math.max(x + horizontalPadding, fontSize * 2)),
      height: Math.ceil(height),
    };
  }

  render() {
    if (!this.font) return;

    const { items, width, height } = this.buildPaths();
    const safeColor = SignatureAnim.escapeAttr(this.color);

    const outlineStrokeWidth = Math.max(1.5, this.fontSize * 0.025);
    const maskStrokeWidth = this.fontSize * 0.22;

    const maskPaths = items
      .map(
        (item) => `
        <path
          class="signature-mask-path"
          data-delay-index="${item.delayIndex}"
          d="${item.d}"
          stroke="white"
          stroke-width="${maskStrokeWidth}"
          fill="none"
          vector-effect="non-scaling-stroke"
          stroke-linecap="round"
          stroke-linejoin="round"
          opacity="0"
        ></path>
      `
      )
      .join("");

    const strokePaths = items
      .map(
        (item) => `
        <path
          class="signature-stroke-path"
          data-delay-index="${item.delayIndex}"
          d="${item.d}"
          stroke="${safeColor}"
          stroke-width="${outlineStrokeWidth}"
          fill="none"
          vector-effect="non-scaling-stroke"
          stroke-linecap="round"
          stroke-linejoin="round"
          opacity="0"
        ></path>
      `
      )
      .join("");

    const fillPaths = items
      .map((item) => `<path d="${item.d}" fill="${safeColor}"></path>`)
      .join("");

    this.container.innerHTML = `
      <svg
        class="signature-svg"
        width="${width}"
        height="${height}"
        viewBox="0 0 ${width} ${height}"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="${SignatureAnim.escapeAttr(this.text)} signature"
      >
        <defs>
          <mask id="${this.maskId}" maskUnits="userSpaceOnUse">
            ${maskPaths}
          </mask>
        </defs>

        ${strokePaths}

        <g mask="url(#${this.maskId})">
          ${fillPaths}
        </g>
      </svg>
    `;

    this.resetDrawState();
  }

  getPathPairs() {
    const maskPaths = Array.from(
      this.container.querySelectorAll(".signature-mask-path")
    );
    const strokePaths = Array.from(
      this.container.querySelectorAll(".signature-stroke-path")
    );

    return strokePaths
      .map((stroke, i) => ({ stroke, mask: maskPaths[i] }))
      .filter((pair) => pair.stroke && pair.mask);
  }

  resetDrawState() {
    this.getPathPairs().forEach(({ stroke, mask }) => {
      let length = 1;
      try {
        length = stroke.getTotalLength();
      } catch {
        length = 1;
      }

      if (!Number.isFinite(length) || length <= 0) length = 1;

      [stroke, mask].forEach((path) => {
        path.style.transition = "none";
        path.style.strokeDasharray = `${length}`;
        path.style.strokeDashoffset = `${length}`;
        path.style.opacity = "0";
      });
    });

    void this.container.offsetHeight;
  }

  play() {
    if (!this.font) return;

    const pairs = this.getPathPairs();
    if (!pairs.length) return;

    this.resetDrawState();

    const duration = Math.max(0, Number(this.duration) || 0);
    const baseDelay = Math.max(0, Number(this.delay) || 0);
    const letterDelay = Math.max(0, Number(this.letterDelay) || 0);

    requestAnimationFrame(() => {
      pairs.forEach(({ stroke, mask }) => {
        const delayIndex = Number(stroke.dataset.delayIndex || 0);
        const pathDelay = baseDelay + delayIndex * letterDelay;

        [stroke, mask].forEach((path) => {
          path.style.transition = [
            `stroke-dashoffset ${duration}s ease-in-out ${pathDelay}s`,
            `opacity 0.01s linear ${pathDelay + 0.01}s`,
          ].join(", ");

          path.style.strokeDashoffset = "0";
          path.style.opacity = "1";
        });
      });
    });
  }

  replay() {
    this.play();
  }

  setText(text) {
    this.text = String(text ?? "");
    if (!this.font) return;
    this.render();
    this.play();
  }
}

// Theme toggle functionality
function setupThemeToggle() {
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');

  // Check for saved theme preference or use preferred color scheme
  const savedTheme = localStorage.getItem('theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

  // Apply the saved theme
  document.documentElement.setAttribute('data-theme', savedTheme);

  // Update icon based on current theme
  updateThemeIcon(savedTheme);

  // Toggle theme on button click
  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
  });

  function updateThemeIcon(theme) {
    if (theme === 'dark') {
      // Moon icon for dark mode
      themeIcon.innerHTML = `
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      `;
    } else {
      // Sun icon for light mode
      themeIcon.innerHTML = `
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      `;
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setupThemeToggle();

  const input = document.getElementById("signature-text");

  const signature = new SignatureAnim("signature-container", {
    text: input.value,
    color: "var(--signature-color)",
    fontSize: 100,
    duration: 1.4,
    delay: 0.05,
    letterDelay: 0.13,
    fontUrl: "./LastoriaBoldRegular.otf",
  });

  document.getElementById("replay-btn").addEventListener("click", () => {
    signature.replay();
  });

  document.getElementById("update-btn").addEventListener("click", () => {
    signature.setText(input.value.trim() || "Signature");
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      signature.setText(input.value.trim() || "Signature");
    }
  });
});