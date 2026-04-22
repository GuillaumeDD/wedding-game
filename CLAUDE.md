# Wedding Geography Guessing Game

## Project Overview
A trilingual (French/English/Arabic) geography guessing game for [PERSON A] & [PERSON B]'s wedding. Guests drop pins on an interactive map to guess where other guests are traveling from.

## Architecture
Static SPA — four files, zero build step, no backend. Deploys to any static host.

- `index.html` — Three-screen SPA (welcome, game, results) toggled via `.active` class
- `style.css` — Wedding palette (rose/sage/gold), Leaflet overrides, RTL support
- `game.js` — Game logic, i18n, Leaflet map, Haversine scoring (single script, no modules)
- `guests.json` — 16 location rounds with trilingual clues

## Key Conventions
- **No build step**: All code runs directly in the browser. No bundlers, no transpilers.
- **No dependencies beyond CDNs**: Leaflet 1.9.4 and OpenStreetMap tiles only.
- **i18n via `data-i18n` attributes**: All translatable text uses `data-i18n="key"` with translations in the `i18n` object in `game.js`.
- **RTL support**: Arabic sets `dir="rtl"` on `<html>`. CSS handles layout via `[dir="rtl"]` selectors.
- **CSS custom properties**: Palette defined in `:root` — `--rose`, `--sage`, `--gold` and variants.

## Local Development
Serve with any static HTTP server (fetch requires it):
```
python3 -m http.server 8000
```

## Testing
Manual browser testing — no test framework. Verify:
1. Language switching (FR/EN/AR + RTL)
2. Map interaction (tap to place pin, drag to refine)
3. Full 16-round playthrough with scoring
4. Results screen and replay
5. Mobile viewports (Chrome DevTools)
