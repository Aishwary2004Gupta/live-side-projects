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
    this.color = options.color ?? "#ffffff";
    this.fontSize = options.fontSize ?? 96;
    this.duration = options.duration ?? 1.5;
    this.delay = options.delay ?? 0;
    this.letterDelay = options.letterDelay ?? 0.16;
    this.inView = options.inView ?? false;
    this.once = options.once ?? true;

    this.fontUrl =
      options.fontUrl ??
      "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/sacramento/Sacramento-Regular.ttf";

    this.font = null;
    this.hasPlayed = false;
    this.observer = null;
    this.maskId = `signature-reveal-${SignatureAnim.uid()}`;

    this.init();
  }

  static uid() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID().replace(/-/g, "");
    }

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
      throw new Error(
        "opentype.js is not loaded. Make sure the opentype CDN script is above script.js."
      );
    }

    const response = await fetch(url, {
      mode: "cors",
    });

    if (!response.ok) {
      throw new Error(
        `Font request failed: ${response.status} ${response.statusText} - ${url}`
      );
    }

    const buffer = await response.arrayBuffer();

    // Correct modern way. This avoids the deprecated opentype.load() warning.
    const font = window.opentype.parse(buffer);

    if (!font || typeof font.charToGlyph !== "function") {
      throw new Error("The downloaded file is not a valid TTF/OTF font.");
    }

    return font;
  }

  async init() {
    this.container.innerHTML = `
      <div class="signature-loading">
        Loading signature...
      </div>
    `;

    try {
      this.font = await SignatureAnim.loadFont(this.fontUrl);
      this.render();

      if (this.inView) {
        this.observeInView();
      } else {
        this.play();
      }
    } catch (error) {
      console.error("Signature component font load error:", error);

      this.container.innerHTML = `
        <div class="signature-error">
          Failed to load font.<br>
          Try Live Server or use a local .ttf/.otf font.
        </div>
      `;
    }
  }

  buildPaths() {
    const font = this.font;
    const fontSize = Number(this.fontSize) || 96;
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
        items.push({
          d,
          delayIndex: i,
        });
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
    const safeLabel = SignatureAnim.escapeAttr(`${this.text} signature`);

    const outlineStrokeWidth = Math.max(1.5, this.fontSize * 0.025);
    const maskStrokeWidth = this.fontSize * 0.22;

    const maskPaths = items
      .map(
        (item, i) => `
          <path
            class="signature-mask-path"
            data-path-index="${i}"
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
        (item, i) => `
          <path
            class="signature-stroke-path"
            data-path-index="${i}"
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
        aria-label="${safeLabel}"
      >
        <defs>
          <mask
            id="${this.maskId}"
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="${width}"
            height="${height}"
          >
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
      .map((stroke, i) => ({
        stroke,
        mask: maskPaths[i],
      }))
      .filter((pair) => pair.stroke && pair.mask);
  }

  resetDrawState() {
    const pairs = this.getPathPairs();

    pairs.forEach(({ stroke, mask }) => {
      let length = 1;

      try {
        length = stroke.getTotalLength();
      } catch {
        length = 1;
      }

      if (!Number.isFinite(length) || length <= 0) {
        length = 1;
      }

      [stroke, mask].forEach((path) => {
        path.style.transition = "none";
        path.style.strokeDasharray = `${length}`;
        path.style.strokeDashoffset = `${length}`;
        path.style.opacity = "0";
        path.dataset.length = String(length);
      });
    });

    // Forces the browser to apply the reset before replaying.
    void this.container.offsetHeight;
  }

  play() {
    if (!this.font) return;

    const pairs = this.getPathPairs();

    if (!pairs.length) return;

    this.resetDrawState();

    const reducedMotion =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const duration = Math.max(0, Number(this.duration) || 0);
    const baseDelay = Math.max(0, Number(this.delay) || 0);
    const letterDelay = Math.max(0, Number(this.letterDelay) || 0);

    requestAnimationFrame(() => {
      pairs.forEach(({ stroke, mask }) => {
        const delayIndex = Number(stroke.dataset.delayIndex || 0);
        const pathDelay = baseDelay + delayIndex * letterDelay;

        [stroke, mask].forEach((path) => {
          if (reducedMotion || duration === 0) {
            path.style.transition = "none";
            path.style.strokeDashoffset = "0";
            path.style.opacity = "1";
            return;
          }

          path.style.transition = [
            `stroke-dashoffset ${duration}s ease-in-out ${pathDelay}s`,
            `opacity 0.01s linear ${pathDelay + 0.01}s`,
          ].join(", ");

          path.style.strokeDashoffset = "0";
          path.style.opacity = "1";
        });
      });
    });

    this.hasPlayed = true;
  }

  replay() {
    if (!this.font) return;
    this.play();
  }

  setText(text) {
    this.text = String(text ?? "");

    if (!this.font) return;

    this.render();
    this.play();
  }

  observeInView() {
    if (!("IntersectionObserver" in window)) {
      this.play();
      return;
    }

    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (!this.once || !this.hasPlayed) {
              this.play();
            }

            if (this.once && this.observer) {
              this.observer.disconnect();
            }
          } else if (!this.once) {
            this.hasPlayed = false;
            this.resetDrawState();
          }
        });
      },
      {
        threshold: 0.35,
      }
    );

    this.observer.observe(this.container);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("signature-text");

  const signature = new SignatureAnim("signature-container", {
    text: input.value,
    color: "#ffffff",
    fontSize: 100,
    duration: 1.4,
    delay: 0.1,
    letterDelay: 0.13,

    // CORS-friendly Google font URL.
    fontUrl:
      "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/sacramento/Sacramento-Regular.ttf",

    // If you download a local font, use this instead:
    // fontUrl: "./fonts/Sacramento-Regular.ttf",
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