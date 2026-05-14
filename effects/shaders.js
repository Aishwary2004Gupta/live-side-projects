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
    float rowIndex = floor(uv.x / normalizedPixelSize.x);
    vec2 uvPixel = normalizedPixelSize * floor(uv / normalizedPixelSize);

    vec4 color = texture2D(inputBuffer, uvPixel);
    float luma = dot(vec3(0.2126, 0.7152, 0.0722), color.rgb);

    if (luma < 0.05) {
      outputColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }

    vec2 cellUV = fract(uv / normalizedPixelSize);

    // Enhanced line width for better model definition
    float lineWidth = luma > 0.8 ? 0.15 : luma > 0.5 ? 0.3 : luma > 0.2 ? 0.5 : 0.7;

    float yStart = 0.05;
    float yEnd = 0.95;

    if (cellUV.y > yStart && cellUV.y < yEnd && cellUV.x > 0.0 && cellUV.x < lineWidth) {
      // Preserve original color instead of black lines
      outputColor = vec4(color.rgb * 1.2, 1.0);
    } else {
      outputColor = vec4(0.0, 0.0, 0.0, 1.0);
    }
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

        float random(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123); }

        vec3 rgbToHsv(vec3 c) {
          vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
          vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
          vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
          float d = q.x - min(q.w, q.y);
          float e = 1.0e-10;
          return vec3(abs(q.z + (q.w - q.y) / (6.0*d + e)), d/(q.x+e), q.x);
        }

        vec3 hsvToRgb(vec3 c) {
          vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
          vec3 p = abs(fract(c.xxx + K.xyz)*6.0 - K.www);
          return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }

        float noise(vec2 st){
          vec2 i=floor(st), f=fract(st);
          float a=random(i), b=random(i+vec2(1,0)), c=random(i+vec2(0,1)), d=random(i+vec2(1,1));
          vec2 u=f*f*(3.0-2.0*f);
          return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
        }

        void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
          vec2 s = pixelSize / resolution;
          vec2 uvPixel = s * floor(uv / s);
          vec4 color = texture2D(inputBuffer, uvPixel);

          float luma = dot(vec3(0.2126,0.7152,0.0722), color.rgb);
          vec2 cellPos = floor(uv / s);
          vec2 cellUV = fract(uv / s);

          if(luma < 0.001){
            vec2 centered = cellUV - 0.5;
            float alt = mod(cellPos.x,2.0);
            float a = alt==0.0 ? radians(-65.0) : radians(65.0);
            vec2 r = vec2(centered.x*cos(a)-centered.y*sin(a), centered.x*sin(a)+centered.y*cos(a));
            float ellipse = length(vec2(r.x, r.y*1.55 - 0.075));
            float pat = smoothstep(0.2, 1.0, 1.0-ellipse) * 0.06;
            outputColor = vec4(vec3(pat),1.0);
            return;
          }

          float rowOffset = sin((random(vec2(0.0, uvPixel.y)) - 0.5) * 0.25);
          cellUV.x += rowOffset;
          vec2 centered = cellUV - 0.5;

          float noiseAmount = 0.18;
          vec2 noisyCenter = centered + (vec2(
            random(cellPos + centered),
            random(cellPos + centered)
          ) - 0.5) * noiseAmount;

          float alt = mod(cellPos.x,2.0);
          float a = alt==0.0 ? radians(-65.0) : radians(65.0);
          vec2 r = vec2(noisyCenter.x*cos(a)-noisyCenter.y*sin(a), noisyCenter.x*sin(a)+noisyCenter.y*cos(a));
          float ellipse = length(vec2(r.x, r.y*1.55 - 0.075));
          color.rgb *= smoothstep(0.2, 1.0, 1.0-ellipse);

          float stripeNoise = noise(vec2(centered.x, centered.y * 100.0));
          color.rgb *= stripeNoise + 0.4;

          float hueShift = (random(cellPos)-0.5)*0.08;
          vec3 hsv = rgbToHsv(color.rgb);
          hsv.x += hueShift;
          color.rgb = hsvToRgb(hsv);

          outputColor = color;
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