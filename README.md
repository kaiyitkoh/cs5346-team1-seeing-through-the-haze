# Seeing Through the Haze

CS5346 Information Visualization — Team 1

An interactive visualization of Singapore's air quality, exploring how transboundary fires, wind patterns, and El Nino drive haze episodes.

**Two-part site:**
1. **Story page** (`index.html`) — Scroll-driven narrative with animated D3 charts
2. **Explorer page** (`explorer.html`) — Interactive cross-filtering dashboard to explore the data

## Run locally

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173/cs5346-team1-seeing-through-the-haze/`

## Build for production

```bash
npm run build
npm run preview
```

## Tech stack

- D3.js v7 — charts and maps
- Scrollama — scroll-triggered animations
- GSAP — chart transition animations
- Tailwind CSS v4 — styling
- Vite — build tool
