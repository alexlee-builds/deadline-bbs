# DeadLine BBS — Requirements

Feature: `deadline-bbs` · Category: Resurrection (Kiroween 2026)
Status: implemented locally on 2026-10-31; publishing/submission steps are
tracked separately in `tasks.md`.

## Introduction

DeadLine BBS resurrects a 1986 dial-up bulletin board system inside a
modern web browser. In 1986 the original DeadLine BBS ran on a single
phone line in a sysop's basement; the line went dead on Halloween night
and the board — and its sysop — never logged off. The system SHALL
recreate that experience as a pure static web app: a modem dial-up boot
sequence, a CRT terminal, a ghost message board, a text-adventure door
game, an ASCII file library, and a rule-based chat with the ghost sysop.
The system SHALL require no backend, no account, no build step, and no
network access after the page and its files have loaded.

User roles: **Caller** (the visitor, who picks a handle) and the
**SysOp Ghost** (a scripted persona, never a live person or a model).

## Requirements

### Requirement 1 — Modem boot sequence

**User story:** As a caller, I want the session to begin with a dial-up
handshake, so that I feel I have phoned a BBS in 1986.

#### Acceptance criteria (EARS)

1. WHEN the caller activates the CONNECT control, THE SYSTEM SHALL play
   a dial-up sequence (dial tone, DTMF digit tones, carrier handshake)
   synthesized with WebAudio and SHALL display each stage as terminal
   text (`ATDT 555-1986`, `CONNECT 2400`, …).
2. WHEN the boot sequence finishes, THE SYSTEM SHALL present a login
   prompt asking for a handle.
3. IF the caller activates SKIP during boot, THEN THE SYSTEM SHALL end
   the sequence immediately and present the login prompt.
4. WHERE the caller's OS requests reduced motion, THE SYSTEM SHALL
   shorten the boot sequence to near-instant text output with no
   flashing effects.
5. THE SYSTEM SHALL NOT block entry for more than ~8 seconds of boot
   animation when not skipped.

### Requirement 2 — Handle login

1. WHEN the caller submits a non-empty handle, THE SYSTEM SHALL store
   it in localStorage and greet the caller by that handle at the main
   menu.
2. IF the handle field is empty, THEN THE SYSTEM SHALL assign the
   handle `WANDERER` and tell the caller so.
3. WHEN a returning caller loads the page, THE SYSTEM SHALL remember
   the stored handle and pre-fill the login prompt with it.
4. THE SYSTEM SHALL NOT require a password or any account.

### Requirement 3 — CRT terminal presentation

1. THE SYSTEM SHALL render all interaction inside a CRT-styled terminal:
   scanlines, phosphor glow in a green/amber Halloween palette, and an
   80-column monospace feel.
2. WHEN the caller toggles FLICKER off, THE SYSTEM SHALL stop the
   flicker animation and persist that choice.
3. WHERE reduced motion is requested, THE SYSTEM SHALL disable flicker
   by default.
4. THE SYSTEM SHALL keep navigation possible with the keyboard alone
   (number keys / typed commands + Enter) AND with pointer/touch via
   real buttons for every menu entry.
5. THE SYSTEM SHALL remain usable at mobile widths: the terminal
   scrolls, text wraps within the screen, and menu buttons are tappable.

### Requirement 4 — Main menu

1. THE SYSTEM SHALL offer exactly these destinations from the main
   menu: Message Board, Graveyard Quest, File Library, Chat with the
   SysOp, About/Help, and Logoff.
2. WHEN the caller selects Logoff, THE SYSTEM SHALL play a hang-up
   sequence (`ATH0`, `NO CARRIER`) and return to the boot/login state,
   keeping the stored handle and message-board posts.

### Requirement 5 — Message board

1. THE SYSTEM SHALL seed the board with ghost messages dated in 1986.
2. WHEN the caller posts a message, THE SYSTEM SHALL persist it in
   localStorage so it survives reloads, and SHALL display it stamped
   with a 1986-style date (the current month/day, year 1986).
3. THE SYSTEM SHALL let the caller delete their own posts, and SHALL
   NOT offer deletion of seeded ghost posts.
4. IF localStorage is unavailable, THEN THE SYSTEM SHALL keep posts in
   memory for the session and say persistence is off.

### Requirement 6 — Graveyard Quest (door game)

1. THE SYSTEM SHALL provide a complete text adventure of at least 8
   nodes/rooms with a visible health value and a one-item-at-a-time
   inventory.
2. THE SYSTEM SHALL present choices both as buttons and as number-key
   selections.
3. WHEN the caller reaches the win condition (freeing the SysOp's
   ghost in the crypt with the required item), THE SYSTEM SHALL show a
   win ending and offer restart.
4. IF the caller's health reaches zero, THEN THE SYSTEM SHALL show a
   lose ending and offer restart.
5. WHEN the caller restarts, THE SYSTEM SHALL reset health, inventory,
   and position to the start node.

### Requirement 7 — File library (ASCII art)

1. THE SYSTEM SHALL list at least four ASCII-art files (pumpkin,
   haunted house, ghost, modem).
2. WHEN the caller opens a file, THE SYSTEM SHALL show a fake XMODEM
   transfer (block counter and progress bar) and then display the art.
3. THE SYSTEM SHALL offer a real `Save .txt` download of the displayed
   art via a Blob URL.
4. IF the caller cancels mid-transfer, THEN THE SYSTEM SHALL stop the
   animation and return to the file list.

### Requirement 8 — SysOp chat

1. THE SYSTEM SHALL answer chat input with rule-based keyword matching
   only — no network calls, no model, no API key — and SHALL present
   answers with a typing effect.
2. THE SYSTEM SHALL respond on at least these topics: greeting, help,
   Kiro, Halloween, death/ghosts, modem, the Graveyard Quest, and a
   `password` easter egg.
3. IF no rule matches, THEN THE SYSTEM SHALL rotate through in-character
   fallback replies that point the caller back to known topics.

### Requirement 9 — Sound

1. THE SYSTEM SHALL synthesize all sound with WebAudio (key beeps,
   menu blips, modem tones); THE SYSTEM SHALL NOT ship audio files.
2. THE SYSTEM SHALL provide a global sound on/off toggle and persist
   the choice.
3. WHERE the caller has not yet interacted with the page, THE SYSTEM
   SHALL NOT attempt autoplay audio.

### Requirement 10 — Static, offline, and repo hygiene

1. THE SYSTEM SHALL run from any static host or a local static server
   with no build step and no external CDN dependencies.
2. THE REPOSITORY SHALL keep `/.kiro` (specs, steering, hooks) at the
   repo root and SHALL NOT list `.kiro` in `.gitignore`.
3. THE REPOSITORY SHALL carry an MIT `LICENSE` and a `README.md` with
   run instructions.
