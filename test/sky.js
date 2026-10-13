// The night sky behind every screen: stars and film grain, made in code.
// The gradient, glows and vignette are plain CSS in styles.css.

(() => {
  const STAR_COUNT = 120;
  const TWINKLE_COUNT = 10;

  function addStars() {
    const layer = document.getElementById('sky-stars');
    if (!layer) return;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < STAR_COUNT; i++) {
      const star = document.createElement('span');
      star.className = i < TWINKLE_COUNT ? 'star star--twinkle' : 'star';
      const size = Math.random() < 0.85 ? 1 : 2;
      star.style.left = `${(Math.random() * 100).toFixed(2)}%`;
      star.style.top = `${(Math.random() * 100).toFixed(2)}%`;
      star.style.width = star.style.height = `${size}px`;
      star.style.opacity = (0.25 + Math.random() * 0.6).toFixed(2);
      if (i < TWINKLE_COUNT) {
        star.style.animationDelay = `${(Math.random() * -6).toFixed(2)}s`;
        star.style.animationDuration = `${(4 + Math.random() * 4).toFixed(2)}s`;
      }
      frag.append(star);
    }
    layer.append(frag);
  }

  // A tiny tile of random noise, repeated across the screen as grain.
  function addGrain() {
    const layer = document.getElementById('sky-grain');
    if (!layer) return;
    try {
      const size = 128;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d');
      const img = ctx.createImageData(size, size);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() * 255;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      layer.style.backgroundImage = `url(${canvas.toDataURL('image/png')})`;
    } catch (err) {
      // Grain is decoration only; skip it if canvas is unavailable.
    }
  }

  addStars();
  addGrain();
})();
