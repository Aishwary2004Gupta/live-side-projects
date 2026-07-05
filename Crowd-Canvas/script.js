
      // ==================== CROWD CANVAS ====================
      const canvas = document.getElementById("crowdCanvas");
      const ctx = canvas.getContext("2d");

      const config = {
        src: "https://raw.githubusercontent.com/Aishwary2004Gupta/models/cloud/images/open-peeps-sheet.png",
        rows: 15,
        cols: 7,
      };

      let img = new Image();
      let stage = { width: 0, height: 0 };
      let allPeeps = [];
      let availablePeeps = [];
      let crowd = [];
      let dpr = window.devicePixelRatio || 1;

      // UTILS
      const randomRange = (min, max) => min + Math.random() * (max - min);
      const randomIndex = (array) => randomRange(0, array.length) | 0;
      const removeFromArray = (array, i) => array.splice(i, 1)[0];
      const removeItemFromArray = (array, item) =>
        removeFromArray(array, array.indexOf(item));
      const removeRandomFromArray = (array) =>
        removeFromArray(array, randomIndex(array));
      const getRandomFromArray = (array) => array[randomIndex(array) | 0];

      // Reset peep position
      function resetPeep({ stage, peep }) {
        const direction = Math.random() > 0.5 ? 1 : -1;
        const offsetY = 100 - 250 * gsap.parseEase("power2.in")(Math.random());
        const startY = stage.height - peep.height + offsetY;
        let startX, endX;

        if (direction === 1) {
          startX = -peep.width;
          endX = stage.width;
          peep.scaleX = 1;
        } else {
          startX = stage.width + peep.width;
          endX = 0;
          peep.scaleX = -1;
        }

        peep.x = startX;
        peep.y = startY;
        peep.anchorY = startY;

        return { startX, startY, endX };
      }

      // Walking animation
      function normalWalk({ peep, props }) {
        const { startX, startY, endX } = props;
        const xDuration = 10;
        const yDuration = 0.25;

        const tl = gsap.timeline();
        tl.timeScale(randomRange(0.5, 1.5));

        tl.to(
          peep,
          {
            duration: xDuration,
            x: endX,
            ease: "none",
          },
          0,
        );

        tl.to(
          peep,
          {
            duration: yDuration,
            repeat: xDuration / yDuration,
            yoyo: true,
            y: startY - 10,
            ease: "sine.inOut",
          },
          0,
        );

        return tl;
      }

      // Create a single peep
      function createPeep({ image, rect }) {
        return {
          image,
          rect,
          width: rect[2],
          height: rect[3],
          x: 0,
          y: 0,
          anchorY: 0,
          scaleX: 1,
          walk: null,
          render(ctx) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.scale(this.scaleX, 1);
            ctx.drawImage(
              this.image,
              this.rect[0],
              this.rect[1],
              this.rect[2],
              this.rect[3],
              0,
              0,
              this.width,
              this.height,
            );
            ctx.restore();
          },
        };
      }

      // Create all peeps from sprite sheet
      function createPeeps() {
        const { rows, cols } = config;
        const { naturalWidth: width, naturalHeight: height } = img;
        const total = rows * cols;
        const rectWidth = width / rows;
        const rectHeight = height / cols;

        for (let i = 0; i < total; i++) {
          allPeeps.push(
            createPeep({
              image: img,
              rect: [
                (i % rows) * rectWidth,
                ((i / rows) | 0) * rectHeight,
                rectWidth,
                rectHeight,
              ],
            }),
          );
        }
      }

      function addPeepToCrowd() {
        const peep = removeRandomFromArray(availablePeeps);
        const walk = normalWalk({
          peep,
          props: resetPeep({ peep, stage }),
        }).eventCallback("onComplete", () => {
          removePeepFromCrowd(peep);
          addPeepToCrowd();
        });

        peep.walk = walk;
        crowd.push(peep);
        crowd.sort((a, b) => a.anchorY - b.anchorY);
        return peep;
      }

      function removePeepFromCrowd(peep) {
        removeItemFromArray(crowd, peep);
        availablePeeps.push(peep);
      }

      function initCrowd() {
        while (availablePeeps.length) {
          addPeepToCrowd().walk.progress(Math.random());
        }
      }

      function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.scale(dpr, dpr);
        crowd.forEach((peep) => peep.render(ctx));
        ctx.restore();
      }

      function resize() {
        stage.width = canvas.clientWidth;
        stage.height = canvas.clientHeight;
        canvas.width = stage.width * dpr;
        canvas.height = stage.height * dpr;

        crowd.forEach((peep) => {
          if (peep.walk) peep.walk.kill();
        });

        crowd.length = 0;
        availablePeeps.length = 0;
        availablePeeps.push(...allPeeps);

        initCrowd();
      }

      function init() {
        createPeeps();
        resize();
        gsap.ticker.add(render);
      }

      // Load the sprite sheet
      img.onload = init;
      img.src = config.src;

      // Handle resize
      window.addEventListener("resize", resize);
