// Canvas renderer for Data-Dash. Logical size = COLS*CS x ROWS*CS, drawn at 2x.
import { CS, GHOST_INFO, type LevelDef } from './levels'
import type { GameState, Ghost } from './engine'

const SCALE = 2

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function wifiIcon(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.strokeStyle = color
  ctx.lineWidth = 1.8
  ctx.lineCap = 'round'
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath()
    ctx.arc(x, y, i * s * 0.46, Math.PI * 1.2, Math.PI * 1.8)
    ctx.stroke()
  }
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, 1.6, 0, Math.PI * 2)
  ctx.fill()
}

function lockIcon(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(x, y - s * 0.45, s * 0.5, Math.PI, 0)
  ctx.stroke()
  rr(ctx, x - s * 0.7, y - s * 0.5, s * 1.4, s * 1.1, 2)
  ctx.fillStyle = color
  ctx.fill()
}

function shieldIcon(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, fill: string, stroke: string) {
  ctx.beginPath()
  ctx.moveTo(x, y - s)
  ctx.lineTo(x + s * 0.85, y - s * 0.55)
  ctx.lineTo(x + s * 0.7, y + s * 0.45)
  ctx.lineTo(x, y + s)
  ctx.lineTo(x - s * 0.7, y + s * 0.45)
  ctx.lineTo(x - s * 0.85, y - s * 0.55)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.lineWidth = 1.6
    ctx.stroke()
  }
}

/** Big comic-style speech bubble with tail (mockup style) + optional educational tip line. */
function drawSpeech(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  w: number,
  opts?: { below?: boolean; color?: string; tip?: string }
) {
  ctx.font = '900 11px Nunito, sans-serif'
  const tw = ctx.measureText(text).width
  ctx.font = '800 7px Nunito, sans-serif'
  const tip = opts?.tip && opts.tip.length > 0 ? opts.tip : ''
  const twt = tip ? ctx.measureText(tip).width : 0
  const bw = Math.max(tw, twt) + 18
  const bh = tip ? 33 : 20
  const bx = Math.max(bw / 2 + 2, Math.min(w - bw / 2 - 2, x))
  const by = opts?.below ? y + 18 : y - 42
  ctx.fillStyle = 'rgba(255,255,255,0.97)'
  rr(ctx, bx - bw / 2, by, bw, bh, 6)
  ctx.fill()
  // tail
  ctx.beginPath()
  const tx = Math.max(bx - bw / 2 + 8, Math.min(bx + bw / 2 - 8, x))
  if (opts?.below) {
    ctx.moveTo(tx - 5, by)
    ctx.lineTo(tx, by - 8)
    ctx.lineTo(tx + 5, by)
  } else {
    ctx.moveTo(tx - 5, by + bh)
    ctx.lineTo(tx, by + bh + 8)
    ctx.lineTo(tx + 5, by + bh)
  }
  ctx.closePath()
  ctx.fill()
  if (opts?.color) {
    ctx.strokeStyle = opts.color
    ctx.lineWidth = 1.6
    rr(ctx, bx - bw / 2, by, bw, bh, 6)
    ctx.stroke()
  }
  ctx.fillStyle = '#10131f'
  ctx.font = '900 11px Nunito, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(text, bx, by + 14)
  if (tip) {
    ctx.fillStyle = '#4a4f6a'
    ctx.font = '800 7px Nunito, sans-serif'
    ctx.fillText(tip, bx, by + 27)
  }
}

function warnTri(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath()
  ctx.moveTo(x, y - s)
  ctx.lineTo(x + s * 0.95, y + s * 0.7)
  ctx.lineTo(x - s * 0.95, y + s * 0.7)
  ctx.closePath()
  ctx.fillStyle = '#ffd23f'
  ctx.fill()
  ctx.strokeStyle = '#7a5200'
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.fillStyle = '#7a5200'
  ctx.font = '900 9px Nunito, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('!', x, y + s * 0.45)
}

function buildMaze(def: LevelDef): HTMLCanvasElement {
  const cols = def.cols
  const rows = def.rows
  const W = cols * CS
  const H = rows * CS
  const cv = document.createElement('canvas')
  cv.width = W * SCALE
  cv.height = H * SCALE
  const ctx = cv.getContext('2d')!
  ctx.scale(SCALE, SCALE)

  const walls = (() => {
    const b = new Uint8Array(cols * rows)
    for (let c = 0; c < cols; c++) {
      b[c] = 1
      b[c + (rows - 1) * cols] = 1
    }
    for (let r = 0; r < rows; r++) {
      b[r * cols] = 1
      b[r * cols + cols - 1] = 1
    }
    for (const [x1, y1, x2, y2] of def.walls) {
      const xa = Math.min(x1, x2)
      const xb = Math.max(x1, x2)
      const ya = Math.min(y1, y2)
      const yb = Math.max(y1, y2)
      for (let x = xa; x <= xb; x++) for (let y = ya; y <= yb; y++) b[y * cols + x] = 1
    }
    return b
  })()

  // background
  ctx.fillStyle = def.theme.bg
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = 'rgba(255,255,255,0.035)'
  for (let y = 8; y < H; y += 16) {
    for (let x = 8; x < W; x += 16) {
      ctx.fillRect(x, y, 1.4, 1.4)
    }
  }
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95)
  vg.addColorStop(0, 'rgba(0,0,0,0)')
  vg.addColorStop(1, 'rgba(0,0,0,0.4)')
  ctx.fillStyle = vg
  ctx.fillRect(0, 0, W, H)

  // wall blocks
  ctx.fillStyle = 'rgba(15,22,66,0.9)'
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (walls[r * cols + c]) {
        rr(ctx, c * CS + 2, r * CS + 2, CS - 4, CS - 4, 5)
        ctx.fill()
      }
    }
  }

  const openN = (c: number, r: number) =>
    c < 0 || r < 0 || c >= cols || r >= rows || walls[r * cols + c] === 0

  const segs: { x1: number; y1: number; x2: number; y2: number; col: string }[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!walls[r * cols + c]) continue
      const col = (c * 5 + r * 3) % 2 === 0 ? def.theme.a : def.theme.b
      const x = c * CS
      const y = r * CS
      if (openN(c, r - 1)) segs.push({ x1: x, y1: y, x2: x + CS, y2: y, col })
      if (openN(c, r + 1)) segs.push({ x1: x, y1: y + CS, x2: x + CS, y2: y + CS, col })
      if (openN(c - 1, r)) segs.push({ x1: x, y1: y, x2: x, y2: y + CS, col })
      if (openN(c + 1, r)) segs.push({ x1: x + CS, y1: y, x2: x + CS, y2: y + CS, col })
    }
  }
  ctx.lineCap = 'round'
  for (const sg of segs) {
    ctx.strokeStyle = sg.col
    ctx.shadowColor = sg.col
    ctx.shadowBlur = 9
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(sg.x1, sg.y1)
    ctx.lineTo(sg.x2, sg.y2)
    ctx.stroke()
  }
  ctx.shadowBlur = 0
  ctx.strokeStyle = 'rgba(255,255,255,0.32)'
  ctx.lineWidth = 1.8
  for (const sg of segs) {
    ctx.beginPath()
    ctx.moveTo(sg.x1, sg.y1)
    ctx.lineTo(sg.x2, sg.y2)
    ctx.stroke()
  }

  // report & block zone
  {
    const [x1, y1, x2, y2] = def.reportZone
    const rx = x1 * CS
    const ry = y1 * CS
    const rw = (x2 - x1 + 1) * CS
    const rh = (y2 - y1 + 1) * CS
    ctx.fillStyle = 'rgba(255,77,94,0.09)'
    ctx.fillRect(rx, ry, rw, rh)
    ctx.save()
    ctx.beginPath()
    ctx.rect(rx, ry, rw, rh)
    ctx.clip()
    ctx.strokeStyle = 'rgba(255,77,94,0.32)'
    ctx.lineWidth = 6
    for (let i = -rh; i < rw + rh; i += 14) {
      ctx.beginPath()
      ctx.moveTo(rx + i, ry)
      ctx.lineTo(rx + i + rh, ry + rh)
      ctx.stroke()
    }
    ctx.restore()
    ctx.strokeStyle = '#ff4d5e'
    ctx.lineWidth = 2.4
    ctx.shadowColor = '#ff4d5e'
    ctx.shadowBlur = 8
    ctx.strokeRect(rx + 1, ry + 1, rw - 2, rh - 2)
    ctx.shadowBlur = 0
    ctx.fillStyle = '#ffc9d0'
    ctx.font = '800 9px Nunito, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('REPORT & BLOCK', rx + rw / 2, ry + rh / 2 + 3)
    shieldIcon(ctx, rx + rw / 2, ry + 13, 7, 'rgba(255,77,94,0.45)', '#ff4d5e')
  }

  // public wi-fi zone
  {
    const [x1, y1, x2, y2] = def.wifiRect
    const rx = x1 * CS
    const ry = y1 * CS
    const rw = (x2 - x1 + 1) * CS
    const rh = (y2 - y1 + 1) * CS
    ctx.fillStyle = 'rgba(61,255,138,0.12)'
    ctx.fillRect(rx, ry, rw, rh)
    ctx.strokeStyle = '#3dff8a'
    ctx.shadowColor = '#3dff8a'
    ctx.shadowBlur = 8
    ctx.lineWidth = 2.4
    ctx.strokeRect(rx + 1, ry + 1, rw - 2, rh - 2)
    ctx.shadowBlur = 0
    warnTri(ctx, rx + 10, ry + 11, 5)
    warnTri(ctx, rx + rw - 10, ry + 11, 5)
    wifiIcon(ctx, rx + 14, ry + 26, 4.6, 'rgba(61,255,138,0.9)')
    if (rw >= 3 * CS) {
      ctx.fillStyle = 'rgba(170,255,210,0.9)'
      ctx.font = '800 9px Nunito, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('PUBLIC WI-FI ZONE', rx + rw / 2, ry + 12)
    }
  }

  // quarantine vault
  {
    const [c, r] = def.vault
    const x = (c + 0.5) * CS
    const y = (r + 0.5) * CS
    ctx.fillStyle = 'rgba(53,224,255,0.10)'
    rr(ctx, c * CS + 2, r * CS + 2, CS - 4, CS - 4, 6)
    ctx.fill()
    ctx.strokeStyle = '#35e0ff'
    ctx.shadowColor = '#35e0ff'
    ctx.shadowBlur = 8
    ctx.lineWidth = 2
    rr(ctx, c * CS + 2, r * CS + 2, CS - 4, CS - 4, 6)
    ctx.stroke()
    ctx.shadowBlur = 0
    // vault door
    ctx.strokeStyle = '#8ff2ff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(x, y + 1, 9, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(x, y + 1, 4, 0, Math.PI * 2)
    ctx.stroke()
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4
      ctx.beginPath()
      ctx.moveTo(x + Math.cos(a) * 4, y + 1 + Math.sin(a) * 4)
      ctx.lineTo(x + Math.cos(a) * 9, y + 1 + Math.sin(a) * 9)
      ctx.stroke()
    }
    ctx.fillStyle = 'rgba(160,240,255,0.95)'
    ctx.font = '800 7.5px Nunito, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('QUARANTINE VAULT', x, (r + 1) * CS + 10)
  }

  // HTTPS gates
  for (const [c, r] of def.gateH) {
    const x = (c + 0.5) * CS
    const y = (r + 0.5) * CS
    ctx.strokeStyle = '#3dff8a'
    ctx.shadowColor = '#3dff8a'
    ctx.shadowBlur = 8
    ctx.lineWidth = 2.8
    ctx.beginPath()
    ctx.moveTo(c * CS + 2, r * CS)
    ctx.lineTo(c * CS + 2, (r + 1) * CS)
    ctx.moveTo((c + 1) * CS - 2, r * CS)
    ctx.lineTo((c + 1) * CS - 2, (r + 1) * CS)
    ctx.stroke()
    ctx.shadowBlur = 0
    lockIcon(ctx, x, y, 6, '#3dff8a')
    ctx.fillStyle = 'rgba(160,255,200,0.95)'
    ctx.font = '800 7.5px Nunito, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('SECURE HTTPS', x, (r + 1) * CS + 9)
  }

  // incognito gates
  for (const [c, r] of def.gateP) {
    const x = (c + 0.5) * CS
    const y = (r + 0.5) * CS
    ctx.strokeStyle = '#35e0ff'
    ctx.shadowColor = '#35e0ff'
    ctx.shadowBlur = 8
    ctx.setLineDash([6, 4])
    ctx.lineWidth = 2.4
    ctx.beginPath()
    ctx.arc(x, y, 12, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.shadowBlur = 0
    shieldIcon(ctx, x, y, 7, 'rgba(53,224,255,0.35)', '#35e0ff')
    ctx.fillStyle = 'rgba(170,240,255,0.95)'
    ctx.font = '800 7.5px Nunito, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('INCOGNITO GATE', x, r * CS - 4)
  }

  // phishing doors + URL banners
  const drawDoor = (c: number, r: number, ok: boolean) => {
    const x = (c + 0.5) * CS
    const y = (r + 0.5) * CS
    const col = ok ? '#3dff8a' : '#ff4d5e'
    ctx.strokeStyle = col
    ctx.shadowColor = col
    ctx.shadowBlur = 8
    ctx.lineWidth = 2.4
    rr(ctx, c * CS + 4, r * CS + 4, CS - 8, CS - 8, 5)
    ctx.stroke()
    ctx.shadowBlur = 0
    if (ok) {
      ctx.strokeStyle = col
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(x - 5, y)
      ctx.lineTo(x - 1, y + 4.5)
      ctx.lineTo(x + 5.5, y - 4.5)
      ctx.stroke()
    } else {
      ctx.fillStyle = col
      ctx.font = '900 16px Nunito, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('!', x, y + 5.5)
    }
    const url = ok ? def.realUrl : def.fakeUrl
    ctx.font = '800 9px Nunito, sans-serif'
    const tw = ctx.measureText(url).width
    let bx = x
    const by = r === 0 ? (r + 1.5) * CS + 2 : r * CS - 11
    bx = Math.max(tw / 2 + 7, Math.min(W - tw / 2 - 7, bx))
    rr(ctx, bx - tw / 2 - 7, by - 8, tw + 14, 15, 5)
    ctx.fillStyle = 'rgba(5,9,28,0.94)'
    ctx.fill()
    ctx.strokeStyle = col
    ctx.lineWidth = 1.2
    ctx.stroke()
    ctx.fillStyle = col
    ctx.textAlign = 'center'
    ctx.fillText(url, bx, by + 3)
  }
  drawDoor(def.doorT[0], def.doorT[1], true)
  drawDoor(def.doorF[0], def.doorF[1], false)

  return cv
}

function drawGhost(ctx: CanvasRenderingContext2D, g: Ghost, s: GameState, t: number, W: number) {
  const info = GHOST_INFO[g.kind]
  const x = g.px
  const y = g.py
  let color = info.color
  let alpha = 1
  if (g.emergeT > 0) alpha = 0.45 + 0.35 * Math.sin(t * 9)
  const muted = s.muteT > 0 && g.emergeT <= 0 && g.stunT <= 0 && g.blockedT <= 0
  if (muted) color = '#4db8ff'
  if (g.blockedT > 0) color = '#8a93a6'
  if (g.stunT > 0 && Math.sin(t * 30) > 0) color = '#ffffff'

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.shadowColor = color
  ctx.shadowBlur = 12
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y - 2, 12, Math.PI, 0)
  ctx.lineTo(x + 12, y + 11)
  ctx.lineTo(x + 8, y + 7.5)
  ctx.lineTo(x + 4, y + 11)
  ctx.lineTo(x, y + 7.5)
  ctx.lineTo(x - 4, y + 11)
  ctx.lineTo(x - 8, y + 7.5)
  ctx.lineTo(x - 12, y + 11)
  ctx.closePath()
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.strokeStyle = '#10131f'
  ctx.lineWidth = 2
  ctx.stroke()

  const ex = (g.dir.x || g.face.x) * 1.9
  const ey = (g.dir.y || g.face.y) * 1.9
  if (muted) {
    ctx.strokeStyle = '#063552'
    ctx.lineWidth = 2.2
    for (const sx of [-5, 5]) {
      ctx.beginPath()
      ctx.moveTo(x + sx - 2.6, y - 7)
      ctx.lineTo(x + sx + 2.6, y - 1.5)
      ctx.moveTo(x + sx + 2.6, y - 7)
      ctx.lineTo(x + sx - 2.6, y - 1.5)
      ctx.stroke()
    }
  } else {
    for (const sx of [-5, 5]) {
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(x + sx, y - 4, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#0a1030'
      ctx.beginPath()
      ctx.arc(x + sx + ex, y - 4 + ey, 2.1, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()

  // ---- accessories (mockup style) ----
  if (g.emergeT <= 0) {
    if (g.kind === 'blinky') {
      // fishing rod + hook + lure
      ctx.strokeStyle = '#8a5a2b'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x + 7, y - 4)
      ctx.lineTo(x + 14, y - 13)
      ctx.stroke()
      ctx.strokeStyle = '#c8ccd8'
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.moveTo(x + 14, y - 13)
      ctx.lineTo(x + 14, y - 5)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(x + 12.4, y - 4, 1.8, -0.5, Math.PI * 0.9)
      ctx.stroke()
      ctx.fillStyle = '#ff4d5e'
      ctx.beginPath()
      ctx.arc(x + 14, y - 7, 1.6, 0, Math.PI * 2)
      ctx.fill()
    } else if (g.kind === 'pinky') {
      // binoculars
      ctx.fillStyle = '#20264d'
      ctx.beginPath()
      ctx.arc(x - 5, y + 3, 3.6, 0, Math.PI * 2)
      ctx.arc(x + 5, y + 3, 3.6, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillRect(x - 2, y + 1.6, 4, 2.8)
      ctx.fillStyle = '#8ff2ff'
      ctx.beginPath()
      ctx.arc(x - 5.6, y + 2.4, 1.3, 0, Math.PI * 2)
      ctx.arc(x + 4.4, y + 2.4, 1.3, 0, Math.PI * 2)
      ctx.fill()
    } else if (g.kind === 'clyde') {
      // magnifying glass
      ctx.strokeStyle = '#5a6070'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(x - 11, y + 3, 4.2, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = 'rgba(200,230,255,0.3)'
      ctx.fill()
      ctx.strokeStyle = '#3a3f4e'
      ctx.lineWidth = 2.6
      ctx.beginPath()
      ctx.moveTo(x - 8, y + 6)
      ctx.lineTo(x - 4.6, y + 9.6)
      ctx.stroke()
    }
  }

  // inky megaphone + sound burst while taunting
  if (g.kind === 'inky' && g.tauntT > 0 && g.emergeT <= 0) {
    const mx = x + 8
    const my = y - 7
    // spiky burst
    ctx.fillStyle = '#ffb03a'
    ctx.beginPath()
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.4
      const r = i % 2 === 0 ? 6 : 3.8
      const px2 = mx + 3 + Math.cos(a) * r
      const py2 = my + 2 + Math.sin(a) * r
      if (i === 0) ctx.moveTo(px2, py2)
      else ctx.lineTo(px2, py2)
    }
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#ff8a3d'
    ctx.beginPath()
    ctx.moveTo(mx, my + 3)
    ctx.lineTo(mx + 7, my - 1.5)
    ctx.lineTo(mx + 7, my + 8.5)
    ctx.lineTo(mx, my + 7)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#ff8a3d'
    ctx.lineWidth = 1.8
    ctx.beginPath()
    ctx.arc(mx + 8, my + 3.5, 2.2, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(mx + 10.5, my + 3.5, 3.2, -0.9, 0.9)
    ctx.stroke()
  }

  if (g.blockedT > 0) {
    ctx.fillStyle = 'rgba(5,9,28,0.92)'
    rr(ctx, x - 30, y - 30, 60, 16, 5)
    ctx.fill()
    ctx.strokeStyle = '#ff4d5e'
    ctx.lineWidth = 1.4
    ctx.stroke()
    ctx.fillStyle = '#ff8f9b'
    ctx.font = '900 10px Nunito, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('BLOCKED!', x, y - 18.5)
  } else if (g.bubT > 0 && g.bubText) {
    // shout only — the lesson is revealed after the player answers the challenge
    drawSpeech(ctx, x, y - 16, g.bubText, W, { color: info.color })
  }

  if (s.introT > 0.8 && g.bubT <= 0) {
    const label = `${info.name} · ${info.role.toUpperCase()}`
    ctx.font = '900 8px Nunito, sans-serif'
    const tw = ctx.measureText(label).width
    rr(ctx, x - tw / 2 - 7, y - 42, tw + 14, 15, 5)
    ctx.fillStyle = 'rgba(4,8,24,0.9)'
    ctx.fill()
    ctx.strokeStyle = info.color
    ctx.lineWidth = 1.2
    ctx.stroke()
    ctx.fillStyle = info.color
    ctx.textAlign = 'center'
    ctx.fillText(label, x, y - 31)
  }
}

function drawGift(ctx: CanvasRenderingContext2D, s: GameState, t: number) {
  const g = s.gift
  if (!g) return
  const x = g.x
  const y = g.y
  if (g.attached) {
    ctx.strokeStyle = 'rgba(255,138,61,0.8)'
    ctx.lineWidth = 2
    ctx.setLineDash([4, 4])
    ctx.lineDashOffset = -t * 30
    ctx.beginPath()
    ctx.moveTo(s.player.px, s.player.py)
    ctx.lineTo(x, y)
    ctx.stroke()
    ctx.setLineDash([])
  }
  ctx.save()
  ctx.shadowColor = '#b06bff'
  ctx.shadowBlur = 10
  ctx.fillStyle = '#8a4de8'
  rr(ctx, x - 8, y - 8, 16, 16, 3)
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.fillStyle = '#ffd23f'
  ctx.fillRect(x - 1.8, y - 8, 3.6, 16)
  ctx.fillRect(x - 8, y - 1.8, 16, 3.6)
  ctx.strokeStyle = '#3a1a66'
  ctx.lineWidth = 1.4
  rr(ctx, x - 8, y - 8, 16, 16, 3)
  ctx.stroke()
  // ribbon bow
  ctx.fillStyle = '#ffd23f'
  ctx.beginPath()
  ctx.arc(x - 3, y - 9.5, 2.2, 0, Math.PI * 2)
  ctx.arc(x + 3, y - 9.5, 2.2, 0, Math.PI * 2)
  ctx.fill()
  // blinking FREE! tag
  if (Math.sin(t * 7) > -0.3) {
    ctx.fillStyle = '#ff4d5e'
    rr(ctx, x - 14, y - 24, 28, 12, 4)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = '900 9px Nunito, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('FREE!', x, y - 15)
  }
  ctx.restore()
}

function drawLooker(ctx: CanvasRenderingContext2D, s: GameState, t: number, W: number) {
  const L = s.looker
  const alpha = L.emergeT > 0 ? 0.5 + 0.3 * Math.sin(t * 8) : 1

  // light cone
  if (L.emergeT <= 0) {
    const len = 2.6 * CS
    const copy = L.copyT > 0
    const danger = s.inLight || copy
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.fillStyle = danger
      ? copy
        ? 'rgba(255,60,80,0.30)'
        : 'rgba(255,90,100,0.20)'
      : 'rgba(255,225,130,0.14)'
    ctx.beginPath()
    ctx.moveTo(L.px, L.py)
    ctx.arc(L.px, L.py, len, L.ang - 0.55, L.ang + 0.55)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = danger ? 'rgba(255,90,100,0.4)' : 'rgba(255,225,130,0.25)'
    ctx.lineWidth = 1.4
    ctx.stroke()
    ctx.restore()
  }

  ctx.save()
  ctx.globalAlpha = alpha
  // body
  ctx.fillStyle = '#141c44'
  ctx.shadowColor = copyFlash(L) ? '#ff4d5e' : '#5a6bd8'
  ctx.shadowBlur = 8
  ctx.beginPath()
  ctx.arc(L.px, L.py, 10, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.strokeStyle = L.copyT > 0 ? '#ff4d5e' : '#5a6bd8'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(L.px, L.py, 10, 0, Math.PI * 2)
  ctx.stroke()
  // antenna
  ctx.strokeStyle = '#8a93c8'
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.moveTo(L.px, L.py - 10)
  ctx.lineTo(L.px, L.py - 15)
  ctx.stroke()
  ctx.fillStyle = L.copyT > 0 ? '#ff4d5e' : '#ffd23f'
  ctx.beginPath()
  ctx.arc(L.px, L.py - 16, 2, 0, Math.PI * 2)
  ctx.fill()
  // eye (faces cone direction)
  const ex = Math.cos(L.ang) * 3
  const ey = Math.sin(L.ang) * 3
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(L.px + ex * 0.6, L.py + ey * 0.6, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = L.copyT > 0 ? '#ff4d5e' : '#0a1030'
  ctx.beginPath()
  ctx.arc(L.px + ex, L.py + ey, 2.6, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  if (L.bubT > 0 && L.bubText) {
    drawSpeech(ctx, L.px, L.py - 14, L.bubText, W, { color: L.copyT > 0 ? '#ff4d5e' : '#5a6bd8' })
  }
}

function copyFlash(L: { copyT: number }) {
  return L.copyT > 0.8
}

export function renderFrame(ctx: CanvasRenderingContext2D, s: GameState, t: number) {
  const W = s.def.cols * CS
  const H = s.def.rows * CS
  const cCols = s.def.cols
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0)
  ctx.fillStyle = s.def.theme.bg
  ctx.fillRect(0, 0, W, H)
  if (s.shake > 0.2) {
    ctx.translate((Math.random() * 2 - 1) * s.shake * 0.22, (Math.random() * 2 - 1) * s.shake * 0.22)
  }
  if (!s.mazeCanvas) s.mazeCanvas = buildMaze(s.def)
  ctx.drawImage(s.mazeCanvas, 0, 0, W, H)

  // exposed wifi pulse
  if (s.exposed && s.vpnT <= 0 && s.phase === 'play') {
    const [x1, y1, x2, y2] = s.def.wifiRect
    const a = 0.35 + 0.3 * Math.sin(t * 7)
    ctx.strokeStyle = `rgba(61,255,138,${a})`
    ctx.lineWidth = 2.5
    ctx.strokeRect(x1 * CS + 2, y1 * CS + 2, (x2 - x1 + 1) * CS - 4, (y2 - y1 + 1) * CS - 4)
  }

  // cookies
  for (const ck of s.cookies) {
    ctx.globalAlpha = Math.min(1, ck.t / 1.5)
    ctx.fillStyle = '#c98f4e'
    ctx.beginPath()
    ctx.arc(ck.x, ck.y, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#8a5a2b'
    for (const [dx, dy] of [[-1.7, -1.2], [1.7, 0.5], [0, 2]]) {
      ctx.beginPath()
      ctx.arc(ck.x + dx, ck.y + dy, 1.1, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  // vault active pulse (gift on the way)
  if (s.gift?.attached) {
    const [c, r] = s.def.vault
    const x = (c + 0.5) * CS
    const y = (r + 0.5) * CS
    const pr = 14 + 4 * Math.sin(t * 6)
    ctx.strokeStyle = 'rgba(53,224,255,0.9)'
    ctx.shadowColor = '#35e0ff'
    ctx.shadowBlur = 12
    ctx.lineWidth = 2.6
    ctx.beginPath()
    ctx.arc(x, y, pr, 0, Math.PI * 2)
    ctx.stroke()
    ctx.shadowBlur = 0
  }

  // bait sign / locked door
  {
    const [c, r] = s.def.bait
    const x = (c + 0.5) * CS
    const y = (r + 0.5) * CS
    if (!s.bait.active) {
      const blink = 0.65 + 0.35 * Math.sin(t * 6)
      ctx.globalAlpha = s.bait.used ? 0.35 : blink
      ctx.fillStyle = 'rgba(5,9,28,0.9)'
      rr(ctx, x - 15, y - 11, 30, 22, 5)
      ctx.fill()
      ctx.strokeStyle = s.bait.used ? '#8a93a6' : '#ff3fa4'
      ctx.lineWidth = 2
      ctx.shadowColor = '#ff3fa4'
      ctx.shadowBlur = 8
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.fillStyle = s.bait.used ? '#8a93a6' : '#ffd23f'
      ctx.font = '900 9px Nunito, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(s.bait.used ? 'CLAIMED' : 'FREE', x, y - 1)
      ctx.fillStyle = s.bait.used ? '#5d6578' : '#3dff8a'
      ctx.font = '900 10px Nunito, sans-serif'
      ctx.fillText(s.bait.used ? '' : '+500', x, y + 10)
      ctx.globalAlpha = 1
    } else {
      // slammed door around the player
      const px = s.player.px
      const py = s.player.py
      ctx.strokeStyle = '#ff4d5e'
      ctx.shadowColor = '#ff4d5e'
      ctx.shadowBlur = 14
      ctx.lineWidth = 4
      rr(ctx, px - 15, py - 15, 30, 30, 6)
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.lineWidth = 2.4
      ctx.beginPath()
      ctx.moveTo(px - 9, py - 9)
      ctx.lineTo(px + 9, py + 9)
      ctx.moveTo(px + 9, py - 9)
      ctx.lineTo(px - 9, py + 9)
      ctx.stroke()
      ctx.fillStyle = '#ff8f9b'
      ctx.font = '900 10px Nunito, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('LOCKED', px, py - 20)
    }
  }

  // gift box
  drawGift(ctx, s, t)

  // looker cone (under entities)
  if (!s.looker.dead) drawLooker(ctx, s, t, W)

  // safe pellets
  {
    ctx.fillStyle = '#ffd23f'
    ctx.shadowColor = '#ffd23f'
    ctx.shadowBlur = 6
    ctx.beginPath()
    for (let i = 0; i < s.pellets.length; i++) {
      if (!s.pellets[i]) continue
      const x = ((i % cCols) + 0.5) * CS
      const y = (Math.floor(i / cCols) + 0.5) * CS
      const r = 2.9 + 0.55 * Math.sin(t * 5 + (i % 7))
      ctx.moveTo(x + r, y)
      ctx.arc(x, y, r, 0, Math.PI * 2)
    }
    ctx.fill()
    ctx.shadowBlur = 0
  }

  // PII pellets
  for (let i = 0; i < s.pii.length; i++) {
    if (!s.pii[i]) continue
    const c = i % cCols
    const r = Math.floor(i / cCols)
    const x = (c + 0.5) * CS
    const y = (r + 0.5) * CS
    const a = 0.45 + 0.55 * Math.abs(Math.sin(t * 4 + i))
    ctx.globalAlpha = a
    ctx.fillStyle = '#ff4d5e'
    ctx.shadowColor = '#ff4d5e'
    ctx.shadowBlur = 10
    rr(ctx, x - 8, y - 8, 16, 16, 4.5)
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.fillStyle = '#ffffff'
    if ((c + r) % 2 === 0) {
      rr(ctx, x - 3.4, y - 5.5, 6.8, 11, 1.8)
      ctx.fill()
      ctx.fillStyle = '#ff4d5e'
      ctx.fillRect(x - 1.8, y + 3.2, 3.6, 1.2)
    } else {
      ctx.fillRect(x - 4, y - 1, 8, 6.5)
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1.8
      ctx.beginPath()
      ctx.arc(x, y - 2.2, 2.9, Math.PI, 0)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }

  // power nodes, entropy tiles, magnet, filter, vpn, gate dims
  const parts = (s.ent.up ? 1 : 0) + (s.ent.num ? 1 : 0) + (s.ent.spec ? 1 : 0)
  for (let i = 0; i < s.kinds.length; i++) {
    const k = s.kinds[i]
    if (!k) continue
    const c = i % cCols
    const r = Math.floor(i / cCols)
    const x = (c + 0.5) * CS
    const y = (r + 0.5) * CS
    if (k === 'power') {
      const dim = s.gateCd[i] > 0
      ctx.globalAlpha = dim ? 0.35 : 1
      const full = parts === 3
      const col = parts === 0 ? '#8a93a6' : full ? '#3dff8a' : '#ffd23f'
      ctx.shadowColor = col
      ctx.shadowBlur = 12
      ctx.strokeStyle = col
      ctx.fillStyle = full ? 'rgba(61,255,138,0.22)' : parts > 0 ? 'rgba(255,210,63,0.2)' : 'rgba(138,147,166,0.15)'
      ctx.lineWidth = 2.4
      const pr = 12 + 2 * Math.sin(t * 6)
      ctx.beginPath()
      ctx.arc(x, y, pr, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      // key glyph
      ctx.lineWidth = 2.4
      ctx.beginPath()
      ctx.arc(x - 2.6, y - 3, 3.8, 0, Math.PI * 2)
      ctx.moveTo(x + 0.4, y)
      ctx.lineTo(x + 6, y + 6)
      ctx.moveTo(x + 3.6, y + 3.6)
      ctx.lineTo(x + 5.8, y + 1.4)
      ctx.stroke()
      ctx.shadowBlur = 0
      // progress dots
      for (let d = 0; d < 3; d++) {
        ctx.fillStyle = d < parts ? '#3dff8a' : 'rgba(255,255,255,0.2)'
        ctx.beginPath()
        ctx.arc(x - 7 + d * 7, y + 16, 2.2, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = col
      ctx.font = '800 7.5px Nunito, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('2FA CHECKPOINT', x, y + 27)
      ctx.globalAlpha = 1
    } else if (k === 'up' || k === 'num' || k === 'spec') {
      const col = k === 'up' ? '#ffd23f' : k === 'num' ? '#35e0ff' : '#ff3fa4'
      const lit = k === 'up' ? s.ent.up : k === 'num' ? s.ent.num : s.ent.spec
      const inCone = s.inLight && s.filterT <= 0
      ctx.shadowColor = inCone ? '#ff4d5e' : col
      ctx.shadowBlur = 10
      ctx.fillStyle = inCone ? 'rgba(255,77,94,0.3)' : 'rgba(10,18,51,0.85)'
      rr(ctx, x - 11, y - 11, 22, 22, 6)
      ctx.fill()
      ctx.strokeStyle = inCone ? '#ff4d5e' : col
      ctx.lineWidth = 2.2
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.fillStyle = inCone ? '#ff8f9b' : col
      ctx.font = '900 14px Nunito, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(k === 'up' ? 'A' : k === 'num' ? '7' : '#', x, y + 5)
      ctx.font = '800 7px Nunito, sans-serif'
      ctx.fillText(k === 'up' ? 'UPPERCASE' : k === 'num' ? 'NUMBER' : 'SYMBOL', x, y + 21)
      if (lit) {
        ctx.strokeStyle = col
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x - 5, y - 15)
        ctx.lineTo(x - 1.5, y - 11.5)
        ctx.lineTo(x + 4, y - 18)
        ctx.stroke()
      }
    } else if (k === 'magnet') {
      ctx.strokeStyle = '#ff8a3d'
      ctx.shadowColor = '#ff8a3d'
      ctx.shadowBlur = 10
      ctx.lineWidth = 4.4
      ctx.beginPath()
      ctx.arc(x, y - 1, 7, Math.PI, 0)
      ctx.stroke()
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(x - 7, y - 1)
      ctx.lineTo(x - 7, y + 5)
      ctx.moveTo(x + 7, y - 1)
      ctx.lineTo(x + 7, y + 5)
      ctx.stroke()
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(x - 9.2, y + 4, 4.4, 4)
      ctx.fillRect(x + 4.8, y + 4, 4.4, 4)
      ctx.shadowBlur = 0
      ctx.fillStyle = '#ffb27a'
      ctx.font = '800 7px Nunito, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('SANDBOX MAGNET', x, y + 21)
    } else if (k === 'filter') {
      ctx.fillStyle = 'rgba(53,224,255,0.2)'
      ctx.strokeStyle = '#35e0ff'
      ctx.shadowColor = '#35e0ff'
      ctx.shadowBlur = 10
      ctx.lineWidth = 2
      rr(ctx, x - 8, y - 10, 16, 20, 4)
      ctx.fill()
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'
      ctx.lineWidth = 1.6
      ctx.beginPath()
      ctx.moveTo(x - 4, y + 6)
      ctx.lineTo(x + 5, y - 5)
      ctx.stroke()
      ctx.fillStyle = '#8ff2ff'
      ctx.font = '800 7px Nunito, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('PRIVACY FILTER', x, y + 21)
    } else if (k === 'vpn') {
      shieldIcon(ctx, x, y, 10, 'rgba(61,255,138,0.3)', '#3dff8a')
      wifiIcon(ctx, x, y - 1, 3.8, '#3dff8a')
      ctx.fillStyle = '#3dff8a'
      ctx.font = '800 7px Nunito, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('VPN', x, y + 21)
    } else if (k === 'gateP' && s.gateCd[i] > 0) {
      ctx.fillStyle = 'rgba(4,8,24,0.55)'
      ctx.beginPath()
      ctx.arc(x, y, 13, 0, Math.PI * 2)
      ctx.fill()
    } else if (k === 'bait') {
      // handled by the bait sign above (cell marker only)
    }
  }

  // ---- player ----
  const p = s.player
  {
    let alpha = 1
    if (s.invulnT > 0) alpha = 0.35 + 0.65 * Math.abs(Math.sin(t * 12))
    if (s.exposed && s.vpnT <= 0) alpha = Math.min(alpha, 0.55)
    ctx.save()
    ctx.globalAlpha = alpha
    const ang = Math.atan2(p.face.y, p.face.x)
    const moving = p.dir.x !== 0 || p.dir.y !== 0
    const open = moving ? 0.3 + 0.3 * Math.abs(Math.sin(p.chompT * 14)) : 0.12
    ctx.shadowColor = '#ffd23f'
    ctx.shadowBlur = 14
    ctx.fillStyle = '#ffd23f'
    ctx.beginPath()
    ctx.moveTo(p.px, p.py)
    ctx.arc(p.px, p.py, 13, ang + open, ang - open + Math.PI * 2)
    ctx.closePath()
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.fillStyle = '#1a1030'
    ctx.beginPath()
    ctx.arc(p.px + p.face.x * 3.2, p.py - 7.5, 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    // attached equipment (grows with rank, mockup style — kept inside the corridor)
    const bob = Math.sin(t * 3) * 1.2
    if (s.level >= 2) {
      const sx = p.px - 11
      const sy = p.py - 1 + bob
      shieldIcon(ctx, sx, sy, 5.5, 'rgba(47,127,224,0.95)', '#bdf3ff')
      ctx.fillStyle = '#ffffff'
      ctx.font = '900 5.5px Nunito, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('P', sx, sy + 2)
    }
    if (s.level >= 3) {
      const hx = p.px + 11
      const hy = p.py - 2 - bob
      ctx.strokeStyle = '#ff8a3d'
      ctx.lineWidth = 1.8
      ctx.beginPath()
      ctx.arc(hx, hy, 4.2, Math.PI, 0)
      ctx.stroke()
      ctx.fillStyle = '#ff8a3d'
      rr(ctx, hx - 6.2, hy - 0.5, 3, 5.2, 1.2)
      ctx.fill()
      rr(ctx, hx + 3.2, hy - 0.5, 3, 5.2, 1.2)
      ctx.fill()
    }
    if (s.level >= 4) {
      const lx = p.px + 10
      const ly = p.py - 12 - bob
      ctx.fillStyle = '#3dff8a'
      ctx.shadowColor = '#3dff8a'
      ctx.shadowBlur = 5
      ctx.beginPath()
      ctx.moveTo(lx + 1, ly - 5)
      ctx.lineTo(lx - 3.4, ly + 1)
      ctx.lineTo(lx - 0.4, ly + 1)
      ctx.lineTo(lx - 1.4, ly + 5)
      ctx.lineTo(lx + 3.4, ly - 1)
      ctx.lineTo(lx + 0.4, ly - 1)
      ctx.closePath()
      ctx.fill()
      ctx.shadowBlur = 0
    }
    if (s.level >= 5) {
      const gx = p.px - 10
      const gy = p.py - 12 + bob
      ctx.strokeStyle = '#ff4d5e'
      ctx.lineWidth = 2.8
      ctx.beginPath()
      ctx.arc(gx, gy, 4, Math.PI, 0)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(gx - 4, gy)
      ctx.lineTo(gx - 4, gy + 3.4)
      ctx.moveTo(gx + 4, gy)
      ctx.lineTo(gx + 4, gy + 3.4)
      ctx.stroke()
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(gx - 5.6, gy + 2.6, 2.8, 2.6)
      ctx.fillRect(gx + 2.8, gy + 2.6, 2.8, 2.6)
    }
    // purchased weapon & gear
    const fx = p.face.x
    if (s.weapon === 'sword') {
      ctx.strokeStyle = '#cfd8ff'
      ctx.shadowColor = '#8fa8ff'
      ctx.shadowBlur = 5
      ctx.lineWidth = 2.6
      ctx.beginPath()
      ctx.moveTo(p.px - fx * 8, p.py + 7)
      ctx.lineTo(p.px - fx * 14, p.py + 2)
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.strokeStyle = '#ffb03a'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(p.px - fx * 8, p.py + 4)
      ctx.lineTo(p.px - fx * 8, p.py + 10)
      ctx.stroke()
    } else if (s.weapon === 'bow') {
      ctx.strokeStyle = '#35e0ff'
      ctx.shadowColor = '#35e0ff'
      ctx.shadowBlur = 5
      ctx.lineWidth = 2.2
      ctx.beginPath()
      ctx.arc(p.px + fx * 10, p.py - 4, 7, Math.PI * 0.6, Math.PI * 1.4)
      ctx.stroke()
      ctx.shadowBlur = 0
    } else if (s.weapon === 'laser') {
      ctx.fillStyle = '#ff4d5e'
      ctx.shadowColor = '#ff4d5e'
      ctx.shadowBlur = 6
      ctx.fillRect(p.px + fx * 10 - 3, p.py - 2 - 2.5, 9, 5)
      ctx.shadowBlur = 0
      ctx.fillStyle = '#ffd23f'
      ctx.fillRect(p.px + fx * 10 + (fx >= 0 ? 6 : -9), p.py - 3.5, 3, 7)
    } else if (s.weapon === 'spell') {
      ctx.strokeStyle = '#b06bff'
      ctx.shadowColor = '#b06bff'
      ctx.shadowBlur = 5
      ctx.lineWidth = 2.2
      ctx.beginPath()
      ctx.moveTo(p.px + fx * 9, p.py + 4)
      ctx.lineTo(p.px + fx * 14, p.py - 6)
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.fillStyle = '#ffd23f'
      ctx.beginPath()
      const sx2 = p.px + fx * 15
      const sy2 = p.py - 8
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2
        const r = i % 2 === 0 ? 4 : 1.8
        const px2 = sx2 + Math.cos(a) * r
        const py2 = sy2 + Math.sin(a) * r
        if (i === 0) ctx.moveTo(px2, py2)
        else ctx.lineTo(px2, py2)
      }
      ctx.closePath()
      ctx.fill()
    }
    if (s.gear === 'armor') {
      ctx.strokeStyle = 'rgba(53,224,255,0.85)'
      ctx.lineWidth = 2
      ctx.shadowColor = '#35e0ff'
      ctx.shadowBlur = 6
      ctx.beginPath()
      ctx.arc(p.px, p.py, 15.5, 0, Math.PI * 2)
      ctx.stroke()
      ctx.shadowBlur = 0
    }
    if (s.gear === 'helmet') {
      ctx.fillStyle = '#ffd23f'
      ctx.shadowColor = '#ffd23f'
      ctx.shadowBlur = 5
      ctx.beginPath()
      ctx.arc(p.px, p.py - 4, 9, Math.PI * 1.15, Math.PI * 1.85)
      ctx.closePath()
      ctx.fill()
      ctx.shadowBlur = 0
    }
    if (s.bubbleT > 0) {
      ctx.strokeStyle = '#35e0ff'
      ctx.shadowColor = '#35e0ff'
      ctx.shadowBlur = 10
      ctx.lineWidth = 2.2
      ctx.setLineDash([7, 5])
      ctx.lineDashOffset = -t * 36
      ctx.beginPath()
      ctx.arc(p.px, p.py, 21, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.shadowBlur = 0
    }
    if (s.magnetT > 0) {
      ctx.strokeStyle = 'rgba(255,138,61,0.85)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(p.px, p.py, 18, 0, Math.PI * 2)
      ctx.stroke()
    }
    if (s.vpnT > 0) {
      ctx.strokeStyle = 'rgba(61,255,138,0.8)'
      ctx.lineWidth = 1.8
      ctx.beginPath()
      ctx.arc(p.px, p.py, 17, 0, Math.PI * 2)
      ctx.stroke()
    }
    if (s.filterT > 0) {
      const ang2 = Math.atan2(p.face.y, p.face.x)
      ctx.strokeStyle = '#35e0ff'
      ctx.shadowColor = '#35e0ff'
      ctx.shadowBlur = 10
      ctx.lineWidth = 5
      ctx.beginPath()
      ctx.arc(p.px, p.py, 22, ang2 - 0.5, ang2 + 0.5)
      ctx.stroke()
      ctx.shadowBlur = 0
    }
  }

  // ---- ghosts ----
  for (const g of s.ghosts) if (!g.dead) drawGhost(ctx, g, s, t, W)

  // ---- merchant (wandering vendor ghost) ----
  {
    const M = s.merchant
    ctx.save()
    ctx.shadowColor = '#b06bff'
    ctx.shadowBlur = 10
    ctx.fillStyle = '#b06bff'
    ctx.beginPath()
    ctx.arc(M.px, M.py - 2, 12, Math.PI, 0)
    ctx.lineTo(M.px + 12, M.py + 11)
    ctx.lineTo(M.px + 8, M.py + 7.5)
    ctx.lineTo(M.px + 4, M.py + 11)
    ctx.lineTo(M.px, M.py + 7.5)
    ctx.lineTo(M.px - 4, M.py + 11)
    ctx.lineTo(M.px - 8, M.py + 7.5)
    ctx.lineTo(M.px - 12, M.py + 11)
    ctx.closePath()
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.strokeStyle = '#10131f'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(M.px - 4.5, M.py - 4, 3.6, 0, Math.PI * 2)
    ctx.arc(M.px + 4.5, M.py - 4, 3.6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#0a1030'
    ctx.beginPath()
    ctx.arc(M.px - 4.5, M.py - 3.4, 1.8, 0, Math.PI * 2)
    ctx.arc(M.px + 4.5, M.py - 3.4, 1.8, 0, Math.PI * 2)
    ctx.fill()
    // coin
    ctx.fillStyle = '#ffd23f'
    ctx.beginPath()
    ctx.arc(M.px, M.py + 4, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#b8860b'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.fillStyle = '#b8860b'
    ctx.font = '900 5px Nunito, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('C', M.px, M.py + 5.6)
    // name tag
    ctx.fillStyle = '#d9b8ff'
    ctx.font = '800 6.5px Nunito, sans-serif'
    ctx.fillText('MERCHANT', M.px, M.py - 17)
    ctx.restore()
    if (M.bubT > 0 && M.bubText) {
      drawSpeech(ctx, M.px, M.py - 14, M.bubText, W, { color: '#b06bff' })
    }
  }

  // speech bubbles (player on top)
  if (p.bubT > 0 && p.bubText) {
    const below = p.py < 60
    drawSpeech(ctx, p.px, below ? p.py + 20 : p.py - 18, p.bubText, W, {
      below,
      color: '#ffd23f',
    })
  }

  // particles
  for (const pt of s.parts) {
    ctx.globalAlpha = Math.max(0, pt.t / pt.max)
    ctx.fillStyle = pt.color
    ctx.beginPath()
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  // floating texts
  for (const ft of s.texts) {
    ctx.globalAlpha = Math.min(1, ft.t / 0.6)
    ctx.font = '900 13px Nunito, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = ft.color
    ctx.shadowColor = 'rgba(0,0,0,0.9)'
    ctx.shadowBlur = 4
    ctx.fillText(ft.text, ft.x, ft.y)
    ctx.shadowBlur = 0
  }
  ctx.globalAlpha = 1

  // hit flash
  if (s.flash > 0.01) {
    const col =
      s.flashColor === 'red' ? '255,60,80' : s.flashColor === 'blue' ? '80,180,255' : '255,255,255'
    ctx.fillStyle = `rgba(${col},${s.flash * 0.28})`
    ctx.fillRect(-8, -8, W + 16, H + 16)
  }

  // critical breach vignette
  if (s.critical && s.phase === 'play') {
    ctx.strokeStyle = `rgba(255,50,70,${0.4 + 0.3 * Math.sin(t * 8)})`
    ctx.lineWidth = 12
    ctx.shadowColor = '#ff3246'
    ctx.shadowBlur = 20
    ctx.strokeRect(5, 5, W - 10, H - 10)
    ctx.shadowBlur = 0
  }
}
