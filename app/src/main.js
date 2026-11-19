// Vice Cover Studio — editor wiring.
//
// Owns the page state (photos, panel assignment, layout, caption, grade),
// the live preview, drag-to-pan / scroll-to-zoom on the canvas, the PNG
// export, and the ?demo=1 / ?shot=cover helpers the maker uses to take the
// entry's screenshots. Photos are read on the user's machine and never sent
// anywhere: uploads use object URLs, samples are files under app/.

import {
  EXPORT_SIZES,
  CAPTION_STYLES,
  LAYOUTS,
  defaultPanels,
  layoutPanelPolygons,
  renderCover,
  exportCoverPNG,
} from './cover.js';

const preview = document.getElementById('preview');
const previewCtx = preview.getContext('2d');
const canvasWrap = document.getElementById('canvasWrap');
const emptyState = document.getElementById('emptyState');
const tray = document.getElementById('tray');
const params = new URLSearchParams(location.search);

const state = {
  photos: [],
  layout: 'vice-grid',
  panels: defaultPanels('vice-grid'),
  caption: 'VICE CITY',
  subtitle: 'NEON NIGHTS',
  captionStyle: 'sunset',
  size: 'wide',
  grade: 0.8,
  halftone: true,
  grain: true,
};

let selectedPanel = 0;
let drag = null;

function currentSize() {
  return EXPORT_SIZES[state.size];
}

function resizePreview() {
  const size = currentSize();
  preview.width = size.width;
  preview.height = size.height;
  redraw();
}

function redraw() {
  renderCover(previewCtx, preview.width, preview.height, state);
  drawSelectedPanelOutline();
  emptyState.style.display = state.photos.length ? 'none' : 'grid';
}

function pointInPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function panelAtPoint(canvasX, canvasY) {
  const polys = layoutPanelPolygons(state.layout, preview.width, preview.height);
  for (let i = polys.length - 1; i >= 0; i--) {
    if (pointInPolygon(canvasX, canvasY, polys[i])) return { index: i, points: polys[i] };
  }
  return null;
}

function drawSelectedPanelOutline() {
  if (selectedPanel === null || !state.photos.length) return;
  const size = currentSize();
  const hit = panelAtPointForOutline(selectedPanel, size.width, size.height);
  if (!hit) return;
  previewCtx.save();
  previewCtx.beginPath();
  previewCtx.moveTo(hit[0][0], hit[0][1]);
  for (let i = 1; i < hit.length; i++) previewCtx.lineTo(hit[i][0], hit[i][1]);
  previewCtx.closePath();
  previewCtx.setLineDash([14, 10]);
  previewCtx.strokeStyle = '#ffd319';
  previewCtx.lineWidth = Math.max(3, Math.round(size.width * 0.005));
  previewCtx.stroke();
  previewCtx.restore();
}

function panelAtPointForOutline(index, width, height) {
  const polys = layoutPanelPolygons(state.layout, width, height);
  return polys[index] || null;
}

function canvasCoords(event) {
  const rect = preview.getBoundingClientRect();
  return [
    ((event.clientX - rect.left) / rect.width) * preview.width,
    ((event.clientY - rect.top) / rect.height) * preview.height,
  ];
}

function addPhoto(image, url) {
  const index = state.photos.length;
  state.photos.push(image);
  const thumb = document.createElement('img');
  thumb.src = url;
  thumb.alt = `Photo ${index + 1}`;
  thumb.title = `Click to put photo ${index + 1} in the selected panel`;
  thumb.addEventListener('click', () => {
    document.querySelectorAll('#tray img').forEach((img) => img.classList.remove('selected'));
    thumb.classList.add('selected');
    assignPhotoToPanel(index, selectedPanel);
  });
  tray.appendChild(thumb);
  const firstEmpty = state.panels.findIndex((panel) => panel.photo === null);
  if (firstEmpty !== -1) state.panels[firstEmpty].photo = index;
  redraw();
}

function assignPhotoToPanel(photoIndex, panelIndex) {
  if (panelIndex === null || !state.panels[panelIndex]) return;
  state.panels[panelIndex].photo = photoIndex;
  state.panels[panelIndex].zoom = 1;
  state.panels[panelIndex].ox = 0;
  state.panels[panelIndex].oy = 0;
  redraw();
}

function loadImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${url}`));
    image.src = url;
  });
}

async function loadSamplePhotos() {
  for (const url of ['samples/boulevard.jpg', 'samples/pier.jpg']) {
    try {
      const image = await loadImageFromUrl(url);
      addPhoto(image, url);
    } catch (error) {
      console.warn(error.message);
    }
  }
  // Spread the two samples across the panels like a real user would, and
  // nudge the two short right-hand panels down a touch so faces, not
  // torsos, fill their frames.
  state.panels.forEach((panel, i) => {
    panel.photo = state.photos.length ? i % state.photos.length : null;
    if (i === 1 || i === 2) panel.oy = 0.12;
  });
  redraw();
}

function buildLayoutButtons() {
  const grid = document.getElementById('layoutGrid');
  LAYOUTS.forEach((layout) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'layout-btn' + (layout.id === state.layout ? ' active' : '');
    button.textContent = layout.name;
    button.addEventListener('click', () => {
      document.querySelectorAll('.layout-btn').forEach((el) => el.classList.remove('active'));
      button.classList.add('active');
      state.layout = layout.id;
      state.panels = defaultPanels(layout.id);
      state.photos.forEach((_, photoIndex) => {
        const slot = state.panels.findIndex((panel) => panel.photo === null);
        if (slot !== -1) state.panels[slot].photo = photoIndex;
      });
      state.panels.forEach((panel, i) => {
        if (state.photos.length) panel.photo = i % state.photos.length;
      });
      selectedPanel = 0;
      redraw();
    });
    grid.appendChild(button);
  });
}

function buildCaptionStyleButtons() {
  const row = document.getElementById('captionStyles');
  Object.entries(CAPTION_STYLES).forEach(([id, style]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'style-btn' + (id === state.captionStyle ? ' active' : '');
    button.textContent = style.name;
    button.addEventListener('click', () => {
      document.querySelectorAll('.style-btn').forEach((el) => el.classList.remove('active'));
      button.classList.add('active');
      state.captionStyle = id;
      redraw();
    });
    row.appendChild(button);
  });
}

function wireControls() {
  document.getElementById('photoInput').addEventListener('change', async (event) => {
    for (const file of event.target.files) {
      const url = URL.createObjectURL(file);
      try {
        const image = await loadImageFromUrl(url);
        addPhoto(image, url);
      } catch (error) {
        console.warn(error.message);
      }
    }
    event.target.value = '';
  });

  document.getElementById('sampleBtn').addEventListener('click', loadSamplePhotos);

  document.getElementById('fillAllBtn').addEventListener('click', () => {
    if (!state.photos.length) return;
    state.panels.forEach((panel) => {
      panel.photo = 0;
      panel.zoom = 1;
      panel.ox = 0;
      panel.oy = 0;
    });
    redraw();
  });

  document.getElementById('captionInput').addEventListener('input', (event) => {
    state.caption = event.target.value;
    redraw();
  });
  document.getElementById('subtitleInput').addEventListener('input', (event) => {
    state.subtitle = event.target.value;
    redraw();
  });

  document.getElementById('gradeSlider').addEventListener('input', (event) => {
    state.grade = Number(event.target.value);
    redraw();
  });
  document.getElementById('halftoneToggle').addEventListener('change', (event) => {
    state.halftone = event.target.checked;
    redraw();
  });
  document.getElementById('grainToggle').addEventListener('change', (event) => {
    state.grain = event.target.checked;
    redraw();
  });

  const zoomSlider = document.getElementById('zoomSlider');
  zoomSlider.addEventListener('input', (event) => {
    const panel = state.panels[selectedPanel];
    if (panel) {
      panel.zoom = Number(event.target.value);
      redraw();
    }
  });

  document.querySelectorAll('.size-btn').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.size-btn').forEach((el) => el.classList.remove('active'));
      button.classList.add('active');
      state.size = button.dataset.size;
      resizePreview();
    });
  });

  document.getElementById('exportBtn').addEventListener('click', async () => {
    const button = document.getElementById('exportBtn');
    button.disabled = true;
    button.textContent = 'Exporting…';
    try {
      await document.fonts.ready;
      const blob = await exportCoverPNG(state, state.size);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `vice-cover-${state.size}-${currentSize().width}x${currentSize().height}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } finally {
      button.disabled = false;
      button.textContent = 'Export PNG';
    }
  });
}

function wireCanvas() {
  preview.addEventListener('pointerdown', (event) => {
    const [x, y] = canvasCoords(event);
    const hit = panelAtPoint(x, y);
    if (hit) selectedPanel = hit.index;
    drag = { x, y, panel: selectedPanel, moved: false };
    preview.setPointerCapture(event.pointerId);
    redraw();
  });
  preview.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const [x, y] = canvasCoords(event);
    const panel = state.panels[drag.panel];
    if (!panel || panel.photo === null) return;
    const panelWidth = preview.width;
    panel.ox += (x - drag.x) / panelWidth;
    panel.oy += (y - drag.y) / preview.height;
    panel.ox = Math.max(-0.6, Math.min(0.6, panel.ox));
    panel.oy = Math.max(-0.6, Math.min(0.6, panel.oy));
    drag.x = x;
    drag.y = y;
    drag.moved = true;
    redraw();
  });
  preview.addEventListener('pointerup', () => {
    drag = null;
  });
  preview.addEventListener('wheel', (event) => {
    event.preventDefault();
    const panel = state.panels[selectedPanel];
    if (!panel) return;
    panel.zoom = Math.max(1, Math.min(2.5, panel.zoom * Math.exp(-event.deltaY * 0.0012)));
    document.getElementById('zoomSlider').value = String(panel.zoom);
    redraw();
  }, { passive: false });
}

// Screenshot helper: renders the real exported PNG and shows it full-screen
// so the entry's cover screenshot is the PNG the app itself wrote.
async function showExportedCoverShot() {
  await document.fonts.ready;
  const sizeKey = params.get('size') || state.size;
  const blob = await exportCoverPNG(state, sizeKey);
  const url = URL.createObjectURL(blob);
  const img = document.getElementById('shotImg');
  img.src = url;
  document.getElementById('shotView').hidden = false;
  document.body.classList.add('shot-mode');
  const size = EXPORT_SIZES[sizeKey];
  document.getElementById('shotStatus').textContent =
    `export-ok ${size.width}x${size.height} bytes=${blob.size}`;
  window.__shotDone = true;
}

async function init() {
  buildLayoutButtons();
  buildCaptionStyleButtons();
  wireControls();
  wireCanvas();
  if (params.get('size') && EXPORT_SIZES[params.get('size')]) {
    state.size = params.get('size');
    document.querySelectorAll('.size-btn').forEach((el) => {
      el.classList.toggle('active', el.dataset.size === state.size);
    });
  }
  if (params.get('layout') && LAYOUTS.some((entry) => entry.id === params.get('layout'))) {
    state.layout = params.get('layout');
    state.panels = defaultPanels(state.layout);
  }
  resizePreview();
  try {
    await document.fonts.load('40px Anton');
  } catch (error) {
    console.warn('Anton font did not load in time', error);
  }
  if (params.get('demo') === '1') {
    await loadSamplePhotos();
  }
  redraw();
  if (params.get('shot') === 'cover') {
    await showExportedCoverShot();
  } else {
    window.__shotDone = true;
  }
}

init();
