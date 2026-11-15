(() => {
  const figure = document.querySelector(".H9hbUW_piece");
  const paragraph = figure?.querySelector(".H9hbUW_text");
  const canvas = figure?.querySelector(".H9hbUW_thumb");
  const style = figure?.querySelector(":scope > style");
  const characters = paragraph
    ? [...paragraph.querySelectorAll("span[data-c]")]
    : [];

  if (!figure || !paragraph || !canvas || !style || characters.length === 0) {
    return;
  }

  const context = canvas.getContext("2d");
  if (!context) {
    console.error("Could not create the Starry Night canvas context.");
    return;
  }

  const image = new Image();
  image.src = new URL("starry-night.jpg", document.baseURI).href;

  const selected = new Uint8Array(characters.length);
  let samples = [];
  let lastLayout = "";

  function averageColor(pixels, width, height, x, y, boxWidth, boxHeight) {
    const left = Math.max(0, Math.floor(x));
    const top = Math.max(0, Math.floor(y));
    const right = Math.min(width, Math.ceil(x + boxWidth));
    const bottom = Math.min(height, Math.ceil(y + boxHeight));
    let red = 0;
    let green = 0;
    let blue = 0;
    let count = 0;

    for (let row = top; row < bottom; row += 1) {
      for (let column = left; column < right; column += 1) {
        const offset = (row * width + column) * 4;
        red += pixels[offset];
        green += pixels[offset + 1];
        blue += pixels[offset + 2];
        count += 1;
      }
    }

    return count
      ? [
          Math.round(red / count),
          Math.round(green / count),
          Math.round(blue / count),
        ]
      : [255, 255, 255];
  }

  function renderCanvas() {
    if (!image.complete || !image.naturalWidth) {
      return;
    }

    const displayWidth = canvas.clientWidth || 116;
    const displayHeight = Math.round(
      (displayWidth * image.naturalHeight) / image.naturalWidth,
    );
    const pixelRatio = window.devicePixelRatio || 1;

    canvas.style.height = `${displayHeight}px`;
    canvas.width = Math.round(displayWidth * pixelRatio);
    canvas.height = Math.round(displayHeight * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, displayWidth, displayHeight);

    const paragraphRect = paragraph.getBoundingClientRect();
    const scaleX = displayWidth / paragraphRect.width;
    const scaleY = displayHeight / paragraphRect.height;

    samples.forEach((sample, index) => {
      if (!sample || !selected[index]) {
        return;
      }

      context.fillStyle = sample.color;
      const left = Math.floor(sample.x * scaleX * pixelRatio) / pixelRatio;
      const top = Math.floor(sample.y * scaleY * pixelRatio) / pixelRatio;
      const right =
        Math.ceil((sample.x + sample.width) * scaleX * pixelRatio) /
        pixelRatio;
      const bottom =
        Math.ceil((sample.y + sample.height) * scaleY * pixelRatio) /
        pixelRatio;
      context.fillRect(left, top, right - left, bottom - top);
    });
  }

  function updateLayout() {
    if (!image.complete || !image.naturalWidth) {
      return;
    }

    const paragraphRect = paragraph.getBoundingClientRect();
    const firstRect = characters[0].getBoundingClientRect();
    const lastRect = characters[characters.length - 1].getBoundingClientRect();
    const layout = [
      paragraphRect.width,
      paragraphRect.height,
      firstRect.left,
      firstRect.top,
      lastRect.left,
      lastRect.top,
    ]
      .map(value => value.toFixed(1))
      .join(",");

    if (layout === lastLayout) {
      return;
    }
    lastLayout = layout;

    const width = Math.max(1, Math.round(paragraphRect.width));
    const height = Math.max(1, Math.round(paragraphRect.height));
    const source = document.createElement("canvas");
    source.width = width;
    source.height = height;
    const sourceContext = source.getContext("2d", {
      willReadFrequently: true,
    });

    if (!sourceContext) {
      console.error("Could not sample colors from the Starry Night image.");
      return;
    }

    const scale = Math.max(
      width / image.naturalWidth,
      height / image.naturalHeight,
    );
    const imageWidth = image.naturalWidth * scale;
    const imageHeight = image.naturalHeight * scale;
    sourceContext.drawImage(
      image,
      (width - imageWidth) / 2,
      (height - imageHeight) / 2,
      imageWidth,
      imageHeight,
    );

    const pixels = sourceContext.getImageData(0, 0, width, height).data;
    const lineHeight =
      Number.parseFloat(getComputedStyle(paragraph).lineHeight) || 24;
    const rules = [];

    samples = characters.map(character => {
      const rect = character.getBoundingClientRect();
      if (!rect.width) {
        return null;
      }

      const x = rect.left - paragraphRect.left;
      const y =
        rect.top + rect.height / 2 - paragraphRect.top - lineHeight / 2;
      if (character.textContent === " " && rect.left >= paragraphRect.right - 0.5) {
        rules.push(`.${character.dataset.c}::selection{background:transparent}`);
        return null;
      }

      const [red, green, blue] = averageColor(
        pixels,
        width,
        height,
        x,
        y,
        rect.width,
        lineHeight,
      );
      const color = `rgb(${red}, ${green}, ${blue})`;
      const textColor =
        0.2126 * red + 0.7152 * green + 0.0722 * blue > 150
          ? "#222"
          : "#e5e7ee";
      rules.push(
        `.${character.dataset.c}::selection{background:${color};color:${textColor}}`,
        `.${character.dataset.c}::-moz-selection{background:${color};color:${textColor}}`,
      );

      return {
        x,
        y,
        width: rect.width,
        height: lineHeight,
        color,
      };
    });

    style.textContent = rules.join("\n");
    renderCanvas();
  }

  function recordSelection() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      return;
    }

    let changed = false;
    for (
      let rangeIndex = 0;
      rangeIndex < selection.rangeCount;
      rangeIndex += 1
    ) {
      const range = selection.getRangeAt(rangeIndex);
      characters.forEach((character, index) => {
        if (!selected[index] && range.intersectsNode(character)) {
          selected[index] = 1;
          changed = true;
        }
      });
    }

    if (changed) {
      renderCanvas();
    }
  }

  image.onload = updateLayout;
  image.onerror = () => {
    console.error(`Could not load the Starry Night image: ${image.src}`);
  };

  if (image.complete && image.naturalWidth) {
    updateLayout();
  }

  const resizeObserver = new ResizeObserver(updateLayout);
  resizeObserver.observe(paragraph);
  window.addEventListener("resize", updateLayout);
  document.addEventListener("selectionchange", recordSelection);

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(updateLayout);
  }
})();
