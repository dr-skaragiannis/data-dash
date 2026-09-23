// Headless smoke test: runs the engine for a few simulated minutes with
// scripted input to catch crashes, NaNs, stuck actors and broken states.
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
const dirs = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 0, y: -1 },
]

function freshGame(lvl) {
  const s = E.createGame(lvl)
  return s
}

let fails = 0
const fail = (m) => {
  fails++
  console.error('  ✗ ' + m)
}

for (const lvl of [0, 1, 2]) {
  console.log(`\n=== Sim level ${lvl + 1} ===`)
  const s = freshGame(lvl)
  const input = { desired: { x: 0, y: 0 } }
  const startPellets = s.left
  let pelletSeen = false
  let ghostMoved = false
  const ghostStart = s.ghosts.map((g) => [g.px, g.py])
  let leaked = 0
  let secured = 0
  let ateGhost = 0
  let caught = 0

  for (let f = 0; f < 60 * 240 && s.phase === 'play'; f++) {
    // wander with occasional pauses + use action buttons sometimes
    const seg = Math.floor(f / 70) % 8
    if (seg < 4) input.desired = dirs[seg]
    else if (seg === 4) input.desired = { x: 0, y: 0 }
    else input.desired = dirs[(seg + 3) % 4]
    if (f === 300) E.doPrivacyShield(s)
    if (f === 500) E.doReportBlock(s)
    if (f % 600 === 300) E.doPrivacyShield(s)

    E.updateGame(s, input, DT)
    for (const e of s.events) {
      if (e.type === 'pellet') pelletSeen = true
      if (e.type === 'piiLeak') leaked++
      if (e.type === 'piiSecure') secured++
      if (e.type === 'ghostEat') ateGhost++
      if (e.type === 'caught') caught++
    }
    s.events.length = 0
    // the walker "answers" hands-on challenges like a player would
    if (s.scn.active) {
      if (s.scn.result) E.dismissScenario(s)
      else {
        const items = s.scn.ch.items
        let next = items.findIndex((it) => it.correct && !it.picked && !it.wrong)
        if (next < 0) next = items.findIndex((it) => !it.picked && !it.wrong)
        if (next >= 0) E.challengeTap(s, next)
      }
    }

    const p = s.player
    if (Number.isNaN(p.px) || Number.isNaN(p.py)) {
      fail(`NaN player position at frame ${f}`)
      break
    }
    for (const g of s.ghosts) {
      if (Number.isNaN(g.px) || Number.isNaN(g.py)) {
        fail(`NaN ghost ${g.kind} at frame ${f}`)
        break
      }
    }
    // wall penetration check: player, ghosts and looker must never be inside a wall
    const colsN = s.def.cols
    const c = Math.floor(p.px / 32)
    const r = Math.floor(p.py / 32)
    if (s.walls[r * colsN + c]) {
      fail(`player inside wall at ${c},${r} frame ${f}`)
      break
    }
    for (const g of s.ghosts) {
      if (g.dead) continue
      const gc = Math.floor(g.px / 32)
      const gr = Math.floor(g.py / 32)
      if (s.walls[gr * colsN + gc]) {
        fail(`ghost ${g.kind} inside wall at ${gc},${gr} frame ${f}`)
        break
      }
    }
    if (!s.looker.dead) {
      const lc = Math.floor(s.looker.px / 32)
      const lr = Math.floor(s.looker.py / 32)
      if (s.walls[lr * colsN + lc]) {
        fail(`looker inside wall at ${lc},${lr} frame ${f}`)
        break
      }
    }
  }

  if (s.left < startPellets) ghostMoved = true // pellets eaten implies movement
  if (pelletSeen) console.log('  ✓ pellets eaten')
  else fail('no pellets eaten in 240s of wandering')
  const gMoved = s.ghosts.some((g, i) => Math.hypot(g.px - ghostStart[i][0], g.py - ghostStart[i][1]) > 32)
  if (gMoved) console.log('  ✓ ghosts moved from spawns')
  else fail('ghosts never moved')
  console.log(
    `  · state: phase=${s.phase} score=${s.score} lives=${s.lives} exposure=${s.exposure.toFixed(1)} left=${s.left}/${startPellets} leaked=${leaked} secured=${secured} ateGhost=${ateGhost} caught=${caught}`
  )
  if (s.lives < 3 || caught > 0) console.log('  ✓ catch/life cycle triggered')

  // force-clear path
  if (s.phase === 'play') {
    if (s.scn.active) {
      if (!s.scn.result) {
        const next = s.scn.ch.items.findIndex((it) => it.correct && !it.picked)
        if (next >= 0) E.challengeTap(s, next)
        if (!s.scn.result) E.dismissScenario(s)
      } else {
        E.dismissScenario(s)
      }
    }
    s.left = 0
    for (let i = 0; i < 300; i++) E.updateGame(s, input, DT)
    s.events.length = 0
    if (s.phase === 'clear') console.log('  ✓ level-clear path works')
    else fail('level-clear path broken')
  }
}

console.log(fails ? `\nSIM RESULT: FAIL (${fails})` : '\nSIM RESULT: OK')
process.exit(fails ? 1 : 0)
