function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

function getResponsiveFontSize() {
  const w = window.innerWidth;
  if (w <= 360) return 48;
  if (w <= 480) return 56;
  if (w <= 768) return 72;
  if (w <= 1024) return 88;
  return 100;
}

class SignatureAnim {
  constructor(container, options = {}) {
    this.container = typeof container === "string" ? document.getElementById(container) : container;
    if (!this.container) throw new Error("Container not found");

    this.text = options.text ?? "Signature";
    this.color = options.color ?? "#111111";
    this.fontSize = options.fontSize ?? getResponsiveFontSize();
    this.duration = options.duration ?? 1.5;
    this.delay = options.delay ?? 0;
    this.letterDelay = options.letterDelay ?? 0.16;
    this.fontUrl = options.fontUrl ?? "./LastoriaBoldRegular.otf";
    this.font = null;
    this.maskId = `sig-${Math.random().toString(36).slice(2)}`;
    this.init();
  }

  static escapeAttr(v) {
    return String(v).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }

  static async loadFont(url) {
    if (!window.opentype?.parse) throw new Error("opentype.js not loaded");
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error(`Font fetch failed ${res.status} ${url}`);
    const buffer = await res.arrayBuffer();
    const font = window.opentype.parse(buffer);
    if (!font || typeof font.charToGlyph !== "function") throw new Error("Invalid font");
    return font;
  }

  async init() {
    this.container.innerHTML = `<div class="signature-loading">Loading...</div>`;
    const candidates = [this.fontUrl, "./LastoriaBoldRegular.otf", "./fonts/LastoriaBoldRegular.otf", "/LastoriaBoldRegular.otf"];
    const urls = [...new Set(candidates)];
    let lastErr;
    for (const url of urls) {
      try {
        this.font = await SignatureAnim.loadFont(url);
        this.fontUrl = url;
        this.render();
        this.play();
        return;
      } catch (e) { lastErr = e; }
    }
    console.error(lastErr);
    this.container.innerHTML = `<div class="signature-error">Failed to load LastoriaBoldRegular.otf<br>Use Live Server, not file://</div>`;
  }

  buildPaths() {
    const font = this.font;
    const fontSize = this.fontSize;
    const unitsPerEm = font.unitsPerEm || 1000;
    const scale = fontSize / unitsPerEm;
    const horizontalPadding = fontSize * 0.15;
    const baseline = fontSize * 1.8;
    const height = fontSize * 3.1;

    let x = horizontalPadding;
    const items = [];
    const chars = Array.from(this.text);

    for (let i = 0; i < chars.length; i++) {
      const glyph = font.charToGlyph(chars[i]);
      const d = glyph.getPath(x, baseline, fontSize).toPathData(3);
      if (d && d.trim()) items.push({ d, delayIndex: i });

      const advance = Number.isFinite(glyph.advanceWidth) ? glyph.advanceWidth : unitsPerEm * 0.5;
      let kerning = 0;
      if (font.getKerningValue && chars[i+1]) {
        kerning = font.getKerningValue(glyph, font.charToGlyph(chars[i+1])) || 0;
      }
      x += (advance + kerning) * scale;
    }
    return { items, width: Math.ceil(Math.max(x + horizontalPadding, fontSize * 2)), height: Math.ceil(height) };
  }

  render() {
    if (!this.font) return;
    const { items, width, height } = this.buildPaths();
    const safeColor = SignatureAnim.escapeAttr(this.color);
    const outline = Math.max(1.5, this.fontSize * 0.025);
    const maskStroke = this.fontSize * 0.22;

    const maskPaths = items.map(i => `<path class="signature-mask-path" data-delay-index="${i.delayIndex}" d="${i.d}" stroke="white" stroke-width="${maskStroke}" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0"/>`).join("");
    const strokePaths = items.map(i => `<path class="signature-stroke-path" data-delay-index="${i.delayIndex}" d="${i.d}" stroke="${safeColor}" stroke-width="${outline}" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0"/>`).join("");
    const fillPaths = items.map(i => `<path d="${i.d}" fill="${safeColor}"/>`).join("");

    this.container.innerHTML = `
      <svg class="signature-svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs><mask id="${this.maskId}">${maskPaths}</mask></defs>
        ${strokePaths}
        <g mask="url(#${this.maskId})">${fillPaths}</g>
      </svg>`;
    this.resetDrawState();
  }

  getPathPairs() {
    const masks = [...this.container.querySelectorAll(".signature-mask-path")];
    const strokes = [...this.container.querySelectorAll(".signature-stroke-path")];
    return strokes.map((s, i) => ({ stroke: s, mask: masks[i] })).filter(p => p.stroke && p.mask);
  }

  resetDrawState() {
    this.getPathPairs().forEach(({ stroke, mask }) => {
      let len = 1;
      try { len = stroke.getTotalLength(); } catch {}
      if (!Number.isFinite(len) || len <= 0) len = 1;
      [stroke, mask].forEach(p => {
        p.style.transition = "none";
        p.style.strokeDasharray = `${len}`;
        p.style.strokeDashoffset = `${len}`;
        p.style.opacity = "0";
      });
    });
    void this.container.offsetHeight;
  }

  play() {
    if (!this.font) return;
    const pairs = this.getPathPairs();
    if (!pairs.length) return;
    this.resetDrawState();
    requestAnimationFrame(() => {
      pairs.forEach(({ stroke, mask }) => {
        const d = Number(stroke.dataset.delayIndex || 0);
        const pd = this.delay + d * this.letterDelay;
        [stroke, mask].forEach(p => {
          p.style.transition = `stroke-dashoffset ${this.duration}s ease-in-out ${pd}s, opacity 0.01s linear ${pd + 0.01}s`;
          p.style.strokeDashoffset = "0";
          p.style.opacity = "1";
        });
      });
    });
  }

  setText(t) {
    this.text = String(t || "");
    if (!this.font) return;
    this.render();
    this.play();
  }

  setFontSize(size) {
    this.fontSize = size;
    this.render();
    this.play();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("signature-text");

  const signature = new SignatureAnim("signature-container", {
    text: input.value || "Signature",
    color: "#111111",
    fontSize: getResponsiveFontSize(),
    duration: 1.4,
    delay: 0.05,
    letterDelay: 0.13,
    fontUrl: "./LastoriaBoldRegular.otf"
  });

  document.getElementById("replay-btn").addEventListener("click", () => signature.replay?.() || signature.play());
  document.getElementById("update-btn").addEventListener("click", () => signature.setText(input.value.trim() || "Signature"));
  input.addEventListener("keydown", e => { if (e.key === "Enter") signature.setText(input.value.trim() || "Signature"); });

  // Make responsive on resize
  window.addEventListener("resize", debounce(() => {
    const newSize = getResponsiveFontSize();
    if (newSize !== signature.fontSize) signature.setFontSize(newSize);
  }, 200));
});