class SignatureAnim {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    
    // Default Props mapped from the React component
    this.text = options.text || "Signature";
    this.color = options.color || "white";
    this.fontSize = options.fontSize || 64; // Scaled up slightly for vanilla demo
    this.duration = options.duration || 1.5;
    this.delay = options.delay || 0;
    this.fontUrl =
  options.fontUrl ||
  "https://raw.githubusercontent.com/google/fonts/main/ofl/sacramento/Sacramento-Regular.ttf";
    
    this.maskId = `signature-reveal-${Math.random().toString(36).substr(2, 9)}`;
    this.font = null;
    
    this.init();
  }

  async init() {
    try {
      // 1. Load Font using Opentype.js
      this.font = await opentype.load(this.fontUrl);
      this.render();
    } catch (error) {
      console.error("Signature component font load error:", error);
      this.container.innerHTML = `<p style="color:red">Failed to load font.</p>`;
    }
  }

  render() {
    // 2. Setup Math & Calculations
    const height = this.fontSize * 3;
    const horizontalPadding = this.fontSize * 0.1;
    const topMargin = this.fontSize * 1.5;
    const baseline = topMargin;

    let x = horizontalPadding;
    const pathsData = [];

    // 3. Generate Paths per character
    for (const char of this.text) {
      const glyph = this.font.charToGlyph(char);
      const path = glyph.getPath(x, baseline, this.fontSize);
      pathsData.push(path.toPathData(3));

      const advanceWidth = glyph.advanceWidth ?? this.font.unitsPerEm;
      x += advanceWidth * (this.fontSize / this.font.unitsPerEm);
    }

    const width = x + horizontalPadding;

    // 4. Construct SVG HTML exactly like the React component
    // We inject as a string, then grab the elements to animate them.
    const svgHTML = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
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

    // 5. Trigger the animation
    this.animatePaths();
  }

  animatePaths() {
    const maskPaths = this.container.querySelectorAll('.mask-path');
    const strokePaths = this.container.querySelectorAll('.stroke-path');

    // Iterate over paths and animate them using Web Animations API (WAAPI)
    maskPaths.forEach((maskPath, i) => {
      const strokePath = strokePaths[i];
      
      // Calculate length to recreate Framer Motion's pathLength: [0, 1]
      const length = maskPath.getTotalLength();
      
      // Initial Setup
      const setupStyles = (el) => {
        el.style.strokeDasharray = length;
        el.style.strokeDashoffset = length;
      };
      
      setupStyles(maskPath);
      setupStyles(strokePath);

      // Animation timings
      const charDelay = (this.delay + i * 0.2) * 1000;
      const animDuration = this.duration * 1000;

      // Recreating Framer Motion's exact keyframes
      const keyframes = [
        { strokeDashoffset: length, opacity: 0 },
        { strokeDashoffset: length, opacity: 1, offset: 0.01 }, // Quick fade in
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
  
  // Re-run the animation
  replay() {
      if(this.font) {
          this.render();
      }
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  const signature = new SignatureAnim('signature-container', {
    text: "John Doe",       // The text to draw
    color: "#ffffff",       // Path/Fill color
    fontSize: 64,           // Font size
    duration: 1.5,          // Draw speed in seconds
    delay: 0                // Start delay
  });

  // Attach Replay Button logic
  document.getElementById('replay-btn').addEventListener('click', () => {
    signature.replay();
  });
});