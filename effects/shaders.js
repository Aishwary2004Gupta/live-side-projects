export const normalShader = `
  precision highp float;
  uniform vec2 resolution;
  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    // Slight contrast boost for better model definition
    vec3 color = inputColor.rgb;
    color = clamp(color * 1.1 - 0.05, 0.0, 1.0);
    outputColor = vec4(color, inputColor.a);
  }
`;

export const dotsShader = `    
  precision highp float;
  uniform float pixelSize;
  uniform vec2 resolution;
  void mainImage(const in vec4 i, const in vec2 uv, out vec4 o) {
    vec2 s = pixelSize / resolution;
    vec2 u = s * floor(uv / s);
    vec4 c = texture2D(inputBuffer, u);
    float l = dot(vec3(0.2126, 0.7152, 0.0722), c.rgb);

    // Enhanced dot size for better model visibility
    float radius = l > 0.6 ? 0.35 : l > 0.3 ? 0.25 : l > 0.05 ? 0.18 : 0.1;
    vec2 center = vec2(0.5); // Centered dots for better symmetry
    vec2 f = fract(uv / s);
    float d = distance(f, center);

    // Slight glow for better contrast
    float glow = smoothstep(radius + 0.08, radius - 0.08, d) * (l * 0.3);
    float m = smoothstep(radius, radius - 0.05, d) + glow;

    // Preserve original color instead of grayscale
    o = vec4(c.rgb * m * 1.2, 1.0);
  }
`;

export const linesShader = `
  precision highp float;
  uniform float pixelSize;
  uniform vec2 resolution;

  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  vec3 sat(vec3 rgb, float adjustment) {
    const vec3 W = vec3(0.2125, 0.7154, 0.0721);
    vec3 intensity = vec3(dot(rgb, W));
    return mix(intensity, rgb, adjustment);
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec2 normalizedPixelSize = pixelSize / resolution;
    vec2 uvPixel = normalizedPixelSize * floor(uv / normalizedPixelSize);

    vec4 color = texture2D(inputBuffer, uvPixel);
    float luma = dot(vec3(0.2126, 0.7152, 0.0722), color.rgb);

    // Skip background completely (pure black)
    if (luma < 0.02) {
      outputColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }

    vec2 cellUV = fract(uv / normalizedPixelSize);
    float lineWidth = 0.0;

    if (luma > 0.0)  lineWidth = 1.0;
    if (luma > 0.3)  lineWidth = 0.7;
    if (luma > 0.5)  lineWidth = 0.5;
    if (luma > 0.7)  lineWidth = 0.3;
    if (luma > 0.9)  lineWidth = 0.1;
    if (luma > 0.99) lineWidth = 0.0;

    float yStart = 0.05;
    float yEnd = 0.95;

    if (cellUV.y > yStart && cellUV.y < yEnd && cellUV.x > 0.0 && cellUV.x < lineWidth) {
      // Black lines (your requested logic)
      color = vec4(0.0, 0.0, 0.0, 1.0);
    } else {
      // Light paper gray background (your requested logic)
      color = vec4(0.70, 0.74, 0.73, 1.0);
    }

    outputColor = color;
  }
`;

export const ditherShader = `
  precision highp float;
  uniform vec2 resolution;
  const float bayer[64] = float[](
     0.0, 32.0,  8.0, 40.0,  2.0, 34.0, 10.0, 42.0,
    48.0, 16.0, 56.0, 24.0, 50.0, 18.0, 58.0, 26.0,
    12.0, 44.0,  4.0, 36.0, 14.0, 46.0,  6.0, 38.0,
    60.0, 28.0, 52.0, 20.0, 62.0, 30.0, 54.0, 22.0,
     3.0, 35.0, 11.0, 43.0,  1.0, 33.0,  9.0, 41.0,
    51.0, 19.0, 59.0, 27.0, 49.0, 17.0, 57.0, 25.0,
    15.0, 47.0,  7.0, 39.0, 13.0, 45.0,  5.0, 37.0,
    63.0, 31.0, 55.0, 23.0, 61.0, 29.0, 53.0, 21.0
  );
  void mainImage(const in vec4 i, const in vec2 uv, out vec4 o) {
    vec4 c = texture2D(inputBuffer, uv);
    float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
    vec2 sc = uv * resolution;
    int x = int(mod(sc.x, 8.0));
    int y = int(mod(sc.y, 8.0));
    int idx = y * 8 + x;
    float t = bayer[idx] / 64.0;

    // Slight brightness boost for better model visibility
    float d = step(t, l * 1.2);

    // Preserve original color instead of grayscale
    o = vec4(c.rgb * d * 1.1, 1.0);
  }
`;

export const halftoneShader = `
        precision highp float;
        uniform float pixelSize;
        uniform vec2 resolution;
        void mainImage(const in vec4 i, const in vec2 uv, out vec4 o) {
          vec2 s = pixelSize / resolution;
          vec2 u = s * floor(uv / s) + 0.5*s;
          vec4 c = texture2D(inputBuffer, u);
          float l = dot(c.rgb, vec3(.2126,.7152,.0722));
          vec2 f = fract(uv / s);
          float r = (1.0 - l) * 0.5;
          float d = distance(f, vec2(.5));
          float m = smoothstep(r+0.02, r, d);
          o = vec4(vec3(m),1.0);
        }
      `;

export const wovenShader = `
  precision highp float;
  uniform float pixelSize;
  uniform vec2 resolution;

  float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  vec3 rgbToHsv(vec3 c) {
      vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
      vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
      vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
      float d = q.x - min(q.w, q.y);
      float e = 1.0e-10;
      return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
  }

  vec3 hsvToRgb(vec3 c) {
      vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  float noise(vec2 st) {
      vec2 i = floor(st);
      vec2 f = fract(st);
      float a = random(i);
      float b = random(i + vec2(1.0, 0.0));
      float c = random(i + vec2(0.0, 1.0));
      float d = random(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
      vec2 s = pixelSize / resolution;
      vec2 uvPixel = s * floor(uv / s);
      vec4 color = texture2D(inputBuffer, uvPixel); // Changed texture to texture2D for WebGL compatibility
      float luma = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));

      vec2 cellPosition = floor(uv / s);
      vec2 cellUV = fract(uv / s);

      // 1. BACKGROUND LOGIC (Dark areas of the model)
      // Uses your exact diagonal math to create a faint fabric texture in the shadows
      if (luma < 0.01) {
          vec2 centeredBg = cellUV - 0.5;
          float isAlternateBg = mod(cellPosition.x, 2.0);
          float angleBg = isAlternateBg == 0.0 ? radians(-65.0) : radians(65.0);
          
          vec2 rotatedBg = vec2(
              centeredBg.x * cos(angleBg) - centeredBg.y * sin(angleBg),
              centeredBg.x * sin(angleBg) + centeredBg.y * cos(angleBg)
          );
          
          float ellipseBg = length(vec2(rotatedBg.x, rotatedBg.y * 1.55 - 0.075));
          float patBg = smoothstep(0.2, 1.0, 1.0 - ellipseBg) * 0.08;
          
          outputColor = vec4(vec3(0.015, 0.015, 0.02) + vec3(patBg), 1.0);
          return;
      }

      // 2. FOREGROUND WEAVE (Lit areas of the model)
      float rowOffset = sin((random(vec2(0.0, uvPixel.y)) - 0.5) * 0.25);
      cellUV.x += rowOffset; 
      vec2 centered = cellUV - 0.5;

      float noiseAmount = 0.18;
      vec2 noisyCenter = centered + (vec2(
          random(cellPosition + centered),
          random(cellPosition + centered)
      ) - 0.5) * noiseAmount;

      float isAlternate = mod(cellPosition.x, 2.0);
      float angle = isAlternate == 0.0 ? radians(-65.0) : radians(65.0);
      
      vec2 rotated = vec2(
          noisyCenter.x * cos(angle) - noisyCenter.y * sin(angle),
          noisyCenter.x * sin(angle) + noisyCenter.y * cos(angle)
      );
      
      float aspectRatio = 1.55;
      float ellipse = length(vec2(rotated.x, rotated.y * aspectRatio - 0.075));
      
      // FIX: Calculate mask ONCE (your original code applied it twice, making it too dark)
      float threadMask = smoothstep(0.2, 1.0, 1.0 - ellipse);
      
      // 3. 3D CYLINDRICAL SHADING
      // Make the center of the thread bright and the edges dark to simulate volume
      float threadHighlight = smoothstep(0.0, 0.5, 1.0 - ellipse) * 0.4;
      float threadShadow = smoothstep(0.5, 1.0, ellipse) * 0.6;
      
      // Directional fiber noise
      float stripeNoise = noise(vec2(centered.x, centered.y * 100.0)); 
      float fiberTexture = (stripeNoise * 0.5) + 0.5;

      // Apply 3D shading and fibers to the base color
      vec3 shadedColor = color.rgb * fiberTexture;
      shadedColor += threadHighlight * color.rgb; // Add highlight
      shadedColor -= threadShadow * color.rgb;    // Add shadow
      shadedColor = max(shadedColor, 0.0);        // Prevent negative colors

      // 4. COLOR PROCESSING
      float hueShift = (random(cellPosition) - 0.5) * 0.08;
      vec3 hsv = rgbToHsv(shadedColor);
      hsv.x += hueShift;
      hsv.y *= 1.15; // Boost saturation for dyed fabric look
      hsv.z *= 1.2;  // Boost brightness to counteract the dark gaps
      shadedColor = hsvToRgb(hsv);

      // 5. FINAL COMPOSITION
      // Mix the shaded thread with a very dark gap color
      vec3 gapColor = vec3(0.01, 0.01, 0.015);
      vec3 finalColor = mix(gapColor, shadedColor, threadMask);

      // Slight overall contrast boost
      finalColor = clamp(finalColor * 1.1, 0.0, 1.0);

      outputColor = vec4(finalColor, 1.0);
  }
`;

export const legoShader = `
        precision highp float;
        uniform float pixelSize;
        uniform vec2 resolution;
        uniform vec2 lightPosition;

        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }

        vec3 rgbToHsv(vec3 c) {
          vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
          vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
          vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
          float d = q.x - min(q.w, q.y);
          float e = 1.0e-10;
          return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
        }

        vec3 hsvToRgb(vec3 c) {
          vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
          vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
          return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }

        const float colorNum = 16.0;
        const float MASK_BORDER = 1.5;

        void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
          vec2 s = pixelSize / resolution;
          vec2 uvPixel = s * floor(uv / s);
          vec4 color = texture2D(inputBuffer, uvPixel);

          color.r = floor(color.r * (colorNum - 1.0) + 0.5) / (colorNum - 1.0);
          color.g = floor(color.g * (colorNum - 1.0) + 0.5) / (colorNum - 1.0);
          color.b = floor(color.b * (colorNum - 1.0) + 0.5) / (colorNum - 1.0);
          color.rgb = clamp(color.rgb, 0.01, 0.95);

          vec2 cellPosition = floor(uv / s);
          vec2 cellUV = fract(uv / s);

          float lighting = dot(normalize(cellUV - vec2(0.5)), lightPosition) * 0.7;
          float dis = abs(distance(cellUV, vec2(0.5)) * 2.0 - 0.5);
          color.rgb *= smoothstep(0.1,0.0,dis) * lighting + 1.0;

          vec2 centeredCellUV = cellUV * 2.0 - 1.0;
          float mask = 1.0;
          vec2 border = 1.05 - pow(centeredCellUV, vec2(8.0)) * MASK_BORDER;
          mask *= border.x * border.y;
          float maskStrength = smoothstep(0.0, 0.8, mask);
          color.rgb *= 0.8 + (maskStrength * 0.1);

          float hueShift = random(cellPosition) * 0.02;
          vec3 hsv = rgbToHsv(color.rgb);
          hsv.x += hueShift;
          color.rgb = hsvToRgb(hsv);

          outputColor = color;
        }
      `;

export const complexShader = `
  precision highp float;
  uniform float pixelSize;
  uniform vec2 resolution;
  float circle(vec2 uv, float r) { return 1.0 - smoothstep(r - 0.05, r + 0.05, length(uv - 0.5)); }
  float square(vec2 uv, float size) { vec2 d = abs(uv - 0.5); return step(max(d.x, d.y), size); }
  float cross(vec2 uv, float thickness) { float h = step(abs(uv.x - 0.5), thickness); float v = step(abs(uv.y - 0.5), thickness); return max(h, v); }
  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec2 cellSize = pixelSize / resolution;
    vec2 uvPixel = cellSize * floor(uv / cellSize);
    vec4 src = texture2D(inputBuffer, uvPixel);
    float luma = dot(src.rgb, vec3(0.2126, 0.7152, 0.0722));
    vec2 cellUV = fract(uv / cellSize);

    // Enhanced pattern sizes for better model visibility
    float pattern = 0.0;
    if (luma < 0.15) pattern = 1.0;
    else if (luma < 0.35) pattern = cross(cellUV, 0.15);
    else if (luma < 0.55) pattern = square(cellUV, 0.35);
    else if (luma < 0.75) pattern = circle(cellUV, 0.32);
    else pattern = circle(cellUV, 0.15);

    float edgeBoost = smoothstep(0.0, 0.2, 1.0 - luma);

    // Use original model color instead of fixed blue
    vec3 modelColor = src.rgb;
    vec3 finalColor = mix(vec3(0.0), modelColor, pattern * (0.7 + edgeBoost * 0.5));

    outputColor = vec4(finalColor * 1.1, 1.0);
  }
`;

export const contourShader = `
  precision highp float;
  uniform vec2 resolution;
  vec4 sampleOffset(vec2 uv, vec2 off){ return texture2D(inputBuffer, uv + off / resolution); }
  void mainImage(const in vec4 i,const in vec2 uv,out vec4 o){
    float sx = -1.0*dot(sampleOffset(uv, vec2(-1.,-1.)).rgb, vec3(0.3)) + 1.0*dot(sampleOffset(uv, vec2(1.,-1.)).rgb, vec3(0.3))
             -2.0*dot(sampleOffset(uv, vec2(-1.,0.)).rgb, vec3(0.3)) + 2.0*dot(sampleOffset(uv, vec2(1.,0.)).rgb, vec3(0.3))
             -1.0*dot(sampleOffset(uv, vec2(-1.,1.)).rgb, vec3(0.3)) + 1.0*dot(sampleOffset(uv, vec2(1.,1.)).rgb, vec3(0.3));
    float sy = -1.0*dot(sampleOffset(uv, vec2(-1.,-1.)).rgb, vec3(0.3)) -2.0*dot(sampleOffset(uv, vec2(0.,-1.)).rgb, vec3(0.3)) -1.0*dot(sampleOffset(uv, vec2(1.,-1.)).rgb, vec3(0.3))
             +1.0*dot(sampleOffset(uv, vec2(-1.,1.)).rgb, vec3(0.3)) +2.0*dot(sampleOffset(uv, vec2(0.,1.)).rgb, vec3(0.3)) +1.0*dot(sampleOffset(uv, vec2(1.,1.)).rgb, vec3(0.3));
    float g = length(vec2(sx,sy));

    // Enhanced contour visibility
    float contour = smoothstep(0.1, 0.0, g);
    float glow = smoothstep(0.1, 0.2, g) * 0.4;

    // Use original model color for contours
    vec3 modelColor = sampleOffset(uv, vec2(0.,0.)).rgb;
    o = vec4(modelColor * (contour + glow) * 1.3, 1.0);
  }
`;

export const edgeShader = `
  precision highp float;
  uniform vec2 resolution;
  vec4 sampleOffset(vec2 uv, vec2 off){ return texture2D(inputBuffer, uv + off / resolution); }
  void mainImage(const in vec4 i,const in vec2 uv,out vec4 o){
    float c = -4.0*dot(sampleOffset(uv, vec2(0.,0.)).rgb, vec3(0.3));
    c += 1.0*dot(sampleOffset(uv, vec2(-1.,0.)).rgb, vec3(0.3));
    c += 1.0*dot(sampleOffset(uv, vec2(1.,0.)).rgb, vec3(0.3));
    c += 1.0*dot(sampleOffset(uv, vec2(0.,-1.)).rgb, vec3(0.3));
    c += 1.0*dot(sampleOffset(uv, vec2(0.,1.)).rgb, vec3(0.3));
    c = abs(c) * 1.2; // Slightly stronger edge detection

    // Use original model color for edges
    vec3 modelColor = sampleOffset(uv, vec2(0.,0.)).rgb;
    float edge = step(0.15, c);
    o = vec4(modelColor * edge * 1.3, 1.0);
  }
`;

export const blockifyShader = `
  precision highp float;
  uniform float pixelSize;
  uniform vec2 resolution;
  void mainImage(const in vec4 i,const in vec2 uv,out vec4 o){
    vec2 s = pixelSize / resolution;
    vec2 u = s * floor(uv / s);
    vec4 color = texture2D(inputBuffer, u);

    // Slight contrast boost for better model definition
    color.rgb = clamp(color.rgb * 1.1 - 0.05, 0.0, 1.0);
    o = color;
  }
`;

export const crosshatchShader = `
  precision highp float;
  uniform vec2 resolution;
  float hatchLine(vec2 p, vec2 dir, float spacing, float thickness) {
    float v = dot(p, dir);
    float m = abs(mod(v, spacing) - spacing * 0.5);
    return 1.0 - smoothstep(thickness * 0.5, thickness, m);
  }
  void mainImage(const in vec4 i,const in vec2 uv,out vec4 o){
    vec4 src = texture2D(inputBuffer, uv);
    float l = dot(src.rgb, vec3(.2126,.7152,.0722));
    float minRes = min(resolution.x, resolution.y);
    vec2 p = uv * minRes;
    float darkness = 1.0 - l;

    // Enhanced hatch density for better model detail
    float baseSpacing = mix(25.0, 5.0, smoothstep(0.0, 1.0, darkness));
    float baseThickness = mix(1.0, 4.0, smoothstep(0.0, 1.0, darkness));

    float a1 = hatchLine(p, normalize(vec2(1.0, 1.0)), baseSpacing, baseThickness);
    float a2 = hatchLine(p, normalize(vec2(1.0, -1.0)), baseSpacing * 0.7, baseThickness * 0.85);
    float a3 = hatchLine(p, normalize(vec2(1.0, 0.0)), baseSpacing * 0.5, baseThickness * 0.6);
    float hatch = clamp(a1 * 0.9 + a2 * 0.7 + a3 * 0.5, 0.0, 1.0);

    // Use original model color instead of grayscale
    o = vec4(src.rgb * (1.0 - hatch) * 1.1, 1.0);
  }
`;

export const waveLinesShader = `
  precision highp float;
  uniform float time;
  uniform vec2 resolution;
  float random(vec2 st){ return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123); }
  void mainImage(const in vec4 i,const in vec2 uv,out vec4 o){
    vec4 c = texture2D(inputBuffer, uv);
    float l = dot(c.rgb, vec3(.2126,.7152,.0722));
    float handMask = smoothstep(0.01, 0.08, l);

    vec2 u = uv;
    // Enhanced wave amplitude for better visibility
    u.y += sin(uv.x * 15.0 + time * 1.5) * 0.004 * l;
    float linesCount = max(resolution.y / 5.5, 50.0);
    float yPos = fract(u.y * linesCount);
    float dist = abs(yPos - 0.5);

    float thickness = l * 0.5; // Slightly thicker lines
    float line = smoothstep(thickness + 0.05, thickness, dist);

    // Use original model color instead of grayscale
    vec3 finalColor = c.rgb * line * 1.2;
    finalColor += random(uv*(time+0.1))*0.18;
    finalColor *= handMask;

    o = vec4(finalColor, 1.0);
  }
`;

export const noiseShader = `
  precision highp float;
  uniform float time;
  uniform vec2 resolution;
  float random(vec2 st){ return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123); }
  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    float l = dot(texture2D(inputBuffer, uv).rgb, vec3(0.299, 0.587, 0.114));
    float mask = smoothstep(0.02, 0.06, l);
    if(mask < 0.001){ outputColor = vec4(0.0,0.0,0.0,1.0); return; }

    vec2 coord = uv;
    float scan = floor(resolution.y / 4.0);
    float lineId = floor(coord.y * scan);
    float r = random(vec2(lineId, floor(time*4.0)));
    if(r > 0.92) coord.x += random(vec2(lineId, time))*0.015;
    if(r < 0.07){ outputColor = vec4(0.0,0.0,0.0,1.0); return; }
    vec2 gUV = floor(coord * resolution) / resolution;
    float s = random(vec2(gUV.x, gUV.y + floor(time * 30.0)));
    s = step(0.48, s);
    s -= random(gUV + time) * 0.12;
    s *= l * 1.6; // Slightly stronger noise effect

    // Use original model color instead of grayscale
    vec3 modelColor = texture2D(inputBuffer, uv).rgb;
    vec3 finalColor = modelColor * s * mask * 1.1;

    outputColor = vec4(finalColor, 1.0);
  }
`;

export const voronoiShader = `
  precision highp float;
  uniform float time;
  uniform vec2 resolution;
  vec2 hash(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }
  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec4 original = texture2D(inputBuffer, uv);
    float l = dot(original.rgb, vec3(0.299, 0.587, 0.114));
    if(l < 0.02){ outputColor = vec4(0.0,0.0,0.0,1.0); return; }

    float cellScale = 42.0;
    vec2 ratio = vec2(resolution.x / resolution.y, 1.0);
    vec2 drift = vec2(time * 0.15, time * 0.1);
    vec2 coord = uv * ratio * cellScale + drift;
    vec2 cell = floor(coord);
    vec2 local = fract(coord);

    float minD = 8.0;
    float secD = 8.0;
    vec2 centerUV = vec2(0.0);
    for(int y=-1;y<=1;y++){
      for(int x=-1;x<=1;x++){
        vec2 n = vec2(float(x), float(y));
        vec2 cellPos = cell + n;
        vec2 point = vec2(0.5) + 0.4 * sin(time*1.5 + 6.2831 * hash(cellPos));
        vec2 diff = n + point - local;
        float d = length(diff);
        if(d < minD){
          secD = minD;
          minD = d;
          centerUV = (cellPos + point - drift) / (ratio * cellScale);
        } else if(d < secD){
          secD = d;
        }
      }
    }

    vec4 cellColor = texture2D(inputBuffer, centerUV);
    float cellL = dot(cellColor.rgb, vec3(0.299, 0.587, 0.114));
    cellL = smoothstep(0.05, 0.6, cellL * 1.4); // Slightly stronger cell brightness

    float borderDist = secD - minD;
    float border = smoothstep(0.01, 0.08, borderDist);
    float outL = cellL * border;

    // Use original cell color instead of grayscale
    outputColor = vec4(cellColor.rgb * outL * 1.2, 1.0);
  }
`;

export const vhsShader = `
  precision highp float;
  uniform float time;
  uniform vec2 resolution;
  float rand(vec2 co){ return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453); }
  void mainImage(const in vec4 i, const in vec2 uv, out vec4 o) {
    float jitter = (rand(vec2(time, uv.y)) - 0.5) * step(0.98, rand(vec2(time * 0.5, 0.0))) * 0.02;
    float wave = sin(uv.y * 3.0 + time * 2.0) * 0.005;
    vec2 u = uv + vec2(jitter + wave, 0.0);
    float shift = 0.005;

    // Enhanced color separation for better VHS effect
    float r = texture2D(inputBuffer, u + vec2(shift, 0.0)).r * 1.1;
    float g = texture2D(inputBuffer, u).g * 1.05;
    float b = texture2D(inputBuffer, u - vec2(shift, 0.0)).b * 0.95;
    vec3 color = vec3(r,g,b);

    color -= sin(u.y * resolution.y * 0.8) * 0.1;
    color += (rand(u + time) - 0.5) * 0.15;
    // Slight contrast boost for better model visibility
    color = clamp(color * 1.1 - 0.05, 0.0, 1.0);
    o = vec4(color, 1.0);
  }
`;

export const heatMapShader = `
  precision highp float;
  uniform vec2 resolution;

  // Helper to smoothly mix colors based on intensity thresholds
  // This allows us to map specific brightness ranges to specific heat zones
  vec3 getHeatColor(float luma) {
      // 1. Define the "Palette" of the heat map
      vec3 colDark   = vec3(0.05, 0.00, 0.40); // Deep Midnight Blue
      vec3 colBlue   = vec3(0.10, 0.20, 1.00); // Cyan/Blue
      vec3 colPurple = vec3(0.80, 0.00, 1.00); // Magenta/Purple
      vec3 colGreen  = vec3(0.60, 1.00, 0.10); // Lime Green
      vec3 colYellow = vec3(1.00, 1.00, 0.20); // Yellow
      vec3 colRed    = vec3(1.00, 0.30, 0.00); // Burning Orange/Red
      vec3 colWhite  = vec3(1.00, 1.00, 1.00); // Super Hot White

      // 2. Initial Mix: Cold Range (0.0 - 0.2 Luma)
      vec3 finalColor = colDark;
      if (luma > 0.05) {
          float t = clamp((luma - 0.05) * 3.5, 0.0, 1.0);
          finalColor = mix(finalColor, colBlue, t);
      }

      // 3. Mid-Mix: Cool/Warm Transition (0.2 - 0.4 Luma)
      if (luma > 0.18) {
          float t = clamp((luma - 0.18) * 4.0, 0.0, 1.0);
          finalColor = mix(finalColor, colPurple, t);
      }

      // 4. Hot Mix: Warm Range (0.4 - 0.6 Luma)
      if (luma > 0.35) {
          float t = clamp((luma - 0.35) * 3.5, 0.0, 1.0);
          finalColor = mix(finalColor, colGreen, t * 0.6); // Subtle green tint
          finalColor = mix(finalColor, colYellow, t * 0.9);
      }

      // 5. Extreme Mix: Hot Range (0.6 - 1.0 Luma)
      if (luma > 0.55) {
          float t = clamp((luma - 0.55) * 3.0, 0.0, 1.0);
          finalColor = mix(finalColor, colRed, t);
          
          // The white-hot peak for specular highlights
          if (luma > 0.75) {
              float peak = smoothstep(0.75, 1.0, luma);
              finalColor = mix(finalColor, colWhite, peak);
          }
      }

      return finalColor;
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
      // 1. Sample Input
      vec3 baseColor = inputColor.rgb;
      
      // 2. Calculate Intensity (Luma)
      // We boost saturation slightly before reading luma to make colors pop more
      float r = baseColor.r;
      float g = baseColor.g * 1.2; 
      float b = baseColor.b;
      float luma = dot(vec3(r, g, b), vec3(0.2126, 0.7152, 0.0722));

      // 3. Apply Non-Linear Response Curve
      // This mimics a real thermal camera which has low sensitivity at low temps
      // and high sensitivity/spike at high temps.
      luma = pow(luma, 0.75); 

      // 4. Get Color from Palette
      vec3 finalColor = getHeatColor(luma);

      // 5. Add "Glow" Effect to very hot pixels
      // If pixel is super bright, push it beyond 1.0 slightly for bloom effect
      if (luma > 0.85) {
          float glowAmount = (luma - 0.85) * 2.0;
          finalColor += vec3(glowAmount);
      }

      outputColor = vec4(finalColor, 1.0);
  }
`;

export const minecraftShader = `
  precision highp float;
  uniform float pixelSize;
  uniform vec2 resolution;

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec2 s = pixelSize / resolution;
    vec2 uvPixel = s * floor(uv / s);
    vec4 original = texture2D(inputBuffer, uvPixel);
    
    float luma = dot(original.rgb, vec3(0.2126, 0.7152, 0.0722));
    
    // COMPLETELY REMOVE BACKGROUND
    if (luma < 0.03) {
      outputColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }

    // Apply Minecraft block effect only to the model
    vec4 color = original;
    
    // Posterize colors (Minecraft-style limited palette)
    float levels = 5.0;
    color.rgb = floor(color.rgb * levels + 0.5) / levels;

    // Boost saturation for that classic Minecraft look
    float modelLuma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    color.rgb = mix(vec3(modelLuma), color.rgb, 1.35);

    vec2 cellUV = fract(uv / s);

    // 3D Block Lighting (Top lit, sides and bottom in shadow)
    float topFace = smoothstep(0.75, 0.85, cellUV.y);
    float bottomFace = smoothstep(0.25, 0.15, cellUV.y);
    float leftShadow = smoothstep(0.0, 0.15, cellUV.x) * 0.35;
    float rightShadow = smoothstep(1.0, 0.85, cellUV.x) * 0.55;

    float mainFace = 1.0 - topFace - bottomFace - leftShadow - rightShadow;
    mainFace = clamp(mainFace, 0.0, 1.0);

    vec3 topColor = color.rgb * 1.35;
    vec3 mainColor = color.rgb * 1.0;
    vec3 sideColor = color.rgb * 0.65;

    vec3 finalColor = topColor * topFace + 
                      mainColor * mainFace + 
                      sideColor * (leftShadow + rightShadow + bottomFace);

    // Block Edges (Dark lines between blocks)
    float edge = 1.0 - smoothstep(0.0, 0.06, cellUV.x) * smoothstep(0.0, 0.06, cellUV.y) *
                       smoothstep(1.0, 0.94, cellUV.x) * smoothstep(1.0, 0.94, cellUV.y);
    finalColor *= (0.75 + edge * 0.25);

    // Slight texture variation
    float noise = fract(sin(dot(floor(uv * 8.0), vec2(12.9898, 78.233))) * 43758.5453);
    finalColor += (noise - 0.5) * 0.03;

    finalColor = clamp(finalColor, 0.0, 1.0);

    outputColor = vec4(finalColor, 1.0);
  }
`;

export const tetrisShader = `
  precision highp float;
  uniform float pixelSize;
  uniform vec2 resolution;

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    // 1. Blockify (Voxelization) - Make it pixelated
    vec2 s = pixelSize / resolution;
    vec2 uvPixel = s * floor(uv / s);
    vec4 color = texture2D(inputBuffer, uvPixel);

    // 2. Posterize Colors - Reduce color depth for that retro blocky palette
    float levels = 6.0;
    color.rgb = floor(color.rgb * levels + 0.5) / levels;

    // 3. Boost Saturation - Minecraft colors are vibrant
    float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    color.rgb = mix(vec3(luma), color.rgb, 1.25);

    // 4. Fake Block Lighting & Edges
    vec2 cellUV = fract(uv / s);

    // Simulate light coming from top-left (shadows on bottom and right edges)
    float shadow = 1.0;
    shadow *= smoothstep(0.15, 0.0, cellUV.y) * 0.25 + 0.75; // Bottom shadow
    shadow *= smoothstep(0.85, 1.0, cellUV.x) * 0.15 + 0.85; // Right shadow

    // Add a subtle grid line to separate blocks
    float gridX = smoothstep(0.0, 0.04, cellUV.x) * smoothstep(1.0, 0.96, cellUV.x);
    float gridY = smoothstep(0.0, 0.04, cellUV.y) * smoothstep(1.0, 0.96, cellUV.y);
    float grid = 1.0 - (gridX * gridY);

    color.rgb *= shadow;
    color.rgb *= (1.0 - grid * 0.4); // Darken edges to create block separation

    // 5. Final Contrast Boost
    color.rgb = clamp(color.rgb * 1.1, 0.0, 1.0);

    outputColor = vec4(color.rgb, 1.0);
  }
`;

export const sketchShader = `
  precision highp float;
  uniform float time;
  uniform vec2 resolution;

  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  // Multi-directional edge detection (Sobel)
  float getEdge(vec2 uv) {
    vec2 px = 1.0 / resolution;

    vec3 s00 = texture2D(inputBuffer, uv + vec2(-px.x, -px.y)).rgb;
    vec3 s01 = texture2D(inputBuffer, uv + vec2( 0.0,  -px.y)).rgb;
    vec3 s02 = texture2D(inputBuffer, uv + vec2( px.x, -px.y)).rgb;
    vec3 s10 = texture2D(inputBuffer, uv + vec2(-px.x,  0.0 )).rgb;
    vec3 s12 = texture2D(inputBuffer, uv + vec2( px.x,  0.0 )).rgb;
    vec3 s20 = texture2D(inputBuffer, uv + vec2(-px.x,  px.y)).rgb;
    vec3 s21 = texture2D(inputBuffer, uv + vec2( 0.0,   px.y)).rgb;
    vec3 s22 = texture2D(inputBuffer, uv + vec2( px.x,  px.y)).rgb;

    vec3 gx = -s00 - 2.0*s10 - s20 + s02 + 2.0*s12 + s22;
    vec3 gy = -s00 - 2.0*s01 - s02 + s20 + 2.0*s21 + s22;

    return length(vec2(length(gx), length(gy)));
  }

  // Pencil hatching lines in multiple directions
  float hatch(vec2 uv, float angle, float spacing, float thickness) {
    float c = cos(angle);
    float s = sin(angle);
    vec2 rotUV = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);
    float line = abs(fract(rotUV.x / spacing) - 0.5);
    return smoothstep(thickness, thickness - 0.005, line);
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec4 originalColor = texture2D(inputBuffer, uv);
    float luma = dot(originalColor.rgb, vec3(0.2126, 0.7152, 0.0722));

    // 1. BACKGROUND - Cream paper color
    vec3 paperColor = vec3(0.96, 0.94, 0.90);

    // 2. BACKGROUND CHECK - If model is not present return paper
    if (luma < 0.02) {
      // Subtle paper texture noise for the background
      float paperNoise = noise(uv * 800.0) * 0.04;
      outputColor = vec4(paperColor - paperNoise, 1.0);
      return;
    }

    // 3. PAPER TEXTURE - Subtle grain across whole image
    float paperGrain = noise(uv * 600.0) * 0.06;
    float paperGrain2 = noise(uv * 200.0 + 1.5) * 0.03;
    vec3 paper = paperColor - paperGrain - paperGrain2;

    // 4. EDGE DETECTION - Strong pencil outline strokes
    float edge = getEdge(uv);
    edge = pow(edge * 3.5, 1.2);
    edge = clamp(edge, 0.0, 1.0);

    // Add wobble to edges to simulate hand-drawn lines
    vec2 wobbleUV = uv + vec2(
      noise(uv * 120.0 + 0.5) - 0.5,
      noise(uv * 120.0 + 1.5) - 0.5
    ) * 0.003;
    float edgeWobble = getEdge(wobbleUV);
    edgeWobble = clamp(edgeWobble * 3.0, 0.0, 1.0);
    edge = max(edge, edgeWobble * 0.6);

    // Darken edges (pencil line color - dark grey/graphite)
    vec3 pencilColor = vec3(0.12, 0.10, 0.09);
    vec3 edgeLayer = mix(paper, pencilColor, edge);

    // 5. HATCHING - Pencil shading lines based on darkness
    float darkness = 1.0 - luma;
    vec3 hatchLayer = edgeLayer;

    if (darkness > 0.15) {
      float spacing1 = 0.006;
      float h1 = hatch(uv, radians(45.0), spacing1, 0.003);
      float h1strength = smoothstep(0.15, 0.5, darkness);
      hatchLayer = mix(hatchLayer, pencilColor, h1 * h1strength * 0.6);
    }

    if (darkness > 0.35) {
      float spacing2 = 0.005;
      float h2 = hatch(uv, radians(-45.0), spacing2, 0.0025);
      float h2strength = smoothstep(0.35, 0.7, darkness);
      hatchLayer = mix(hatchLayer, pencilColor, h2 * h2strength * 0.55);
    }

    if (darkness > 0.55) {
      float spacing3 = 0.004;
      float h3 = hatch(uv, radians(0.0), spacing3, 0.002);
      float h3strength = smoothstep(0.55, 0.85, darkness);
      hatchLayer = mix(hatchLayer, pencilColor, h3 * h3strength * 0.5);
    }

    if (darkness > 0.72) {
      float spacing4 = 0.0035;
      float h4 = hatch(uv, radians(90.0), spacing4, 0.0018);
      float h4strength = smoothstep(0.72, 1.0, darkness);
      hatchLayer = mix(hatchLayer, pencilColor, h4 * h4strength * 0.45);
    }

    // 6. COLOR BLEED - Subtle tint of original color bleeding through
    // This is the key to the "colored sketch" look from your reference image
    float colorBleed = 0.35;
    vec3 tintedColor = mix(hatchLayer, originalColor.rgb, colorBleed * luma);

    // 7. PAPER TEXTURE on top of everything
    vec3 finalColor = tintedColor - paperGrain * 0.4;

    // 8. Slight desaturation to match that "faded pencil" look
    float finalLuma = dot(finalColor, vec3(0.2126, 0.7152, 0.0722));
    finalColor = mix(vec3(finalLuma), finalColor, 0.75);

    // 9. Slight contrast boost
    finalColor = clamp(finalColor * 1.05 - 0.02, 0.0, 1.0);

    outputColor = vec4(finalColor, 1.0);
  }
`;

// export const liquidChromeShader = `
//   precision highp float;
//   uniform float time;
//   uniform vec2 resolution;

//   float random(vec2 st) {
//     return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
//   }

//   float noise(vec2 st) {
//     vec2 i = floor(st);
//     vec2 f = fract(st);

//     float a = random(i);
//     float b = random(i + vec2(1.0, 0.0));
//     float c = random(i + vec2(0.0, 1.0));
//     float d = random(i + vec2(1.0, 1.0));

//     vec2 u = f * f * (3.0 - 2.0 * f);

//     return mix(a, b, u.x) +
//            (c - a) * u.y * (1.0 - u.x) +
//            (d - b) * u.x * u.y;
//   }

//   float fbm(vec2 p) {
//     float v = 0.0;
//     float a = 0.5;

//     for (int i = 0; i < 5; i++) {
//       v += noise(p) * a;
//       p *= 2.0;
//       a *= 0.5;
//     }

//     return v;
//   }

//   float luma(vec3 c) {
//     return dot(c, vec3(0.2126, 0.7152, 0.0722));
//   }

//   float edgeDetect(vec2 uv) {
//     vec2 px = 1.0 / resolution;

//     float c  = luma(texture2D(inputBuffer, uv).rgb);
//     float l  = luma(texture2D(inputBuffer, uv - vec2(px.x, 0.0)).rgb);
//     float r  = luma(texture2D(inputBuffer, uv + vec2(px.x, 0.0)).rgb);
//     float u  = luma(texture2D(inputBuffer, uv + vec2(0.0, px.y)).rgb);
//     float d  = luma(texture2D(inputBuffer, uv - vec2(0.0, px.y)).rgb);

//     float e = abs(c - l) + abs(c - r) + abs(c - u) + abs(c - d);
//     return smoothstep(0.05, 0.25, e);
//   }

//   vec3 sampleChromatic(vec2 uv, float amount) {
//     float r = texture2D(inputBuffer, uv + vec2(amount, 0.0)).r;
//     float g = texture2D(inputBuffer, uv).g;
//     float b = texture2D(inputBuffer, uv - vec2(amount, 0.0)).b;
//     return vec3(r, g, b);
//   }

//   void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
//     vec3 original = texture2D(inputBuffer, uv).rgb;
//     float baseLuma = luma(original);

//     if (baseLuma < 0.015) {
//       outputColor = vec4(0.0, 0.0, 0.0, 1.0);
//       return;
//     }

//     float mask = smoothstep(0.015, 0.12, baseLuma);

//     vec2 p = uv;
//     vec2 aspect = vec2(resolution.x / resolution.y, 1.0);

//     float n1 = fbm(vec2(p.x * 3.5, p.y * 8.0 + time * 0.15));
//     float n2 = fbm(vec2(p.x * 14.0 + time * 0.2, p.y * 3.0));

//     float horizontalWave =
//       sin(p.y * 70.0 + n1 * 8.0 + time * 1.3) * 0.018;

//     float tightWave =
//       sin(p.y * 180.0 + n2 * 12.0 - time * 1.8) * 0.006;

//     float columnNoise = random(vec2(floor(p.x * 80.0), 3.0));
//     float columnMask = smoothstep(0.72, 1.0, columnNoise);

//     float verticalPull =
//       sin(p.x * 90.0 + time * 0.6) * 0.012 * columnMask;

//     float xDistort = (horizontalWave + tightWave + verticalPull) * mask;

//     float yDistort =
//       sin(p.x * 45.0 + n1 * 5.0 + time) * 0.008 * mask;

//     vec2 warpedUV = uv + vec2(xDistort, yDistort);

//     warpedUV.x += sin(warpedUV.y * 35.0 + time * 0.8) * 0.01 * mask;
//     warpedUV.x += (fbm(warpedUV * vec2(8.0, 20.0)) - 0.5) * 0.018 * mask;

//     warpedUV = clamp(warpedUV, vec2(0.001), vec2(0.999));

//     float chroma = 0.004 + abs(xDistort) * 0.45;

//     vec3 refracted = sampleChromatic(warpedUV, chroma);

//     vec3 smear = vec3(0.0);
//     float total = 0.0;

//     for (int i = -5; i <= 5; i++) {
//       float fi = float(i);
//       float w = 1.0 - abs(fi) / 6.0;
//       vec2 off = vec2(
//         sin(fi * 1.7 + time) * 0.002,
//         fi * 0.006 * (0.4 + columnMask)
//       );

//       vec2 suv = clamp(warpedUV + off * mask, vec2(0.001), vec2(0.999));
//       smear += texture2D(inputBuffer, suv).rgb * w;
//       total += w;
//     }

//     smear /= total;

//     vec3 color = mix(refracted, smear, 0.45);

//     float colorLuma = luma(color);

//     vec3 deepBlue = vec3(0.01, 0.04, 0.09);
//     vec3 cyanGlow = vec3(0.0, 0.85, 1.0);
//     vec3 orangeHot = vec3(1.0, 0.25, 0.02);
//     vec3 whiteHot = vec3(1.0);

//     float bright = smoothstep(0.35, 0.95, colorLuma);
//     float hot = smoothstep(0.55, 1.0, colorLuma);
//     float white = smoothstep(0.82, 1.0, colorLuma);

//     color = mix(deepBlue * (0.5 + colorLuma * 2.0), color, 0.72);
//     color = mix(color, cyanGlow, bright * 0.22);
//     color = mix(color, orangeHot, hot * 0.35);
//     color = mix(color, whiteHot, white * 0.65);

//     float edge = edgeDetect(warpedUV);
//     color += edge * vec3(0.75, 0.95, 1.0) * 0.45;

//     float rippleLines =
//       abs(sin((uv.y + xDistort * 2.0) * resolution.y * 0.09));
//     rippleLines = smoothstep(0.88, 1.0, rippleLines);

//     color += rippleLines * vec3(0.0, 0.6, 0.9) * 0.08 * mask;

//     color = pow(color, vec3(0.82));
//     color = clamp(color * 1.18 - 0.04, 0.0, 1.0);

//     outputColor = vec4(color, 1.0);
//   }
// `;

export const clayShader = `
  precision highp float;
  uniform vec2 resolution;

  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(a, b, u.x) +
           (c - a) * u.y * (1.0 - u.x) +
           (d - b) * u.x * u.y;
  }

  float getLuma(vec3 c) {
    return dot(c, vec3(0.2126, 0.7152, 0.0722));
  }

  float getEdge(vec2 uv) {
    vec2 px = 1.0 / resolution;

    float c  = getLuma(texture2D(inputBuffer, uv).rgb);
    float l  = getLuma(texture2D(inputBuffer, uv - vec2(px.x, 0.0)).rgb);
    float r  = getLuma(texture2D(inputBuffer, uv + vec2(px.x, 0.0)).rgb);
    float u  = getLuma(texture2D(inputBuffer, uv + vec2(0.0, px.y)).rgb);
    float d  = getLuma(texture2D(inputBuffer, uv - vec2(0.0, px.y)).rgb);

    float edge = abs(c - l) + abs(c - r) + abs(c - u) + abs(c - d);
    return smoothstep(0.05, 0.22, edge);
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec3 src = inputColor.rgb;
    float luma = getLuma(src);

    if (luma < 0.015) {
      outputColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }

    float edge = getEdge(uv);

    vec3 gray = vec3(luma);

    vec3 pastelColor = mix(gray, src, 0.58);
    pastelColor = pow(pastelColor, vec3(0.82));
    pastelColor = clamp(pastelColor * 1.05, 0.0, 1.0);

    vec3 warmClayTint = vec3(0.96, 0.82, 0.68);
    vec3 clayColor = mix(warmClayTint * luma, pastelColor, 0.78);

    float softShade = smoothstep(0.02, 0.95, luma);
    softShade = pow(softShade, 0.72);

    clayColor *= 0.62 + softShade * 0.58;

    vec2 grainUV = uv * resolution / 7.5;

    float fineNoise = noise(grainUV * 0.8);
    float mediumNoise = noise(grainUV * 0.22 + 4.0);

    vec2 warp = vec2(
      noise(uv * 45.0 + 2.0),
      noise(uv * 45.0 + 9.0)
    ) - 0.5;

    vec2 ridgeUV = uv + warp * 0.012;

    float ridgeA = sin((ridgeUV.x * resolution.x * 0.42) + noise(ridgeUV * 80.0) * 8.0);
    float ridgeB = sin((ridgeUV.y * resolution.y * 0.34) + noise(ridgeUV * 65.0 + 3.0) * 6.0);
    float ridgeC = sin(((ridgeUV.x + ridgeUV.y) * resolution.x * 0.18) + noise(ridgeUV * 50.0 + 7.0) * 7.0);

    float ridges = (ridgeA * 0.45 + ridgeB * 0.35 + ridgeC * 0.20);
    ridges = ridges * 0.5 + 0.5;

    float fingerprint = smoothstep(0.45, 0.85, ridges);
    fingerprint = (fingerprint - 0.5) * 0.055;

    float grain = (fineNoise - 0.5) * 0.045 + (mediumNoise - 0.5) * 0.035;

    clayColor += grain;
    clayColor += fingerprint * (0.35 + luma * 0.65);

    vec3 creaseColor = vec3(0.36, 0.27, 0.30);
    clayColor = mix(clayColor, clayColor * creaseColor, edge * 0.35);

    float highlight = smoothstep(0.72, 1.0, luma);
    clayColor += vec3(0.08, 0.065, 0.05) * highlight;

    clayColor = mix(vec3(getLuma(clayColor)), clayColor, 0.88);

    clayColor = clamp(clayColor, 0.0, 1.0);

    outputColor = vec4(clayColor, 1.0);
  }
`;

export const liquidChromeShader = `
  precision highp float;
  uniform float time;
  uniform vec2 resolution;

  float lumaOf(vec3 c) {
    return dot(c, vec3(0.2126, 0.7152, 0.0722));
  }

  vec2 safeUV(vec2 uv) {
    return clamp(uv, vec2(0.001), vec2(0.999));
  }

  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(a, b, u.x) +
           (c - a) * u.y * (1.0 - u.x) +
           (d - b) * u.x * u.y;
  }

  // --- Background detection ----------------------------------------------
  // Sample the four corners and average them. Corners are almost always
  // background, so this gives us the background color for ANY theme
  // (black, white, or anything else).
  vec3 detectBackground() {
    vec3 c0 = texture2D(inputBuffer, vec2(0.01, 0.01)).rgb;
    vec3 c1 = texture2D(inputBuffer, vec2(0.99, 0.01)).rgb;
    vec3 c2 = texture2D(inputBuffer, vec2(0.01, 0.99)).rgb;
    vec3 c3 = texture2D(inputBuffer, vec2(0.99, 0.99)).rgb;
    return (c0 + c1 + c2 + c3) * 0.25;
  }

  // How different a color is from the background (0 = same as bg, 1 = very different)
  float bgDifference(vec3 col, vec3 bg) {
    return clamp(length(col - bg) * 1.6, 0.0, 1.0);
  }

  vec2 gradientAt(vec2 uv) {
    vec2 px = 1.0 / resolution;

    float left  = lumaOf(texture2D(inputBuffer, safeUV(uv - vec2(px.x, 0.0))).rgb);
    float right = lumaOf(texture2D(inputBuffer, safeUV(uv + vec2(px.x, 0.0))).rgb);
    float down  = lumaOf(texture2D(inputBuffer, safeUV(uv - vec2(0.0, px.y))).rgb);
    float up    = lumaOf(texture2D(inputBuffer, safeUV(uv + vec2(0.0, px.y))).rgb);

    return vec2(right - left, up - down);
  }

  float edgeAt(vec2 uv) {
    vec2 px = 1.0 / resolution;

    float c  = lumaOf(texture2D(inputBuffer, uv).rgb);
    float l  = lumaOf(texture2D(inputBuffer, safeUV(uv - vec2(px.x, 0.0))).rgb);
    float r  = lumaOf(texture2D(inputBuffer, safeUV(uv + vec2(px.x, 0.0))).rgb);
    float u  = lumaOf(texture2D(inputBuffer, safeUV(uv + vec2(0.0, px.y))).rgb);
    float d  = lumaOf(texture2D(inputBuffer, safeUV(uv - vec2(0.0, px.y))).rgb);

    float e = abs(c - l) + abs(c - r) + abs(c - u) + abs(c - d);
    return smoothstep(0.035, 0.22, e);
  }

  // Object mask at an arbitrary uv, theme-independent (based on bg difference).
  float maskAt(vec2 uv, vec3 bg) {
    vec3 col = texture2D(inputBuffer, safeUV(uv)).rgb;
    float diff = bgDifference(col, bg);
    float e = edgeAt(safeUV(uv));
    return smoothstep(0.06, 0.18, diff + e * 0.35);
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec3 bg = detectBackground();

    vec3 original = texture2D(inputBuffer, uv).rgb;

    float edge = edgeAt(uv);

    // Theme-independent object mask: how different is this pixel from the bg?
    float diff = bgDifference(original, bg);
    float objectMask = smoothstep(0.06, 0.18, diff + edge * 0.35);

    // Background stays untouched (renders the original background color).
    if (objectMask < 0.01) {
      outputColor = vec4(bg, 1.0);
      return;
    }

    // keep originalLuma for the displacement amount (still useful for relief)
    float originalLuma = lumaOf(original);

    vec2 grad = gradientAt(uv);
    vec3 fakeNormal = normalize(vec3(-grad * 9.0, 1.0));

    vec2 centeredUV = uv - 0.5;
    centeredUV.x *= resolution.x / resolution.y;
    float radial = length(centeredUV);

    float broadWave = sin(
      uv.x * 44.0 +
      sin(uv.y * 14.0 + time * 0.18) * 5.0 +
      fakeNormal.y * 6.0
    );

    float tightWave = sin(
      uv.x * 125.0 +
      uv.y * 10.0 +
      fakeNormal.x * 10.0 +
      noise(uv * 18.0) * 5.0
    );

    float fineWave = sin(
      uv.x * 310.0 +
      uv.y * 26.0 +
      noise(uv * 48.0) * 8.0
    );

    float horizontalMelt = sin(
      uv.y * 36.0 +
      broadWave * 4.0 +
      radial * 10.0
    );

    float displacementAmount =
      0.004 +
      objectMask * 0.020 +
      edge * 0.045;

    vec2 displacement = vec2(
      broadWave * displacementAmount * 0.75 +
      tightWave * displacementAmount * 0.35 +
      fakeNormal.x * 0.020,
      horizontalMelt * displacementAmount * 0.45 +
      fineWave * 0.002 +
      fakeNormal.y * 0.010
    );

    vec2 refractUV = safeUV(uv + displacement);

    vec3 refracted = texture2D(inputBuffer, refractUV).rgb;
    float refractedLuma = lumaOf(refracted);

    vec2 grad2 = gradientAt(refractUV);
    vec3 n = normalize(vec3(-grad2 * 11.0, 1.0));

    float edge2 = edgeAt(refractUV);

    vec2 chromeUV = refractUV;

    float verticalBand1 = sin(
      (chromeUV.x + n.x * 0.22 + broadWave * 0.018) * 72.0
    );

    float verticalBand2 = sin(
      (chromeUV.x + n.y * 0.16 + tightWave * 0.015) * 155.0
    );

    float verticalBand3 = sin(
      (chromeUV.x + fineWave * 0.006) * 260.0
    );

    float flowingBand = sin(
      (chromeUV.y + n.x * 0.18 + horizontalMelt * 0.025) * 22.0
    );

    float softReflection =
      0.5 +
      0.25 * verticalBand1 +
      0.15 * flowingBand +
      0.10 * sin(radial * 28.0 + n.x * 4.0);

    float brightStreaks =
      pow(abs(verticalBand1), 10.0) * 0.85 +
      pow(abs(verticalBand2), 16.0) * 0.55 +
      pow(abs(verticalBand3), 24.0) * 0.25;

    float darkStreaks =
      pow(1.0 - abs(verticalBand1), 5.0) * 0.55 +
      pow(1.0 - abs(verticalBand2), 8.0) * 0.35;

    vec3 smearA = texture2D(
      inputBuffer,
      safeUV(refractUV + vec2(broadWave * 0.030, horizontalMelt * 0.012))
    ).rgb;

    vec3 smearB = texture2D(
      inputBuffer,
      safeUV(refractUV + vec2(-tightWave * 0.020, -horizontalMelt * 0.014))
    ).rgb;

    float smearLuma = lumaOf((smearA + smearB) * 0.5);

    float formLight = pow(max(refractedLuma, smearLuma), 0.55);

    float chromeValue =
      softReflection * 0.55 +
      formLight * 0.42 +
      brightStreaks * 0.85 -
      darkStreaks * 0.55;

    vec3 lightDir = normalize(vec3(-0.45, 0.65, 1.0));
    float specular = pow(max(dot(n, lightDir), 0.0), 26.0);

    float rim = smoothstep(0.08, 0.32, edge2 + edge * 0.6);

    chromeValue += specular * 1.15;
    chromeValue += rim * 0.55;

    float moltenHighlight = smoothstep(0.62, 1.0, chromeValue);
    float deepShadow = smoothstep(0.0, 0.22, chromeValue);

    chromeValue = mix(chromeValue * 0.25, chromeValue, deepShadow);

    chromeValue = clamp(chromeValue, 0.0, 1.0);

    chromeValue = smoothstep(0.08, 0.95, chromeValue);

    float microNoise =
      noise(uv * resolution * 0.12) * 0.045 +
      noise(uv * resolution * 0.035 + 5.0) * 0.035;

    chromeValue += (microNoise - 0.04) * objectMask;

    chromeValue = clamp(chromeValue, 0.0, 1.0);

    vec3 silverDark = vec3(0.015, 0.016, 0.018);
    vec3 silverMid = vec3(0.55, 0.58, 0.60);
    vec3 silverBright = vec3(0.95, 0.97, 1.0);

    vec3 chromeColor = mix(silverDark, silverMid, chromeValue);
    chromeColor = mix(chromeColor, silverBright, smoothstep(0.55, 1.0, chromeValue));

    chromeColor = mix(chromeColor, vec3(1.0), moltenHighlight * 0.35);

    chromeColor *= vec3(0.96, 0.98, 1.02);

    chromeColor = clamp(chromeColor * 1.18 - 0.035, 0.0, 1.0);

    // Confine STRICTLY to the model silhouette (theme-independent).
    // Both the current pixel and the refracted sample must be "non-background".
    float refractedObjectMask = maskAt(refractUV, bg);
    float finalMask = objectMask * refractedObjectMask;

    // Blend chrome over the actual background color (works for any theme).
    vec3 finalColor = mix(bg, chromeColor, finalMask);

    outputColor = vec4(finalColor, 1.0);
  }
`;

// export const liquidChromeShader = `
//   precision highp float;
//   uniform float time;
//   uniform vec2 resolution;

//   float lumaOf(vec3 c) {
//     return dot(c, vec3(0.2126, 0.7152, 0.0722));
//   }

//   vec2 safeUV(vec2 uv) {
//     return clamp(uv, vec2(0.001), vec2(0.999));
//   }

//   float random(vec2 st) {
//     return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
//   }

//   float noise(vec2 st) {
//     vec2 i = floor(st);
//     vec2 f = fract(st);
//     float a = random(i);
//     float b = random(i + vec2(1.0, 0.0));
//     float c = random(i + vec2(0.0, 1.0));
//     float d = random(i + vec2(1.0, 1.0));
//     vec2 u = f * f * (3.0 - 2.0 * f);
//     return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
//   }

//   vec2 gradientAt(vec2 uv) {
//     vec2 px = 1.0 / resolution;
//     float left  = lumaOf(texture2D(inputBuffer, safeUV(uv - vec2(px.x, 0.0))).rgb);
//     float right = lumaOf(texture2D(inputBuffer, safeUV(uv + vec2(px.x, 0.0))).rgb);
//     float down  = lumaOf(texture2D(inputBuffer, safeUV(uv - vec2(0.0, px.y))).rgb);
//     float up    = lumaOf(texture2D(inputBuffer, safeUV(uv + vec2(0.0, px.y))).rgb);
//     return vec2(right - left, up - down);
//   }

//   float edgeAt(vec2 uv) {
//     vec2 px = 1.0 / resolution;
//     float c  = lumaOf(texture2D(inputBuffer, uv).rgb);
//     float l  = lumaOf(texture2D(inputBuffer, safeUV(uv - vec2(px.x, 0.0))).rgb);
//     float r  = lumaOf(texture2D(inputBuffer, safeUV(uv + vec2(px.x, 0.0))).rgb);
//     float u  = lumaOf(texture2D(inputBuffer, safeUV(uv + vec2(0.0, px.y))).rgb);
//     float d  = lumaOf(texture2D(inputBuffer, safeUV(uv - vec2(0.0, px.y))).rgb);
//     float e = abs(c - l) + abs(c - r) + abs(c - u) + abs(c - d);
//     return smoothstep(0.03, 0.18, e);
//   }

//   void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
//     vec3 original = texture2D(inputBuffer, uv).rgb;
//     float originalLuma = lumaOf(original);
//     float edge = edgeAt(uv);

//     // Tighter mask combining luma, edge detection, and local contrast
//     float contrast = length(gradientAt(uv));
//     float objectMask = smoothstep(0.015, 0.05, originalLuma + edge * 0.55) * smoothstep(0.008, 0.12, contrast);

//     if (objectMask < 0.06) {
//       outputColor = vec4(0.0, 0.0, 0.0, 0.0);
//       return;
//     }

//     vec2 grad = gradientAt(uv);
//     vec3 fakeNormal = normalize(vec3(-grad * 8.5, 1.0));

//     vec2 centeredUV = uv - 0.5;
//     centeredUV.x *= resolution.x / resolution.y;
//     float radial = length(centeredUV);

//     float broadWave = sin(uv.x * 44.0 + sin(uv.y * 14.0 + time * 0.18) * 5.0 + fakeNormal.y * 6.0);
//     float tightWave = sin(uv.x * 125.0 + uv.y * 10.0 + fakeNormal.x * 10.0 + noise(uv * 18.0) * 5.0);
//     float fineWave = sin(uv.x * 310.0 + uv.y * 26.0 + noise(uv * 48.0) * 8.0);
//     float horizontalMelt = sin(uv.y * 36.0 + broadWave * 4.0 + radial * 10.0);

//     float displacementAmount = 0.003 + originalLuma * 0.018 + edge * 0.04;
//     vec2 displacement = vec2(
//       broadWave * displacementAmount * 0.75 + tightWave * displacementAmount * 0.35 + fakeNormal.x * 0.018,
//       horizontalMelt * displacementAmount * 0.45 + fineWave * 0.002 + fakeNormal.y * 0.009
//     );

//     vec2 refractUV = safeUV(uv + displacement);
//     vec3 refracted = texture2D(inputBuffer, refractUV).rgb;
//     float refractedLuma = lumaOf(refracted);

//     vec2 grad2 = gradientAt(refractUV);
//     vec3 n = normalize(vec3(-grad2 * 10.0, 1.0));
//     float edge2 = edgeAt(refractUV);

//     float displacedMask = smoothstep(0.02, 0.1, refractedLuma + edge2 * 0.4);
//     float finalMask = max(objectMask, displacedMask);

//     if (finalMask < 0.05) {
//       outputColor = vec4(0.0, 0.0, 0.0, 0.0);
//       return;
//     }

//     vec2 chromeUV = refractUV;

//     float verticalBand1 = sin((chromeUV.x + n.x * 0.25 + broadWave * 0.02) * 80.0);
//     float verticalBand2 = sin((chromeUV.x + n.y * 0.18 + tightWave * 0.018) * 160.0);
//     float verticalBand3 = sin((chromeUV.x + fineWave * 0.008) * 280.0);
//     float flowingBand = sin((chromeUV.y + n.x * 0.2 + horizontalMelt * 0.03) * 24.0);

//     float softReflection = 0.5 + 0.28 * verticalBand1 + 0.18 * flowingBand + 0.12 * sin(radial * 30.0 + n.x * 4.5);
//     float brightStreaks = pow(abs(verticalBand1), 12.0) * 0.9 + pow(abs(verticalBand2), 18.0) * 0.6 + pow(abs(verticalBand3), 26.0) * 0.3;
//     float darkStreaks = pow(1.0 - abs(verticalBand1), 6.0) * 0.5 + pow(1.0 - abs(verticalBand2), 9.0) * 0.4;

//     vec3 smearA = texture2D(inputBuffer, safeUV(refractUV + vec2(broadWave * 0.028, horizontalMelt * 0.01))).rgb;
//     vec3 smearB = texture2D(inputBuffer, safeUV(refractUV + vec2(-tightWave * 0.018, -horizontalMelt * 0.012))).rgb;
//     float smearLuma = lumaOf((smearA + smearB) * 0.5);

//     float formLight = pow(max(refractedLuma, smearLuma), 0.5);
//     float chromeValue = softReflection * 0.55 + formLight * 0.45 + brightStreaks * 0.9 - darkStreaks * 0.5;

//     // Enhanced metallic lighting
//     float fresnel = pow(1.0 - max(dot(n, vec3(0.0, 0.0, 1.0)), 0.0), 3.5);
    
//     vec3 lightDir = normalize(vec3(-0.4, 0.7, 1.0));
//     vec3 halfDir = normalize(lightDir + vec3(0.0, 0.0, 1.0));
//     float specular = pow(max(dot(n, halfDir), 0.0), 64.0) * 1.5;
//     float rim = smoothstep(0.05, 0.35, edge2 + edge * 0.7) * fresnel;

//     chromeValue += specular * 1.2;
//     chromeValue += rim * 0.65;

//     // Sharpen value curve for metallic contrast
//     float moltenHighlight = smoothstep(0.65, 1.0, chromeValue);
//     float deepShadow = smoothstep(0.0, 0.18, chromeValue);
//     chromeValue = mix(chromeValue * 0.2, chromeValue, deepShadow);
//     chromeValue = clamp(chromeValue, 0.0, 1.0);
//     chromeValue = pow(chromeValue, 0.85);
//     chromeValue = smoothstep(0.06, 0.92, chromeValue);

//     float microNoise = noise(uv * resolution * 0.1) * 0.04 + noise(uv * resolution * 0.03 + 5.0) * 0.03;
//     chromeValue += (microNoise - 0.035) * finalMask;
//     chromeValue = clamp(chromeValue, 0.0, 1.0);

//     // Metallic color palette (steel/titanium) with normal-based tint
//     vec3 steelDark = vec3(0.02, 0.025, 0.035);
//     vec3 steelMid = vec3(0.45, 0.48, 0.52);
//     vec3 steelBright = vec3(0.92, 0.94, 0.98);
//     vec3 metallicTint = mix(vec3(0.9, 0.95, 1.0), vec3(1.0, 0.85, 0.75), n.x * 0.5 + 0.5);

//     vec3 chromeColor = mix(steelDark, steelMid, chromeValue);
//     chromeColor = mix(chromeColor, steelBright * metallicTint, smoothstep(0.58, 1.0, chromeValue));
//     chromeColor = mix(chromeColor, vec3(1.0), moltenHighlight * 0.25);
//     chromeColor += fresnel * vec3(0.25, 0.35, 0.45) * 0.4;

//     // Final contrast punch for metallic snap
//     chromeColor = (chromeColor - 0.5) * 1.15 + 0.5;
//     chromeColor = clamp(chromeColor, 0.0, 1.0);

//     vec3 finalColor = mix(vec3(0.0), chromeColor, finalMask);
//     outputColor = vec4(finalColor, 1.0);
//   }
// `;

export const chromeRippleShader = `
  precision highp float;
  uniform float time;
  uniform vec2 resolution;

  float getLuma(vec3 c) {
    return dot(c, vec3(0.2126, 0.7152, 0.0722));
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    // Sample original pixel WITHOUT any displacement.
    // This is used purely to detect if this pixel is background.
    vec4 original = texture2D(inputBuffer, uv);
    float origLuma = getLuma(original.rgb);

    // Background detection (works for BOTH modes):
    //  - Dark mode  -> background is near-black (luma very low)
    //  - Light mode -> background is near-white (luma very high)
    // If pixel is background, return it directly. No ripple, no chrome.
    if (origLuma < 0.03 || origLuma > 0.97) {
      outputColor = original;
      return;
    }

    // ---- MODEL PIXEL: apply chrome ripple effect ----

    // 1. HORIZONTAL FREQUENCY RIPPLE DISPLACEMENT
    float freq = 90.0 + origLuma * 120.0;
    float ripple = sin(uv.x * freq + time * 1.5) * 0.012 * (0.3 + origLuma);

    vec2 rippleUV = uv;
    rippleUV.x += ripple;
    rippleUV.y += sin(uv.x * freq * 0.5) * 0.004;

    // Clamp displaced UV so we never sample background by accident
    rippleUV = clamp(rippleUV, vec2(0.001), vec2(0.999));

    // 2. CHROMATIC ABERRATION - iridescent edges
    float shift = 0.006 + origLuma * 0.012;
    float r = texture2D(inputBuffer, clamp(rippleUV + vec2(shift, 0.0), vec2(0.001), vec2(0.999))).r;
    float g = texture2D(inputBuffer, rippleUV).g;
    float b = texture2D(inputBuffer, clamp(rippleUV - vec2(shift, 0.0), vec2(0.001), vec2(0.999))).b;
    vec3 col = vec3(r, g, b);

    float luma = getLuma(col);

    // 3. SAFETY: if the displaced sample landed on background, fall back to original
    if (luma < 0.03 || luma > 0.97) {
      outputColor = original;
      return;
    }

    // 4. CHROME / GLASS SHADING
    float streak = abs(sin(uv.x * freq + time * 1.5));
    streak = pow(streak, 8.0);
    float specular = streak * smoothstep(0.2, 0.9, luma);

    // 5. IRIDESCENT COLOR GRADING
    vec3 coolTint = vec3(0.15, 0.45, 0.85);
    vec3 warmTint = vec3(1.0, 0.45, 0.1);

    float phase = sin(uv.x * freq * 0.5 + time) * 0.5 + 0.5;
    vec3 iridescence = mix(coolTint, warmTint, phase);

    vec3 chrome = mix(col, col * iridescence * 1.8, 0.55);

    // 6. METALLIC CONTRAST
    chrome = pow(chrome, vec3(1.3));
    chrome += vec3(specular) * 1.2;

    // 7. EDGE GLOW
    float edgeGlow = pow(streak, 3.0) * luma;
    chrome += iridescence * edgeGlow * 0.6;

    // 8. FINAL POLISH
    chrome = clamp(chrome * 1.15, 0.0, 1.0);

    outputColor = vec4(chrome, 1.0);
  }
`;
