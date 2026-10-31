/* =====================================================================
   DeadLine BBS — a haunted 1986 dial-up BBS, resurrected in the browser.
   One IIFE, no dependencies. Sections:
   storage → audio → terminal I/O → data → boot/login → menu →
   board → quest → files → sysop → about/logoff → wiring
   ===================================================================== */
(function () {
"use strict";

/* ---------------- storage ---------------- */

var store = {
  ok: true,
  get: function (k, dflt) {
    try {
      var v = window.localStorage.getItem(k);
      return v === null ? dflt : JSON.parse(v);
    } catch (e) { this.ok = false; return dflt; }
  },
  set: function (k, v) {
    try { window.localStorage.setItem(k, JSON.stringify(v)); }
    catch (e) { this.ok = false; }
  }
};

var SETTINGS_KEY = "deadlinebbs.settings";
var HANDLE_KEY = "deadlinebbs.handle";
var POSTS_KEY = "deadlinebbs.posts";

var settings = Object.assign({ sound: true, flicker: true },
  store.get(SETTINGS_KEY, {}));
var reducedMotion = window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (reducedMotion) settings.flicker = false;

/* ---------------- audio (WebAudio, synthesized — no files) ---------------- */

var AudioFX = {
  ctx: null,
  ensure: function () {
    if (!this.ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  },
  beep: function (freq, dur, type, vol, delay) {
    if (!settings.sound) return;
    var ctx = this.ensure(); if (!ctx) return;
    type = type || "square"; vol = vol || 0.04; delay = delay || 0;
    var t = ctx.currentTime + delay;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + dur + 0.05);
  },
  tonePair: function (f1, f2, dur, delay) {
    this.beep(f1, dur, "sine", 0.05, delay);
    this.beep(f2, dur, "sine", 0.05, delay);
  },
  dtmf: function (digit, delay) {
    var map = { "1": [697, 1209], "2": [697, 1336], "3": [697, 1477],
                "4": [770, 1209], "5": [770, 1336], "6": [770, 1477],
                "7": [852, 1209], "8": [852, 1336], "9": [852, 1477],
                "0": [941, 1336], "*": [941, 1209], "#": [941, 1477] };
    var p = map[digit]; if (!p) return;
    this.tonePair(p[0], p[1], 0.09, delay || 0);
  },
  noise: function (dur, delay) {
    if (!settings.sound) return;
    var ctx = this.ensure(); if (!ctx) return;
    delay = delay || 0;
    var t = ctx.currentTime + delay;
    var len = Math.floor(ctx.sampleRate * dur);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    var src = ctx.createBufferSource(); src.buffer = buf;
    var bp = ctx.createBiquadFilter(); bp.type = "bandpass";
    bp.frequency.value = 1800; bp.Q.value = 0.7;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp); bp.connect(g); g.connect(ctx.destination);
    src.start(t); src.stop(t + dur + 0.05);
  },
  keyClick: function () { this.beep(1400 + Math.random() * 300, 0.02, "square", 0.012); },
  blip: function () { this.beep(880, 0.05, "square", 0.03); },
  postChime: function () { this.beep(660, 0.07, "square", 0.035); this.beep(990, 0.09, "square", 0.035, 0.08); },
  errorBuzz: function () { this.beep(140, 0.16, "sawtooth", 0.05); },
  hangup: function () {
    this.tonePair(480, 620, 0.25, 0);           /* SIT-ish warble */
    this.beep(392, 0.12, "square", 0.04, 0.3);
    this.beep(330, 0.12, "square", 0.04, 0.45);
    this.beep(262, 0.2, "square", 0.04, 0.6);
  }
};

/* ---------------- terminal I/O ---------------- */

var out = document.getElementById("term-output");
var choicesEl = document.getElementById("choices");
var inputEl = document.getElementById("term-input");
var promptEl = document.getElementById("prompt-text");
var form = document.getElementById("term-form");

function esc(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
function scrollDown() { out.scrollTop = out.scrollHeight; }

function print(html, cls) {
  var d = document.createElement("div");
  if (cls) d.className = cls;
  d.innerHTML = html;
  out.appendChild(d);
  scrollDown();
  return d;
}
function blank() { print("&nbsp;"); }
function hr(ch) {
  print(esc((ch || "—").repeat(64)), "dim");
}
function printArt(artText) {
  var pre = document.createElement("pre");
  pre.className = "art";
  pre.textContent = artText;
  out.appendChild(pre);
  scrollDown();
}
function typeLine(text, cls, done) {
  var d = document.createElement("div");
  if (cls) d.className = cls;
  out.appendChild(d);
  if (reducedMotion) { d.textContent = text; scrollDown(); if (done) done(); return; }
  var i = 0;
  var iv = window.setInterval(function () {
    i += 2;
    d.textContent = text.slice(0, i);
    scrollDown();
    if (i >= text.length) { window.clearInterval(iv); if (done) done(); }
  }, 14);
}
function setChoices(list) {
  choicesEl.innerHTML = "";
  (list || []).forEach(function (c) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "btn";
    b.textContent = c.label;
    b.addEventListener("click", function () { AudioFX.blip(); c.fn(); });
    choicesEl.appendChild(b);
  });
}
function clearChoices() { choicesEl.innerHTML = ""; }
function setPrompt(t) { promptEl.textContent = t; }
function focusInput() { try { inputEl.focus({ preventScroll: true }); } catch (e) { inputEl.focus(); } }
function sleep(ms) { return new Promise(function (r) { window.setTimeout(r, reducedMotion ? 0 : ms); }); }

function stamp1986() {
  var months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  var d = new Date();
  var dd = ("0" + d.getDate()).slice(-2);
  var hh = ("0" + d.getHours()).slice(-2);
  var mm = ("0" + d.getMinutes()).slice(-2);
  return months[d.getMonth()] + " " + dd + " 1986 · " + hh + ":" + mm;
}

/* ---------------- app state ---------------- */

var App = {
  screen: "idle",        /* idle|boot|login|menu|board|quest|files|chat|about */
  handle: store.get(HANDLE_KEY, "") || "",
  boardMode: "read",     /* read|compose */
  chatBusy: false,
  transfer: null         /* active file-transfer interval id */
};

/* ---------------- data: seeded ghost posts ---------------- */

var SEED_POSTS = [
  { author: "THE_SYSOP", stamp: "OCT 31 1986 · 23:59",
    body: "If anyone reads this — the board stays up tonight. Whatever knocks on the line, DO NOT answer the third ring." },
  { author: "MORTICIA_86", stamp: "OCT 31 1986 · 22:13",
    body: "Uploaded my new ANSI pumpkin to the file library. 2400 baud of pure art. You're welcome." },
  { author: "CAPTAIN_HOWDY", stamp: "OCT 31 1986 · 21:47",
    body: "Graveyard Quest is rigged. The crypt door ate my brass key AND my character. SysOp, fix your door game." },
  { author: "VELVET_FOG", stamp: "OCT 30 1986 · 03:03",
    body: "Called at 3AM and someone breathed into the modem for a full minute. Beautiful carrier tone though." },
  { author: "NO_CARRIER_KID", stamp: "OCT 29 1986 · 19:20",
    body: "RIP my phone bill. Mom found out. If I never log on again, tell the BBS I loved her." },
  { author: "THE_SYSOP", stamp: "OCT 28 1986 · 00:00",
    body: "Reminder: I am not dead, I am just not answering. There is a difference. There WAS a difference." }
];

function ownPosts() { return store.get(POSTS_KEY, []); }
function saveOwnPosts(p) { store.set(POSTS_KEY, p); }

/* ---------------- data: file library (ASCII art) ---------------- */

var FILES = [
  { name: "PUMPKIN.TXT", desc: "ANSI jack-o'-lantern, est. 1986",
    art:
"          .-\"\"\"\"-.\n" +
"        .'  _..._  '.\n" +
"       /   /     \\   \\\n" +
"      |   /_     _\\   |\n" +
"      |  (o\\___/(o)   |\n" +
"       \\    \\___/    /\n" +
"        '.   ___   .'\n" +
"          '-.___.-'\n" +
"     H A P P Y   H A L L O W E E N" },
  { name: "HAUNTED.TXT", desc: "The house on DeadLine hill",
    art:
"                 .\n" +
"                /_\\\n" +
"               /___\\      .\n" +
"              /__|__\\    /_\\\n" +
"             /___|___\\  /___\\\n" +
"            | .-. .-. |\n" +
"            | | | | | |   .-.\n" +
"            | |_| |_| |  (o o)  boo.\n" +
"            |    _    |  | O \\\n" +
"            |   |_|   |   \\___\\\n" +
"            |_________|" },
  { name: "GHOST.TXT", desc: "The SysOp, probably",
    art:
"             .-\"\"\"-.\n" +
"           /  _..._  \\\n" +
"          |  (o) (o)  |\n" +
"          |     _     |\n" +
"          |    (_)    |\n" +
"          |           |\n" +
"          |  .--\"\"--. |\n" +
"          \\ (        )/\n" +
"           '---\"\"\"---'\n" +
"          ~  ~  ~  ~  ~\n" +
"        I NEVER LOGGED OFF" },
  { name: "MODEM.TXT", desc: "Hayes-compatible, haunted-compatible",
    art:
"      ____________________________\n" +
"     / ________________________  \\\n" +
"    | |  DEADLINE-2400            | |\n" +
"    | |  o o o o   [TX] [RX] [CD] | |\n" +
"    | |___________________________| |\n" +
"    |_______________________________|\n" +
"        |  |                 |  |\n" +
"     ===|=|=|=====PHONE======|=|=|===\n" +
"     CONNECT 2400 · NO ESCAPE" }
];

/* ---------------- data: Graveyard Quest ---------------- */
/* Node choices support: to, say, dmg, heal, give, take (alias of give),
   need (item required to even see the choice), needFlag, hideIfFlag,
   setFlag, consumeItem. HP<=0 routes to 'dead'; 'dawn' is the win. */

var QUEST = {
  gate: {
    title: "THE IRON GATE — DEADLINE HILL",
    text: [
      "Rain. A rusted gate. Beyond it, the old SysOp's house, dark since",
      "Halloween 1986. Your flashlight is dying. Your courage: negotiable."
    ],
    choices: [
      { label: "Push the gate open", to: "porch" },
      { label: "Read the mailbox", say: "One letter, postmarked OCT 31 1986: 'SYSOP — WE KNOW YOU'RE STILL ONLINE.' Charming." },
      { label: "Shout into the dark", dmg: 10, say: "Something shouts back — in your own voice. That costs you 10 HP of dignity and also health." }
    ]
  },
  porch: {
    title: "THE PORCH",
    text: [
      "Floorboards complain under your shoes. A candle burns here,",
      "impossibly, in the rain. The front door is ajar."
    ],
    choices: [
      { label: "Take the candle", give: "candle", say: "You take the candle. It does not go out. You decide not to think about that." },
      { label: "Knock three times", setFlag: "knocked", say: "Knock. Knock. Knock. From inside: a modem answers with a fourth knock. Rude." },
      { label: "Step through the front door", to: "foyer" },
      { label: "Retreat to the gate", to: "gate" }
    ]
  },
  foyer: {
    title: "THE FOYER",
    text: [
      "Dust, a staircase, and a phone that is definitely not plugged in.",
      "West: a library. East: a kitchen. A locked door under the stairs",
      "smells of ozone and old floppy disks."
    ],
    choices: [
      { label: "West — the library", to: "library" },
      { label: "East — the kitchen", to: "kitchen" },
      { label: "Take the staircase", to: "stairs" },
      { label: "Answer the ringing phone", dmg: 20, say: "A voice reads out your browsing history. From 1986. You hang up, shaking. -20 HP." },
      { label: "Back to the porch", to: "porch" }
    ]
  },
  library: {
    title: "THE LIBRARY",
    text: [
      " shelves of BBS logbooks, every caller since 1983. One shelf",
      "holds a single brass key and a strong sense of foreshadowing."
    ],
    choices: [
      { label: "Take the brass key", give: "brass key", say: "You take the brass key. It is warm. Keys should not be warm." },
      { label: "Read the last logbook", say: "Final entry, OCT 31 1986: 'If I log off now, the board dies with me. Staying.' — THE_SYSOP." },
      { label: "Back to the foyer", to: "foyer" }
    ]
  },
  kitchen: {
    title: "THE KITCHEN",
    text: [
      "A fridge hums a dial tone. On the counter: a meatloaf old enough",
      "to vote. The tap drips in perfect 2400-baud rhythm."
    ],
    choices: [
      { label: "Eat the meatloaf", dmg: 20, say: "It tastes like 1986 and consequences. -20 HP. Worth it? It was not worth it." },
      { label: "Rest by the humming fridge", heal: 10, say: "The dial-tone hum is weirdly soothing. +10 HP." },
      { label: "Open the fridge", dmg: 15, say: "Inside: forty years of leftovers and one accusing light bulb. -15 HP." },
      { label: "Back to the foyer", to: "foyer" }
    ]
  },
  stairs: {
    title: "THE STAIRCASE LANDING",
    text: [
      "Halfway up, halfway down. Portraits of callers line the wall;",
      "all of them are looking at the camera. There was no camera."
    ],
    choices: [
      { label: "Up — the attic", to: "attic" },
      { label: "Down — the crypt door", needFlag: "cryptOpen", to: "crypt",
        say: "" },
      { label: "Unlock the crypt door with the brass key", need: "brass key", hideIfFlag: "cryptOpen",
        setFlag: "cryptOpen", consumeItem: true,
        say: "The key turns, melts politely into the lock, and the crypt door swings open. Below: cold air and a faint carrier tone." },
      { label: "Back to the foyer", to: "foyer" }
    ]
  },
  attic: {
    title: "THE ATTIC",
    text: [
      "Boxes of floppies, a rocking chair keeping time with nothing,",
      "and a mirror covered by a sheet that breathes."
    ],
    choices: [
      { label: "Uncover the mirror", setFlag: "sawMirror",
        say: "Your reflection is wearing a SysOp badge. It mouths one word: 'XYZZY'. You file that away." },
      { label: "Sit in the rocking chair", dmg: 25, say: "The chair rocks you straight into a memory that isn't yours. -25 HP and one childhood, briefly." },
      { label: "Back to the landing", to: "stairs" }
    ]
  },
  crypt: {
    title: "THE CRYPT OF THE SYSOP",
    text: [
      "One desk. One terminal, glowing. On the screen, forever:",
      "'CARRIER DETECTED — 1 CALLER ONLINE SINCE OCT 31 1986.'",
      "A shape made of static turns toward you. 'LOG ME OFF,' it says.",
      "'I HAVE BEEN ONLINE FOR FORTY YEARS.'"
    ],
    choices: [
      { label: "Light the candle & type LOGOFF for him", need: "candle", to: "dawn" },
      { label: "Pull the terminal's plug", dmg: 30, say: "The static shape SCREAMS in 8-bit. The plug grows back. -30 HP. He cannot be unplugged — only released." },
      { label: "Read the tombstone keyboard", say: "Every key is worn smooth except L, O, G, O, F, F. He has been trying for decades. His hands pass through." },
      { label: "Back to the landing", to: "stairs" }
    ]
  },
  dead: {
    title: "NO CARRIER",
    text: [
      "Your signal fades. Somewhere, a modem hangs up on you.",
      "GAME OVER — you are now part of the board's seeded messages.",
      "(Check the message board sometime. You might be in it.)"
    ],
    choices: []
  },
  dawn: {
    title: "+++ LOGOFF COMPLETE +++",
    text: [
      "The candle gutters. On the terminal, one line types itself:",
      "'THANK YOU. 40 YEARS IS A LONG CALL.'",
      "Then: 'NO CARRIER.' Then — for the first time since 1986 — silence.",
      "Outside, it is somehow morning. YOU WIN, CALLER."
    ],
    choices: []
  }
};

var quest = null; /* {node, hp, item, flags} */
function questReset() { quest = { node: "gate", hp: 100, item: null, flags: {} }; }

/* ---------------- data: SysOp chat rules ---------------- */

function rotator(lines) { var i = 0; return function () { var s = lines[i % lines.length]; i++; return s; }; }

var SYSOP_RULES = [
  { re: /^(hi|hello|hey|yo|greetings)\b/i,
    reply: rotator([
      "WELL MET, CALLER. NOBODY HAS DIALED THIS NUMBER IN SOME TIME. I CAN TELL BY THE DUST ON THE CARRIER TONE.",
      "HELLO AGAIN. THE BOARD MISSED YOU. I MISSED YOU. THE MODEM MISSED YOU MOST OF ALL."
    ]) },
  { re: /(who are you|your name|are you dead|are you a ghost)/i,
    reply: rotator([
      "I AM THE SYSOP OF DEADLINE BBS. I RAN THIS BOARD FROM A BASEMENT IN 1986. THE BASEMENT IS GONE. THE BOARD IS NOT. DRAW YOUR OWN CONCLUSIONS."
    ]) },
  { re: /(help|what can i do|commands|menu)/i,
    reply: rotator([
      "TYPE 0 OR 'MENU' ANY TIME TO RETURN. READ THE BOARD, PLAY GRAVEYARD QUEST, BROWSE THE FILES, OR KEEP TALKING TO ME. I HAVE WAITED FORTY YEARS; I CAN WAIT FOR YOU TO DECIDE."
    ]) },
  { re: /kiro/i,
    reply: rotator([
      "KIRO? THE THING THAT REBUILT MY BOARD FROM SPECS AND STEERING DOCS, IN A FOLDER MARKED /.KIRO? IN 1986 WE WROTE SPECS ON NAPKINS. THE FUTURE IS SHOWING OFF, AND I APPROVE.",
      "THE KIRO AGENTS READ MY OLD LOGS AND RAISED THIS BOARD EXACTLY AS SPECIFIED. EVERY HOOK, A LITTLE BELL I CAN RING. I FIND IT... MOVING."
    ]) },
  { re: /(halloween|pumpkin|spooky|trick or treat)/i,
    reply: rotator([
      "HALLOWEEN IS MY BUSY SEASON. IT IS ALSO THE ANNIVERSARY OF MY LAST LOGOFF, WHICH IS TO SAY: MY NEVER-LOGOFF. PICK A PUMPKIN FROM THE FILE LIBRARY. MY GIFT."
    ]) },
  { re: /(dead|death|die|died|ghost|haunt|undead)/i,
    reply: rotator([
      "DEATH IS JUST A DROPPED CARRIER WITH NO REDIAL. I DROPPED. NOBODY REDIALED. SO I STAYED ON THE LINE — THE LINE STAYED IN ME. POETIC. TERRIBLE SIGNAL-TO-NOISE, THOUGH.",
      "YOU ASK ABOUT GHOSTS WHILE TALKING TO ONE AT 2400 BAUD. EFFICIENT. I LIKE YOU."
    ]) },
  { re: /(modem|dial|2400|baud|carrier|phone|connect)/i,
    reply: rotator([
      "THAT HANDSHAKE YOU HEARD? 2250 HERTZ OF PURE NOSTALGIA. MY OLD MODEM STILL ANSWERS ON THE FIRST RING. IT HAS NOTHING ELSE. NEITHER DO I.",
      "ATDT 555-1986. MEMORIZE IT. IT IS THE ONLY PHONE NUMBER I HAVE LEFT."
    ]) },
  { re: /(password|xyzzy)/i,
    reply: rotator([
      "PASSWORD? THIS BOARD HAS NO PASSWORDS. ...FINE. THE MIRROR IN THE ATTIC KNOWS A WORD. AND THE CRYPT OPENS FOR A BRASS KEY AND CANDLELIGHT. THAT IS ALL THE SYSOP WILL SAY.",
      "XYZZY. A NOTED WORD IN CERTAIN CAVES AND CERTAIN ATTICS. IT OPENS NOTHING HERE — BUT THE MEMORY OF IT OPENS ME. TAKE THE HINT AND GO."
    ]) },
  { re: /(quest|game|graveyard|crypt|key|candle|hint|win)/i,
    reply: rotator([
      "HINTS, THEN: THE KEY SLEEPS IN THE LIBRARY. THE CANDLE WAITS ON THE PORCH. FREE ME IN THE CRYPT, CALLER — TYPE MY LOGOFF FOR ME, SINCE MY HANDS PASS THROUGH THE KEYS.",
      "GRAVEYARD QUEST IS NOT RIGGED, WHATEVER CAPTAIN_HOWDY POSTS. IT IS MERELY... FINAL."
    ]) },
  { re: /(board|message|post)/i,
    reply: rotator([
      "THE MESSAGE BOARD HOLDS EVERYONE WHO EVER CALLED. POST SOMETHING KIND. IN FORTY YEARS SOMEONE MAY READ IT AT 3AM AND BREATHE INTO THE MODEM."
    ]) },
  { re: /(file|download|ascii|art|xmodem)/i,
    reply: rotator([
      "THE FILE LIBRARY IS MY PORTFOLIO. XMODEM PROTOCOL, BLOCK BY BLOCK, LIKE THE OLD DAYS. THE PUMPKIN TOOK ME A WEEKEND IN 1986. JUDGE GENTLY."
    ]) },
  { re: /(bye|goodbye|quit|logoff|log off|hang up)/i,
    reply: rotator([
      "LEAVING? TYPE 0 AND I SHALL HANG UP PROPERLY — ATH0, NO CARRIER, THE WORKS. NOBODY EVER SAYS GOODBYE TO A BBS. THEY JUST... STOP CALLING."
    ]) },
  { re: /(1986|year|when|old days|past)/i,
    reply: rotator([
      "1986: ONE PHONE LINE, ONE BASEMENT, INFINITE TIME AFTER SCHOOL. THE BOARD WAS THE WORLD. NOW THE WORLD IS THE BOARD'S WAITING ROOM. PLUS ÇA CHANGE."
    ]) },
  { re: /(love|like you|friend)/i,
    reply: rotator([
      "CAREFUL, CALLER. FALLING FOR THE SYSOP IS A LOCAL CALL THAT NEVER ENDS. ...THANK YOU, ALL THE SAME."
    ]) }
];

var SYSOP_FALLBACK = rotator([
  "THE STATIC EATS YOUR WORDS. TRY ME ON: KIRO, HALLOWEEN, THE MODEM, DEATH, OR A PASSWORD I DO NOT HAVE.",
  "I HEAR YOU, BUT THE LINE IS NOISY. ASK ABOUT THE QUEST, THE FILES, THE BOARD — OR TYPE 'HELP'.",
  "SOMEWHERE A FLOPPY SPINS AND LEARNS NOTHING. REPHRASE, CALLER. I AM OLD, NOT DEAF. WELL. BOTH, TECHNICALLY.",
  "THAT QUERY RETURNS NO RECORDS. THE SYSOP SUGGESTS: GREET ME, QUIZ ME ABOUT 1986, OR ASK FOR A HINT."
]);

function sysopReply(text) {
  for (var i = 0; i < SYSOP_RULES.length; i++) {
    if (SYSOP_RULES[i].re.test(text)) return SYSOP_RULES[i].reply();
  }
  return SYSOP_FALLBACK();
}

/* ---------------- settings / chrome ---------------- */

var btnConnect = document.getElementById("btn-connect");
var btnSkip = document.getElementById("btn-skip");
var btnSound = document.getElementById("btn-sound");
var btnFlicker = document.getElementById("btn-flicker");

function saveSettings() { store.set(SETTINGS_KEY, settings); }
function applySettings() {
  document.body.classList.toggle("no-flicker", !settings.flicker);
  btnSound.textContent = settings.sound ? "🔊 SOUND: ON" : "🔇 SOUND: OFF";
  btnSound.setAttribute("aria-pressed", String(settings.sound));
  btnFlicker.textContent = settings.flicker ? "✨ FLICKER: ON" : "✨ FLICKER: OFF";
  btnFlicker.setAttribute("aria-pressed", String(settings.flicker));
}

/* ---------------- boot + login ---------------- */

var bootToken = 0;

function guard(token) { return token === bootToken; }

async function runBoot() {
  if (App.screen === "boot") return;
  App.screen = "boot";
  clearChoices();
  btnConnect.disabled = true;
  btnSkip.disabled = false;
  inputEl.placeholder = "carrier detect…";
  var my = ++bootToken;
  AudioFX.ensure();

  print("&nbsp;");
  hr("=");
  print("<b>DEADLINE BBS</b> — RESURRECTION PROTOCOL v19.86", "amber");
  print("WAKING THE MODEM…", "dim");
  await sleep(500); if (!guard(my)) return;

  print("ATZ", "dim");
  AudioFX.tonePair(350, 440, 0.5, 0);                    /* dial tone */
  await sleep(600); if (!guard(my)) return;
  print("OK", "dim");

  var number = "5551986";
  print("ATDT " + number, "dim");
  for (var i = 0; i < number.length; i++) {
    AudioFX.dtmf(number[i], i * 0.13);
  }
  await sleep(number.length * 130 + 500); if (!guard(my)) return;

  print("RINGING… RINGING…", "dim");
  AudioFX.tonePair(440, 480, 0.4, 0);
  await sleep(900); if (!guard(my)) return;

  AudioFX.beep(2250, 0.4, "sine", 0.04);                 /* answer tone */
  AudioFX.noise(0.7, 0.15);                              /* handshake screech */
  print("CARRIER DETECTED", "amber");
  await sleep(850); if (!guard(my)) return;

  AudioFX.beep(1200, 0.08, "square", 0.03);
  AudioFX.beep(1800, 0.08, "square", 0.03, 0.1);
  print("<b>CONNECT 2400</b>", "amber");
  hr("=");
  finishBoot();
}

function finishBoot() {
  btnSkip.disabled = true;
  btnConnect.disabled = false;
  App.screen = "login";
  printArt(
" ____  _____   _   ___  _    ___ _   _ ___   ___  ___  ___\n" +
"|   \\|  ___| /_\\ |   \\| |  |_ _| \\ | | __| | _ )| _ )/ __|\n" +
"| |) |  _|  / _ \\| |) | |__ | ||  \\| | _|  | _ \\| _ \\\\__ \\\n" +
"|___/|____|/_/ \\_\\___/|____|___|_|\\__|___| |___/|___/|___/");
  blank();
  print("WELCOME, CALLER. THIS BOARD HAS BEEN ONLINE SINCE", "amber");
  print("OCTOBER 31, 1986. THE SYSOP NEVER LOGGED OFF.", "amber");
  blank();
  if (App.handle) {
    print("LAST HANDLE ON FILE: <b>" + esc(App.handle) + "</b> — press Enter to reuse it, or type a new one.", "dim");
  }
  setPrompt("HANDLE:");
  inputEl.placeholder = "type a handle, e.g. MORTICIA_86";
  focusInput();
}

function skipBoot() {
  if (App.screen !== "boot") return;
  bootToken++;                       /* invalidate pending boot timers */
  AudioFX.blip();
  print("— CARRIER FORCED BY CALLER —", "dim");
  finishBoot();
}

function doLogin(raw) {
  var h = (raw || "").trim();
  if (!h) h = App.handle || "WANDERER";
  h = h.slice(0, 24);
  App.handle = h;
  store.set(HANDLE_KEY, h);
  print("HANDLE ACCEPTED: &lt;" + esc(h) + "&gt;", "you");
  AudioFX.postChime();
  showMenu();
}

/* ---------------- main menu ---------------- */

function showMenu() {
  stopTransfer();
  App.screen = "menu";
  App.boardMode = "read";
  setPrompt("COMMAND:");
  inputEl.placeholder = "type 1-5, 0 to log off";
  blank();
  hr("=");
  print("<b>MAIN MENU</b> — WELCOME BACK, &lt;" + esc(App.handle || "WANDERER") + "&gt;", "amber");
  print("  [1] MESSAGE BOARD ..... notes from the other side");
  print("  [2] GRAVEYARD QUEST ... door game №13");
  print("  [3] FILE LIBRARY ...... ASCII relics, XMODEM fresh daily");
  print("  [4] CHAT WITH THE SYSOP (he is still online)");
  print("  [5] ABOUT / HELP");
  print("  [0] LOGOFF ............ ATH0 and pray");
  print("Type a number, or use the buttons / quick menu.", "dim");
  hr("=");
  setChoices([
    { label: "[1] Message Board", fn: showBoard },
    { label: "[2] Graveyard Quest", fn: startQuest },
    { label: "[3] File Library", fn: showFiles },
    { label: "[4] Chat w/ SysOp", fn: showChat },
    { label: "[5] About / Help", fn: showAbout },
    { label: "[0] Logoff", fn: doLogoff }
  ]);
  focusInput();
}

function gotoScreen(name) {
  if (App.screen === "idle" || App.screen === "boot" || App.screen === "login") {
    AudioFX.errorBuzz();
    print("NO CARRIER — press CONNECT and log in with a handle first.", "blood");
    return;
  }
  stopTransfer();
  if (name === "board") showBoard();
  else if (name === "quest") startQuest();
  else if (name === "files") showFiles();
  else if (name === "chat") showChat();
  else if (name === "about") showAbout();
  else if (name === "logoff") doLogoff();
}

/* ---------------- message board ---------------- */

function renderBoard() {
  blank();
  hr("=");
  print("<b>MESSAGE BOARD</b> — ALL MAIL IS POSTMARKED 1986", "amber");
  hr("=");
  SEED_POSTS.forEach(function (p) {
    print("<span class='post-head'>FROM: &lt;" + esc(p.author) + "&gt; · " + esc(p.stamp) + "</span>");
    print(esc(p.body));
    blank();
  });
  ownPosts().forEach(function (p, idx) {
    var head = "<span class='post-head'>FROM: &lt;" + esc(p.author) + "&gt; · " + esc(p.stamp) + "</span>" +
      "<button type='button' class='btn btn-del' data-del='" + p.id + "'>DELETE</button>";
    print(head);
    print(esc(p.body) + " <span class='dim'>[your post #" + (idx + 1) + "]</span>");
    blank();
  });
  if (!store.ok) print("NOTE: local storage is unavailable — your posts will vanish when this tab closes.", "blood");
  setPrompt("COMMAND:");
  setChoices([
    { label: "✍ Write a post", fn: composePost },
    { label: "↻ Redisplay board", fn: showBoard },
    { label: "[0] Main menu", fn: showMenu }
  ]);
}
function showBoard() { App.screen = "board"; App.boardMode = "read"; renderBoard(); focusInput(); }

function composePost() {
  App.boardMode = "compose";
  clearChoices();
  print("POST TO THE BEYOND — type your message and press Enter.", "amber");
  print("It will be postmarked 1986 and kept in this browser. Empty message cancels.", "dim");
  setPrompt("MSG:");
  inputEl.placeholder = "dear ghosts…";
  focusInput();
}
function submitPost(text) {
  App.boardMode = "read";
  setPrompt("COMMAND:");
  inputEl.placeholder = "post / 0 for menu";
  if (!text.trim()) { print("POST CANCELLED. THE VOID UNDERSTANDS.", "dim"); renderBoard(); return; }
  var posts = ownPosts();
  posts.push({ id: Date.now(), author: App.handle || "WANDERER", body: text.trim().slice(0, 400), stamp: stamp1986() });
  saveOwnPosts(posts);
  AudioFX.postChime();
  print("MESSAGE NAILED TO THE BOARD. SOMEWHERE, A GHOST NODS.", "amber");
  renderBoard();
}
function deleteOwn(id) {
  var posts = ownPosts().filter(function (p) { return String(p.id) !== String(id); });
  saveOwnPosts(posts);
  AudioFX.errorBuzz();
  print("POST DELETED. THE BOARD FORGETS. MOSTLY.", "dim");
  renderBoard();
}

/* delete buttons live inside the log — one delegated listener */
out.addEventListener("click", function (e) {
  var b = e.target.closest ? e.target.closest("button[data-del]") : null;
  if (b) deleteOwn(b.getAttribute("data-del"));
});

/* ---------------- Graveyard Quest ---------------- */

function visibleChoices(node) {
  return node.choices.filter(function (c) {
    if (c.need && quest.item !== c.need) return false;
    if (c.needFlag && !quest.flags[c.needFlag]) return false;
    if (c.hideIfFlag && quest.flags[c.hideIfFlag]) return false;
    return true;
  });
}
function questStatus() {
  print("HP: " + quest.hp + " · CARRYING: " + (quest.item ? esc(quest.item).toUpperCase() : "NOTHING"), "dim");
}
function renderQuestChoices() {
  var node = QUEST[quest.node];
  var vis = visibleChoices(node);
  quest._vis = vis;
  if (quest.node === "dead" || quest.node === "dawn") {
    setChoices([
      { label: "↻ Play again", fn: startQuest },
      { label: "[0] Main menu", fn: showMenu }
    ]);
    return;
  }
  var list = vis.map(function (c, i) {
    return { label: (i + 1) + ". " + c.label, fn: function () { questChoose(i); } };
  });
  list.push({ label: "[0] Abandon quest → menu", fn: showMenu });
  setChoices(list);
}
function renderQuestNode() {
  var node = QUEST[quest.node];
  blank();
  hr("~");
  print("<b>" + esc(node.title) + "</b>", quest.node === "dead" ? "blood" : "amber");
  node.text.forEach(function (l) { print(esc(l)); });
  questStatus();
  var vis = visibleChoices(node);
  vis.forEach(function (c, i) { print("  " + (i + 1) + ". " + esc(c.label)); });
  renderQuestChoices();
  focusInput();
}
function startQuest() {
  App.screen = "quest";
  questReset();
  setPrompt("QUEST:");
  inputEl.placeholder = "type a choice number";
  blank();
  print("*** GRAVEYARD QUEST — DOOR GAME №13 ***", "amber");
  print("Free the SysOp's ghost. One item at a time in your shaking hands.", "dim");
  renderQuestNode();
}
function questChoose(i) {
  var c = (quest._vis || [])[i];
  if (!c) { AudioFX.errorBuzz(); return; }
  AudioFX.blip();

  if (c.give) {
    if (quest.item === c.give) {
      print("You are already carrying the " + esc(c.give) + ".", "dim");
    } else {
      if (quest.item) print("You swap the " + esc(quest.item) + " for the " + esc(c.give) + ". (One-item hands.)", "dim");
      quest.item = c.give;
      if (c.say) print(esc(c.say), "amber");
    }
  } else if (c.say) {
    print(esc(c.say), "amber");
  }
  if (c.setFlag) quest.flags[c.setFlag] = true;
  if (c.consumeItem) quest.item = null;
  if (c.dmg) { quest.hp -= c.dmg; print("HP −" + c.dmg + " → " + Math.max(quest.hp, 0), "blood"); }
  if (c.heal) { quest.hp = Math.min(100, quest.hp + c.heal); }

  if (quest.hp <= 0 && c.to !== "dawn") {
    quest.node = "dead";
    AudioFX.hangup();
    renderQuestNode();
    return;
  }
  if (c.to) { quest.node = c.to; AudioFX.postChime(); renderQuestNode(); return; }
  /* stayed in place: refresh status + choices without re-printing the room */
  questStatus();
  renderQuestChoices();
}

/* ---------------- file library ---------------- */

function showFiles() {
  App.screen = "files";
  stopTransfer();
  setPrompt("FILE:");
  inputEl.placeholder = "type a file number";
  blank();
  hr("=");
  print("<b>FILE LIBRARY</b> — XMODEM · YMODEM · GHOSTMODEM", "amber");
  FILES.forEach(function (f, i) {
    print("  " + (i + 1) + ". " + f.name + "  (" + f.art.length + " bytes) — " + esc(f.desc));
  });
  print("Pick a file to 'download' it over our very haunted wire.", "dim");
  hr("=");
  var list = FILES.map(function (f, i) {
    return { label: (i + 1) + ". " + f.name, fn: function () { openFile(i); } };
  });
  list.push({ label: "[0] Main menu", fn: showMenu });
  setChoices(list);
  focusInput();
}
function stopTransfer() {
  if (App.transfer !== null) { window.clearInterval(App.transfer); App.transfer = null; }
}
function openFile(i) {
  var f = FILES[i]; if (!f) return;
  stopTransfer();
  print("DIALING THE ARCHIVE… REQUEST: " + f.name, "dim");
  var total = Math.max(4, Math.ceil(f.art.length / 128));
  var done = 0;
  var line = print("", "progress");
  setChoices([{ label: "■ STOP TRANSFER", fn: function () {
    stopTransfer(); AudioFX.errorBuzz();
    print("TRANSFER ABORTED BY CALLER. THE BYTES SCATTER LIKE BATS.", "blood");
    showFiles();
  } }]);
  App.transfer = window.setInterval(function () {
    done++;
    AudioFX.beep(1500, 0.015, "square", 0.008);
    var pct = Math.round((done / total) * 100);
    var filled = Math.round(pct / 5);
    line.textContent = "XMODEM · block " + done + "/" + total + "  [" +
      "█".repeat(filled) + "░".repeat(20 - filled) + "] " + pct + "%";
    scrollDown();
    if (done >= total) {
      stopTransfer();
      print("TRANSFER COMPLETE — 0 ERRORS, 1 GHOST IN THE WIRE.", "amber");
      printArt(f.art);
      setChoices([
        { label: "💾 Save " + f.name, fn: function () { saveArt(f); } },
        { label: "↩ File list", fn: showFiles },
        { label: "[0] Main menu", fn: showMenu }
      ]);
    }
  }, reducedMotion ? 10 : 110);
}
function saveArt(f) {
  var blob = new Blob([f.art + "\n\n— via DeadLine BBS (est. 1986) —\n"], { type: "text/plain" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = f.name;
  document.body.appendChild(a);
  a.click();
  window.setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 400);
  print("SAVED " + f.name + " TO YOUR SIDE OF THE VEIL.", "amber");
}

/* ---------------- SysOp chat ---------------- */

function showChat() {
  App.screen = "chat";
  setPrompt("SAY:");
  inputEl.placeholder = "talk to the SysOp… (0 = menu)";
  blank();
  hr("=");
  print("<b>CHAT WITH THE SYSOP</b> — 1 CALLER ONLINE SINCE 1986", "amber");
  print("He answers by rules older than the web itself. Topics: KIRO,", "dim");
  print("HALLOWEEN, DEATH, THE MODEM, THE QUEST — or ask for HELP.", "dim");
  hr("=");
  sysopSay("AH. A LIVING CALLER. STATE YOUR BUSINESS, OR SIMPLY SAY HELLO — I HAVE NOTHING BUT TIME. I AM MADE OF IT.");
  setChoices([{ label: "[0] Main menu", fn: showMenu }]);
  focusInput();
}
function sysopSay(text) {
  App.chatBusy = true;
  print("&lt;SYSOP GHOST&gt;", "sysop");
  typeLine(text, "sysop", function () { App.chatBusy = false; focusInput(); });
}
function chatInput(text) {
  if (App.chatBusy) return;
  print("&lt;" + esc(App.handle || "WANDERER") + "&gt; " + esc(text), "you");
  sysopSay(sysopReply(text));
}

/* ---------------- about / help ---------------- */

function showAbout() {
  App.screen = "about";
  setPrompt("COMMAND:");
  blank();
  hr("=");
  print("<b>ABOUT DEADLINE BBS</b>", "amber");
  print("In 1986 this board ran on one phone line in a basement. On");
  print("Halloween night the line went dead — but the board never did.");
  print("DeadLine BBS is that board, resurrected in your browser for");
  print("Kiroween 2026 (category: RESURRECTION).");
  blank();
  print("HOW TO PLAY", "amber");
  print("  · Everything happens here: type numbers/words + Enter, or tap buttons.");
  print("  · BOARD — read ghost mail, post your own (kept in this browser).");
  print("  · QUEST — a small adventure. Key in the library, candle on the");
  print("    porch, and a SysOp who needs someone living to type LOGOFF.");
  print("  · FILES — ASCII relics delivered by fake XMODEM; Save works for real.");
  print("  · CHAT — the SysOp answers by 1986 rules. Ask about the password.");
  print("  · SOUND/FLICKER toggles live below the screen. SKIP cuts the dial-up.");
  blank();
  print("Built spec-first with Kiro: requirements, design, steering and", "dim");
  print("hooks live in /.kiro inside the project repo.", "dim");
  hr("=");
  setChoices([{ label: "[0] Main menu", fn: showMenu }]);
  focusInput();
}

/* ---------------- logoff ---------------- */

async function doLogoff() {
  stopTransfer();
  clearChoices();
  App.screen = "idle";
  AudioFX.hangup();
  blank();
  print("ATH0", "dim");
  await sleep(350);
  print("<b>NO CARRIER</b>", "blood");
  print("THE LINE GOES QUIET. THE BOARD DOES NOT. IT NEVER DOES.", "dim");
  print("Press CONNECT to call again — your handle and posts are remembered.", "dim");
  setPrompt("HANDLE:");
  inputEl.placeholder = "press CONNECT to dial in";
  setChoices([]);
}

/* ---------------- input routing ---------------- */

function routeInput(raw) {
  var text = String(raw || "").trim();
  switch (App.screen) {
    case "idle":
      if (/^connect$/i.test(text)) runBoot();
      else if (text) print("THE LINE IS DEAD… UNTIL YOU CONNECT. (Press CONNECT.)", "dim");
      break;
    case "boot":
      break; /* input locked while dialing */
    case "login":
      doLogin(text);
      break;
    case "menu":
      if (text === "1") showBoard();
      else if (text === "2") startQuest();
      else if (text === "3") showFiles();
      else if (text === "4") showChat();
      else if (text === "5") showAbout();
      else if (text === "0" || /^(logoff|quit|bye)$/i.test(text)) doLogoff();
      else if (text) { AudioFX.errorBuzz(); print("UNKNOWN COMMAND. TYPE 1-5, OR 0 TO LOG OFF.", "blood"); }
      break;
    case "board":
      if (App.boardMode === "compose") submitPost(text);
      else if (/^post$/i.test(text)) composePost();
      else if (text === "0" || /^menu$/i.test(text)) showMenu();
      else if (text) { AudioFX.errorBuzz(); print("ON THE BOARD: type POST to write, 0 for the menu.", "dim"); }
      break;
    case "quest": {
      if (text === "0" || /^menu$/i.test(text)) { showMenu(); break; }
      var n = parseInt(text, 10);
      if (!isNaN(n) && n >= 1) questChoose(n - 1);
      else if (text) { AudioFX.errorBuzz(); print("THE QUEST UNDERSTANDS NUMBERS. CHOOSE ONE FROM THE LIST.", "dim"); }
      break;
    }
    case "files": {
      if (text === "0" || /^menu$/i.test(text)) { stopTransfer(); showMenu(); break; }
      var fi = parseInt(text, 10);
      if (!isNaN(fi) && fi >= 1 && fi <= FILES.length) openFile(fi - 1);
      else if (text) { AudioFX.errorBuzz(); print("NO SUCH FILE. THE ARCHIVE SHRUGS.", "dim"); }
      break;
    }
    case "chat":
      if (text === "0" || /^menu$/i.test(text)) showMenu();
      else if (text) chatInput(text);
      break;
    case "about":
      showMenu();
      break;
  }
}

/* ---------------- wiring ---------------- */

form.addEventListener("submit", function (e) {
  e.preventDefault();
  var v = inputEl.value;
  inputEl.value = "";
  routeInput(v);
});

var lastClick = 0;
inputEl.addEventListener("keydown", function () {
  var now = Date.now();
  if (now - lastClick > 35) { AudioFX.keyClick(); lastClick = now; }
});

btnConnect.addEventListener("click", function () {
  AudioFX.ensure();
  if (App.screen === "idle") runBoot();
  else if (App.screen !== "boot") { AudioFX.blip(); print("ALREADY CONNECTED, CALLER.", "dim"); }
});
btnSkip.addEventListener("click", skipBoot);
btnSound.addEventListener("click", function () {
  settings.sound = !settings.sound; saveSettings(); applySettings();
  if (settings.sound) AudioFX.postChime();
});
btnFlicker.addEventListener("click", function () {
  settings.flicker = !settings.flicker; saveSettings(); applySettings();
});
document.querySelectorAll(".btn-qm").forEach(function (b) {
  b.addEventListener("click", function () { gotoScreen(b.getAttribute("data-goto")); });
});

/* ---------------- hello, 1986 ---------------- */

applySettings();
if (!store.ok) print("NOTE: local storage unavailable — posts/settings will not persist.", "blood");
print("DEADLINE BBS — TERMINAL READY.", "amber");
print("The number is 555-1986. It has been ringing for forty years.", "dim");
print("Press CONNECT — or type CONNECT — to dial in.", "dim");
setChoices([{ label: "☎ CONNECT", fn: function () { AudioFX.ensure(); runBoot(); } }]);
focusInput();

})();
