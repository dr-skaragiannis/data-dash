// Data-Dash level definitions.
// Each level has its own grid size (progressively larger) and is built from
// wall SEGMENTS on a cols x rows grid (borders auto-walled), which keeps
// corridors wide, kid-friendly and easy to validate.

export const CS = 32

export type GhostKind = 'blinky' | 'pinky' | 'inky' | 'clyde'

export type CellKind =
  | ''
  | 'pii'
  | 'power'
  | 'up' // entropy tile: UPPERCASE
  | 'num' // entropy tile: NUMBER
  | 'spec' // entropy tile: SPECIAL SYMBOL
  | 'magnet' // sandbox magnet
  | 'filter' // privacy screen filter
  | 'gateP' // incognito gate (privacy bubble)
  | 'gateH' // secure HTTPS gate (ghosts cannot cross)
  | 'doorT' // verified link door
  | 'doorF' // fake phishing door
  | 'vpn' // VPN token pickup
  | 'bait' // "FREE +500" bait-and-switch tile

export interface LevelDef {
  id: number
  cols: number
  rows: number
  name: string
  sub: string
  desc: string
  walls: [number, number, number, number][]
  power: [number, number][]
  pii: [number, number][]
  entropy: { up: [number, number]; num: [number, number]; spec: [number, number] }
  magnet: [number, number]
  filter: [number, number]
  vpn: [number, number][]
  gateP: [number, number][]
  gateH: [number, number][]
  doorT: [number, number]
  doorF: [number, number]
  wifiRect: [number, number, number, number]
  reportZone: [number, number, number, number]
  vault: [number, number]
  bait: [number, number]
  looker: [number, number]
  merchant: [number, number]
  player: [number, number]
  spawns: [GhostKind, number, number][]
  patrol: [number, number][]
  theme: { a: string; b: string; bg: string }
  ghostSpeed: number
  fakeUrl: string
  realUrl: string
  tip: string
}

export const PII_LABELS = [
  'Home address',
  'Phone number',
  'Password',
  'School name',
  'Birthday',
  'Wi-Fi name',
]

export interface BuiltLevel {
  walls: Uint8Array // 1 = solid for everyone
  gwalls: Uint8Array // 1 = solid for ghosts (walls + HTTPS gates + borders)
  kinds: CellKind[]
  pellets: Uint8Array
  wifi: Uint8Array
  report: Uint8Array
  piiLabels: string[]
}

export function buildLevel(def: LevelDef): BuiltLevel {
  const cols = def.cols
  const rows = def.rows
  const n = cols * rows
  const walls = new Uint8Array(n)
  const gwalls = new Uint8Array(n)
  const kinds: CellKind[] = new Array(n).fill('')
  const pellets = new Uint8Array(n)
  const wifi = new Uint8Array(n)
  const report = new Uint8Array(n)
  const piiLabels: string[] = new Array(n).fill('')

  const idx = (c: number, r: number) => r * cols + c

  for (let c = 0; c < cols; c++) {
    walls[idx(c, 0)] = gwalls[idx(c, 0)] = 1
    walls[idx(c, rows - 1)] = gwalls[idx(c, rows - 1)] = 1
  }
  for (let r = 0; r < rows; r++) {
    walls[idx(0, r)] = gwalls[idx(0, r)] = 1
    walls[idx(cols - 1, r)] = gwalls[idx(cols - 1, r)] = 1
  }

  for (const [x1, y1, x2, y2] of def.walls) {
    const xa = Math.min(x1, x2)
    const xb = Math.max(x1, x2)
    const ya = Math.min(y1, y2)
    const yb = Math.max(y1, y2)
    for (let x = xa; x <= xb; x++) {
      for (let y = ya; y <= yb; y++) {
        if (x <= 0 || y <= 0 || x >= cols - 1 || y >= rows - 1) continue
        walls[idx(x, y)] = 1
        gwalls[idx(x, y)] = 1
      }
    }
  }

  const setKind = (c: number, r: number, k: CellKind) => {
    kinds[idx(c, r)] = k
  }
  def.power.forEach(([c, r]) => setKind(c, r, 'power'))
  def.gateP.forEach(([c, r]) => setKind(c, r, 'gateP'))
  def.gateH.forEach(([c, r]) => {
    setKind(c, r, 'gateH')
    gwalls[idx(c, r)] = 1
  })
  setKind(def.doorT[0], def.doorT[1], 'doorT')
  setKind(def.doorF[0], def.doorF[1], 'doorF')
  setKind(def.entropy.up[0], def.entropy.up[1], 'up')
  setKind(def.entropy.num[0], def.entropy.num[1], 'num')
  setKind(def.entropy.spec[0], def.entropy.spec[1], 'spec')
  setKind(def.magnet[0], def.magnet[1], 'magnet')
  setKind(def.filter[0], def.filter[1], 'filter')
  def.vpn.forEach(([c, r]) => setKind(c, r, 'vpn'))
  setKind(def.bait[0], def.bait[1], 'bait')
  def.pii.forEach(([c, r], i) => {
    setKind(c, r, 'pii')
    piiLabels[idx(c, r)] = PII_LABELS[i % PII_LABELS.length]
  })

  {
    const [x1, y1, x2, y2] = def.reportZone
    for (let x = x1; x <= x2; x++) for (let y = y1; y <= y2; y++) report[idx(x, y)] = 1
  }
  {
    const [x1, y1, x2, y2] = def.wifiRect
    for (let x = x1; x <= x2; x++) for (let y = y1; y <= y2; y++) wifi[idx(x, y)] = 1
  }

  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      const i = idx(c, r)
      if (walls[i] === 0 && kinds[i] === '' && report[i] === 0) pellets[i] = 1
    }
  }

  return { walls, gwalls, kinds, pellets, wifi, report, piiLabels }
}

export const GHOST_INFO: Record<
  GhostKind,
  { name: string; role: string; color: string; desc: string }
> = {
  blinky: {
    name: 'BLINKY',
    role: 'Phish Bot',
    color: '#ff4d5e',
    desc: 'Chases you and lures you with fake prize links.',
  },
  pinky: {
    name: 'PINKY',
    role: 'Snooper',
    color: '#ff7bd5',
    desc: 'Ambushes you with unverified links & spyware gifts.',
  },
  inky: {
    name: 'INKY',
    role: 'Toxic Troll',
    color: '#35e0ff',
    desc: 'Trolls the chat with scripts. Report & Block him!',
  },
  clyde: {
    name: 'CLYDE',
    role: 'Ad-Tracker',
    color: '#ffa02f',
    desc: 'Drops cookies & fake "free skin" gift boxes.',
  },
}

export interface TauntPhrase {
  say: string
  tip: string
}
export const TAUNTS: TauntPhrase[] = [
  { say: 'LOUD!', tip: 'Cyberbullying: screenshot it, then block & report' },
  { say: "YOU'RE NO GOOD!", tip: 'Troll words are scripts — not the truth' },
  { say: 'NOBODY WANTS YOU!', tip: 'Trolls target everyone. It says nothing about you' },
  { say: 'LOG OFF! QUIT!', tip: 'Walking away is power. Tell an adult' },
  { say: 'SHARE YOUR PASSWORD!', tip: 'Never trade data to stop bullying — that is a trap' },
]
export const BLINKY_LURES: TauntPhrase[] = [
  { say: 'FREE ROBUX — CLICK!', tip: '"Free prizes" are phish bait — check the URL first' },
  { say: 'ACCOUNT LOCKED! URGENT!', tip: 'Urgency is a trick. Real games never rush your login' },
  { say: 'YOU WON A PRIZE! OPEN NOW', tip: 'You did not enter, you cannot win. It is a trap' },
  { say: 'TYPE YOUR PASSWORD HERE', tip: 'No real site ever asks for your password in chat' },
  { say: 'VERIFY QUICKLY! .xyz', tip: 'Typo domains with .xyz / .win = close the tab' },
]
export const PINKY_SPY: TauntPhrase[] = [
  { say: 'I SEE YOU!', tip: 'Keep location, school and home private — always' },
  { say: "WHAT'S YOUR REAL NAME?", tip: 'Never share real name + city together' },
  { say: 'SEND ME A SELFIE', tip: 'Photos stay forever. Would you post it publicly?' },
  { say: 'SHOW ME YOUR SCREEN!', tip: 'Shoulder-surfing is real — privacy filter first' },
]

export const LEVELS: LevelDef[] = [
  {
    id: 1,
    cols: 21,
    rows: 17,
    name: 'GAMING LOBBY',
    sub: 'Level 1',
    desc: 'Fake links, stranger gifts, public Wi-Fi — and a merchant with gear.',
    walls: [
      [5, 1, 5, 5],
      [11, 1, 11, 5],
      [15, 1, 15, 5],
      [2, 6, 3, 6],
      [7, 6, 9, 6],
      [13, 6, 13, 6],
      [17, 6, 19, 6],
      [5, 7, 5, 11],
      [11, 8, 11, 11],
      [15, 7, 15, 11],
      [2, 12, 3, 12],
      [7, 12, 9, 12],
      [13, 12, 13, 12],
      [17, 12, 19, 12],
      [5, 13, 5, 17],
      [11, 13, 11, 17],
      [15, 13, 15, 17],
    ],
    power: [
      [1, 1],
      [19, 1],
      [1, 15],
      [19, 15],
    ],
    pii: [
      [2, 2],
      [8, 2],
      [13, 2],
      [18, 2],
      [2, 9],
      [18, 9],
      [8, 15],
      [13, 15],
    ],
    entropy: { up: [11, 6], num: [6, 13], spec: [12, 9] },
    magnet: [9, 7],
    filter: [17, 11],
    vpn: [[18, 3]],
    gateP: [
      [8, 1],
      [13, 15],
    ],
    gateH: [
      [11, 12],
      [16, 6],
    ],
    doorT: [1, 9],
    doorF: [19, 9],
    wifiRect: [16, 1, 19, 4],
    reportZone: [1, 13, 3, 15],
    vault: [17, 15],
    bait: [6, 12],
    looker: [8, 9],
    merchant: [12, 12],
    player: [12, 7],
    spawns: [
      ['blinky', 8, 5],
      ['pinky', 2, 1],
      ['inky', 18, 9],
      ['clyde', 13, 15],
    ],
    patrol: [
      [17, 7],
      [19, 11],
      [17, 9],
      [19, 7],
    ],
    theme: { a: '#ff3fa4', b: '#26e5ff', bg: '#070a26' },
    ghostSpeed: 104,
    fakeUrl: 'dlsc0rd-security.ru',
    realUrl: 'discord.com/verify',
    tip: 'Before you click a link, scan the web address for typos. "dlsc0rd" is NOT "discord" — one zero hides the trap.',
  },
  {
    id: 2,
    cols: 25,
    rows: 21,
    name: 'SOCIAL STREAM',
    sub: 'Level 2',
    desc: 'A wider feed: geotags, screen-peekers and risky shares.',
    walls: [
      [5, 1, 5, 5],
      [11, 1, 11, 5],
      [15, 1, 15, 5],
      [19, 1, 19, 5],
      [2, 6, 4, 6],
      [7, 6, 10, 6],
      [13, 6, 14, 6],
      [17, 6, 18, 6],
      [21, 6, 23, 6],
      [5, 7, 5, 11],
      [11, 8, 11, 11],
      [15, 7, 15, 11],
      [19, 8, 19, 11],
      [2, 12, 4, 12],
      [7, 12, 10, 12],
      [13, 12, 14, 12],
      [17, 12, 18, 12],
      [21, 12, 23, 12],
      [5, 13, 5, 17],
      [11, 13, 11, 17],
      [15, 13, 15, 17],
      [19, 13, 19, 17],
      [2, 18, 4, 18],
      [7, 18, 10, 18],
      [13, 18, 14, 18],
      [17, 18, 18, 18],
      [21, 18, 23, 18],
    ],
    power: [
      [1, 1],
      [23, 1],
      [1, 19],
      [23, 19],
    ],
    pii: [
      [2, 2],
      [8, 2],
      [13, 2],
      [22, 2],
      [2, 9],
      [22, 9],
      [8, 15],
      [17, 15],
    ],
    entropy: { up: [11, 6], num: [12, 19], spec: [20, 9] },
    magnet: [8, 7],
    filter: [22, 11],
    vpn: [[22, 3]],
    gateP: [
      [8, 1],
      [17, 19],
    ],
    gateH: [
      [11, 12],
      [20, 6],
    ],
    doorT: [1, 9],
    doorF: [23, 9],
    wifiRect: [20, 1, 23, 4],
    reportZone: [1, 15, 3, 17],
    vault: [23, 17],
    bait: [6, 12],
    looker: [13, 9],
    merchant: [12, 12],
    player: [12, 7],
    spawns: [
      ['blinky', 8, 5],
      ['pinky', 2, 1],
      ['inky', 23, 9],
      ['clyde', 13, 17],
    ],
    patrol: [
      [21, 7],
      [23, 11],
      [21, 9],
      [23, 7],
    ],
    theme: { a: '#26e5ff', b: '#3dff8a', bg: '#031423' },
    ghostSpeed: 114,
    fakeUrl: 'insta-gr0ut.com/free',
    realUrl: 'instagram.com',
    tip: 'Someone watching over your shoulder can read your code. Pull down your privacy filter before you type credentials.',
  },
  {
    id: 3,
    cols: 29,
    rows: 25,
    name: 'GROUP CHAT',
    sub: 'Level 3',
    desc: 'The full arena: trolls, spam chains and one brave upstander.',
    walls: [
      [5, 1, 5, 5],
      [11, 1, 11, 5],
      [15, 1, 15, 5],
      [19, 1, 19, 5],
      [23, 1, 23, 5],
      [2, 6, 3, 6],
      [7, 6, 9, 6],
      [13, 6, 13, 6],
      [17, 6, 17, 6],
      [21, 6, 21, 6],
      [25, 6, 27, 6],
      [5, 7, 5, 11],
      [11, 8, 11, 11],
      [15, 7, 15, 11],
      [19, 8, 19, 11],
      [23, 7, 23, 11],
      [2, 12, 3, 12],
      [7, 12, 9, 12],
      [13, 12, 13, 12],
      [17, 12, 17, 12],
      [21, 12, 21, 12],
      [25, 12, 27, 12],
      [5, 13, 5, 17],
      [11, 13, 11, 17],
      [15, 13, 15, 17],
      [19, 13, 19, 17],
      [23, 13, 23, 17],
      [2, 18, 3, 18],
      [7, 18, 9, 18],
      [13, 18, 13, 18],
      [17, 18, 17, 18],
      [21, 18, 21, 18],
      [25, 18, 27, 18],
      [5, 19, 5, 23],
      [11, 19, 11, 23],
      [15, 19, 15, 23],
      [19, 19, 19, 23],
      [23, 19, 23, 23],
    ],
    power: [
      [1, 1],
      [27, 1],
      [1, 23],
      [27, 23],
    ],
    pii: [
      [2, 2],
      [8, 2],
      [13, 2],
      [21, 2],
      [26, 2],
      [2, 15],
      [26, 15],
      [13, 21],
    ],
    entropy: { up: [15, 12], num: [1, 15], spec: [27, 9] },
    magnet: [8, 9],
    filter: [21, 11],
    vpn: [[13, 10]],
    gateP: [
      [26, 1],
      [8, 23],
    ],
    gateH: [
      [11, 18],
      [20, 12],
    ],
    doorT: [1, 9],
    doorF: [27, 11],
    wifiRect: [12, 8, 14, 11],
    reportZone: [7, 1, 9, 3],
    vault: [27, 21],
    bait: [11, 12],
    looker: [8, 11],
    merchant: [16, 12],
    player: [13, 13],
    spawns: [
      ['blinky', 13, 21],
      ['pinky', 2, 1],
      ['inky', 24, 9],
      ['clyde', 8, 15],
    ],
    patrol: [
      [25, 7],
      [25, 9],
      [27, 15],
      [26, 7],
    ],
    theme: { a: '#ff8a3d', b: '#26e5ff', bg: '#0d0722' },
    ghostSpeed: 126,
    fakeUrl: 'free-robu4.win',
    realUrl: 'roblox.com/dev',
    tip: 'Screenshot bullying messages as proof, then block and report. Never fight back with more insults — walk away strong.',
  },
]
