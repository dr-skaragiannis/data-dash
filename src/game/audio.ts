// Tiny WebAudio synth for game blips — no assets, works offline in the APK.
let ctx: AudioContext | null = null
let master: GainNode | null = null
let muted = false
try {
  muted = typeof localStorage !== 'undefined' && localStorage.getItem('datadash-mute') === '1'
} catch {
  muted = false
}

export function ensureAudio() {
  if (typeof window === 'undefined') return
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext
    if (!AC) return
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0.16
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
}

export const isMuted = () => muted
export function setMuted(m: boolean) {
  muted = m
  try {
    localStorage.setItem('datadash-mute', m ? '1' : '0')
  } catch {
    /* ignore */
  }
}

function tone(
  f0: number,
  f1: number,
  dur: number,
  type: OscillatorType = 'square',
  vol = 1,
  delay = 0
) {
  if (!ctx || !master || muted) return
  try {
    const t = ctx.currentTime + delay
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = type
    o.frequency.setValueAtTime(Math.max(1, f0), t)
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur)
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    o.connect(g)
    g.connect(master)
    o.start(t)
    o.stop(t + dur + 0.03)
  } catch {
    /* ignore */
  }
}

export const sfx = {
  click: () => tone(640, 880, 0.06, 'triangle', 0.7),
  waka: (alt: boolean) => tone(alt ? 240 : 330, alt ? 330 : 240, 0.06, 'square', 0.45),
  secure: () => {
    tone(520, 780, 0.12, 'sine', 0.9)
    tone(780, 1040, 0.12, 'sine', 0.7, 0.08)
  },
  leak: () => {
    tone(220, 70, 0.28, 'sawtooth', 1)
    tone(180, 60, 0.24, 'sawtooth', 0.8, 0.1)
  },
  power: () => {
    tone(330, 660, 0.09, 'square', 0.8)
    tone(440, 880, 0.09, 'square', 0.8, 0.09)
    tone(660, 1320, 0.14, 'square', 0.8, 0.18)
  },
  pickup: () => tone(820, 1200, 0.09, 'triangle', 0.9),
  doorGood: () => {
    tone(560, 840, 0.1, 'triangle', 0.9)
    tone(840, 1120, 0.12, 'triangle', 0.8, 0.09)
  },
  doorBad: () => {
    tone(300, 120, 0.25, 'sawtooth', 0.9)
    tone(140, 80, 0.3, 'sawtooth', 0.7, 0.12)
  },
  ghosteat: () => tone(320, 1400, 0.28, 'square', 0.9),
  shieldon: () => tone(700, 1050, 0.14, 'sine', 0.9),
  shieldbreak: () => {
    tone(900, 420, 0.16, 'triangle', 0.9)
    tone(420, 240, 0.18, 'triangle', 0.7, 0.1)
  },
  gate: () => tone(500, 900, 0.12, 'sine', 0.8),
  report: () => {
    tone(440, 440, 0.08, 'square', 0.8)
    tone(660, 660, 0.08, 'square', 0.8, 0.09)
    tone(880, 880, 0.14, 'square', 0.8, 0.18)
  },
  deny: () => tone(150, 110, 0.14, 'square', 0.7),
  caught: () => {
    tone(500, 90, 0.4, 'sawtooth', 0.9)
    tone(380, 60, 0.5, 'sawtooth', 0.7, 0.15)
  },
  critical: () => {
    tone(240, 180, 0.16, 'square', 0.9)
    tone(240, 180, 0.16, 'square', 0.9, 0.2)
  },
  fanfare: () => {
    const seq = [523, 659, 784, 1046]
    seq.forEach((f, i) => tone(f, f, 0.16, 'triangle', 0.9, i * 0.13))
    tone(1046, 1568, 0.3, 'triangle', 0.8, seq.length * 0.13)
  },
  gameover: () => {
    const seq = [392, 330, 262, 196]
    seq.forEach((f, i) => tone(f, f * 0.94, 0.22, 'sawtooth', 0.8, i * 0.18))
  },
  ent: () => {
    tone(620, 930, 0.08, 'square', 0.8)
    tone(930, 1240, 0.1, 'square', 0.7, 0.07)
  },
  keyFull: () => {
    tone(392, 392, 0.1, 'triangle', 0.9)
    tone(523, 523, 0.1, 'triangle', 0.9, 0.1)
    tone(659, 659, 0.1, 'triangle', 0.9, 0.2)
    tone(784, 1046, 0.25, 'triangle', 0.9, 0.3)
  },
  magnet: () => {
    tone(180, 320, 0.2, 'sine', 1)
    tone(320, 480, 0.15, 'sine', 0.7, 0.15)
  },
  quarantine: () => {
    tone(330, 220, 0.16, 'triangle', 0.9)
    tone(220, 330, 0.16, 'triangle', 0.9, 0.14)
    tone(440, 660, 0.3, 'triangle', 0.9, 0.28)
  },
  malware: () => {
    tone(240, 90, 0.3, 'sawtooth', 1)
    tone(120, 50, 0.35, 'square', 0.8, 0.12)
  },
  copied: () => {
    tone(1400, 900, 0.07, 'square', 0.7)
    tone(1400, 900, 0.07, 'square', 0.7, 0.09)
    tone(1400, 700, 0.12, 'square', 0.7, 0.18)
  },
  bait: () => {
    tone(160, 60, 0.25, 'square', 1)
    tone(90, 40, 0.3, 'sawtooth', 0.8, 0.1)
  },
  baitWin: () => {
    tone(523, 523, 0.09, 'triangle', 0.9)
    tone(659, 659, 0.09, 'triangle', 0.9, 0.09)
    tone(784, 1046, 0.2, 'triangle', 0.9, 0.18)
  },
  baitFail: () => {
    tone(300, 150, 0.2, 'sawtooth', 0.9)
    tone(150, 80, 0.3, 'sawtooth', 0.8, 0.15)
  },
  scn: () => {
    tone(520, 780, 0.1, 'sine', 0.8)
    tone(780, 1040, 0.12, 'sine', 0.7, 0.1)
    tone(1040, 1300, 0.1, 'sine', 0.5, 0.2)
  },
  levelup: () => {
    tone(392, 392, 0.1, 'triangle', 0.9)
    tone(523, 523, 0.1, 'triangle', 0.9, 0.1)
    tone(659, 659, 0.1, 'triangle', 0.9, 0.2)
    tone(784, 1046, 0.22, 'triangle', 0.9, 0.3)
    tone(1046, 1568, 0.2, 'sine', 0.6, 0.42)
  },
}
