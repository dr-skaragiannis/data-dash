# LLM-Prompt.md — Data-Dash: Concept & How to Create It with an LLM

This document has two parts:

1. **The concept idea** — what Data-Dash is and why it exists.
2. **How to create it with an LLM** — a prompting strategy plus a ready-to-paste master prompt.

---

## Part 1 — The Concept Idea

### One-line pitch

**Data-Dash** is a Pac-Man–style arcade game that teaches kids cybersecurity and privacy *by playing* — the maze is full of personal data, phishing links and four ghosts that each embody a real online threat.

### The idea in a paragraph

Traditional cyber-safety education for children is passive: slides, lectures, bullet points about "suspicious links". Kids forget it because threats feel abstract. Data-Dash flips this: the player *experiences* every threat inside a familiar, immediately fun arcade loop. Collecting data safely, securing PII nodes, choosing the real URL over the homoglyph trap, reporting the troll — each is a game action with a score consequence **and** a lesson delivered at the exact moment it matters. You don't read that urgency is a phishing tactic; you click "ACCOUNT LOCKED! URGENT!", lose a life, and the tip appears on screen.

### Concept mapping (arcade → cybersecurity)

| Arcade element | Cyber-safety meaning |
|---|---|
| Pellets | Safe data / safe browsing |
| Red PII nodes | Personal data to secure (address, phone, password…) |
| 4 ghosts | BLINKY = phishing lures · PINKY = stranger snooping · INKY = troll/harassment · CLYDE = trackers/cookies |
| Two exit doors | Real URL vs. typo-squatted phishing URL |
| Power tiles | Privacy filter, VPN, incognito gate, HTTPS gate, report zone |
| Exposure meter | How "seen" you are online — mistakes make ghosts faster |
| Report & Block | The actual counter to cyberbullying, as a cooldown ability |
| Merchant shop | Firewall armor, privacy helmet — gear that teaches by effect |

### Structure

- **3 missions** with progressively larger mazes and faster ghosts: *Gaming Lobby* → *Social Stream* → *Group Chat*.
- **11 branching scenarios** (EN + GR): loyalty-card data harvesting, free AI face filters, live-location leaks, EXIF GPS, borrowed passwords…
- **Timed mini-challenges**: spot the real URL among homoglyph traps, pick the strong password, sort private vs. public data, riddles (phishing, data brokers, EXIF).
- **Five Digital Rules** the player leaves with after playing.

### Design principles (the concept's soul)

1. **Lesson at the moment of threat** — never a quiz before the danger; explanation only after the player acts.
2. **Content is data** — every taunt is `{ say, tip }`; you can't ship a scare without its lesson.
3. **Mechanics are metaphors** — exposure speeds up ghosts; the privacy helmet literally blocks the Looker.
4. **It must work as a game first** — fun arcade loop, shop, ranks, high score; the education rides underneath.

---

## Part 2 — How to Create This Using an LLM

### Strategy: prompt in layers, not all at once

Don't ask one prompt to "make a game". Feed the LLM **context → concept → architecture → iteration**, and keep every round small enough to verify.

| Round | Give the LLM | Acceptance check |
|---|---|---|
| 1 | Concept + tech stack + scaffold request | `npm run dev` starts, blank app runs |
| 2 | Level format spec + ask for `levels.ts` + a maze validator script | validator passes (reachability, sealed borders) |
| 3 | Engine contract (`createGame`/`updateGame`, no DOM) + core mechanics | headless sim runs 60s without crash/NaN |
| 4 | Renderer spec + headless render test | renders all levels all states |
| 5 | Content banks (ghosts, challenges, scenarios) — **give exact data shapes** | data compiles, counts match spec |
| 6 | UI shell, HUD, modals, save | playable end-to-end loop |
| 7 | Polish, balance, build single-file, deploy | `dist/index.html` opens via `file://` |

### Prompting rules that make this project succeed

1. **Lock the stack in the first prompt** (React 19, TS, Vite 7, Tailwind 4, `vite-plugin-singlefile`, Canvas 2D, no assets). LLMs drift otherwise.
2. **Insist on engine/renderer/UI separation with "no DOM in the engine"** — this is what enables the headless tests; say it explicitly every round.
3. **Demand content-as-code** — scenarios/challenges/taunts as typed data arrays, not hardcoded JSX.
4. **Ask for a validation script alongside every hand-authored artifact** — "when you write the levels, also write `check.mjs` that BFS-verifies reachability". LLMs are great at generating the test in the same breath.
5. **One module per round; run the tests before the next round.** Never accept "it should work".
6. **Paste file excerpts back** when asking for edits — LLMs forget files after many turns.
7. **Give the full content inventory up front** (counts: 3 levels, 4 ghosts, 11 scenarios, 6 URL sets, 12 questions…) so you can diff the result.

### Ready-to-paste master prompt

> Copy everything below the line into a capable coding LLM (Opus/GPT-4.1+ class).

---

You are a senior game developer + educational-content designer. Build a complete web game: **Data-Dash — Cyber Safety Arcade**.

## Mission

Children (~8–14) get passive, forgettable cyber-safety education. Build an arcade game that teaches digital safety **by playing**: every tile, ghost, door and mini-challenge is a teachable moment with an immediate in-game consequence. The lesson arrives at the exact moment of the threat — explanation only AFTER the player acts, never before.

## Concept

Pac-Man reinterpreted as network defense:
- Pellets = safe data (+10). Red **PII nodes** (Home address, Phone number, Password, School name, Birthday, Wi-Fi name) = personal data to secure (+50, +2 credits; leaking = exposure).
- **Two exit doors** = real URL vs homoglyph phishing URL (e.g. `dlsc0rd-security.ru` vs `discord.com/verify`); correct = +100; level-clear screen shows the safety tip.
- **Four ghosts**, each with taunts **structurally paired with a tip** (`{ say, tip }` — a scare can never ship without its lesson):
  - **BLINKY / Phish Bot** — urgency lures ("FREE ROBUX — CLICK!", "ACCOUNT LOCKED! URGENT!").
  - **PINKY / Snooper** — stranger danger ("WHAT'S YOUR REAL NAME?", "SEND ME A SELFIE").
  - **INKY / Toxic Troll** — harassment; counter = **Report & Block** (12s cooldown, banishes him 8s, +75, −10 exposure).
  - **CLYDE / Ad-Tracker** — cookies and fake "free skin" boxes.
- Power tiles: 4 power pellets (corners), magnet, privacy filter, VPN token, 2 incognito gates, 2 HTTPS gates (ghosts can't cross), bait tile ("FREE +500" win or fail), quarantine vault, report zone, Wi-Fi risky rect, merchant shop, shoulder-surfing **Looker** NPC.
- **3 missions**, larger & faster each time: GAMING LOBBY 21×17 speed 104 → SOCIAL STREAM 25×21 speed 114 → GROUP CHAT 29×25 speed 126. Ghost speed also `×= 1 + (exposure/100)*0.4`.
- **Exposure meter**: decay −1.1/s; ≥100 = critical vignette; recovery below 92. 5 ranks (threshold `level×1500`); rank 2 unlocks Shield Charge.
- **Shop items**: NEON SWORD 15, DATA BOW 25, FIREWALL LASER 35 (+5s timers), SHIELD SPELL 45, FIREWALL ARMOR 20, PRIVACY HELMET 30 (Looker can't read you).

## Stack (fixed — do not substitute)

React 19 · TypeScript 5.9 · Vite 7 · Tailwind CSS 4 (`@tailwindcss/vite`) · `clsx`/`tailwind-merge` · `vite-plugin-singlefile` (build = one self-contained `dist/index.html`) · hand-rolled Canvas 2D renderer · WebAudio-synthesized SFX (no assets) · Google Fonts Titan One + Nunito · `localStorage` save (`datadash-save` = `{hi, unlocked}` clamp 1–3, `datadash-mute`) · mobile viewport/PWA meta.

## Architecture (strict)

```
src/App.tsx            # React UI: menus, HUD, shop, modals, profile, save
src/game/engine.ts     # Pure state machine: createGame/updateGame + action fns — NO DOM
src/game/levels.ts     # Levels as wall SEGMENTS on cols×rows grid (borders auto-walled);
                       # PII_LABELS, GHOST_INFO, taunt banks {say, tip}
src/game/challenges.ts # Timed challenge banks — pure typed data
src/game/scenarios.ts  # Branching scenarios — pure typed data
src/game/items.ts      # Merchant inventory
src/game/render.ts     # Canvas renderer — reads state, zero game logic
src/game/audio.ts      # WebAudio SFX + mute
```

Rules: engine has zero DOM access (enables headless Node tests); renderer has zero logic; ALL educational content is plain data structures — adding a scenario/URL set/tip is a data edit, never a code change.

## Content inventory (must ship, counts enforced)

- **3 levels** with tiles: 4 power, PII, entropy (UPPER/NUMBER/SYMBOL), magnet, filter, 1–2 VPN, 2 gateP, 2 gateH, doorT/doorF, bait, vault, looker, merchant, report zone, Wi-Fi rect. Per-level theme colors + clear-screen tip.
- **11 scenarios** (EN+GR), each 4 choice stages + reveal, options graded `safe|cautious|fail|neutral`, results show `risk`/`goal`: megamart, sam, popfilter, smarttv, transit, quiz(GR), liveloc(GR), faceanime(GR), viber(GR), exif(GR), password.
- **Challenges** (timed 10–20s, maxWrong 1): 6 URL sets (real vs 2 homoglyph traps using `0/o`, `1/l`, `g9` + `.win`/`.xyz`/`.ru`), 3 password sets, 3 PII sets, 6 riddles (phishing, GPS metadata, data broker, EXIF, troll, fake HTTPS), 8-item spot-the-tracker, 12-question awareness bank each with `topic` + `why`.
- **UI copy**: 7 rotating loading tips; **Five Digital Rules** on Profile; 4 catch-shouts per ghost.
- Scenario category → ghost actor: `phish→blinky, privacy→pinky, bully→inky, biometric→clyde, network→looker, auth→blinky`.

## Economy (exact)

pellet +10 · PII secured +50/+2cr · doorT +100 · bait +500/+5cr (fail +10 exposure) · report&block +75/−10 exposure · challenge win +250/+5cr/−10 exposure/+1 shield (fail +20 or +10 exposure) · power clear `300 + lives×150` · pickups +50 · start 10 credits · Shield 15 bandwidth/5s.

## Quality bar (acceptance criteria)

Build 4 headless scripts (esbuild-bundle TS on the fly; no test framework) and make them pass:

1. `scripts/check.mjs` — per level: ghost borders sealed; BFS from player reaches EVERY pellet/special; ghost spawns+patrol reachable; report zone clear; no overlaps; no orphan corridors.
2. `scripts/sim.mjs` — minutes of scripted play per level: no crash, no NaN, no stuck actors, pellets decrease.
3. `scripts/sim2.mjs` — entropy key, vault+magnet, Looker, bait tunnel mechanics.
4. `scripts/render-test.mjs` — Proxy-stubbed 2D context; draw every level in every special state.

`npm run build` must emit one `dist/index.html` that works via `file://`.

## Deliverables

Playable 3-level game (all mechanics above) · all content banks · full screens (title/tips, HUD, level-clear with door URLs, scenario modal, challenge modal, shop, profile with rules + reset) · save + mute · touch controls · 4 passing validators · `README.md` · single-file build ready for GitHub Pages (root `index.html` on `gh-pages` branch).

## Suggested build order

1. Scaffold → 2. `levels.ts` + `check.mjs` until green → 3. `engine.ts` core + `sim.mjs` → 4. `render.ts` + `render-test.mjs` → 5. mechanics + `sim2.mjs` → 6. content banks → 7. `App.tsx` UI → 8. audio/polish/balance → 9. build & deploy.

## Voice & constraints

Kid-friendly, arcade hype, never preachy; short speech bubbles; actionable advice ("close the tab", "screenshot, block, report"). Greek scenarios in Greek; UI English. No external assets, no backend, no analytics. High contrast on `#04061a`.

---

### After the build: verification prompts

Use these follow-up prompts so the LLM checks its own work:

- *"Run all four validator scripts and fix every failure before telling me it's done."*
- *"List every item in the content inventory and point to its file:line — flag anything missing."*
- *"Review `engine.ts` for any DOM access — there must be none."*
- *"Build and confirm `dist/index.html` has no external JS/CSS references except Google Fonts."*
- *"Simulate a full playthrough in text: menu → level 1 → challenge → shop → death → game over. Flag any dead UI path."*
