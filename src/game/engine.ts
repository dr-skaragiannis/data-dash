// Data-Dash game engine: pure state + update, no DOM.
// Active grid size (single active game at a time; set by createGame).
let GW = 19
let GH = 15

import {
  CS,
  LEVELS,
  GHOST_INFO,
  TAUNTS,
  BLINKY_LURES,
  PINKY_SPY,
  buildLevel,
  type LevelDef,
  type GhostKind,
  type CellKind,
  type BuiltLevel,
} from './levels'
import { pickScenario, type ScnCat } from './scenarios'
import { buildChallenge, buildQuestion, type Challenge } from './challenges'
import { ITEMS, itemById, WEAPON_RANGE } from './items'

const CAT_BY_KIND: Record<GhostKind, ScnCat> = {
  blinky: 'phish',
  pinky: 'privacy',
  inky: 'bully',
  clyde: 'biometric',
}

export type ActorRef = 'blinky' | 'pinky' | 'inky' | 'clyde' | 'looker'

const ACTOR_NAME: Record<ActorRef, string> = {
  blinky: 'BLINKY THE PHISH BOT',
  pinky: 'PINKY THE SNOOPER',
  inky: 'INKY THE TOXIC TROLL',
  clyde: 'CLYDE THE AD-TRACKER',
  looker: 'THE LOOKER',
}
const SHOUTS: Record<ActorRef, string[]> = {
  blinky: [
    'TOLD YOU — MY LINK WAS THE REAL ONE!',
    'PASSWORDS TASTE BETTER WHEN THEY ARE SHARED!',
    'TOO SLOW! THE PHISH IS ALREADY IN!',
    'CLICKY CLICKY — WHOOPS, YOU BITED!',
  ],
  pinky: [
    'I KNEW WHERE YOU WOULD RUN!',
    'SNOOPING IS MY DAY JOB!',
    'YOUR FOOTPRINT? DELICIOUS!',
    'I READ THAT FROM YOUR TAG, BY THE WAY!',
  ],
  inky: [
    'THE CHAT REMEMBERS EVERYTHING!',
    'YOU WILL NEVER WIN AGAIN!',
    'BLOCK ME? TRY IT!',
    'EVERYONE IN THE LOBBY SAWS THAT!',
  ],
  clyde: [
    'MY COOKIES NEVER LIE!',
    'THAT GIFT HAD A LITTLE EXTRA INSIDE!',
    'YOU ARE FULLY MAPPED. LOLL!',
    'CRUMB BY CRUMB, YOU ARE MINE!',
  ],
  looker: [
    'I CAN READ YOUR SCREEN FROM HERE!',
    'NO PRIVACY FILTER? NO PROBLEM!',
    'YOUR LOCATION IS PINNED, BY THE WAY!',
    'KEEP TYPING — I AM WATCHING!',
  ],
}
const CAT_ACTOR: Record<ScnCat, ActorRef> = {
  phish: 'blinky',
  privacy: 'pinky',
  bully: 'inky',
  biometric: 'clyde',
  network: 'looker',
  auth: 'blinky',
}

export interface Vec {
  x: number
  y: number
}
export interface InputState {
  desired: Vec
}

export interface Actor {
  px: number
  py: number
  dir: Vec
  face: Vec
  desired: Vec
}

export interface Ghost extends Actor {
  kind: GhostKind
  home: { c: number; r: number }
  emergeT: number
  stunT: number
  blockedT: number
  cookieT: number
  tauntT: number
  bubT: number
  bubText: string
  bubTip: string
  sayT: number
  ti: number
  dead: boolean
}

export interface Looker extends Actor {
  emergeT: number
  ang: number
  angT: number
  retargetT: number
  targetC: number
  targetR: number
  copyT: number
  bubT: number
  bubText: string
  dead: boolean
}

export interface Merchant extends Actor {
  sayT: number
  bubT: number
  bubText: string
}

export interface Gift {
  x: number
  y: number
  attached: boolean
  source: GhostKind
}
export interface Cookie {
  x: number
  y: number
  t: number
}
export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  t: number
  max: number
  color: string
  size: number
}
export interface FloatText {
  x: number
  y: number
  text: string
  color: string
  t: number
}
export interface GameEvent {
  type: string
  text?: string
}

export interface GameState {
  lvlIdx: number
  def: LevelDef
  walls: Uint8Array
  gwalls: Uint8Array
  ghostBlock: Uint8Array
  baitBlock: Uint8Array
  kinds: CellKind[]
  pellets: Uint8Array
  wifi: Uint8Array
  report: Uint8Array
  pii: Uint8Array
  piiLabels: string[]
  gateCd: Float32Array
  doorsUsed: { T: boolean; F: boolean }
  scn: {
    active: boolean
    cat: ScnCat
    context: 'icon' | 'catch' | 'duel'
    actor: ActorRef
    actorName: string
    shout: string
    ch: Challenge | null
    data: { risk: string; goal: string } | null
    result: { verdict: 'win' | 'fail'; effects: string[] } | null
  }
  scnCooldown: Record<ScnCat, number>
  scnCount: number
  credits: number
  weapon: string | null
  gear: string | null
  merchant: Merchant
  shopOpen: boolean
  shopStock: string[]
  merchantNear: boolean
  fightCd: number
  wifiWarned: boolean
  powerWarned: boolean
  left: number
  score: number
  lives: number
  level: number
  shieldCharge: boolean
  lvlT: number
  exposure: number
  critical: boolean
  bandwidth: number
  shields: number
  ent: { up: boolean; num: boolean; spec: boolean }
  muteT: number
  bubbleT: number
  vpnT: number
  magnetT: number
  filterT: number
  slowT: number
  boostT: number
  invulnT: number
  reportCd: number
  blinkyBoostT: number
  powerDenyCd: number
  copyCd: number
  onCookie: boolean
  exposed: boolean
  inLight: boolean
  introT: number
  time: number
  player: Actor & { chompT: number; bubT: number; bubText: string }
  ghosts: Ghost[]
  looker: Looker
  gift: Gift | null
  giftT: number
  giftT2: number
  bait: { active: boolean; t: number; used: boolean }
  inkyPatrolI: number
  inkyPatrolT: number
  cookies: Cookie[]
  parts: Particle[]
  texts: FloatText[]
  breach: string[]
  phase: 'play' | 'clear' | 'over'
  clearT: number
  overT: number
  overReason: 'lives' | 'critical' | ''
  clearBonus: number
  shake: number
  flash: number
  flashColor: 'red' | 'blue' | 'white'
  wakaFlip: boolean
  events: GameEvent[]
  mazeCanvas?: HTMLCanvasElement | null
}

const cellC = (px: number) => Math.floor(px / CS)
const cellR = (py: number) => Math.floor(py / CS)

function isOpen(block: Uint8Array, c: number, r: number) {
  return c >= 0 && c < GW && r >= 0 && r < GH && block[r * GW + c] === 0
}

const DIRS: Vec[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
]

// Classic tile-based mover: decisions happen exactly at cell centers.
// stopHere  -> the target is the CURRENT cell's center: the cell ahead (c+dx)
//              is the decision cell; if blocked we stop at this center.
// !stopHere -> we already passed the current center heading to the next one;
//              that cell was verified open when we passed, so we just travel
//              there (dynamic closure is a rare edge: we stop in place).
function stepActor(a: Actor, dist: number, block: Uint8Array, onCenter?: (c: number, r: number) => void) {
  let rem = dist
  let guard = 0
  while (rem > 1e-4 && guard++ < 14) {
    const dx = a.dir.x
    const dy = a.dir.y
    if (dx === 0 && dy === 0) {
      if (
        (a.desired.x !== 0 || a.desired.y !== 0) &&
        isOpen(block, cellC(a.px) + a.desired.x, cellR(a.py) + a.desired.y)
      ) {
        a.dir = { x: a.desired.x, y: a.desired.y }
        a.face = { x: a.desired.x, y: a.desired.y }
      } else {
        if (a.desired.x !== 0 || a.desired.y !== 0) a.face = { ...a.desired }
        return
      }
      continue
    }
    if (a.desired.x !== 0 || a.desired.y !== 0) a.face = { ...a.desired }
    const c = cellC(a.px)
    const r = cellR(a.py)
    const cx = (c + 0.5) * CS
    const cy = (r + 0.5) * CS
    let tx = cx
    let ty = cy
    let stopHere = false
    if (dx === 1) {
      if (a.px < cx - 1e-4) {
        stopHere = true
      } else {
        tx = cx + CS
      }
    } else if (dx === -1) {
      if (a.px > cx + 1e-4) {
        stopHere = true
      } else {
        tx = cx - CS
      }
    } else if (dy === 1) {
      if (a.py < cy - 1e-4) {
        stopHere = true
      } else {
        ty = cy + CS
      }
    } else {
      if (a.py > cy + 1e-4) {
        stopHere = true
      } else {
        ty = cy - CS
      }
    }
    const d = dx !== 0 ? Math.abs(tx - a.px) : Math.abs(ty - a.py)
    const tc = cellC(tx)
    const tr = cellR(ty)
    const des = a.desired
    const canTurn =
      (des.x !== 0 || des.y !== 0) &&
      (des.x !== dx || des.y !== dy) &&
      isOpen(block, tc + des.x, tr + des.y)
    const stopBlocked = stopHere ? !isOpen(block, c + dx, r + dy) : !isOpen(block, tc, tr)
    if (!canTurn && stopBlocked) {
      const m = stopHere ? Math.min(rem, d) : 0
      a.px += dx * m
      a.py += dy * m
      if (m >= d - 1e-4) {
        a.px = tx
        a.py = ty
        a.dir = { x: 0, y: 0 }
        if (onCenter) onCenter(tc, tr)
      }
      a.face = { x: dx, y: dy }
      return
    }
    const m = Math.min(rem, d)
    a.px += dx * m
    a.py += dy * m
    rem -= m
    if (m >= d - 1e-4) {
      a.px = tx
      a.py = ty
      if (canTurn) {
        a.dir = { x: des.x, y: des.y }
        a.face = { x: des.x, y: des.y }
      }
      if (onCenter) onCenter(tc, tr)
      if (d < 0.01) break
    }
  }
}

function ev(s: GameState, type: string, text?: string) {
  s.events.push({ type, text })
}

function burst(s: GameState, x: number, y: number, color: string, n: number, speed = 120) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2
    const v = speed * (0.35 + Math.random() * 0.85)
    s.parts.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      t: 0.5 + Math.random() * 0.35,
      max: 0.85,
      color,
      size: 2 + Math.random() * 3,
    })
  }
  if (s.parts.length > 340) s.parts.splice(0, s.parts.length - 340)
}

function float(s: GameState, x: number, y: number, text: string, color: string) {
  s.texts.push({ x, y, text, color, t: 2.4 })
}

function say(target: { bubT: number; bubText: string }, text: string, t: number) {
  target.bubText = text
  target.bubT = t
}

export function createGame(lvlIdx: number): GameState {
  const def = LEVELS[Math.max(0, Math.min(LEVELS.length - 1, lvlIdx))]
  GW = def.cols
  GH = def.rows
  const b: BuiltLevel = buildLevel(def)
  const n = GW * GH
  const pii = new Uint8Array(n)
  def.pii.forEach(([c, r]) => (pii[r * GW + c] = 1))
  let left = def.pii.length
  for (let i = 0; i < n; i++) if (b.pellets[i]) left++

  const s: GameState = {
    lvlIdx,
    def,
    walls: b.walls,
    gwalls: b.gwalls,
    ghostBlock: b.gwalls,
    baitBlock: new Uint8Array(n),
    kinds: b.kinds,
    pellets: b.pellets,
    wifi: b.wifi,
    report: b.report,
    pii,
    piiLabels: b.piiLabels,
    gateCd: new Float32Array(n),
    doorsUsed: { T: false, F: false },
    scn: {
      active: false,
      cat: 'phish',
      context: 'icon',
      actor: 'blinky',
      actorName: '',
      shout: '',
      ch: null,
      data: null,
      result: null,
    },
    scnCooldown: { phish: 0, privacy: 0, biometric: 0, network: 0, bully: 0, auth: 0 },
    scnCount: 0,
    credits: 10,
    weapon: null,
    gear: null,
    merchant: {
      px: (def.merchant[0] + 0.5) * CS,
      py: (def.merchant[1] + 0.5) * CS,
      dir: { x: 0, y: 0 },
      face: { x: 0, y: 0 },
      desired: { x: 1, y: 0 },
      sayT: 4,
      bubT: 0,
      bubText: '',
    },
    shopOpen: false,
    shopStock: [],
    merchantNear: false,
    fightCd: 0,
    wifiWarned: false,
    powerWarned: false,
    left,
    score: 0,
    lives: 3,
    level: 1,
    shieldCharge: false,
    lvlT: 0,
    exposure: 0,
    critical: false,
    bandwidth: 40,
    shields: 1,
    ent: { up: false, num: false, spec: false },
    muteT: 0,
    bubbleT: 0,
    vpnT: 0,
    magnetT: 0,
    filterT: 0,
    slowT: 0,
    boostT: 0,
    invulnT: 0,
    reportCd: 0,
    blinkyBoostT: 0,
    powerDenyCd: 0,
    copyCd: 0,
    onCookie: false,
    exposed: false,
    inLight: false,
    introT: 5,
    time: 0,
    player: {
      px: (def.player[0] + 0.5) * CS,
      py: (def.player[1] + 0.5) * CS,
      dir: { x: 0, y: 0 },
      face: { x: 0, y: -1 },
      desired: { x: 0, y: 0 },
      chompT: 0,
      bubT: 6,
      bubText: 'PROTECT THE RED DATA!',
    },
    ghosts: def.spawns.map(([kind, c, r]) => ({
      kind,
      px: (c + 0.5) * CS,
      py: (r + 0.5) * CS,
      dir: { x: 0, y: 0 },
      face: { x: 0, y: 0 },
      desired: { x: 0, y: 0 },
      home: { c, r },
      emergeT: 3.2,
      stunT: 0,
      blockedT: 0,
      cookieT: 3,
      tauntT: 0,
      bubT: 0,
      bubText: '',
      bubTip: '',
      sayT: 2 + Math.random() * 3,
      ti: 0,
      dead: false,
    })),
    looker: {
      px: (def.looker[0] + 0.5) * CS,
      py: (def.looker[1] + 0.5) * CS,
      dir: { x: 0, y: 0 },
      face: { x: 0, y: 0 },
      desired: { x: 0, y: 0 },
      emergeT: 1.2,
      ang: Math.random() * Math.PI * 2,
      angT: Math.random() * 10,
      retargetT: 0,
      targetC: def.player[0],
      targetR: def.player[1],
      copyT: 0,
      bubT: 0,
      bubText: '',
      dead: false,
    },
    gift: null,
    giftT: 30,
    giftT2: 55,
    bait: { active: false, t: 0, used: false },
    inkyPatrolI: 0,
    inkyPatrolT: 0,
    cookies: [],
    parts: [],
    texts: [],
    breach: [],
    phase: 'play',
    clearT: 0,
    overT: 0,
    overReason: '',
    clearBonus: 0,
    shake: 0,
    flash: 0,
    flashColor: 'white',
    wakaFlip: false,
    events: [],
    mazeCanvas: null,
  }
  return s
}

function ghostTarget(s: GameState, g: Ghost): { c: number; r: number } {
  const pc = cellC(s.player.px)
  const pr = cellR(s.player.py)
  if (g.kind === 'blinky') return { c: pc, r: pr }
  if (g.kind === 'pinky') {
    return { c: pc + s.player.face.x * 3, r: pr + s.player.face.y * 3 }
  }
  if (g.kind === 'inky') {
    const d = Math.hypot(g.px - s.player.px, g.py - s.player.py) / CS
    if (d <= 4) return { c: pc, r: pr }
    const p = s.def.patrol[s.inkyPatrolI % s.def.patrol.length]
    return { c: p[0], r: p[1] }
  }
  const d = Math.hypot(g.px - s.player.px, g.py - s.player.py) / CS
  return d > 6 ? { c: pc, r: pr } : { c: g.home.c, r: g.home.r }
}

function ghostDecide(s: GameState, g: Ghost) {
  const block = s.bait.active ? s.baitBlock : s.ghostBlock
  const c = cellC(g.px)
  const r = cellR(g.py)
  const opts: Vec[] = []
  for (const d of DIRS) {
    if (d.x === -g.dir.x && d.y === -g.dir.y && (g.dir.x !== 0 || g.dir.y !== 0)) continue
    if (isOpen(block, c + d.x, r + d.y)) opts.push(d)
  }
  if (opts.length === 0) {
    const back = { x: -g.dir.x, y: -g.dir.y }
    g.dir = back
    g.desired = { ...back }
    return
  }
  if (s.muteT > 0) {
    const pc = cellC(s.player.px)
    const pr = cellR(s.player.py)
    const d2 = (a: Vec) => {
      const dx = c + a.x - pc
      const dy = r + a.y - pr
      return dx * dx + dy * dy
    }
    opts.sort((a, b) => d2(b) - d2(a))
    g.dir = Math.random() < 0.3 ? opts[Math.floor(Math.random() * opts.length)] : opts[0]
  } else {
    const t = ghostTarget(s, g)
    const d2 = (a: Vec) => {
      const dx = c + a.x - t.c
      const dy = r + a.y - t.r
      return dx * dx + dy * dy
    }
    opts.sort((a, b) => d2(a) - d2(b))
    g.dir = opts[0]
  }
  g.desired = { ...g.dir }
  g.face = { ...g.dir }
}

function resetGhost(_s: GameState, g: Ghost, emerge: number) {
  g.px = (g.home.c + 0.5) * CS
  g.py = (g.home.r + 0.5) * CS
  g.dir = { x: 0, y: 0 }
  g.desired = { x: 0, y: 0 }
  g.emergeT = emerge
  g.stunT = 0
  g.blockedT = 0
}

function distCells(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by) / CS
}

function trySpawnGift(s: GameState, source: GhostKind): boolean {
  const vc = s.def.vault
  for (let tries = 0; tries < 60; tries++) {
    const c = 1 + Math.floor(Math.random() * (GW - 2))
    const r = 1 + Math.floor(Math.random() * (GH - 2))
    const i = r * GW + c
    if (s.walls[i] || s.kinds[i] || s.report[i]) continue
    if (c === vc[0] && r === vc[1]) continue
    if (c === cellC(s.player.px) && r === cellR(s.player.py)) continue
    const d = distCells((c + 0.5) * CS, (r + 0.5) * CS, s.player.px, s.player.py)
    if (d < 3 || d > 8) continue
    s.gift = { x: (c + 0.5) * CS, y: (r + 0.5) * CS, attached: false, source }
    return true
  }
  return false
}

function triggerBait(s: GameState) {
  s.bait.active = true
  s.bait.t = 6
  s.player.dir = { x: 0, y: 0 }
  s.baitBlock.set(s.exposed && s.vpnT <= 0 ? s.walls : s.gwalls)
  const pc = cellC(s.player.px)
  const pr = cellR(s.player.py)
  for (const d of DIRS) s.baitBlock[(pr + d.y) * GW + (pc + d.x)] = 1
  say(s.player, 'WHOOPS — DOOR SHUT!', 4)
  ev(s, 'bait')
  s.shake = 6
  s.flash = 0.5
  s.flashColor = 'red'
}

function triggerChallenge(s: GameState, cat: ScnCat, context: 'icon' | 'catch' | 'duel', actorOverride?: ActorRef) {
  if (s.scn.active || s.phase !== 'play' || s.scnCount >= 4 || s.time < 12) return
  if (s.scnCooldown[cat] > 0) return
  const actor = actorOverride ?? CAT_ACTOR[cat]
  const shouts = SHOUTS[actor]
  // CATCHES get an awareness QUESTION to answer; other triggers get hands-on puzzles
  let ch: Challenge
  let data: { risk: string; goal: string }
  if (context === 'catch') {
    const q = buildQuestion()
    ch = q.ch
    data = { risk: q.topic, goal: q.why }
  } else {
    ch = buildChallenge(cat)
    const sc = pickScenario(cat)
    data = { risk: sc.risk, goal: sc.goal }
  }
  if (s.weapon === 'laser' || s.gear === 'helmet') {
    ch.time += 5
    ch.timeMax += 5
  }
  s.scn = {
    active: true,
    cat,
    context,
    actor,
    actorName: ACTOR_NAME[actor],
    shout: shouts[Math.floor(Math.random() * shouts.length)],
    ch,
    data,
    result: null,
  }
  s.scnCooldown[cat] = 30
  s.scnCount++
  ev(s, 'scnStart', s.scn.data ? s.scn.data.risk : '')
}

function endChallenge(s: GameState, success: boolean) {
  const scn = s.scn
  const effects: string[] = []
  if (success) {
    // correct answer: the malicious actor dies
    let killed = false
    if (scn.actor === 'looker') {
      if (!s.looker.dead) {
        s.looker.dead = true
        burst(s, s.looker.px, s.looker.py, '#5a6bd8', 26, 160)
        float(s, s.looker.px, s.looker.py - 14, 'QUARANTINED!', '#3dff8a')
        killed = true
      }
    } else {
      const g = s.ghosts.find((x) => x.kind === scn.actor)
      if (g && !g.dead) {
        g.dead = true
        burst(s, g.px, g.py, GHOST_INFO[scn.actor as GhostKind].color, 30, 180)
        burst(s, g.px, g.py, '#ffffff', 12, 120)
        float(s, g.px, g.py - 14, 'QUARANTINED!', '#3dff8a')
        killed = true
      }
    }
    s.score += 250
    s.credits += 5
    s.exposure = Math.max(0, s.exposure - 10)
    s.bandwidth = Math.min(100, s.bandwidth + 20)
    s.shields = Math.min(4, s.shields + 1)
    s.invulnT = Math.max(s.invulnT, 1.5)
    effects.push('+250 XP', '+5 credits', 'Exposure -10', '+1 shield stored')
    if (killed) effects.push(`${scn.actorName} quarantined!`)
  } else {
    if (scn.context === 'catch') {
      if (s.gear === 'armor') {
        s.gear = null
        ev(s, 'armorBreak')
        effects.push('Armor shattered — heart saved!')
      } else {
        s.exposure = Math.min(100, s.exposure + 20)
        s.lives--
        effects.push('Exposure +20', 'Heart lost')
        if (s.lives <= 0 || s.exposure >= 100) {
          if (s.exposure >= 100) s.breach.push('Critical breach: 100% exposure')
          s.breach.push(`Challenge failed: ${scn.data ? scn.data.risk : ''}`)
          scn.result = { verdict: 'fail', effects }
          ev(s, 'scnEnd', 'fail')
          gameOver(s, s.exposure >= 100 ? 'critical' : 'lives')
          return
        }
        const p = s.player
        p.px = (s.def.player[0] + 0.5) * CS
        p.py = (s.def.player[1] + 0.5) * CS
        p.dir = { x: 0, y: 0 }
        p.face = { x: 0, y: -1 }
        s.invulnT = 2.5
        for (const g2 of s.ghosts) if (!g2.dead) resetGhost(s, g2, 1.6)
      }
    } else if (scn.context === 'duel') {
      if (s.weapon !== 'spell') s.muteT = 0
      const g = s.ghosts.find((x) => x.kind === scn.actor)
      if (g && !g.dead) resetGhost(s, g, 2.5)
      s.exposure = Math.min(100, s.exposure + 10)
      effects.push('Exposure +10', 'Threat retreated')
      if (s.weapon !== 'spell') effects.push('2FA stance broken')
    } else {
      s.exposure = Math.min(100, s.exposure + 20)
      s.slowT = 2.5
      effects.push('Exposure +20', 'Slowed down by the leak')
    }
    s.flash = 0.8
    s.flashColor = 'red'
    s.shake = 6
    if (scn.context !== 'catch') s.breach.push(`Challenge failed: ${scn.data ? scn.data.risk : ''}`)
  }
  scn.result = { verdict: success ? 'win' : 'fail', effects }
  ev(s, 'scnEnd', success ? 'win' : 'fail')
}

export function doFight(s: GameState) {
  if (s.phase !== 'play' || s.scn.active || s.shopOpen) return
  if (s.fightCd > 0) return
  let range = 0
  if (s.weapon && WEAPON_RANGE[s.weapon]) range = WEAPON_RANGE[s.weapon]
  else if (s.muteT > 0) range = 34
  else {
    ev(s, 'deny', 'No weapon! Buy gear from the Merchant (B) or arm a 2FA checkpoint')
    s.fightCd = 0.8
    return
  }
  let best: Ghost | null = null
  let bd = range
  for (const g of s.ghosts) {
    if (g.dead || g.emergeT > 0 || g.stunT > 0 || g.blockedT > 0) continue
    const d = Math.hypot(g.px - s.player.px, g.py - s.player.py)
    if (d < bd) {
      bd = d
      best = g
    }
  }
  if (!best) {
    ev(s, 'deny', 'No threat in range!')
    s.fightCd = 0.8
    return
  }
  s.fightCd = 1
  ev(s, 'fight', GHOST_INFO[best.kind].name)
  triggerChallenge(s, CAT_BY_KIND[best.kind], 'duel', best.kind)
}

export function openShop(s: GameState) {
  if (s.phase !== 'play' || s.scn.active) return
  if (s.shopOpen) {
    s.shopOpen = false
    return
  }
  if (Math.hypot(s.merchant.px - s.player.px, s.merchant.py - s.player.py) > 72) {
    ev(s, 'deny', 'Too far from the Merchant!')
    return
  }
  s.shopOpen = true
  const ids = ITEMS.map((i) => i.id)
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
  }
  s.shopStock = ids.slice(0, 3)
  ev(s, 'shopOpen')
}

export function closeShop(s: GameState) {
  s.shopOpen = false
}

export function buyItem(s: GameState, idx: number) {
  if (!s.shopOpen) return
  const id = s.shopStock[idx]
  const it = itemById(id)
  if (!it) return
  if (s.credits < it.price) {
    ev(s, 'deny', 'Not enough credits! Earn them securing data and winning challenges')
    return
  }
  s.credits -= it.price
  if (it.slot === 'weapon') s.weapon = it.id
  else s.gear = it.id
  s.shopStock.splice(idx, 1)
  ev(s, 'buy', it.id)
}

export function challengeTap(s: GameState, idx: number) {
  const scn = s.scn
  if (!scn.active || !scn.ch || scn.result) return
  const it = scn.ch.items[idx]
  if (!it || it.picked || it.wrong) return
  if (it.correct) {
    it.picked = true
    scn.ch.pickedCount++
    ev(s, 'scnPick', 'good')
    if (scn.ch.pickedCount >= scn.ch.need) endChallenge(s, true)
  } else {
    it.wrong = true
    scn.ch.wrongCount++
    ev(s, 'scnPick', 'bad')
    if (scn.ch.wrongCount > scn.ch.maxWrong) endChallenge(s, false)
  }
}

export function dismissScenario(s: GameState) {
  if (!s.scn.active || !s.scn.result) return
  s.scn.active = false
  s.scn.ch = null
  s.scn.data = null
  s.scn.result = null
  s.scn.shout = ''
}

export function resolveBait(s: GameState, success: boolean) {
  if (s.phase !== 'play' || !s.bait.active) return
  s.bait.active = false
  if (success) {
    s.score += 500
    s.credits += 5
    ev(s, 'baitWin')
    float(s, s.player.px, s.player.py - 14, '+500 TRACKER SPOTTED!', '#3dff8a')
    burst(s, s.player.px, s.player.py, '#3dff8a', 22, 160)
    say(s.player, 'SECURED! +500', 4)
  } else {
    s.exposure = Math.min(100, s.exposure + 10)
    s.blinkyBoostT = 2.5
    s.breach.push('Bait shortcut: hidden tracker slipped in (3s check failed)')
    ev(s, 'baitFail')
    s.flash = 0.8
    s.flashColor = 'red'
    s.shake = 7
  }
}

function playerOnCenter(s: GameState, c: number, r: number) {
  const i = r * GW + c
  const k = s.kinds[i]
  const x = (c + 0.5) * CS
  const y = (r + 0.5) * CS
  if (k === 'gateP') {
    if (s.gateCd[i] <= 0) {
      s.gateCd[i] = 8
      s.bubbleT = 5
      ev(s, 'gate')
      burst(s, x, y, '#35e0ff', 14, 90)
    }
  } else if (k === 'doorT') {
    if (!s.doorsUsed.T) {
      s.doorsUsed.T = true
      s.boostT = 3
      s.score += 100
      ev(s, 'doorT')
      float(s, x, y - 10, '+100 VERIFIED', '#3dff8a')
    }
  } else if (k === 'doorF') {
    if (!s.doorsUsed.F) {
      s.doorsUsed.F = true
      s.slowT = 4
      s.blinkyBoostT = 2.5
      s.exposure = Math.min(100, s.exposure + 10)
      s.breach.push(`Clicked a fake link: ${s.def.fakeUrl}`)
      ev(s, 'doorF')
      s.flash = 0.7
      s.flashColor = 'red'
      s.shake = 6
      triggerChallenge(s, 'phish', 'icon')
    }
  } else if (k === 'up' || k === 'num' || k === 'spec') {
    if (s.inLight && s.filterT <= 0) {
      // shoulder-surfing: the Looker reads the credential
      if (s.copyCd <= 0) {
        s.copyCd = 2.5
        s.exposure = Math.min(100, s.exposure + 8)
        s.looker.copyT = 1.6
        say(s.looker, 'SCREEN COPY!', 4)
        s.breach.push('Shoulder-surfed: a looker copied your key tile')
        ev(s, 'copied')
        s.flash = 0.7
        s.flashColor = 'red'
        s.shake = 5
        say(s.player, 'OUTSIDE THE LIGHT, PLEASE!', 4.5)
      }
      return // tile is NOT collected
    }
    s.kinds[i] = ''
    const part = k
    s.ent[part] = true
    s.score += 100
    ev(s, 'ent', part)
    float(s, x, y - 10, part === 'up' ? 'A +100' : part === 'num' ? '7 +100' : '# +100', '#ffd23f')
    const full = s.ent.up && s.ent.num && s.ent.spec
    if (full) {
      ev(s, 'keyFull')
      say(s.player, 'MASTER KEY BUILT!', 5)
      burst(s, x, y, '#3dff8a', 20, 140)
    }
  } else if (k === 'magnet') {
    s.kinds[i] = ''
    s.magnetT = 12
    s.score += 50
    ev(s, 'magnet')
    float(s, x, y - 10, 'MAGNET 12s', '#ff8a3d')
    say(s.player, 'DRAG THE GIFT TO THE VAULT!', 4.5)
  } else if (k === 'filter') {
    s.kinds[i] = ''
    s.filterT = 10
    s.score += 50
    ev(s, 'filter')
    float(s, x, y - 10, 'FILTER 10s', '#35e0ff')
  } else if (k === 'vpn') {
    s.kinds[i] = ''
    s.vpnT = 10
    s.score += 50
    ev(s, 'vpn')
    float(s, x, y - 10, 'VPN 10s', '#3dff8a')
  } else if (k === 'bait') {
    if (!s.bait.used) {
      s.bait.used = true
      triggerBait(s)
    }
  }
}

function gameOver(s: GameState, reason: 'lives' | 'critical') {
  s.phase = 'over'
  s.overT = 0
  s.overReason = reason
  ev(s, 'over')
}

function updateParts(s: GameState, dt: number) {
  for (let i = s.parts.length - 1; i >= 0; i--) {
    const p = s.parts[i]
    p.t -= dt
    if (p.t <= 0) {
      s.parts.splice(i, 1)
      continue
    }
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.vx *= 1 - 2.4 * dt
    p.vy *= 1 - 2.4 * dt
  }
  for (let i = s.texts.length - 1; i >= 0; i--) {
    const t = s.texts[i]
    t.t -= dt
    t.y -= 13 * dt
    if (t.t <= 0) s.texts.splice(i, 1)
  }
}

export function updateGame(s: GameState, input: InputState, dt: number) {
  if (s.scn.active) {
    // world frozen while the challenge runs; the clock still ticks down
    if (!s.scn.result && s.scn.ch) {
      s.scn.ch.time -= dt
      if (s.scn.ch.time <= 0) endChallenge(s, false)
    }
    return
  }
  if (s.shopOpen) return

  s.time += dt
  s.shake = Math.max(0, s.shake - dt * 26)
  s.flash = Math.max(0, s.flash - dt * 2.4)
  updateParts(s, dt)

  if (s.phase !== 'play') {
    if (s.phase === 'clear') s.clearT += dt
    else s.overT += dt
    return
  }

  s.introT = Math.max(0, s.introT - dt)
  s.muteT = Math.max(0, s.muteT - dt)
  s.bubbleT = Math.max(0, s.bubbleT - dt)
  s.vpnT = Math.max(0, s.vpnT - dt)
  s.magnetT = Math.max(0, s.magnetT - dt)
  s.filterT = Math.max(0, s.filterT - dt)
  s.slowT = Math.max(0, s.slowT - dt)
  s.boostT = Math.max(0, s.boostT - dt)
  s.invulnT = Math.max(0, s.invulnT - dt)
  s.reportCd = Math.max(0, s.reportCd - dt)
  s.fightCd = Math.max(0, s.fightCd - dt)
  s.blinkyBoostT = Math.max(0, s.blinkyBoostT - dt)
  s.powerDenyCd = Math.max(0, s.powerDenyCd - dt)
  s.copyCd = Math.max(0, s.copyCd - dt)
  s.lvlT = Math.max(0, s.lvlT - dt)
  s.player.bubT = Math.max(0, s.player.bubT - dt)
  s.looker.bubT = Math.max(0, s.looker.bubT - dt)

  // bait puzzle countdown (player frozen)
  if (s.bait.active) {
    s.bait.t -= dt
    if (s.bait.t <= 0) resolveBait(s, false)
  }

  const pc0 = cellC(s.player.px)
  const pr0 = cellR(s.player.py)
  s.exposed = s.wifi[pr0 * GW + pc0] === 1
  if (s.exposed && s.vpnT <= 0 && !s.wifiWarned) {
    s.wifiWarned = true
    triggerChallenge(s, 'network', 'icon')
  }
  if (s.exposed && s.vpnT <= 0) s.exposure = Math.min(100, s.exposure + 2.2 * dt)
  s.exposure = Math.max(0, s.exposure - 1.1 * dt)
  s.ghostBlock = s.exposed && s.vpnT <= 0 ? s.walls : s.gwalls

  if (s.exposure >= 100 && !s.critical) {
    s.critical = true
    ev(s, 'critical')
    s.shake = 7
    s.flash = 0.8
    s.flashColor = 'red'
  } else if (s.exposure < 92 && s.critical) {
    s.critical = false
  }

  // ---- looker (shoulder-surfing cone) ----
  const L = s.looker
  if (!L.dead) {
    L.emergeT = Math.max(0, L.emergeT - dt)
    L.copyT = Math.max(0, L.copyT - dt)
  const p0 = s.player
  const dxL = p0.px - L.px
  const dyL = p0.py - L.py
  const dL = Math.hypot(dxL, dyL)
  L.angT += dt
  const baseAng = Math.atan2(dyL, dxL)
  L.ang = baseAng + Math.sin(L.angT * 0.85) * 1.7
  L.retargetT -= dt
  if (L.retargetT <= 0) {
    L.retargetT = 2.5
    L.targetC = Math.max(1, Math.min(GW - 2, cellC(p0.px) + Math.round((Math.random() - 0.5) * 4)))
    L.targetR = Math.max(1, Math.min(GH - 2, cellR(p0.py) + Math.round((Math.random() - 0.5) * 4)))
  }
  if (L.emergeT <= 0) {
    const lc = cellC(L.px)
    const lr = cellR(L.py)
    if (L.dir.x === 0 && L.dir.y === 0) {
      const opts = DIRS.filter((d) => isOpen(s.walls, lc + d.x, lr + d.y))
      if (opts.length) {
        opts.sort(
          (a, b) =>
            (lc + a.x - L.targetC) ** 2 + (lr + a.y - L.targetR) ** 2 -
            ((lc + b.x - L.targetC) ** 2 + (lr + b.y - L.targetR) ** 2)
        )
        L.dir = opts[0]
        L.desired = { ...opts[0] }
      }
    } else {
      L.desired = { ...L.dir }
    }
    stepActor(L, 48 * dt, s.walls, (c, r) => {
      if (c !== cellC(L.px) || r !== cellR(L.py)) return
      const lc2 = c
      const lr2 = r
      const opts = DIRS.filter((d) => isOpen(s.walls, lc2 + d.x, lr2 + d.y))
      if (opts.length) {
        opts.sort(
          (a, b) =>
            (lc2 + a.x - L.targetC) ** 2 + (lr2 + a.y - L.targetR) ** 2 -
            ((lc2 + b.x - L.targetC) ** 2 + (lr2 + b.y - L.targetR) ** 2)
        )
        L.desired = opts[0]
      }
    })
  }
    const angTo = Math.atan2(dyL, dxL)
    let diff = L.ang - angTo
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    s.inLight =
      L.emergeT <= 0 &&
      s.gear !== 'helmet' &&
      dL < 3.4 * CS &&
      Math.abs(diff) < 0.55
  } else {
    s.inLight = false
  }

  // ---- merchant (wandering vendor ghost) ----
  const M = s.merchant
  M.bubT = Math.max(0, M.bubT - dt)
  s.merchantNear = Math.hypot(M.px - s.player.px, M.py - s.player.py) < 56
  M.sayT -= dt
  if (M.sayT <= 0) {
    M.sayT = 9
    if (distCells(M.px, M.py, s.player.px, s.player.py) <= 6) {
      M.bubText = 'NEED GEAR? PRESS B!'
      M.bubT = 5
    }
  }
  if (M.dir.x === 0 && M.dir.y === 0) {
    const mc = cellC(M.px)
    const mr = cellR(M.py)
    const opts = DIRS.filter((d) => isOpen(s.walls, mc + d.x, mr + d.y))
    if (opts.length) {
      M.dir = opts[Math.floor(Math.random() * opts.length)]
      M.desired = { ...M.dir }
    }
  } else {
    M.desired = { ...M.dir }
  }
  stepActor(M, 48 * dt, s.walls, (c, r) => {
    if (c !== cellC(M.px) || r !== cellR(M.py)) return
    const mc = c
    const mr = r
    if (Math.random() < 0.4) {
      const opts = DIRS.filter((d) => isOpen(s.walls, mc + d.x, mr + d.y))
      if (opts.length) M.desired = opts[Math.floor(Math.random() * opts.length)]
    }
  })

  // ---- player ----
  const p = s.player
  p.desired = s.bait.active ? { x: 0, y: 0 } : { ...input.desired }
  if (!s.bait.active) {
    let pv = 150
    if (s.slowT > 0) pv *= 0.55
    if (s.onCookie) pv *= 0.7
    if (s.boostT > 0) pv *= 1.3
    if (s.level >= 4) pv *= 1.12 // Speed Router
    stepActor(p, pv * dt, s.walls, (c, r) => playerOnCenter(s, c, r))
    p.chompT += dt * ((p.dir.x !== 0 || p.dir.y !== 0) ? 1 : 0.2)
  }

  // pickups at player cell (skipped while the bait door is shut)
  if (!s.bait.active) {
    const pc = cellC(p.px)
    const pr = cellR(p.py)
    const i = pr * GW + pc
    const px = (pc + 0.5) * CS
    const py = (pr + 0.5) * CS
    if (s.pellets[i]) {
      s.pellets[i] = 0
      s.left--
      s.score += 10
      s.bandwidth = Math.min(100, s.bandwidth + 4)
      s.wakaFlip = !s.wakaFlip
      ev(s, 'pellet')
      burst(s, px, py, '#ffd23f', 3, 60)
    }
    // Data Magnet: vacuum up pellets in the surrounding cells
    if (s.level >= 5) {
      for (const [dxx, dyy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const vc = pc + dxx
        const vr = pr + dyy
        if (vc < 0 || vr < 0 || vc >= GW || vr >= GH) continue
        const vi = vr * GW + vc
        if (s.pellets[vi]) {
          s.pellets[vi] = 0
          s.left--
          s.score += 10
          s.bandwidth = Math.min(100, s.bandwidth + 4)
          s.wakaFlip = !s.wakaFlip
          ev(s, 'pellet')
          burst(s, (vc + 0.5) * CS, (vr + 0.5) * CS, '#ffd23f', 3, 60)
        }
      }
    }
    if (s.pii[i]) {
      s.pii[i] = 0
      s.left--
      const label = s.piiLabels[i]
    if (s.bubbleT > 0) {
      s.score += 50
      s.credits += 2
      ev(s, 'piiSecure', label)
      float(s, px, py - 10, 'SECURED +50', '#3dff8a')
      burst(s, px, py, '#3dff8a', 12, 100)
    } else {
        s.exposure = Math.min(100, s.exposure + 25)
        s.breach.push(`Leaked personal data: ${label}`)
        ev(s, 'piiLeak', label)
        s.flash = 1
        s.flashColor = 'red'
        s.shake = 7
        burst(s, px, py, '#ff4d5e', 16, 140)
        triggerChallenge(s, 'privacy', 'icon')
      }
    }
    if (s.kinds[i] === 'power') {
      const parts = (s.ent.up ? 1 : 0) + (s.ent.num ? 1 : 0) + (s.ent.spec ? 1 : 0)
      if (s.gateCd[i] <= 0) {
        if (parts === 0) {
          if (s.powerDenyCd <= 0) {
            s.powerDenyCd = 2.4
            ev(s, 'deny', 'Assemble the key: A + 7 + # tiles!')
            say(s.player, 'FIND THE 2FA KEY TILES!', 4.5)
            burst(s, px, py, '#8a93a6', 6, 60)
          }
      } else {
        s.muteT = parts === 3 ? 14 : 7
        s.gateCd[i] = 3
        s.score += 25
        ev(s, 'power', parts === 3 ? 'full' : 'weak')
          burst(s, px, py, parts === 3 ? '#3dff8a' : '#ffd23f', 18, 120)
          if (!s.powerWarned) {
            s.powerWarned = true
            triggerChallenge(s, 'auth', 'icon')
          }
        }
      }
    }
  }

  // inky proximity (toxic troll) — drain + rotating scripted taunts
  const inky = s.ghosts.find((g) => g.kind === 'inky' && !g.dead)
  if (inky && inky.blockedT <= 0 && inky.emergeT <= 0) {
    const dIn = distCells(inky.px, inky.py, p.px, p.py)
    if (dIn <= 3.5) {
      s.bandwidth = Math.max(0, s.bandwidth - 3 * dt)
      inky.tauntT = Math.max(inky.tauntT, dt + 0.4)
      inky.sayT -= dt
      if (inky.sayT <= 0) {
        inky.sayT = 6
        const ph = TAUNTS[inky.ti++ % TAUNTS.length]
        inky.bubText = ph.say
        inky.bubTip = ph.tip
        inky.bubT = 6.5
      }
    } else {
      inky.tauntT = Math.max(0, inky.tauntT - dt)
      inky.sayT = Math.max(inky.sayT, 0.5)
    }
  }

  // ghost chatter (intent telegraphing) — only shouted when VERY close to you
  for (const g of s.ghosts) {
    if (g.dead) continue
    g.bubT = Math.max(0, g.bubT - dt)
    if (g.emergeT > 0 || g.stunT > 0 || g.blockedT > 0) continue
    g.sayT -= dt
    if (g.sayT <= 0) {
      const close = distCells(g.px, g.py, p.px, p.py) <= 4.5
      if (g.kind === 'blinky') {
        g.sayT = 14
        if (close) {
          const ph = BLINKY_LURES[g.ti++ % BLINKY_LURES.length]
          g.bubText = ph.say
          g.bubTip = ph.tip
          g.bubT = 6
        }
      } else if (g.kind === 'pinky') {
        g.sayT = 20
        if (close) {
          const ph = PINKY_SPY[g.ti++ % PINKY_SPY.length]
          g.bubText = ph.say
          g.bubTip = ph.tip
          g.bubT = 6
        }
      } else if (g.kind === 'clyde') {
        g.sayT = 16
      }
    }
  }

  // cookies
  s.onCookie = false
  for (let i2 = s.cookies.length - 1; i2 >= 0; i2--) {
    const ck = s.cookies[i2]
    ck.t -= dt
    if (ck.t <= 0) {
      s.cookies.splice(i2, 1)
      continue
    }
    if (Math.hypot(ck.x - p.px, ck.y - p.py) < 15) {
      s.onCookie = true
      s.exposure = Math.min(100, s.exposure + 1.3 * dt)
      if (Math.random() < dt * 6) burst(s, ck.x, ck.y, '#c98f4e', 1, 40)
    }
  }

  // ---- gift box (quarantine vault mechanic) ----
  if (s.gift) {
    const g = s.gift
    if (g.attached) {
      const fx = p.face.x !== 0 || p.face.y !== 0 ? p.face.x : 0
      const fy = p.face.x !== 0 || p.face.y !== 0 ? p.face.y : 0
      const tx = p.px - fx * 22
      const ty = p.py - fy * 22
      const k = Math.min(1, 12 * dt)
      g.x += (tx - g.x) * k
      g.y += (ty - g.y) * k
      const vc = s.def.vault
      if (cellC(p.px) === vc[0] && cellR(p.py) === vc[1]) {
        s.score += 150
        s.exposure = Math.max(0, s.exposure - 5)
        s.gift = null
        s.giftT = 25
        ev(s, 'quarantine')
        say(s.player, 'QUARANTINED! +150', 4)
        burst(s, (vc[0] + 0.5) * CS, (vc[1] + 0.5) * CS, '#35e0ff', 24, 150)
        s.shake = 4
      }
    } else {
      const d = Math.hypot(g.x - p.px, g.y - p.py)
      if (s.magnetT > 0 && d < 26) {
        g.attached = true
        ev(s, 'magnetGrab')
        say(s.player, 'DRAG IT TO THE VAULT!', 4.5)
        burst(s, g.x, g.y, '#ff8a3d', 12, 100)
      } else if (d < 15 && !s.bait.active) {
        s.gift = null
        s.giftT = 30
        s.exposure = Math.min(100, s.exposure + 15)
        s.slowT = 2
        s.blinkyBoostT = 2
        s.breach.push('Opened an unverified gift ("free skin") — malware ran')
        ev(s, 'malware')
        s.flash = 1
        s.flashColor = 'red'
        s.shake = 8
        burst(s, g.x, g.y, '#b06bff', 20, 150)
        triggerChallenge(s, 'phish', 'icon')
      }
    }
  } else if (s.time > 8) {
    const clydeAlive = !s.ghosts.find((g2) => g2.kind === 'clyde')?.dead
    const pinkyAlive = !s.ghosts.find((g2) => g2.kind === 'pinky')?.dead
    if (clydeAlive) {
      s.giftT -= dt
      if (s.giftT <= 0) {
        if (trySpawnGift(s, 'clyde')) {
          s.giftT = 45
          const clyde = s.ghosts.find((g2) => g2.kind === 'clyde')
          if (clyde && distCells(clyde.px, clyde.py, s.player.px, s.player.py) <= 4.5) {
            clyde.bubText = 'FREE SKIN!'
            clyde.bubTip = 'Unverified downloads hide malware — grab the Sandbox Magnet'
            clyde.bubT = 6
          }
          ev(s, 'gift')
        }
      }
    }
    if (pinkyAlive) {
      s.giftT2 -= dt
      if (s.giftT2 <= 0) {
        if (trySpawnGift(s, 'pinky')) s.giftT2 = 65
        s.giftT2 = Math.max(s.giftT2, 65)
      }
    }
  }

  // ---- ghosts ----
  s.inkyPatrolT += dt
  if (s.inkyPatrolT > 2.6) {
    s.inkyPatrolT = 0
    s.inkyPatrolI = (s.inkyPatrolI + 1) % s.def.patrol.length
  }

  const gblock = s.bait.active ? s.baitBlock : s.ghostBlock
  for (const g of s.ghosts) {
    if (g.dead) continue
    const wasBlocked = g.blockedT > 0
    g.emergeT = Math.max(0, g.emergeT - dt)
    g.stunT = Math.max(0, g.stunT - dt)
    g.blockedT = Math.max(0, g.blockedT - dt)
    if (g.kind === 'clyde') g.cookieT -= dt

    if (g.emergeT <= 0.0001 && g.emergeT + dt > 0.0001 && g.dir.x === 0 && g.dir.y === 0) {
      ghostDecide(s, g)
    }
    if (wasBlocked && g.blockedT <= 0 && g.dir.x === 0 && g.dir.y === 0) {
      ghostDecide(s, g)
    }
    if (g.emergeT > 0 || g.stunT > 0 || g.blockedT > 0) continue

    let v = s.def.ghostSpeed
    v *= 1 + (s.exposure / 100) * 0.4
    if (s.level >= 3) v *= 0.88 // Focus Mode: they cannot hear you
    if (s.exposed && s.vpnT <= 0) v *= 1.25
    if (s.muteT > 0) v *= 0.5
    if (g.kind === 'blinky' && s.blinkyBoostT > 0) v *= 1.3
    if (g.kind === 'inky' && distCells(g.px, g.py, p.px, p.py) <= 4) v *= 1.1

    stepActor(g, v * dt, gblock, (c, r) => {
      if (c === cellC(g.px) && r === cellR(g.py)) ghostDecide(s, g)
    })

    if (g.kind === 'clyde' && g.cookieT <= 0) {
      g.cookieT = 3.6
      if (s.cookies.length < 14) s.cookies.push({ x: g.px, y: g.py, t: 9 })
    }
  }

  // ---- collisions: EVERY touch is a challenge, never an instant outcome ----
  for (const g of s.ghosts) {
    if (g.dead) continue
    if (g.emergeT > 0 || g.stunT > 0 || g.blockedT > 0) continue
    if (Math.hypot(g.px - p.px, g.py - p.py) < 15) {
      const name = GHOST_INFO[g.kind].name
      if (s.invulnT > 0) continue
      if (s.muteT > 0) {
        // 2FA armed: this hit is a DUEL — the challenge decides who dies
        ev(s, 'fight', name)
        triggerChallenge(s, CAT_BY_KIND[g.kind], 'duel', g.kind)
        return
      } else if (s.shields > 0) {
        s.shields--
        ev(s, 'shieldBreak', name)
        burst(s, p.px, p.py, '#35e0ff', 16, 130)
        s.flash = 0.6
        s.flashColor = 'blue'
        s.shake = 5
        resetGhost(s, g, 2)
      } else if (s.level >= 2 && s.shieldCharge) {
        s.shieldCharge = false
        ev(s, 'dsShield', name)
        burst(s, p.px, p.py, '#35e0ff', 22, 150)
        s.flash = 0.7
        s.flashColor = 'blue'
        s.shake = 6
        p.px = (s.def.player[0] + 0.5) * CS
        p.py = (s.def.player[1] + 0.5) * CS
        p.dir = { x: 0, y: 0 }
        p.face = { x: 0, y: -1 }
        s.invulnT = 2.5
        for (const g2 of s.ghosts) resetGhost(s, g2, 1.6)
        say(p, 'DATA SHIELD SAVED YOU!', 4)
      } else {
        // plain catch: the challenger gets one fair shot at a challenge
        s.breach.push(`Caught by ${name}`)
        ev(s, 'caught', name)
        s.flash = 0.9
        s.flashColor = 'red'
        s.shake = 8
        triggerChallenge(s, CAT_BY_KIND[g.kind], 'catch', g.kind)
        return
      }
    }
  }

  // ---- rank up ----
  if (s.level < 5 && s.score >= s.level * 1500) {
    s.level++
    if (s.level === 2) s.shieldCharge = true
    s.lvlT = 3.2
    ev(s, 'levelup', String(s.level))
    s.shake = 5
    burst(s, p.px, p.py, '#ffd23f', 26, 170)
    burst(s, p.px, p.py, '#35e0ff', 14, 130)
  }

  // ---- level clear ----
  if (s.left <= 0 && s.phase === 'play') {
    s.phase = 'clear'
    s.clearT = 0
    s.clearBonus = 300 + s.lives * 150
    s.score += s.clearBonus
    ev(s, 'clear')
    for (let k2 = 0; k2 < 5; k2++) {
      burst(
        s,
        40 + Math.random() * (GW * CS - 80),
        40 + Math.random() * (GH * CS - 80),
        ['#ffd23f', '#3dff8a', '#35e0ff', '#ff3fa4'][k2 % 4],
        14,
        160
      )
    }
  }
}

export function doPrivacyShield(s: GameState) {
  if (s.phase !== 'play') return
  if (s.bait.active) {
    ev(s, 'deny', 'The door is shut — finish the check first!')
    return
  }
  if (s.bubbleT > 0) {
    ev(s, 'deny', 'Privacy shield already active')
    return
  }
  if (s.bandwidth < 15) {
    ev(s, 'deny', 'Not enough bandwidth! Eat safe dots')
    return
  }
  s.bandwidth -= 15
  s.bubbleT = 5
  ev(s, 'shieldOn')
  burst(s, s.player.px, s.player.py, '#35e0ff', 14, 100)
}

export function doReportBlock(s: GameState) {
  if (s.phase !== 'play') return
  if (s.bait.active) {
    ev(s, 'deny', 'The door is shut — finish the check first!')
    return
  }
  if (s.reportCd > 0) {
    ev(s, 'deny', 'Report & Block is on cooldown')
    return
  }
  const inky = s.ghosts.find((g) => g.kind === 'inky')
  if (!inky || inky.dead) {
    ev(s, 'deny', 'The troll is already quarantined')
    return
  }
  if (inky.emergeT > 0 || inky.blockedT > 0) {
    ev(s, 'deny', 'The troll is out of reach')
    return
  }
  if (distCells(inky.px, inky.py, s.player.px, s.player.py) > 6.5) {
    ev(s, 'deny', 'Troll too far — get closer first')
    return
  }
  const [zx1, zy1] = s.def.reportZone
  inky.px = (zx1 + 0.8) * CS
  inky.py = (zy1 + 0.8) * CS
  inky.dir = { x: 0, y: 0 }
  inky.blockedT = 8
  s.reportCd = 12
  s.exposure = Math.max(0, s.exposure - 10)
  s.score += 75
  ev(s, 'report')
  s.shake = 5
  burst(s, inky.px, inky.py, '#35e0ff', 20, 130)
  float(s, inky.px, inky.py - 16, 'BLOCKED!', '#ff4d5e')
  say(inky, 'BANNED?!', 5)
}
