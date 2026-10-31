# Tech steering — DeadLine BBS

## Hard constraints

- **Vanilla HTML/CSS/JS only.** No frameworks, no libraries, no CDN,
  no webfonts, no images, no audio files. The page must work offline
  from any static host with no build step.
- **Sound is synthesized** with WebAudio (oscillators + filtered
  noise). AudioContext is created only after a user gesture.
- **State is localStorage only**, behind a try/catch wrapper with an
  in-memory fallback. Seeded content lives in code, never in storage.
- **No network calls** after load. No analytics, no tracking.

## Code conventions

- `app.js` is one IIFE with `"use strict"`; sections in order:
  storage → audio → terminal I/O → boot/login → menu → board →
  quest → files → sysop → logoff → wiring. Banner comments mark
  sections; data tables (seed posts, quest graph, files, sysop rules)
  sit above the engines that consume them.
- Prefer small pure helpers (`print`, `hr`, `esc`) over clever code.
  Escape all user text before injecting HTML (`esc()`).
- DOM building for interactive elements uses real `<button>`s and
  event delegation; never inline `onclick` attributes.

## Accessibility (non-negotiable)

- Semantic landmarks; terminal output is `role="log"`,
  `aria-live="polite"`; the input has a real `<label>`.
- Every action reachable by keyboard alone; `:focus-visible` styling
  is never removed.
- `prefers-reduced-motion` disables flicker, shrinks typing/boot
  delays to ~0, and is respected in both CSS and JS.
- Works at 360 px wide: fluid type, wrapping, tappable menu buttons.
