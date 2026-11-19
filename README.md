[![GTA 6 Cover Art](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/Erwinsays12/makefun-gta6-cover-art/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/Erwinsays12/makefun-gta6-cover-art/reward.svg)](https://make.fun/c/gta6-cover-art-01)

# Vice Cover Studio — GTA-style Cover Art Maker

A free, offline web app that turns your own photos and a caption into
GTA-style multi-panel cover art — Vice City sunset / neon colour grade, bold
caption lettering — exported as a PNG to share. Built for the
[Make GTA 6 Cover Art](https://make.fun/c/gta6-cover-art-01) bounty on
[make.fun](https://make.fun).

## What it does

- **Any photo:** load photos from your machine (never uploaded), or use the
  two bundled sample photos. Click a panel, then a photo, to fill it.
- **Multi-panel posters:** five layouts — Vice Grid (5 panels), Sunset Trio,
  Hero Duo, Quad, Solo — with slanted comic-book dividers.
- **Crop & position per panel:** drag a panel to pan its photo, scroll or use
  the slider to zoom, or fill every panel with one photo.
- **Bold caption lettering:** editable caption + subtitle in the Anton display
  font (SIL OFL, shipped under `app/fonts/`), in three gradient styles
  (Sunset, Neon, Vice white).
- **Sunset grade:** warm sunset / neon grade, halftone print dots and film
  grain, all deterministic.
- **Fast export:** one click exports a PNG in 1080 × 1080, 1080 × 1350 or
  1920 × 1080.

## Run it

Serve `app/` with any static server and open `app/index.html` — no build
step, no network request. For example:

```sh
python3 -m http.server --directory app 8080
```

Then open http://localhost:8080. Add `?demo=1` to preload the sample photos.

## Layout

- `app/index.html` — editor shell
- `app/style.css` — editor chrome (dark neon theme)
- `app/src/cover.js` — cover renderer: panels, photo crop, sunset grade,
  halftone, grain, caption lettering, PNG export
- `app/src/main.js` — editor wiring: uploads, tray, drag/zoom, export
- `app/samples/` — two sample photos (made with an image model for make.fun,
  free to use)
- `app/fonts/Anton-Regular.ttf` — Anton display font (SIL Open Font License 1.1)
- `main.ts` — entry program: copies `app/` + `screenshots/` to `/output`
  and writes `dossier.json`
- `screenshots/` — 3–4 screenshots: the exported cover first, then the editor

## License

MIT. The Anton font is licensed under the SIL Open Font License 1.1
(see `app/fonts/OFL.txt`). Original work — no Rockstar Games logo, artwork,
character or font is used anywhere.
