// Targeted mechanics test: entropy key, quarantine vault + magnet,
// shoulder-surfing Looker, and the bait & switch tunnel.
import { build } from 'esbuild'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
await build({
  entryPoints: ['src/game/engine.ts'],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  outfile: 'scripts/.engine.cjs',
})
const E = require('./.engine.cjs')
const DT = 1 / 60
let fails = 0
const fail = (m) => {
  fails++
  console.error('  ✗ ' + m)
}
const ok = (m) => console.log('  ✓ ' + m)
const CS = 32

const s = E.createGame(0)
const drain = () => {
  const out = [...s.events]
  s.events.length = 0
  return out
}

// 1. entropy key + hitting a muted ghost -> DUEL challenge (no instant kill)
s.time = 20
s.ent.up = true
s.ent.num = true
s.ent.spec = true
s.powerWarned = true // skip the auth challenge so contact triggers the duel
s.player.px = 1.5 * CS
s.player.py = 1.5 * CS
s.player.dir = { x: 0, y: 0 }
E.updateGame(s, { desired: { x: 0, y: 0 } }, DT)
let evs = drain()
if (evs.some((e) => e.type === 'power' && e.text === 'full') && s.muteT > 10) ok('full master key arms 14s mute')
else fail('power did not arm full: ' + JSON.stringify(evs))
const blinky = s.ghosts[0]
blinky.px = s.player.px + 12
blinky.py = s.player.py
blinky.dir = { x: -1, y: 0 }
blinky.desired = { x: -1, y: 0 }
blinky.emergeT = 0
const shieldsBefore = s.shields
const scoreBefore0 = s.score
E.updateGame(s, { desired: { x: 0, y: 0 } }, DT)
evs = drain()
if (s.scn.active && s.scn.context === 'duel' && !blinky.dead) ok('hitting a muted ghost starts a DUEL challenge (no instant kill)')
else fail('duel not triggered: ' + JSON.stringify({ active: s.scn.active, ctx: s.scn.context, dead: blinky.dead }))
if (s.scn.active) {
  const corrects = s.scn.ch.items.map((it, i) => (it.correct ? i : -1)).filter((i) => i >= 0)
  for (const i of corrects) E.challengeTap(s, i)
  s.events.length = 0
  if (s.scn.result?.verdict === 'win' && blinky.dead && s.score === scoreBefore0 + 250 && s.shields > shieldsBefore)
    ok('correct duel answers -> ghost dies, +250 XP, +1 shield')
  else fail('duel win failed: ' + JSON.stringify({ r: s.scn.result, dead: blinky.dead, score: s.score, shields: s.shields }))
  E.dismissScenario(s)
}

// 2. report & block still works
s.lives = 99
const inky = s.ghosts[2]
inky.px = s.player.px + 60
inky.py = s.player.py
inky.dir = { x: 1, y: 0 }
inky.desired = { x: 1, y: 0 }
inky.emergeT = 0
E.doReportBlock(s)
evs = drain()
if (evs.some((e) => e.type === 'report') && inky.blockedT > 7) ok('report & block traps the troll')
else fail('report & block failed: ' + JSON.stringify(evs))

// 3. bait & switch: walk into the bait tile, resolve
{
  const s2 = E.createGame(0)
  const [bc, br] = s2.def.bait
  // approach from the left (row 13 is a full corridor in L1)
  s2.player.px = (bc - 0.5) * CS
  s2.player.py = (br + 0.5) * CS
  s2.player.dir = { x: 0, y: 0 }
  E.updateGame(s2, { desired: { x: 1, y: 0 } }, DT * 20)
  const ev2 = [...s2.events]
  s2.events.length = 0
  if (s2.bait.active && ev2.some((e) => e.type === 'bait')) ok('bait tunnel triggers and door slams')
  else fail('bait not triggered: ' + JSON.stringify(ev2) + ' active=' + s2.bait.active)
  // ghosts must not be able to enter the sealed cell
  const block = s2.baitBlock
  const pc = bc
  const pr = br
  const sealed =
    block[pr * s2.def.cols + (pc + 1)] === 1 &&
    block[pr * s2.def.cols + (pc - 1)] === 1 &&
    block[(pr + 1) * s2.def.cols + pc] === 1 &&
    block[(pr - 1) * s2.def.cols + pc] === 1
  if (sealed) ok('door seals the cell against ghosts')
  else fail('door not sealed')
  E.resolveBait(s2, true)
  const ev3 = [...s2.events]
  s2.events.length = 0
  if (ev3.some((e) => e.type === 'baitWin') && !s2.bait.active) ok('tracker spotted: +500, door opens')
  else fail('bait resolve failed: ' + JSON.stringify(ev3))
  // timeout path on a fresh run: let the 3s run out
  const s2b = E.createGame(0)
  s2b.player.px = (bc - 0.5) * CS
  s2b.player.py = (br + 0.5) * CS
  s2b.player.dir = { x: 0, y: 0 }
  E.updateGame(s2b, { desired: { x: 1, y: 0 } }, DT * 20)
  let sawBaitFail = false
  if (s2b.bait.active) {
    for (let f = 0; f < 400; f++) {
      E.updateGame(s2b, { desired: { x: 0, y: 0 } }, DT)
      for (const e of s2b.events) if (e.type === 'baitFail') sawBaitFail = true
    }
  }
  s2b.events.length = 0
  if (sawBaitFail) ok('3s timeout fails the check (+exposure)')
  else fail('bait timeout never fired')
}

// 4. gift box: direct touch = malware; magnet + vault = quarantine
{
  const s3 = E.createGame(0)
  s3.gift = { x: s3.player.px + 14, y: s3.player.py, attached: false, source: 'clyde' }
  E.updateGame(s3, { desired: { x: 1, y: 0 } }, DT * 3)
  const ev5 = [...s3.events]
  s3.events.length = 0
  if (ev5.some((e) => e.type === 'malware') && !s3.gift) ok('opening the gift runs malware (+exposure)')
  else fail('malware path failed: ' + JSON.stringify(ev5))

  const s4 = E.createGame(0)
  s4.gift = { x: s4.player.px + 20, y: s4.player.py, attached: false, source: 'pinky' }
  s4.magnetT = 12
  E.updateGame(s4, { desired: { x: 1, y: 0 } }, DT * 2)
  const ev6 = [...s4.events]
  s4.events.length = 0
  if (s4.gift?.attached && ev6.some((e) => e.type === 'magnetGrab')) ok('sandbox magnet grabs the payload')
  else fail('magnet grab failed: ' + JSON.stringify(ev6))
  const [vc, vr] = s4.def.vault
  s4.player.px = (vc + 0.5) * CS
  s4.player.py = (vr + 0.5) * CS
  s4.player.dir = { x: 0, y: 0 }
  E.updateGame(s4, { desired: { x: 0, y: 0 } }, DT * 2)
  const ev7 = [...s4.events]
  s4.events.length = 0
  if (ev7.some((e) => e.type === 'quarantine') && !s4.gift) ok('payload quarantined in the vault (+150)')
  else fail('quarantine failed: ' + JSON.stringify(ev7))
}

// 5. looker: cone over a credential tile blocks pickup; filter protects
{
  const s5 = E.createGame(0)
  const [uc, ur] = s5.def.entropy.up
  // place looker 2 cells to the left of the up-tile, facing it (angT=0 => cone points at player)
  s5.looker.px = (uc - 2) * CS + CS / 2
  s5.looker.py = (ur + 0.5) * CS
  s5.looker.angT = 0
  s5.looker.emergeT = 0
  s5.looker.dir = { x: 0, y: 0 }
  s5.player.px = (uc - 0.5) * CS // one cell left of the tile... must be open; L1 up is (12,3): (11,3) open
  s5.player.py = (ur + 0.5) * CS
  s5.player.dir = { x: 0, y: 0 }
  E.updateGame(s5, { desired: { x: 1, y: 0 } }, DT * 15)
  const ev8 = [...s5.events]
  s5.events.length = 0
  const stillThere = s5.kinds[ur * s5.def.cols + uc] === 'up'
  if (s5.inLight && stillThere && ev8.some((e) => e.type === 'copied'))
    ok('Looker cone copies credentials — tile NOT collected')
  else
    fail(
      'looker copy failed: inLight=' +
        s5.inLight +
        ' stillThere=' +
        stillThere +
        ' ev=' +
        JSON.stringify(ev8)
    )

  // with the privacy filter the same pickup works
  const s6 = E.createGame(0)
  const [uc2, ur2] = s6.def.entropy.up
  s6.looker.px = (uc2 - 2) * CS + CS / 2
  s6.looker.py = (ur2 + 0.5) * CS
  s6.looker.angT = 0
  s6.looker.emergeT = 0
  s6.looker.dir = { x: 0, y: 0 }
  s6.filterT = 10
  s6.player.px = (uc2 - 0.5) * CS
  s6.player.py = (ur2 + 0.5) * CS
  s6.player.dir = { x: 0, y: 0 }
  E.updateGame(s6, { desired: { x: 1, y: 0 } }, DT * 15)
  const ev9 = [...s6.events]
  s6.events.length = 0
  if (s6.ent.up && s6.kinds[ur2 * s6.def.cols + uc2] === '' && ev9.some((e) => e.type === 'ent'))
    ok('privacy filter blocks the cone — key part collected')
  else fail('filter protect failed: ' + JSON.stringify(ev9) + ' ent=' + JSON.stringify(s6.ent))
}

// 6. level clear path
{
  const s7 = E.createGame(0)
  s7.left = 0
  E.updateGame(s7, { desired: { x: 0, y: 0 } }, DT)
  s7.events.length = 0
  if (s7.phase === 'clear') ok('level clear path works')
  else fail('clear broken')
}

// 7. hands-on challenge: solve -> actor dies, XP earned; fail -> exposure
{
  const s8 = E.createGame(0)
  s8.time = 20
  // leak PII without bubble -> privacy challenge triggers (actor: pinky)
  let pi = -1
  for (let i = 0; i < s8.pii.length; i++) if (s8.pii[i]) pi = i
  s8.player.px = ((pi % s8.def.cols) + 0.5) * CS
  s8.player.py = (Math.floor(pi / s8.def.cols) + 0.5) * CS
  s8.player.dir = { x: 0, y: 0 }
  E.updateGame(s8, { desired: { x: 0, y: 0 } }, DT)
  s8.events.length = 0
  if (s8.scn.active && s8.scn.ch && s8.scn.actor === 'pinky') ok('PII leak triggers a hands-on challenge vs Pinky')
  else fail('challenge not triggered: ' + JSON.stringify({ active: s8.scn.active, actor: s8.scn.actor }))
  const frozenTime = s8.time
  const scoreBefore = s8.score
  E.updateGame(s8, { desired: { x: 0, y: 0 } }, DT)
  if (s8.time === frozenTime) ok('world is frozen during the challenge')
  else fail('world kept moving during challenge')
  // solve: tap every correct tile
  const corrects = s8.scn.ch.items.map((it, i) => (it.correct ? i : -1)).filter((i) => i >= 0)
  for (const i of corrects) E.challengeTap(s8, i)
  s8.events.length = 0
  const pinky = s8.ghosts.find((g) => g.kind === 'pinky')
  if (s8.scn.result?.verdict === 'win' && s8.score === scoreBefore + 250 && pinky.dead)
    ok('solving the challenge QUARANTINES Pinky and grants +250 XP')
  else fail('win path failed: ' + JSON.stringify({ r: s8.scn.result, score: s8.score, dead: pinky.dead }))
  E.dismissScenario(s8)
  E.updateGame(s8, { desired: { x: 0, y: 0 } }, DT)
  if (!s8.scn.active && s8.time > frozenTime) ok('world resumes after dismissal')
  else fail('world did not resume')

  // fail path: tap wrong tiles until out of tries
  const s9 = E.createGame(0)
  s9.time = 20
  let pi2 = -1
  for (let i = 0; i < s9.pii.length; i++) if (s9.pii[i]) pi2 = i
  s9.player.px = ((pi2 % s9.def.cols) + 0.5) * CS
  s9.player.py = (Math.floor(pi2 / s9.def.cols) + 0.5) * CS
  s9.player.dir = { x: 0, y: 0 }
  E.updateGame(s9, { desired: { x: 0, y: 0 } }, DT)
  s9.events.length = 0
  if (s9.scn.active) {
    const wrongs = s9.scn.ch.items.map((it, i) => (!it.correct ? i : -1)).filter((i) => i >= 0)
    for (const i of wrongs) E.challengeTap(s9, i) // 2 wrongs > maxWrong 1
    s9.events.length = 0
    const pinky9 = s9.ghosts.find((g) => g.kind === 'pinky')
    if (s9.scn.result?.verdict === 'fail' && s9.exposure >= 20 && !pinky9.dead)
      ok('failing the challenge leaves Pinky alive and adds exposure')
    else fail('fail path broken: ' + JSON.stringify({ r: s9.scn.result, exp: s9.exposure, dead: pinky9.dead }))
    // cap/cooldown prevents immediate re-trigger
    s9.scnCount = 3
    s9.scn.active = false
    s9.scn.ch = null
    s9.scn.result = null
    let pi3 = -1
    for (let i = 0; i < s9.pii.length; i++) if (s9.pii[i]) pi3 = i
    s9.player.px = ((pi3 % s9.def.cols) + 0.5) * CS
    s9.player.py = (Math.floor(pi3 / s9.def.cols) + 0.5) * CS
    s9.player.dir = { x: 0, y: 0 }
    E.updateGame(s9, { desired: { x: 0, y: 0 } }, DT)
    s9.events.length = 0
    if (!s9.scn.active) ok('challenge cap/cooldown prevents spam')
    else fail('challenge re-triggered despite cap')
  } else {
    fail('second challenge not active for fail path')
  }

  // looker (network) challenge: enter public wi-fi, solve, looker dies
  const s9b = E.createGame(0)
  s9b.time = 20
  const [w1, w2] = [s9b.def.wifiRect[0], s9b.def.wifiRect[1]]
  s9b.player.px = (w1 + 1 + 0.5) * CS
  s9b.player.py = (w2 + 1 + 0.5) * CS
  s9b.player.dir = { x: 0, y: 0 }
  E.updateGame(s9b, { desired: { x: 0, y: 0 } }, DT)
  s9b.events.length = 0
  if (s9b.scn.active && s9b.scn.actor === 'looker') ok('public wi-fi entry triggers the Looker challenge')
  else fail('looker challenge not triggered: ' + JSON.stringify(s9b.scn))
  if (s9b.scn.active) {
    const corrects = s9b.scn.ch.items.map((it, i) => (it.correct ? i : -1)).filter((i) => i >= 0)
    for (const i of corrects) E.challengeTap(s9b, i)
    s9b.events.length = 0
    if (s9b.scn.result?.verdict === 'win' && s9b.looker.dead) ok('solving quarantines the Looker (cone gone)')
    else fail('looker kill failed: ' + JSON.stringify({ r: s9b.scn.result, dead: s9b.looker.dead }))
  }
}

// 8. rank system: level ups unlock gear
{
  const s10 = E.createGame(0)
  s10.time = 20
  s10.score = 1495
  E.updateGame(s10, { desired: { x: 0, y: 0 } }, DT) // eats start-cell pellet (+10)
  s10.events.length = 0
  if (s10.level === 2 && s10.shieldCharge === true) ok('rank 2 unlocks Data Shield at 1500 pts')
  else fail('rank 2 failed: level=' + s10.level + ' charge=' + s10.shieldCharge + ' score=' + s10.score)
  s10.score = 3000
  E.updateGame(s10, { desired: { x: 0, y: 0 } }, DT)
  s10.events.length = 0
  if (s10.level === 3) ok('rank 3 unlocks Focus Mode (slower ghosts)')
  else fail('rank 3 failed: level=' + s10.level)
}

// 9. merchant: shop opens, purchase equips gear, weapon duel via FIGHT
{
  const s11 = E.createGame(0)
  s11.time = 20
  s11.player.px = s11.merchant.px
  s11.player.py = s11.merchant.py
  s11.player.dir = { x: 0, y: 0 }
  E.updateGame(s11, { desired: { x: 0, y: 0 } }, DT)
  s11.events.length = 0
  E.openShop(s11)
  s11.events.length = 0
  if (s11.shopOpen && s11.shopStock.length === 3) ok('merchant shop opens with 3 random items')
  else fail('shop open failed: ' + JSON.stringify({ open: s11.shopOpen, stock: s11.shopStock }))
  s11.credits = 100
  const c0 = s11.credits
  const hadGear = s11.gear
  E.buyItem(s11, 0)
  s11.events.length = 0
  if (s11.credits < c0 && (s11.weapon !== null || s11.gear !== hadGear)) ok('purchase deducts credits and equips the item')
  else fail('purchase failed: ' + JSON.stringify({ c0, c: s11.credits, w: s11.weapon, g: s11.gear }))
  // weapon duel via doFight (laser range 224)
  E.closeShop(s11)
  s11.weapon = 'laser'
  const pk = s11.ghosts.find((g) => g.kind === 'pinky')
  pk.emergeT = 0
  pk.px = s11.player.px + 200
  pk.py = s11.player.py
  pk.dir = { x: -1, y: 0 }
  pk.desired = { x: -1, y: 0 }
  E.doFight(s11)
  s11.events.length = 0
  if (s11.scn.active && s11.scn.context === 'duel') ok('FIGHT with a weapon starts a ranged duel')
  else fail('doFight failed: ' + JSON.stringify({ active: s11.scn.active, ctx: s11.scn.context }))
  if (s11.scn.active) {
    const corrects = s11.scn.ch.items.map((it, i) => (it.correct ? i : -1)).filter((i) => i >= 0)
    for (const i of corrects) E.challengeTap(s11, i)
    s11.events.length = 0
    if (s11.scn.result?.verdict === 'win' && pk.dead) ok('weapon duel win quarantines the threat')
    else fail('weapon duel failed: ' + JSON.stringify({ r: s11.scn.result, dead: pk.dead }))
    E.dismissScenario(s11)
  }
}

// 10. catch challenge: heart lost only on failure; armor absorbs
{
  const s12 = E.createGame(0)
  s12.time = 20
  s12.shields = 0
  const bk = s12.ghosts.find((g) => g.kind === 'blinky')
  bk.emergeT = 0
  bk.px = s12.player.px + 12
  bk.py = s12.player.py
  E.updateGame(s12, { desired: { x: 0, y: 0 } }, DT)
  s12.events.length = 0
  if (s12.scn.active && s12.scn.context === 'catch' && s12.lives === 3)
    ok('catch triggers a challenge without instantly losing a heart')
  else fail('catch challenge failed: ' + JSON.stringify({ active: s12.scn.active, ctx: s12.scn.context, lives: s12.lives }))
  if (s12.scn.active && s12.scn.ch.kind !== 'question')
    fail('catch challenge is not an awareness question: ' + s12.scn.ch.kind)
  else if (s12.scn.active) ok('catch challenge is an awareness QUESTION to answer')
  if (s12.scn.active) {
    const wrongs = s12.scn.ch.items.map((it, i) => (!it.correct ? i : -1)).filter((i) => i >= 0)
    E.challengeTap(s12, wrongs[0])
    s12.events.length = 0
    E.challengeTap(s12, wrongs[1])
    s12.events.length = 0
    if (s12.scn.result?.verdict === 'fail' && s12.lives === 2 && s12.exposure >= 20 && !bk.dead)
      ok('failed catch costs one heart + exposure; threat survives')
    else fail('catch fail failed: ' + JSON.stringify({ r: s12.scn.result, lives: s12.lives, exp: s12.exposure }))
    E.dismissScenario(s12)
  }
  // armor absorbs the heart loss
  const s13 = E.createGame(0)
  s13.time = 20
  s13.shields = 0
  s13.gear = 'armor'
  const bk2 = s13.ghosts.find((g) => g.kind === 'blinky')
  bk2.emergeT = 0
  bk2.px = s13.player.px + 12
  bk2.py = s13.player.py
  E.updateGame(s13, { desired: { x: 0, y: 0 } }, DT)
  s13.events.length = 0
  if (s13.scn.active) {
    const wrongs = s13.scn.ch.items.map((it, i) => (!it.correct ? i : -1)).filter((i) => i >= 0)
    E.challengeTap(s13, wrongs[0])
    s13.events.length = 0
    E.challengeTap(s13, wrongs[1])
    s13.events.length = 0
    if (s13.lives === 3 && s13.gear === null) ok('armor shatters and saves the heart')
    else fail('armor failed: ' + JSON.stringify({ lives: s13.lives, gear: s13.gear }))
  } else {
    fail('armor scenario did not start')
  }
}

// 11. bubble texts only appear when the actor is very close
{
  const s14 = E.createGame(0)
  s14.time = 20
  const bk = s14.ghosts.find((g) => g.kind === 'blinky')
  // far away: force the taunt timer, run a frame — no bubble may appear
  bk.px = s14.player.px + 15 * CS
  bk.py = s14.player.py
  bk.emergeT = 0
  bk.sayT = 0
  E.updateGame(s14, { desired: { x: 0, y: 0 } }, DT)
  s14.events.length = 0
  if (bk.bubT === 0 || bk.bubText === '') ok('far-away ghost stays silent (no bubble)')
  else fail('far ghost talked: ' + bk.bubText)
  // very close: force the timer again — bubble must appear
  bk.px = s14.player.px + 2 * CS
  bk.py = s14.player.py
  bk.sayT = 0
  E.updateGame(s14, { desired: { x: 0, y: 0 } }, DT)
  s14.events.length = 0
  if (bk.bubT > 0 && bk.bubText !== '') ok('close ghost shouts its lure bubble')
  else fail('close ghost did not talk')
}

console.log(fails ? `\nMECHANICS RESULT: FAIL (${fails})` : '\nMECHANICS RESULT: OK')
process.exit(fails ? 1 : 0)
