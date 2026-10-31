# Structure steering — DeadLine BBS

```
deadline-bbs/
├── index.html                  # the whole app shell (only page)
├── styles.css                  # CRT presentation
├── app.js                      # all logic (single IIFE)
├── README.md                   # what it is, how to run, Kiro write-up
├── LICENSE                     # MIT, (c) 2026 Alex Lee
├── .gitignore                  # minimal — must NEVER ignore .kiro/
├── SUBMISSION_CHECKLIST.md     # hackathon rules checklist (reference)
└── .kiro/
    ├── specs/deadline-bbs/
    │   ├── requirements.md     # EARS requirements
    │   ├── design.md           # architecture & data design
    │   └── tasks.md            # implementation checklist
    ├── steering/
    │   ├── product.md          # vision & tone (always included)
    │   ├── tech.md             # stack constraints (always included)
    │   └── structure.md        # this file (always included)
    └── hooks/
        ├── update-readme-on-save.kiro.hook
        └── guard-kiro-dir.kiro.hook
```

## Rules

- `.kiro/` lives at the repo root and is committed. It is never added
  to `.gitignore` — the hackathon rules can disqualify a project whose
  `.kiro` directory is hidden.
- New screens go in `app.js` as a section + a `showX()` renderer + a
  branch in `routeInput()`; new data (posts, files, rooms, rules) goes
  in the data tables at the top of their section.
- Keep the three-file app layout. Splitting `app.js` is acceptable
  only along its existing section banners, and `index.html` must keep
  loading everything with plain `<script>` tags (no modules/bundler).
