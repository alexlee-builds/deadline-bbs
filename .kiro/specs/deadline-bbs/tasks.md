# DeadLine BBS — Tasks

Implementation plan for the `deadline-bbs` feature. Checked items are
done and verified locally (see README for how to run). Unchecked items
belong to the publish/submit phase, which needs accounts and the user's
go-ahead, and are NOT part of the local build.

## Spec & steering

- [x] 1. Write EARS requirements (`.kiro/specs/deadline-bbs/requirements.md`)
- [x] 2. Write design (`.kiro/specs/deadline-bbs/design.md`)
- [x] 3. Write steering docs (`product.md`, `tech.md`, `structure.md`)
- [x] 4. Add agent hooks (README-on-save, .kiro gitignore guard)

## App build

- [x] 5. Scaffold `index.html` + `styles.css`: landmarks, CRT frame,
      scanlines/flicker, toolbar (SOUND / FLICKER / SKIP), input line,
      quick-menu nav, responsive + reduced-motion rules
- [x] 6. WebAudio engine: beep/DTMF/noise primitives, key click, modem
      handshake, hang-up; global persisted sound toggle
- [x] 7. Boot sequence + handle login (localStorage handle, SKIP,
      reduced-motion fast path, race-free skip via boot token)
- [x] 8. Main menu routing (keyboard input + clickable buttons)
- [x] 9. Message board: seeded 1986 ghost posts, post + persist,
      1986-style stamps, delete own posts
- [x] 10. Graveyard Quest: 10-node graph, health, one-slot inventory,
      gated choices, win (`dawn`) and lose (`dead`) endings, restart
- [x] 11. File library: 4 ASCII files, fake XMODEM transfer with
      cancel, `Save .txt` real download
- [x] 12. SysOp chat: ordered rule table (greeting/help/Kiro/Halloween/
      death/modem/quest/password easter egg), typing effect, rotating
      fallbacks
- [x] 13. About/Help screen and Logoff hang-up sequence
- [x] 14. Repo hygiene: MIT `LICENSE`, `README.md`, `.gitignore` that
      does NOT exclude `.kiro/`

## Local verification

- [x] 15. `node --check app.js` passes
- [x] 16. Served with a local static server and fetched with curl
      (page + assets return 200)

## Publish & submit (later phase — blocked on accounts/user go-ahead)

- [ ] 17. Push to a public GitHub repo (root contains `/.kiro`,
      detectable MIT license in About)
- [ ] 18. Deploy the static site and verify the live URL in a private
      window (no login, no saved state)
- [ ] 19. Record a <3-minute public demo video (no copyrighted music)
- [ ] 20. Submit on Devpost (description + How-Kiro-was-used write-up)
      before 2026-12-04 14:00 PT
