# Devpost Submission — prepared text (fill URL fields at submit time)

- **Project name:** DeadLine BBS
- **Category:** Resurrection
- **App URL:** https://alexlee-builds.github.io/deadline-bbs/
- **GitHub repo:** https://github.com/alexlee-builds/deadline-bbs
- **YouTube demo:** _(fill after upload)_

## Elevator pitch

A haunted 1986 dial-up bulletin board system, resurrected as a zero-dependency web app: real WebAudio modem handshake, CRT terminal, persistent ghost message board, a text-adventure door game, an ASCII file library with simulated XMODEM transfers, and the undead SysOp still answering chat — forty years after he died at the keyboard.

## About the project

**Inspiration.** Dial-up BBSes were the social networks of 1986 — and they are effectively extinct. We wanted to resurrect not just the look but the rituals: dialing in, the handshake screech, logging in with a handle, reading last night's messages, playing a door game, and logging off to NO CARRIER.

**What it does.** DeadLine BBS is a single static web app (no build step, no dependencies, no backend):

- **Dial-up boot** — a WebAudio modem sequence (dial tone → DTMF → ringback → 2250 Hz answer tone + noise handshake) ending in CONNECT 2400, with a SKIP path and reduced-motion support.
- **CRT terminal** — scanlines, vignette, optional flicker, green/amber phosphor palette, true 80-column mono layout, responsive down to mobile.
- **Message board** — six seeded ghost posts from October 1986; visitors post under their handle, posts persist in localStorage with a 1986 postmark, and your own posts can be deleted.
- **Graveyard Quest** — a 10-node text-adventure door game with HP, a one-item inventory, and candle/key gating that forces a real route decision; win and lose endings, keyboard and button input.
- **File library** — four pieces of ASCII art delivered over a simulated, cancellable XMODEM transfer, ending in a real downloadable .txt.
- **SysOp chat** — a rule-based ghost SysOp (ordered keyword rules, rotating fallbacks, and an easter egg for callers who type the old password).
- **Logoff** — ATH0 / NO CARRIER hang-up sequence; your handle and posts survive the disconnect.

**How Kiro was used.** This project was built spec-driven with Kiro, and the full working artifacts ship in the repository under `/.kiro`:

- **Specs** (`.kiro/specs/deadline-bbs/`) — requirements written in EARS format (10 requirements), a design doc (state machine, localStorage schema, audio/CRT approach), and a task list that tracked implementation to completion.
- **Steering** (`.kiro/steering/`) — product.md (the 1986 authenticity rules), tech.md (zero-dependency, vanilla JS, Kiro CLI on a headless VM), structure.md (repo layout and the rule that /.kiro is never gitignored).
- **Hooks** (`.kiro/hooks/`) — agent hooks in Kiro JSON format, e.g. guarding the .kiro directory from accidental gitignoring and refreshing the README on save.

The specs came first; the implementation was then built and verified requirement-by-requirement against them (local HTTP checks and a headless DOM smoke suite covering boot → login → posting → a full Graveyard Quest win path → SysOp chat → file transfer → logoff).

**Built with:** HTML, CSS, vanilla JavaScript, WebAudio API, localStorage, Kiro (specs / steering / hooks).

## Try it

Open the app URL, click DIAL, pick a handle, and mind the SysOp.
