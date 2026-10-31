# 👻 DeadLine BBS

**A haunted 1986 dial-up bulletin board system, resurrected in your browser.**

> 📞 `ATDT 555-1986` … `CONNECT 2400` … `NO ESCAPE`

In 1986, the DeadLine BBS ran on a single phone line in its SysOp's
basement. On Halloween night the line went dead — but the board never
logged off, and neither did he. Forty years later you can call it
again: DeadLine BBS recreates the whole ritual on one static web page —
modem handshake, CRT phosphor glow, ghost mail, a door game, an ASCII
file library, and a SysOp who is *still online*.

**Kiroween 2026 · Category: Resurrection**

## Features

- **Modem boot sequence** — synthesized WebAudio dial tone, DTMF digits,
  carrier handshake and `CONNECT 2400`, with a SKIP button and a
  reduced-motion fast path. Ends at a handle login (a nickname, stored
  locally — no account, no password).
- **CRT terminal** — scanlines, flicker (toggleable), phosphor
  green/amber palette, 80-column feel. Keyboard-first, but every action
  also exists as a real button; works on mobile.
- **Message Board** — seeded ghost mail postmarked 1986, plus your own
  posts, persisted in `localStorage` and stamped with 1986-style dates.
  Delete your own posts; the ghosts keep theirs.
- **Graveyard Quest** — a complete 10-node text adventure (door game
  №13): health, a one-item inventory, a brass key, a candle, a crypt,
  a win ending (`LOGOFF COMPLETE`) and a lose ending (`NO CARRIER`),
  with restart.
- **File Library** — four ASCII-art relics (pumpkin, haunted house,
  ghost, modem) delivered by a fake XMODEM transfer with progress bar
  and cancel — and a *real* `Save .txt` download at the end.
- **Chat with the SysOp** — a rule-based ghost (keyword rules, typing
  effect, zero network calls) who talks Kiro, Halloween, death, modems,
  quest hints — and denies knowing any password.
- **Sound, synthesized** — every beep, click and handshake is WebAudio;
  there are no audio files. Global sound on/off toggle.
- **Logoff** — a proper `ATH0` / `NO CARRIER` hang-up. He hates that part.

## How to run

No build step, no dependencies, no server code. Serve the folder with
any static server:

```bash
cd deadline-bbs
python3 -m http.server 8000
# then open http://localhost:8000/
```

…or deploy the three files (`index.html`, `styles.css`, `app.js`) to
any static host (GitHub Pages, Netlify, S3, …). It also works offline
once loaded: no CDNs, no webfonts, no external requests.

## Tech

Vanilla HTML/CSS/JS in three files. State (handle, posts, settings)
lives in `localStorage` behind a try/catch wrapper. Sound is pure
WebAudio synthesis. Accessibility: semantic landmarks, an
`aria-live` terminal log, visible focus, and full respect for
`prefers-reduced-motion`.

## Built with Kiro

This project was developed **spec-driven with Kiro**, and the evidence
ships in the repo, in [`/.kiro`](.kiro/):

- **Specs** — [`.kiro/specs/deadline-bbs/`](.kiro/specs/deadline-bbs/)
  holds EARS-style `requirements.md` (modem boot, board, quest, files,
  SysOp, sound, offline guarantees), the `design.md` (single-page
  terminal, screen state machine, localStorage schema, WebAudio design,
  quest node graph, hook notes), and the `tasks.md` implementation
  checklist that tracked the build.
- **Steering** — [`.kiro/steering/`](.kiro/steering/) keeps every agent
  on the same haunted page: `product.md` (vision & tone — the SysOp is
  a rules-based character, never an AI impersonation), `tech.md` (hard
  constraints: vanilla only, no dependencies, synthesized audio,
  accessibility non-negotiables), and `structure.md` (repo layout and
  the rule that `/.kiro` is never gitignored).
- **Hooks** — [`.kiro/hooks/`](.kiro/hooks/) contains agent hooks in
  Kiro's JSON hook format: one asks the agent to keep the README in
  sync when app files change; the other guards `.gitignore` so the
  `/.kiro` directory can never be hidden from the repo.

The workflow: write the spec first, let the steering docs constrain
every change, implement task-by-task against the checklist, and use
the hooks as guardrails — a 1986 workflow (write the manual before
you plug in the modem) executed by a very modern crew of agents,
across Kiro CLI sessions on the free tier.

## License

MIT — see [LICENSE](LICENSE). © 2026 Alex Lee.

*No ghosts were logged off in the making of this project. Well. One was. He asked.*
