// Vice Cover Studio — cover renderer.
//
// Draws a multi-panel GTA-style poster on any canvas: slanted comic panels,
// one photo per panel (crop + position), a Vice City sunset / neon colour
// grade, halftone print dots, film grain and bold Anton caption lettering.
// Everything is deterministic: fixed seeds, no clock, no network.

export const EXPORT_SIZES = {
  square: { width: 1080, height: 1080, label: '1080 x 1080' },
  portrait: { width: 1080, height: 1350, label: '1080 x 1350' },
  wide: { width: 1920, height: 1080, label: '1920 x 1080' },
};

export const CAPTION_STYLES = {
  sunset: { name: 'Sunset', stops: ['#ffe259', '#ff8a3d', '#ff2975'] },
  neon: { name: 'Neon', stops: ['#7df9ff', '#ff2975', '#b537f2'] },
  vice: { name: 'Vice white', stops: ['#ffffff', '#ffe9a8', '#ffb347'] },
};

export function layoutPanelPolygons(layout, width, height) {
  return layoutPanels(layout, width, height);
}

// Panel polygons in normalised coordinates. Shared edges overlap a touch so
// no hairline gap ever shows between two panels.
function layoutPanels(layout, width, height) {
  const hero = [[0, 0], [0.53, 0], [0.47, 1], [0, 1]];
  const duoSide = [[0.53, 0], [1, 0], [1, 1], [0.47, 1]];
  const trio = [
    [[0, 0], [0.36, 0], [0.30, 1], [0, 1]],
    [[0.36, 0], [0.68, 0], [0.62, 1], [0.30, 1]],
    [[0.68, 0], [1, 0], [1, 1], [0.62, 1]],
  ];
  const quad = [
    [[0, 0], [0.52, 0], [0.46, 0.52], [0, 0.48]],
    [[0.52, 0], [1, 0], [1, 0.48], [0.46, 0.52]],
    [[0, 0.48], [0.46, 0.52], [0.52, 1], [0, 1]],
    [[0.46, 0.52], [1, 0.48], [1, 1], [0.52, 1]],
  ];
  const grid = [
    hero,
    [[0.53, 0], [1, 0], [1, 0.34], [0.485, 0.36]],
    [[0.485, 0.36], [1, 0.34], [1, 0.67], [0.47, 0.68]],
    [[0.46, 0.68], [0.74, 0.675], [0.73, 1], [0.46, 1]],
    [[0.74, 0.675], [1, 0.67], [1, 1], [0.73, 1]],
  ];
  const solo = [[[0, 0], [1, 0], [1, 1], [0, 1]]];
  const byName = {
    'vice-grid': grid,
    'sunset-trio': trio,
    'hero-duo': [hero, duoSide],
    quad,
    solo,
  };
  const polys = byName[layout] || grid;
  return polys.map((poly) => poly.map(([x, y]) => [x * width, y * height]));
}

export const LAYOUTS = [
  { id: 'vice-grid', name: 'Vice Grid', panels: 5 },
  { id: 'sunset-trio', name: 'Sunset Trio', panels: 3 },
  { id: 'hero-duo', name: 'Hero Duo', panels: 2 },
  { id: 'quad', name: 'Quad', panels: 4 },
  { id: 'solo', name: 'Solo', panels: 1 },
];

export function defaultPanels(layoutId) {
  const layout = LAYOUTS.find((entry) => entry.id === layoutId) || LAYOUTS[0];
  return Array.from({ length: layout.panels }, () => ({
    photo: null,
    zoom: 1,
    ox: 0,
    oy: 0,
  }));
}

// Small seeded PRNG so the grain and halftone dots are identical on every run.
export function mulberry32(seed) {
  let value = seed >>> 0;
  return function nextRandom() {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function polygonPath(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
}

function polygonBounds(points) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of points) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function drawPanelPhoto(ctx, image, bounds, panel, grade) {
  const scale = Math.max(bounds.width / image.width, bounds.height / image.height) * panel.zoom;
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const dx = bounds.x + (bounds.width - drawWidth) / 2 + panel.ox * bounds.width;
  const dy = bounds.y + (bounds.height - drawHeight) / 2 + panel.oy * bounds.height;
  ctx.filter = `saturate(${(1 + 0.28 * grade).toFixed(2)}) contrast(${(1 + 0.09 * grade).toFixed(2)})`;
  ctx.drawImage(image, dx, dy, drawWidth, drawHeight);
  ctx.filter = 'none';
}

function drawPanelPlaceholder(ctx, bounds, index) {
  const gradient = ctx.createLinearGradient(bounds.x, bounds.y, bounds.x + bounds.width, bounds.y + bounds.height);
  gradient.addColorStop(0, '#ff8a3d');
  gradient.addColorStop(0.5, '#ff2975');
  gradient.addColorStop(1, '#5b2ee5');
  ctx.fillStyle = gradient;
  ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = `${Math.max(14, bounds.width * 0.055)}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`PHOTO ${index + 1}`, bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
}

function applySunsetGrade(ctx, bounds, grade) {
  if (grade <= 0) return;
  const warm = ctx.createLinearGradient(0, bounds.y, 0, bounds.y + bounds.height);
  warm.addColorStop(0, `rgba(255, 190, 60, ${0.10 * grade})`);
  warm.addColorStop(0.55, `rgba(255, 90, 60, ${0.05 * grade})`);
  warm.addColorStop(1, `rgba(180, 20, 140, ${0.20 * grade})`);
  ctx.fillStyle = warm;
  ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
}

function drawHalftoneDots(ctx, width, height, seed) {
  const random = mulberry32(seed);
  const step = Math.max(9, Math.round(width / 110));
  ctx.fillStyle = 'rgba(10, 0, 30, 0.07)';
  for (let y = step / 2; y < height; y += step) {
    for (let x = step / 2; x < width; x += step) {
      const radius = (0.6 + random() * 1.6) * (step / 9);
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

let grainPattern = null;
function drawFilmGrain(ctx, width, height) {
  if (!grainPattern) {
    const tile = document.createElement('canvas');
    tile.width = 128;
    tile.height = 128;
    const tileCtx = tile.getContext('2d');
    const imageData = tileCtx.createImageData(128, 128);
    const random = mulberry32(20261119);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const value = Math.floor(random() * 255);
      imageData.data[i] = value;
      imageData.data[i + 1] = value;
      imageData.data[i + 2] = value;
      imageData.data[i + 3] = 14;
    }
    tileCtx.putImageData(imageData, 0, 0);
    grainPattern = ctx.createPattern(tile, 'repeat');
  }
  ctx.fillStyle = grainPattern;
  ctx.fillRect(0, 0, width, height);
}

function drawVignette(ctx, width, height) {
  const radius = Math.hypot(width, height) / 2;
  const gradient = ctx.createRadialGradient(
    width / 2, height * 0.46, radius * 0.45,
    width / 2, height * 0.5, radius,
  );
  gradient.addColorStop(0, 'rgba(20, 0, 40, 0)');
  gradient.addColorStop(1, 'rgba(20, 0, 40, 0.38)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function fitCaptionFont(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `${size}px Anton, sans-serif`;
  while (size > 24 && ctx.measureText(text).width > maxWidth) {
    size = Math.floor(size * 0.94);
    ctx.font = `${size}px Anton, sans-serif`;
  }
  return size;
}

function drawCaptionLettering(ctx, width, height, state) {
  const caption = (state.caption || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim().toUpperCase();
  if (!caption && !subtitle) return;
  const style = CAPTION_STYLES[state.captionStyle] || CAPTION_STYLES.sunset;

  ctx.save();
  ctx.translate(width / 2, height * 0.885);
  ctx.rotate(-0.018);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  if (caption) {
    const maxWidth = width * 0.94;
    const size = fitCaptionFont(ctx, caption, maxWidth, Math.round(width * 0.115));
    const gradient = ctx.createLinearGradient(0, -size, 0, size * 0.12);
    style.stops.forEach((stop, i) => gradient.addColorStop(i / (style.stops.length - 1), stop));
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = Math.round(width * 0.012);
    ctx.shadowOffsetY = Math.round(width * 0.006);
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, Math.round(width * 0.007));
    ctx.strokeStyle = 'rgba(16, 2, 32, 0.92)';
    ctx.strokeText(caption, 0, 0);
    ctx.fillStyle = gradient;
    ctx.fillText(caption, 0, 0);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  if (subtitle) {
    const subSize = Math.max(14, Math.round(width * 0.026));
    ctx.font = `700 ${subSize}px "Segoe UI", system-ui, sans-serif`;
    const gap = Math.round(subSize * 0.45);
    const textWidth = ctx.measureText(subtitle.split('').join(' ')).width;
    const lineY = subSize * 1.15;
    const lineHalf = Math.min(width * 0.18, textWidth / 2 + 26);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = Math.max(2, Math.round(width * 0.002));
    ctx.beginPath();
    ctx.moveTo(-lineHalf - textWidth / 2 - 14, lineY - subSize * 0.32);
    ctx.lineTo(-textWidth / 2 - 14, lineY - subSize * 0.32);
    ctx.moveTo(textWidth / 2 + 14, lineY - subSize * 0.32);
    ctx.lineTo(lineHalf + textWidth / 2 + 14, lineY - subSize * 0.32);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(subtitle.split('').join(' '), 0, lineY);
  }
  ctx.restore();
}

// Paints the whole cover on ctx. `photos` is an array of loaded images
// (HTMLImageElement); a panel's `photo` is an index into it, or null.
export function renderCover(ctx, width, height, state) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#160a2e';
  ctx.fillRect(0, 0, width, height);

  const panels = layoutPanels(state.layout, width, height);
  const borderWidth = Math.max(3, Math.round(width * 0.004));

  panels.forEach((points, index) => {
    const panel = state.panels[index] || { photo: null, zoom: 1, ox: 0, oy: 0 };
    const bounds = polygonBounds(points);
    ctx.save();
    polygonPath(ctx, points);
    ctx.clip();
    const image = panel.photo !== null ? state.photos[panel.photo] : null;
    if (image) {
      drawPanelPhoto(ctx, image, bounds, panel, state.grade);
    } else {
      drawPanelPlaceholder(ctx, bounds, index);
    }
    applySunsetGrade(ctx, bounds, state.grade);
    ctx.restore();
  });

  // Crisp white seams between panels, then a thin dark outer frame.
  ctx.lineJoin = 'round';
  panels.forEach((points) => {
    polygonPath(ctx, points);
    ctx.strokeStyle = 'rgba(255,255,255,0.96)';
    ctx.lineWidth = borderWidth;
    ctx.stroke();
  });
  ctx.strokeStyle = 'rgba(10, 0, 26, 0.9)';
  ctx.lineWidth = Math.max(4, Math.round(width * 0.006));
  ctx.strokeRect(0, 0, width, height);

  drawVignette(ctx, width, height);
  if (state.halftone) drawHalftoneDots(ctx, width, height, 1337);
  if (state.grain) drawFilmGrain(ctx, width, height);
  drawCaptionLettering(ctx, width, height, state);
}

// Renders the cover at an export size and returns the canvas.
export function exportCoverCanvas(state, sizeKey) {
  const size = EXPORT_SIZES[sizeKey] || EXPORT_SIZES.square;
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  renderCover(canvas.getContext('2d'), size.width, size.height, state);
  return canvas;
}

export function exportCoverPNG(state, sizeKey) {
  return new Promise((resolve, reject) => {
    exportCoverCanvas(state, sizeKey).toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('PNG export failed'));
    }, 'image/png');
  });
}
