// Headless render smoke test: stubs a 2D context and draws every level in
// every special state to catch runtime errors in the renderer.
import { build } from 'esbuild'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const calls = { count: 0 }
function makeCtx() {
  const noop = () => {
    calls.count++
  }
  return new Proxy(
    {
      measureText: () => ({ width: 40 }),
      canvas: null,
      createRadialGradient: () => ({ addColorStop: () => {} }),
      createLinearGradient: () => ({ addColorStop: () => {} }),
    },
    {
      get(t, p) {
        if (p === 'measureText') return t.measureText
        if (p in t) return t[p]
        return noop
      },
      set() {
        return true
      },
    }
  )
}
globalThis.document = {
  createElement: () => ({
    width: 0,
    height: 0,
    getContext: () => makeCtx(),
  }),
}

await build({
  entryPoints: ['src/game/render.ts'],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  outfile: 'scripts/.render.cjs',
})
await build({
  entryPoints: ['src/game/engine.ts'],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  outfile: 'scripts/.engine.cjs',
})
// render.ts only imports types from engine/levels — levels has no DOM deps
const R = require('./.render.cjs')
const E = require('./.engine.cjs')

const DT = 1 / 60
let fails = 0
for (let lvl = 0; lvl < 3; lvl++) {
  const s = E.createGame(lvl)
  const ctx = makeCtx()
  const input = { desired: { x: 1, y: 0 } }
  for (let f = 0; f < 20 * 60; f++) {
    if (f % 50 === 0) input.desired = [ { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 } ][(f / 50 | 0) % 4]
    E.updateGame(s, input, DT)
    s.events.length = 0
    R.renderFrame(ctx, s, f / 60)
  }
  // hammer special states
  s.bubbleT = 2
  s.vpnT = 5
  s.magnetT = 6
  s.filterT = 6
  s.muteT = 3
  s.critical = true
  s.exposed = true
  s.inLight = true
  s.exposure = 100
  s.flash = 1
  s.shake = 6
  s.invulnT = 2
  s.ent.up = true
  s.ent.num = true
  s.ent.spec = true
  s.doorsUsed.T = true
  s.doorsUsed.F = true
  s.level = 5
  s.shieldCharge = true
  s.lvlT = 2
  s.weapon = 'laser'
  s.gear = 'armor'
  s.merchant.bubText = 'NEED GEAR? PRESS B!'
  s.merchant.bubT = 3
  s.gift = { x: 150, y: 150, attached: true, source: 'clyde' }
  s.cookies.push({ x: 100, y: 100, t: 5 }, { x: 200, y: 300, t: 1 })
  s.looker.copyT = 1
  s.looker.bubText = 'SCREEN COPY!'
  s.looker.bubT = 2
  s.player.bubText = 'PROTECT THE RED DATA!'
  s.player.bubT = 2
  s.bait.active = true
  s.bait.t = 2
  for (const g of s.ghosts) {
    g.tauntT = 2
    g.blockedT = 0
    g.bubText = 'FREE ROBUX!'
    g.bubTip = 'Free prizes are phish bait — check the URL'
    g.bubT = 2
  }
  s.ghosts[2].blockedT = 5
  s.ghosts[2].bubT = 0
  s.ghosts[0].emergeT = 1.5
  s.ghosts[1].dead = true // quarantined actors must not render
  s.phase = 'play'
  for (let f = 0; f < 90; f++) R.renderFrame(ctx, s, f / 60)
  if (calls.count < 5000) {
    fails++
    console.error(`level ${lvl + 1}: suspiciously few draw calls (${calls.count})`)
  } else {
    console.log(`level ${lvl + 1}: render OK (${calls.count} ctx ops)`)
  }
}
console.log(fails ? 'RENDER TEST: FAIL' : 'RENDER TEST: OK')
process.exit(fails ? 1 : 0)
