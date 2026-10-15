window.pumpkinAssets = (() => {
  const TAU = Math.PI * 2;

  function seededRandom(seed) {
    let value = seed >>> 0;
    return () => {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 4294967296;
    };
  }

  function makeRindMaps() {
    const width = 1024;
    const height = 512;
    const random = seededRandom(271828);
    const colorCanvas = document.createElement("canvas");
    const bumpCanvas = document.createElement("canvas");
    const roughnessCanvas = document.createElement("canvas");
    for (const canvas of [colorCanvas, bumpCanvas, roughnessCanvas]) {
      canvas.width = width;
      canvas.height = height;
    }

    const colorContext = colorCanvas.getContext("2d");
    const bumpContext = bumpCanvas.getContext("2d");
    const roughnessContext = roughnessCanvas.getContext("2d");
    const color = colorContext.createImageData(width, height);
    const bump = bumpContext.createImageData(width, height);
    const roughness = roughnessContext.createImageData(width, height);
    const flecks = Array.from({ length: 3200 }, () => ({
      x: random() * width,
      y: random() * height,
      radius: 0.35 + random() * 1.15,
      shade: random() > 0.5 ? 1 : -1,
    }));

    for (let y = 0; y < height; y++) {
      const v = y / height;
      for (let x = 0; x < width; x++) {
        const u = x / width;
        const index = (y * width + x) * 4;
        const ribs = Math.cos(u * TAU * 9 + 0.16 * Math.sin(v * TAU * 2));
        const grooves = Math.pow(Math.max(0, ribs), 34);
        const marbling =
          Math.sin(u * 47 + Math.sin(v * 18) * 0.8) * 3.4 +
          Math.sin(u * 123 - v * 31) * 1.7 +
          Math.sin(u * 391 + v * 167) * 1.2;
        const fineGrain = (random() - 0.5) * 5;
        const fleck = (random() - 0.5) * 2.5;
        const shade = marbling + fineGrain - grooves * 18;
        const orange = 1 + 0.028 * Math.sin(u * TAU * 9);

        color.data[index] = Math.max(0, Math.min(255, 215 * orange + shade));
        color.data[index + 1] = Math.max(
          0,
          Math.min(255, 68 * orange + shade * 0.48),
        );
        color.data[index + 2] = Math.max(
          0,
          Math.min(255, 16 + shade * 0.16 + fleck),
        );
        color.data[index + 3] = 255;

        const relief = Math.max(0, Math.min(255, 134 + marbling * 2 + fineGrain * 2));
        bump.data[index] = relief;
        bump.data[index + 1] = relief;
        bump.data[index + 2] = relief;
        bump.data[index + 3] = 255;

        const rough = Math.max(0, Math.min(255, 194 + Math.abs(marbling) * 2));
        roughness.data[index] = rough;
        roughness.data[index + 1] = rough;
        roughness.data[index + 2] = rough;
        roughness.data[index + 3] = 255;
      }
    }

    colorContext.putImageData(color, 0, 0);
    bumpContext.putImageData(bump, 0, 0);
    roughnessContext.putImageData(roughness, 0, 0);

    const fleckContext = colorContext;
    fleckContext.globalAlpha = 0.13;
    for (const mark of flecks) {
      fleckContext.fillStyle = mark.shade > 0 ? "#ffe0a4" : "#78300d";
      fleckContext.beginPath();
      fleckContext.ellipse(
        mark.x,
        mark.y,
        mark.radius * 1.8,
        mark.radius,
        0.25,
        0,
        TAU,
      );
      fleckContext.fill();
    }
    fleckContext.globalAlpha = 1;

    return {
      color: colorCanvas,
      bump: bumpCanvas,
      roughness: roughnessCanvas,
    };
  }

  function makeStemTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 512;
    const context = canvas.getContext("2d");
    const gradient = context.createLinearGradient(0, 0, 256, 512);
    gradient.addColorStop(0, "#6d694b");
    gradient.addColorStop(0.28, "#6d5531");
    gradient.addColorStop(0.62, "#8a6335");
    gradient.addColorStop(1, "#554629");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 512);

    const random = seededRandom(314159);
    for (let i = 0; i < 1500; i++) {
      const x = random() * 256;
      const y = random() * 512;
      context.fillStyle =
        random() > 0.5 ? "rgba(196,157,92,.15)" : "rgba(35,31,19,.16)";
      context.fillRect(x, y, 1 + random() * 2, 2 + random() * 12);
    }
    return canvas;
  }

  function makeGroundShadow() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext("2d");
    const gradient = context.createRadialGradient(128, 128, 12, 128, 128, 128);
    gradient.addColorStop(0, "rgba(45,30,18,.28)");
    gradient.addColorStop(0.45, "rgba(45,30,18,.13)");
    gradient.addColorStop(1, "rgba(45,30,18,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 256);
    return canvas;
  }

  return { makeGroundShadow, makeRindMaps, makeStemTexture };
})();
