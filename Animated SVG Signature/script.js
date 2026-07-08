class SignatureAnim {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);

    this.text = options.text || "Signature";
    this.color = options.color || "white";
    this.fontSize = options.fontSize || 64;
    this.duration = options.duration || 1.5;
    this.delay = options.delay || 0;

    // Reliable public font (signature style)
    this.fontUrl = options.fontUrl || 
      "https://cdn.jsdelivr.net/gh/AayushBhusworker/fonts@main/GreatVibes-Regular.ttf";

    this.maskId = `signature-reveal-${Math.random().toString(36).substr(2, 9)}`;
    this.font = null;

    this.init();
  }

  async init() {
    try {
      // ✅ Modern way: fetch + opentype.parse (fixes deprecation + loading error)
      const response = await fetch(this.fontUrl);
      if (!response.ok) throw new Error("Font fetch failed");

      const buffer = await response.arrayBuffer();
      this.font = opentype.parse(buffer);

      if (!this.font) throw new Error("Font parsing failed");

      this.render();
    } catch (error) {
      console.error("Signature component font load error:", error);
      this.container.innerHTML = `
        <p style="color: #ff6b6b;">
          Failed to load font.<br>
          <small>Check font URL or use a local .ttf file.</small>
        </p>`;
    }
  }

  render() {
    const height = this.fontSize * 3;
    const horizontalPadding = this.fontSize * 0.1;
    const topMargin = this.fontSize * 1.5;
    const baseline = topMargin;

    let x = horizontalPadding;
    const pathsData = [];

    for (const char of this.text) {
      const glyph = this.font.charToGlyph(char);
      const path = glyph.getPath(x, baseline, this.fontSize);
      pathsData.push(path.toPathData(3));

      const advanceWidth = glyph.advanceWidth ?? this.font.unitsPerEm;
      x += advanceWidth * (this.fontSize / this.font.unitsPerEm);
    }

    const width = x + horizontalPadding;

    const svgHTML = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">
        <defs>
          <mask id="${this.maskId}" maskUnits="userSpaceOnUse">
            ${pathsData.map((d, i) => `
              <path 
                class="mask-path" 
                data-index="${i}"
                d="${d}" 
                stroke="white" 
                stroke-width="${this.fontSize * 0.22}" 
                fill="none" 
                vector-effect="non-scaling-stroke" 
                stroke-linecap="round" 
                stroke-linejoin="round"
                opacity="0"
              />
            `).join('')}
          </mask>
        </defs>

        ${pathsData.map((d, i) => `
          <path 
            class="stroke-path" 
            data-index="${i}"
            d="${d}" 
            stroke="${this.color}" 
            stroke-width="2" 
            fill="none" 
            vector-effect="non-scaling-stroke" 
            stroke-linecap="butt" 
            stroke-linejoin="round"
            opacity="0"
          />
        `).join('')}

        <g mask="url(#${this.maskId})">
          ${pathsData.map(d => `<path d="${d}" fill="${this.color}" />`).join('')}
        </g>
      </svg>
    `;

    this.container.innerHTML = svgHTML;
    this.animatePaths();
  }

  animatePaths() {
    const maskPaths = this.container.querySelectorAll('.mask-path');
    const strokePaths = this.container.querySelectorAll('.stroke-path');

    maskPaths.forEach((maskPath, i) => {
      const strokePath = strokePaths[i];
      const length = maskPath.getTotalLength();

      const setupStyles = (el) => {
        el.style.strokeDasharray = length;
        el.style.strokeDashoffset = length;
      };

      setupStyles(maskPath);
      setupStyles(strokePath);

      const charDelay = (this.delay + i * 0.2) * 1000;
      const animDuration = this.duration * 1000;

      const keyframes = [
        { strokeDashoffset: length, opacity: 0 },
        { strokeDashoffset: length, opacity: 1, offset: 0.01 },
        { strokeDashoffset: 0, opacity: 1 }
      ];

      const animOptions = {
        duration: animDuration,
        delay: charDelay,
        fill: 'forwards',
        easing: 'ease-in-out'
      };

      maskPath.animate(keyframes, animOptions);
      strokePath.animate(keyframes, animOptions);
    });
  }

  replay() {
    if (this.font) this.render();
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  const signature = new SignatureAnim('signature-container', {
    text: "John Doe",
    color: "#ffffff",
    fontSize: 64,
    duration: 1.5,
    delay: 0
  });

  document.getElementById('replay-btn').addEventListener('click', () => {
    signature.replay();
  });
});