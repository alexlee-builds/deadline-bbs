# DeadLine BBS — Design

Implements `.kiro/specs/deadline-bbs/requirements.md`.

## Architecture

A single-page static app, three files, zero dependencies:

| File         | Responsibility |
|--------------|----------------|
| `index.html` | Landmarks, CRT frame, terminal output region, input line, toolbar (SOUND / FLICKER / SKIP), quick-menu nav, loads `styles.css` + `app.js`. |
| `styles.css` | CRT presentation: scanlines (repeating-linear-gradient), phosphor glow (text-shadow), flicker keyframes, 80-column shell, responsive + reduced-motion rules. |
| `app.js`     | Everything else: audio engine, screen state machine, boot sequence, board, quest engine, file library, SysOp rules, persistence. One IIFE, `"use strict"`, sections marked with banner comments. |

No framework, no bundler, no server code, no external requests. Opening
`index.html` via any static server is the whole deployment.

## Screen state machine

`App.screen` is one of: `boot → login → menu → board | quest | files |
chat | about → logoff → boot`.

- `showMenu()` is the hub; every sub-screen renders a `[0] Back` affordance
  (button + typed `0`/`menu`).
- Rendering model: the terminal is an append-mostly log (`#term-output`,
  `role="log"`, `aria-live="polite"`). Screens print a header block;
  dynamic choices are printed as numbered lines AND mirrored as real
  `<button>` elements in `#choices` so pointer, touch, and keyboard all
  work. Buttons call the same handlers as typed commands.
- One text input (`#term-input`) with a form submit handler routes typed
  commands per-screen: `routeInput(text)`.
- Key feedback: `keydown` on the input plays a soft click beep (when
  sound is on); global number keys are NOT hijacked — all input goes
  through the input line so focus/IME/accessibility stay sane.

## Boot sequence

`runBoot()` prints staged lines with delays, driving the audio engine
through: dial tone (350+440 Hz) → DTMF pairs per digit of `555-1986` →
ring → carrier handshake (a short band-limited noise burst + 2250 Hz
answer tone) → `CONNECT 2400`. A `bootToken` counter invalidates pending
timers when SKIP is pressed, so skipping is race-free. If
`matchMedia('(prefers-reduced-motion: reduce)')` matches, all delays
collapse to ~0 and tones are skipped.

## Audio engine (WebAudio)

`AudioFX` lazily creates an `AudioContext` on the first user gesture
(CONNECT click) — never autoplay. Primitives:

- `beep(freq, dur, type, gain)` — one oscillator + gain envelope.
- `dtmf(digit)` — the real DTMF row/column frequency pair.
- `noise(dur)` — a `AudioBufferSourceNode` of white noise through a
  bandpass filter, for the handshake screech.
- `keyClick()`, `blip()`, `errorBuzz()`, `hangup()` — composed presets.

Master gain is gated by `settings.sound`; the toolbar toggle persists it.

## Persistence (localStorage schema)

| Key                  | Shape |
|----------------------|-------|
| `deadlinebbs.handle` | `string` — caller's handle. |
| `deadlinebbs.posts`  | `[{id, author, body, stamp}]` — caller posts only; `stamp` is the preformatted 1986-style date string. Seeded ghost posts live in code, never in storage, so they can never be deleted or duplicated. |
| `deadlinebbs.settings` | `{sound: boolean, flicker: boolean}` |

All storage access is wrapped in try/catch (`store.get/set`); on failure
the app falls back to in-memory state and prints a notice once.

## Message board

Seeded posts: fixed array with 1986 dates (Oct 1986), from handles like
`THE_SYSOP`, `MORTICIA_86`, `CAPTAIN_HOWDY`. Caller posts are rendered
after the seeds with a `DELETE` button per own post (event delegation,
`data-del` id). New-post date: current month/day rendered as
`MMM DD 1986` — the board exists outside of time, mail is always
postmarked 1986.

## Graveyard Quest engine

Data-driven node graph (`QUEST` object). Node shape:

```js
{ title, text: [lines], choices: [{label, to, need, give, dmg, say, ifFlag, setFlag}] }
```

Engine state: `{node, hp: 100, item: null, flags: {}}`. Inventory is a
single slot by design ("you can only carry one thing — your hands are
shaking"). Choice gating: a choice with `need` is hidden until the item
is held; `dmg` subtracts health and may bounce the player back; `hp<=0`
routes to the `dead` node (lose ending); the `dawn` node is the win
ending. Restart resets the state object. 10 nodes: gate, porch, foyer,
library, kitchen, attic, stairs, crypt, dead, dawn.

## File library & XMODEM viewer

`FILES` is an array of `{name, bytes, art}` where `art` is a template
string. Opening a file starts an interval-driven fake transfer: blocks
of 128 bytes, a `[████░░░░] 42%` bar redrawn in one line element, a soft
tick each block. On completion the art is printed in a `<pre>` and a
`Save .txt` button creates `URL.createObjectURL(new Blob([art]))` for a
real download. STOP cancels the interval and returns to the list.

## SysOp chat

Ordered rule table `SYSOP_RULES = [{re, replies: []}]`; first match
wins, matches reply with a per-rule rotating index. Typing effect:
interval printing char-by-char into one line at ~14 ms/char (0 ms under
reduced motion). Rules cover greeting, help, Kiro, Halloween,
death/ghost, modem/2400, quest hints, the board, files, bye, and the
`password` easter egg (the SysOp denies everything, then leaks the
quest hint and the word `XYZZY`). Fallbacks rotate and always name a
real topic, so the SysOp never invents features (see steering).

## CRT effects

- Scanlines: `::after` overlay with repeating-linear-gradient + a slow
  vertical drift; pointer-events none.
- Flicker: `@keyframes flicker` opacity jitter on the screen, toggled by
  the `.no-flicker` class on `<body>` (persisted setting), and forced
  off under `prefers-reduced-motion`.
- Palette: `--phosphor: #7dff8a` green, `--amber: #ffb347`, alert
  `--blood: #ff5a4e`, background near-black `#050807`.
- Vignette: radial-gradient overlay. Fonts: ui-monospace system stack
  only — no webfonts, so the page works fully offline.

## Accessibility

Semantic landmarks (`header`, `main`, `nav`, `footer`), `role="log"`
with `aria-live="polite"` for terminal output, a labelled input,
`:focus-visible` outlines, real `<button>` elements everywhere, and
honoring `prefers-reduced-motion` for flicker, typing, and boot.

## Hooks used (`.kiro/hooks/`)

- `update-readme-on-save.kiro.hook` — when an app file (`index.html`,
  `styles.css`, `app.js`) is edited, asks the agent to check whether the
  README feature list still matches the app and update it if not.
- `guard-kiro-dir.kiro.hook` — when `.gitignore` is edited, asks the
  agent to verify `.kiro` is not ignored (a hackathon disqualifier).

Both are advisory agent hooks in Kiro's JSON hook format
(`name` / `description` / `when` / `then`); they document the workflow
that produced this repo: specs first, steering always-on, hooks as
guardrails.

## Deliberate exclusions

No accounts/passwords, no backend, no AI/model API, no analytics, no
payments, no images or audio files, no third-party code or fonts.
