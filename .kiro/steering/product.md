# Product steering — DeadLine BBS

## Vision

Resurrect a 1986 dial-up BBS as a haunted, fully playable web page.
The board's phone line went dead on Halloween 1986; the SysOp never
logged off. Every visitor "phones" the board again and finds everyone
still there. Category: **Resurrection** (Kiroween 2026).

## Tone

- In-app text is English, written as 1986 BBS copy: ALL-CAPS headers,
  `***` banners, handles in angle brackets, dates in 1986.
- Spooky, playful, a little mournful — never gory, never mean.
- The SysOp Ghost is a character with rules, not an AI. It must never
  claim to be a live person or a language model, and never invent
  features the app does not have; its fallback always points back to
  the real menu.

## Audience & demo promise

Judges open one URL and play immediately: no login (a handle is a
nickname, not an account), no instructions needed beyond the on-screen
menu, full loop (boot → menu → board/quest/files/chat → logoff) in
under three minutes.

## Scope discipline

Features are exactly the ones in
`.kiro/specs/deadline-bbs/requirements.md`. Anything else — accounts,
backends, real multiplayer, model APIs — is out of scope by design and
must not creep in during polish.
