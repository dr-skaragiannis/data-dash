// Validates Data-Dash mazes: row integrity, player reachability of every
// pellet/special, ghost reachability of every spawn, zone sanity.
import { build } from 'esbuild'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
await build({
  entryPoints: ['src/game/levels.ts'],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  outfile: 'scripts/.levels.cjs',
})
const L = require('./.levels.cjs')
let bad = false
const fail = (m) => {
  bad = true
  console.error('  ✗ ' + m)
}
const ok = (m) => console.log('  ✓ ' + m)

for (const def of L.LEVELS) {
  console.log(`\n=== Level ${def.id}: ${def.name} (${def.cols}x${def.rows}) ===`)
  const b = L.buildLevel(def)
  const COLS = def.cols
  const ROWS = def.rows
  const n = COLS * ROWS
  const at = (c, r) => r * COLS + c

  const open = (grid) => (c, r) =>
    c >= 0 && c < COLS && r >= 0 && r < ROWS && grid[at(c, r)] === 0

  const bfs = (start, isOpen) => {
    const seen = new Uint8Array(n)
    const q = [at(start[0], start[1])]
    seen[q[0]] = 1
    while (q.length) {
      const i = q.pop()
      const c = i % COLS
      const r = (i / COLS) | 0
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nc = c + dx
        const nr = r + dy
        if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue
        const j = at(nc, nr)
        if (!seen[j] && isOpen(nc, nr)) {
          seen[j] = 1
          q.push(j)
        }
      }
    }
    return seen
  }

  // borders must be solid for ghosts too
  let borderOpen = 0
  for (let c = 0; c < COLS; c++) {
    if (!b.gwalls[c]) borderOpen++
    if (!b.gwalls[(ROWS - 1) * COLS + c]) borderOpen++
  }
  for (let r = 0; r < ROWS; r++) {
    if (!b.gwalls[r * COLS]) borderOpen++
    if (!b.gwalls[r * COLS + COLS - 1]) borderOpen++
  }
  if (borderOpen) fail(`${borderOpen} border cells open in ghost grid`)
  else ok('ghost grid sealed at borders')

  const pOpen = open(b.walls)
  if (!pOpen(def.player[0], def.player[1])) fail('player start is inside a wall')
  const reach = bfs(def.player, pOpen)

  let pellets = 0
  let pelletBad = 0
  for (let i = 0; i < n; i++) {
    if (b.pellets[i]) {
      pellets++
      if (!reach[i]) pelletBad++
    }
  }
  ok(`pellet count: ${pellets}`)
  if (pelletBad) fail(`${pelletBad} pellets unreachable by player`)
  else ok('all pellets reachable')

  const specials = [
    ...def.power.map((p) => ['power', p]),
    ...def.pii.map((p) => ['pii', p]),
    ['up', def.entropy.up],
    ['num', def.entropy.num],
    ['spec', def.entropy.spec],
    ['magnet', def.magnet],
    ['filter', def.filter],
    ['bait', def.bait],
    ['vault', def.vault],
    ['looker', def.looker],
    ...def.vpn.map((p) => ['vpn', p]),
    ...def.gateP.map((p) => ['gateP', p]),
    ...def.gateH.map((p) => ['gateH', p]),
    ['doorT', def.doorT],
    ['doorF', def.doorF],
    ['merchant', def.merchant],
  ]
  for (const [kind, [c, r]] of specials) {
    const i = at(c, r)
    if (b.walls[i]) fail(`${kind} at ${c},${r} is inside a wall`)
    else if (!reach[i]) fail(`${kind} at ${c},${r} unreachable by player`)
  }
  ok(`special tiles: ${specials.length} checked`)

  const gOpen = open(b.gwalls)
  const spawns = def.spawns.map((s) => [s[1], s[2]])
  const greach = bfs(spawns[0], gOpen)
  for (const [kind, c, r] of def.spawns) {
    if (!gOpen(c, r)) fail(`ghost ${kind} spawn at ${c},${r} inside ghost wall`)
    else if (!greach[at(c, r)]) fail(`ghost ${kind} spawn at ${c},${r} not in main ghost area`)
  }
  for (const [c, r] of def.patrol) {
    if (!gOpen(c, r)) fail(`patrol point ${c},${r} is a ghost wall`)
    else if (!greach[at(c, r)]) fail(`patrol point ${c},${r} not in main ghost area`)
  }
  ok('ghost spawns & patrol reachable')

  const [zx1, zy1, zx2, zy2] = def.reportZone
  let reportOpen = true
  for (let x = zx1; x <= zx2; x++)
    for (let y = zy1; y <= zy2; y++)
      if (!pOpen(x, y)) reportOpen = false
  if (!reportOpen) fail('report zone contains walls')
  else ok('report zone clear')

  // no kind overlaps
  const seenKind = {}
  for (let i = 0; i < n; i++) {
    if (b.kinds[i]) {
      seenKind[i] = (seenKind[i] || 0) + 1
    }
  }
  if (Object.values(seenKind).some((v) => v > 1)) fail('overlapping kinds')

  // connectivity: all player-open cells should be reachable
  let orphan = 0
  for (let r = 1; r < ROWS - 1; r++)
    for (let c = 1; c < COLS - 1; c++)
      if (b.walls[at(c, r)] === 0 && !reach[at(c, r)]) orphan++
  if (orphan) fail(`${orphan} corridor cells unreachable`)
  else ok('full maze connected for player')
}

console.log(bad ? '\nRESULT: FAIL' : '\nRESULT: ALL MAZES OK')
process.exit(bad ? 1 : 0)
