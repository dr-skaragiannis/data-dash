import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from './utils/cn'
import { LEVELS, GHOST_INFO, type GhostKind } from './game/levels'
import {
  createGame,
  updateGame,
  doPrivacyShield,
  doReportBlock,
  resolveBait,
  challengeTap,
  dismissScenario,
  doFight,
  openShop,
  closeShop,
  buyItem,
  type GameState,
  type GameEvent,
} from './game/engine'
import { itemById } from './game/items'
import { renderFrame } from './game/render'
import { ensureAudio, sfx, isMuted, setMuted } from './game/audio'

const SAVE_KEY = 'datadash-save'
interface Save {
  hi: number
  unlocked: number
}
function loadSave(): Save {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      return { hi: p.hi | 0, unlocked: Math.min(3, Math.max(1, p.unlocked | 0)) }
    }
  } catch {
    /* ignore */
  }
  return { hi: 0, unlocked: 1 }
}
function persistSave(s: Save) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

const TIPS = [
  'Passwords are like toothbrushes: never share yours, and change them often.',
  'Before sharing a photo, ask: "Would I be okay if my whole class saw this?"',
  'Turn off location tags before posting photos from home or school.',
  'If a stranger offers you "free" stuff, it is a trap. Close the chat.',
  'Two-factor authentication is a second lock on your door — use both.',
  'Bullied in a chat? Screenshot it as proof, then block, report and tell a trusted adult.',
  'Free Wi-Fi is like a phone call in a crowded room — anyone can listen.',
]

interface UiSnap {
  score: number
  lives: number
  level: number
  shieldCharge: boolean
  lvlT: number
  exposure: number
  bandwidth: number
  shields: number
  muteT: number
  vpnT: number
  bubbleT: number
  reportCd: number
  time: number
  phase: string
  left: number
  critical: boolean
  entUp: boolean
  entNum: boolean
  entSpec: boolean
  baitActive: boolean
  baitT: number
  magnetT: number
  filterT: number
  inLight: boolean
  overReason: string
  breach: string[]
  clearBonus: number
  credits: number
  weapon: string | null
  gear: string | null
  merchantNear: boolean
  shopOpen: boolean
  shopStock: string[]
  scn: null | {
    actor: string
    actorName: string
    shout: string
    kind: string
    prompt: string
    riddle: string
    title: string
    risk: string
    goal: string
    items: { text: string; icon: number; picked: boolean; wrong: boolean }[]
    time: number
    timeMax: number
    result: null | { verdict: string; effects: string[] }
  }
}

/* ---------- tiny inline SVG icons (no emoji) ---------- */
function GhostSvg({ color, size = 64, className }: { color: string; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className}>
      <path
        d="M10 93 L10 48 A40 40 0 0 1 90 48 L90 93 L77.5 81 L65 93 L52.5 81 L40 93 L27.5 81 Z"
        fill={color}
      />
      <circle cx="34" cy="47" r="11.5" fill="#ffffff" />
      <circle cx="66" cy="47" r="11.5" fill="#ffffff" />
      <circle cx="37" cy="50" r="5.2" fill="#0a1030" />
      <circle cx="69" cy="50" r="5.2" fill="#0a1030" />
    </svg>
  )
}
const IconHeart = ({ on, size = 18 }: { on: boolean; size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size}>
    <path
      d="M12 21s-7.5-4.8-9.7-9.2C.7 8.6 2.6 5 6 5c2.2 0 3.6 1.2 6 3.6C14.4 6.2 15.8 5 18 5c3.4 0 5.3 3.6 3.7 6.8C19.5 16.2 12 21 12 21z"
      fill={on ? '#ff4d5e' : '#2a3358'}
      stroke={on ? '#ffb3bc' : '#3a4470'}
      strokeWidth="1.2"
    />
  </svg>
)
const IconShield = ({ on, size = 18 }: { on: boolean; size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size}>
    <path
      d="M12 2l8 3.5v6c0 5-3.4 8.6-8 10.5-4.6-1.9-8-5.5-8-10.5v-6L12 2z"
      fill={on ? '#35e0ff' : 'rgba(53,224,255,0.08)'}
      stroke={on ? '#bdf3ff' : '#3a4470'}
      strokeWidth="1.4"
    />
    {on && (
      <path d="M8.5 11.5l2.5 2.8 4.5-5" fill="none" stroke="#043043" strokeWidth="2" strokeLinecap="round" />
    )}
  </svg>
)
const IconPause = () => (
  <svg viewBox="0 0 24 24" width="16" height="16">
    <rect x="6" y="4" width="4" height="16" rx="1.5" fill="currentColor" />
    <rect x="14" y="4" width="4" height="16" rx="1.5" fill="currentColor" />
  </svg>
)
const IconPlay = () => (
  <svg viewBox="0 0 24 24" width="16" height="16">
    <path d="M7 4l13 8-13 8z" fill="currentColor" />
  </svg>
)
const IconSound = ({ muted }: { muted: boolean }) => (
  <svg viewBox="0 0 24 24" width="16" height="16">
    <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
    {muted ? (
      <path d="M16 9l5 6m0-6l-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    ) : (
      <path
        d="M16 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    )}
  </svg>
)
const IconArrow = ({ dir }: { dir: 'up' | 'down' | 'left' | 'right' }) => {
  const rot = { up: 0, right: 90, down: 180, left: 270 }[dir]
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" style={{ transform: `rotate(${rot}deg)` }}>
      <path d="M12 4l7 9h-4.5v7h-5v-7H5z" fill="currentColor" />
    </svg>
  )
}
const IconGavel = () => (
  <svg viewBox="0 0 24 24" width="20" height="20">
    <path
      d="M13.2 3.5l7.3 7.3-2.7 2.7-7.3-7.3zM11.2 5.5L12.5 4.2 6 10.7 4.7 12l2.3 2.3 1.3-1.3zM3 21h9v-2H4.5L8 15.5l-1.4-1.4L3 17.7z"
      fill="currentColor"
    />
  </svg>
)
const IconTrophy = ({ size = 54 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size}>
    <path
      d="M6 3h12v2h3v3c0 2.6-2 4.7-4.6 5-.8 1.6-2.2 2.8-3.9 3.2V19h3v2H8.5v-2h3v-2.8c-1.7-.4-3.1-1.6-3.9-3.2C5 12.7 3 10.6 3 8V5h3V3zm-1 4v1c0 1.4.9 2.6 2.1 3A10 10 0 016.3 7H5zm14 0h-1.3a10 10 0 01-.8 4c1.2-.4 2.1-1.6 2.1-3V7z"
      fill="#ffd23f"
    />
  </svg>
)
const IconLock = () => (
  <svg viewBox="0 0 24 24" width="16" height="16">
    <rect x="5" y="10" width="14" height="10" rx="2" fill="#3a4470" />
    <path d="M8 10V7a4 4 0 018 0v3" fill="none" stroke="#3a4470" strokeWidth="2.4" />
  </svg>
)

/* ---------- shared bits ---------- */
function GhostIntroRow({ small }: { small?: boolean }) {
  const order: GhostKind[] = ['blinky', 'pinky', 'inky', 'clyde']
  return (
    <div className={cn('flex items-end justify-center gap-3 sm:gap-6', small && 'scale-90')}>
      {order.map((k, i) => (
        <div key={k} className="flex flex-col items-center gap-1 anim-floaty" style={{ animationDelay: `${i * 0.35}s` }}>
          <GhostSvg color={GHOST_INFO[k].color} size={small ? 52 : 68} />
          <div className="rounded-md border border-white/15 bg-[#0a1233]/90 px-1.5 py-0.5 text-center">
            <div className="font-display text-[9px] sm:text-[11px]" style={{ color: GHOST_INFO[k].color }}>
              {GHOST_INFO[k].name}
            </div>
            <div className="text-[8px] sm:text-[9px] font-bold text-white/60 uppercase tracking-wide">
              {GHOST_INFO[k].role}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function ControlsGuide() {
  const rows: [string, string][] = [
    ['MOVE', 'Arrows / WASD / D-Pad'],
    ['PRIVACY SHIELD', 'E or Space — costs 15 bandwidth'],
    ['REPORT & BLOCK', 'R — traps the Troll nearby'],
    ['FIGHT', 'X — duel a threat (weapon or 2FA)'],
    ['MERCHANT', 'B — buy weapons & gear'],
    ['PAUSE', 'P or Esc'],
  ]
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-left w-full">
      {rows.map(([a, b]) => (
        <div key={a} className="contents">
          <span className="font-display text-[10px] text-[#26e5ff] pt-0.5 whitespace-nowrap">{a}</span>
          <span className="text-[11px] font-bold text-white/75">{b}</span>
        </div>
      ))}
    </div>
  )
}

/* ---------- bait & switch: spot-the-tracker puzzle ---------- */
function LootIcon({ i }: { i: number }) {
  const v = i % 7
  return (
    <svg viewBox="0 0 24 24" width="30" height="30">
      {v === 0 && (
        <>
          <circle cx="12" cy="12" r="9" fill="#ffd23f" stroke="#b8860b" strokeWidth="1.5" />
          <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="900" fill="#7a5200">
            R
          </text>
        </>
      )}
      {v === 1 && (
        <>
          <path d="M12 3l7 6-7 12L5 9z" fill="#35e0ff" stroke="#0f9db5" strokeWidth="1.5" />
          <path d="M12 3l7 6H5z" fill="#a8f1ff" opacity="0.7" />
        </>
      )}
      {v === 2 && (
        <path d="M8 4h8l4 4-3 3v9H7v-9L4 8z" fill="#ff7bd5" stroke="#b0448f" strokeWidth="1.5" />
      )}
      {v === 3 && (
        <path
          d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 5.9L12 16.4 6.7 19.3l1.2-5.9L3.4 9.3l6-.7z"
          fill="#ffd23f"
          stroke="#b8860b"
          strokeWidth="1.5"
        />
      )}
      {v === 4 && (
        <>
          <circle cx="8" cy="9" r="4.5" fill="none" stroke="#ffd23f" strokeWidth="3" />
          <path d="M11.5 12L19 20M16 17l3-2" stroke="#ffd23f" strokeWidth="3" strokeLinecap="round" fill="none" />
        </>
      )}
      {v === 5 && <path d="M13 2L4 14h6l-1 8 9-12h-6z" fill="#3dff8a" stroke="#1fae57" strokeWidth="1.5" />}
      {v === 6 && (
        <>
          <path d="M7 4h10v2h3v2c0 2.2-1.7 4-4 4.4A5.5 5.5 0 0113 15v2h2v3H9v-3h2v-2a5.5 5.5 0 01-3-2.6C5.7 12 4 10.2 4 8V6h3V4z" fill="#35e0ff" />
        </>
      )}
    </svg>
  )
}
function TrackerIcon() {
  return (
    <svg viewBox="0 0 24 24" width="30" height="30">
      <circle cx="12" cy="12" r="9.5" fill="#c98f4e" stroke="#8a5a2b" strokeWidth="1.5" />
      <circle cx="8" cy="8" r="1.3" fill="#8a5a2b" />
      <circle cx="17" cy="7.5" r="1.1" fill="#8a5a2b" />
      <circle cx="18" cy="16" r="1.2" fill="#8a5a2b" />
      <ellipse cx="12" cy="12.5" rx="5.5" ry="4" fill="#ffffff" />
      <circle cx="12" cy="12.5" r="2.4" fill="#ff4d5e" />
      <path d="M6 19.5c2 1.5 10 1.5 12 0" stroke="#8a5a2b" strokeWidth="1.2" fill="none" />
    </svg>
  )
}
function BaitPuzzle({ tracker, onPick }: { tracker: number; onPick: (i: number) => void }) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#04061a]/70 p-4">
      <div className="panel anim-pop w-full max-w-[300px] rounded-2xl p-4 text-center" style={{ borderColor: '#ff3fa4' }}>
        <div className="font-display text-xl text-[#ffd23f] text-glow-yellow">SPOT THE TRACKER!</div>
        <div className="mt-1 text-[11px] font-extrabold text-white/70">
          One icon is a hidden tracker — tap it before the 5 seconds run out!
        </div>
        <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-[#0d1440]">
          <div className="h-full rounded-full bg-[#ff4d5e]" style={{ animation: 'baitCount 5s linear forwards' }} />
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <button
              key={i}
              onClick={() => onPick(i)}
              className="rounded-xl border-2 border-[#26e5ff]/30 bg-[#0d1440] p-1.5 transition hover:border-[#26e5ff] active:scale-90"
            >
              {i === tracker ? <TrackerIcon /> : <LootIcon i={i} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ---------- merchant items ---------- */
function ItemIcon({ id, size = 30 }: { id: string; size?: number }) {
  const s = size
  switch (id) {
    case 'sword':
      return (
        <svg viewBox="0 0 32 32" width={s} height={s}>
          <path d="M6 26l14-14 4 4L10 30z" fill="#cfd8ff" />
          <path d="M20 12l4-6 6 6-6 4z" fill="#8fa8ff" />
          <path d="M8 22l6 6" stroke="#ffb03a" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )
    case 'bow':
      return (
        <svg viewBox="0 0 32 32" width={s} height={s}>
          <path d="M8 4c10 4 10 20 0 24" fill="none" stroke="#35e0ff" strokeWidth="3" strokeLinecap="round" />
          <line x1="8" y1="4" x2="8" y2="28" stroke="#9be9ff" strokeWidth="1.5" />
          <line x1="8" y1="16" x2="26" y2="16" stroke="#ffd23f" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M26 16l-5-3v6z" fill="#ffd23f" />
        </svg>
      )
    case 'laser':
      return (
        <svg viewBox="0 0 32 32" width={s} height={s}>
          <rect x="3" y="12" width="18" height="8" rx="2" fill="#ff4d5e" />
          <rect x="21" y="13.5" width="5" height="5" fill="#ff8f9b" />
          <line x1="26" y1="16" x2="31" y2="16" stroke="#ffd23f" strokeWidth="2.6" strokeLinecap="round" />
          <rect x="7" y="20" width="4" height="6" rx="1" fill="#c2273a" />
        </svg>
      )
    case 'spell':
      return (
        <svg viewBox="0 0 32 32" width={s} height={s}>
          <line x1="6" y1="28" x2="20" y2="12" stroke="#b06bff" strokeWidth="3" strokeLinecap="round" />
          <path
            d="M24 2l2.2 4.6 5 .7-3.6 3.4.9 4.9-4.5-2.4-4.5 2.4.9-4.9-3.6-3.4 5-.7z"
            fill="#ffd23f"
          />
        </svg>
      )
    case 'armor':
      return (
        <svg viewBox="0 0 32 32" width={s} height={s}>
          <path
            d="M16 3l11 4v8c0 7-4.7 11.7-11 14C9.7 26.7 5 22 5 15V7z"
            fill="#35e0ff"
            stroke="#bdf3ff"
            strokeWidth="1.5"
          />
          <path d="M16 8v14M10 12l12 8M22 12l-12 8" stroke="#043043" strokeWidth="1.6" />
        </svg>
      )
    case 'helmet':
      return (
        <svg viewBox="0 0 32 32" width={s} height={s}>
          <path d="M4 18a12 12 0 0124 0v6H4z" fill="#ffd23f" stroke="#b8860b" strokeWidth="1.5" />
          <rect x="2" y="22" width="28" height="4" rx="2" fill="#ffb03a" />
          <path d="M12 14a6 6 0 018 0" stroke="#fff2b8" strokeWidth="2" fill="none" />
        </svg>
      )
    default:
      return null
  }
}

function ShopOverlay({
  ui,
  onBuy,
  onClose,
}: {
  ui: UiSnap
  onBuy: (i: number) => void
  onClose: () => void
}) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#04061a]/85 p-4">
      <div className="panel anim-pop w-full max-w-md rounded-2xl p-4" style={{ borderColor: '#b06bff' }}>
        <div className="flex items-center justify-between">
          <div className="font-display text-xl text-[#d9b8ff]">THE MERCHANT</div>
          <div className="flex items-center gap-1 rounded-lg bg-[#0d1440] px-2 py-1">
            <CoinIcon />
            <span className="font-display text-sm text-[#ffd23f]">{ui.credits}</span>
            <span className="text-[9px] font-extrabold text-white/50">CREDITS</span>
          </div>
        </div>
        <div className="mt-1 text-[10px] font-extrabold tracking-wide text-white/50">
          Earn credits by securing data, winning challenges and spotting trackers.
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {ui.shopStock.map((id, i) => {
            const it = itemById(id)
            if (!it) return null
            const equipped = ui.weapon === id || ui.gear === id
            const afford = ui.credits >= it.price
            return (
              <div key={id} className="flex items-center gap-3 rounded-xl bg-[#0d1440] p-2.5" style={{ border: '1px solid rgba(176,107,255,0.3)' }}>
                <ItemIcon id={id} size={38} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-[13px] text-white">{it.name}</span>
                    <span
                      className="rounded px-1.5 py-0.5 text-[8px] font-extrabold tracking-widest"
                      style={{
                        background: it.slot === 'weapon' ? 'rgba(255,77,94,0.2)' : 'rgba(53,224,255,0.18)',
                        color: it.slot === 'weapon' ? '#ff8f9b' : '#8ff2ff',
                      }}
                    >
                      {it.slot === 'weapon' ? 'WEAPON' : 'GEAR'}
                    </span>
                    {equipped && (
                      <span className="rounded bg-[#062a16] px-1.5 py-0.5 text-[8px] font-extrabold text-[#3dff8a]">
                        EQUIPPED
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[10.5px] font-bold leading-snug text-white/60">{it.desc}</div>
                </div>
                <button
                  onClick={() => onBuy(i)}
                  disabled={!afford}
                  className={cn(
                    'btn-game flex shrink-0 flex-col items-center rounded-lg px-3 py-1.5',
                    afford ? 'bg-[#ffd23f] text-[#3d2a00]' : 'bg-[#2a3358] text-white/40'
                  )}
                >
                  <span className="flex items-center gap-1">
                    <CoinIcon size={12} />
                    {it.price}
                  </span>
                  <span className="text-[9px] font-extrabold">BUY</span>
                </button>
              </div>
            )
          })}
          {ui.shopStock.length === 0 && (
            <div className="rounded-xl bg-[#0d1440] p-4 text-center text-[11px] font-extrabold text-white/50">
              Sold out! Come back after your next fight.
            </div>
          )}
        </div>
        <button onClick={onClose} className="btn-game mt-3 w-full rounded-xl bg-[#b06bff] py-2 text-sm text-[#20083d]">
          CLOSE (B / ESC)
        </button>
      </div>
    </div>
  )
}
const CoinIcon = ({ size = 14 }: { size?: number }) => (
  <svg viewBox="0 0 16 16" width={size} height={size}>
    <circle cx="8" cy="8" r="7" fill="#ffd23f" stroke="#b8860b" strokeWidth="1.4" />
    <text x="8" y="11.4" textAnchor="middle" fontSize="9" fontWeight="900" fill="#7a5200">
      C
    </text>
  </svg>
)

/* ---------- hands-on assessment challenge ---------- */
const ACTOR_COLOR: Record<string, string> = {
  blinky: '#ff4d5e',
  pinky: '#ff7bd5',
  inky: '#35e0ff',
  clyde: '#ffa02f',
  looker: '#5a6bd8',
}
function LookerAvatar({ size = 44 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size}>
      <circle cx="24" cy="28" r="14" fill="#141c44" stroke="#5a6bd8" strokeWidth="2.5" />
      <line x1="24" y1="14" x2="24" y2="7" stroke="#8a93c8" strokeWidth="2.5" />
      <circle cx="24" cy="5.5" r="3" fill="#ffd23f" />
      <circle cx="24" cy="28" r="7.5" fill="#fff" />
      <circle cx="24" cy="28" r="4" fill="#0a1030" />
    </svg>
  )
}
function ChallengeOverlay({
  scn,
  onPick,
  onContinue,
}: {
  scn: NonNullable<UiSnap['scn']>
  onPick: (i: number) => void
  onContinue: () => void
}) {
  const color = ACTOR_COLOR[scn.actor] ?? '#ff3fa4'
  if (scn.result) {
    const win = scn.result.verdict === 'win'
    const verdict = win
      ? { label: 'THREAT QUARANTINED!', color: '#3dff8a', sub: `${scn.actorName} has been neutralized for this mission.` }
      : { label: 'DATA EXPOSED', color: '#ff4d5e', sub: `${scn.actorName} survives — next time, faster!` }
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#04061a]/90 p-4">
        <div className="panel anim-pop w-full max-w-sm rounded-2xl p-5 text-center" style={{ borderColor: verdict.color }}>
          <div className="font-display text-2xl" style={{ color: verdict.color, textShadow: `0 0 16px ${verdict.color}66` }}>
            {verdict.label}
          </div>
          <div className="mt-1 text-[11px] font-extrabold text-white/65">{verdict.sub}</div>
          <div className="mt-3 rounded-xl bg-[#0d1440] p-3 text-left">
            <div className="text-[9px] font-extrabold tracking-widest text-white/45">WHAT JUST HAPPENED</div>
            <div className="text-[12px] font-bold leading-snug text-white/85">{scn.risk}</div>
            <div className="mt-2 text-[9px] font-extrabold tracking-widest text-white/45">THE LESSON</div>
            <div className="text-[12px] font-bold leading-snug text-white/85">{scn.goal}</div>
          </div>
          <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
            {scn.result.effects.map((e, i) => (
              <span key={i} className="rounded-md bg-[#0d1440] px-2 py-1 text-[10px] font-extrabold text-[#8ff2ff]">
                {e}
              </span>
            ))}
          </div>
          <button onClick={onContinue} className="btn-game mt-4 w-full rounded-xl bg-[#ffd23f] py-2.5 text-base text-[#3d2a00]">
            CONTINUE
          </button>
        </div>
      </div>
    )
  }
  const isTracker = scn.kind === 'tracker'
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#04061a]/90 p-4">
      <div className="panel anim-pop w-full max-w-md rounded-2xl p-4">
        {/* the actor shouts */}
        <div className="flex items-center gap-2.5">
          <div
            className="shrink-0 rounded-full p-0.5"
            style={{ border: `2.5px solid ${color}`, boxShadow: `0 0 14px ${color}55` }}
          >
            {scn.actor === 'looker' ? (
              <LookerAvatar />
            ) : (
              <GhostSvg color={color} size={44} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[9px] font-extrabold tracking-widest" style={{ color }}>
              {scn.actorName} SHOUTS:
            </div>
            <div
              className="anim-wiggle mt-0.5 rounded-xl rounded-tl-none bg-white px-3 py-1.5"
              style={{ border: `2px solid ${color}` }}
            >
              <span className="font-display text-[13px] leading-tight" style={{ color: '#10131f' }}>
                {scn.shout}
              </span>
            </div>
          </div>
        </div>
        {/* timer */}
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#0d1440]">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.max(0, (scn.time / scn.timeMax) * 100)}%`,
              background: scn.time < scn.timeMax * 0.35 ? '#ff4d5e' : '#ffd23f',
            }}
          />
        </div>
        <div className="mt-2.5 text-center">
          <div className="font-display text-lg text-white" style={{ textShadow: '0 0 12px rgba(38,229,255,0.5)' }}>
            {scn.prompt}
          </div>
          {(scn.kind === 'riddle' || scn.kind === 'question') && (
            <div
              className={cn(
                'mx-auto mt-1.5 max-w-sm rounded-lg px-3 py-2 text-[12.5px] font-bold leading-snug',
                scn.kind === 'question' ? 'bg-[#0d1a40] text-[#a8ecff]' : 'bg-[#0d1440] italic text-[#ffd23f]'
              )}
              style={scn.kind === 'question' ? { border: '1px solid rgba(53,224,255,0.35)' } : undefined}
            >
              {scn.kind === 'question' ? scn.riddle : `“${scn.riddle}”`}
            </div>
          )}
        </div>
        {/* challenge tiles */}
        <div
          className={cn(
            'mt-3 grid gap-2',
            isTracker
              ? 'grid-cols-4'
              : scn.kind === 'url' || scn.kind === 'riddle' || scn.kind === 'question'
                ? 'grid-cols-1'
                : 'grid-cols-2'
          )}
        >
          {scn.items.map((it, i) => (
            <button
              key={i}
              onClick={() => onPick(i)}
              disabled={it.picked || it.wrong}
              className={cn(
                'btn-game flex min-h-12 items-center justify-center rounded-xl px-2 py-2 text-center text-[12px] font-bold leading-tight sm:text-[13px]',
                it.wrong ? 'anim-shake-x bg-[#2a0710] text-[#ff8f9b]' : it.picked ? 'bg-[#062a16] text-[#a5ffd2]' : 'bg-[#0d1440] text-white/90 hover:bg-[#14204d]'
              )}
              style={{ border: `1.5px solid ${it.wrong ? '#ff4d5e' : it.picked ? '#3dff8a' : 'rgba(38,229,255,0.35)'}` }}
            >
              {isTracker ? (
                it.icon === 7 ? (
                  <TrackerIcon />
                ) : (
                  <LootIcon i={it.icon} />
                )
              ) : (
                <span className={cn(scn.kind === 'password' && 'font-mono tracking-tight')}>{it.text}</span>
              )}
            </button>
          ))}
        </div>
        <div className="mt-2 text-center text-[9px] font-extrabold tracking-widest text-white/35">
          TAP THE TILES OR PRESS 1–{scn.items.length}
        </div>
      </div>
    </div>
  )
}

const GEAR_NAME: Record<number, string> = {
  2: 'DATA SHIELD — absorbs one hit',
  3: 'FOCUS MODE — ghosts chase 12% slower',
  4: 'SPEED ROUTER — you move 12% faster',
  5: 'DATA MAGNET — vacuums nearby dots',
}
const IconHeadphone = ({ on }: { on: boolean }) => (
  <svg viewBox="0 0 24 24" width="15" height="15">
    <path d="M4 15a8 8 0 0116 0" fill="none" stroke={on ? '#ff8a3d' : '#3a4470'} strokeWidth="2.6" />
    <rect x="3" y="14" width="4.6" height="7" rx="2" fill={on ? '#ff8a3d' : '#3a4470'} />
    <rect x="16.4" y="14" width="4.6" height="7" rx="2" fill={on ? '#ff8a3d' : '#3a4470'} />
  </svg>
)
const IconBoltSm = ({ on }: { on: boolean }) => (
  <svg viewBox="0 0 24 24" width="15" height="15">
    <path d="M13 2L4 14h6l-1 8 9-12h-6z" fill={on ? '#3dff8a' : '#3a4470'} />
  </svg>
)
const IconMagnetSm = ({ on }: { on: boolean }) => (
  <svg viewBox="0 0 24 24" width="15" height="15">
    <path d="M5 4h5v9a2 2 0 01-2 2 2 2 0 01-3-1.7V4zM14 4h5v11.3a2 2 0 01-3 1.7 2 2 0 01-2-2V4z" fill={on ? '#ff4d5e' : '#3a4470'} />
    <rect x="5" y="4" width="5" height="3.4" fill={on ? '#fff' : '#2a3358'} />
    <rect x="14" y="4" width="5" height="3.4" fill={on ? '#fff' : '#2a3358'} />
  </svg>
)

function Backdrop() {
  return (
    <>
      <div className="absolute inset-0 bg-grid" />
      <div className="absolute -left-24 top-8 h-72 w-72 rounded-full bg-[#26e5ff]/12 blur-3xl" />
      <div className="absolute -right-20 bottom-4 h-80 w-80 rounded-full bg-[#ff3fa4]/12 blur-3xl" />
      <div className="absolute left-1/3 bottom-1/3 h-64 w-64 rounded-full bg-[#ffd23f]/8 blur-3xl" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div
          key={i}
          className="drift-dot"
          style={{
            left: `${8 + i * 12}%`,
            width: i % 3 === 0 ? 8 : 5,
            height: i % 3 === 0 ? 8 : 5,
            background: ['#ffd23f', '#35e0ff', '#ff3fa4', '#3dff8a'][i % 4],
            animationDuration: `${9 + (i % 4) * 3}s`,
            animationDelay: `${i * 1.7}s`,
          }}
        />
      ))}
    </>
  )
}

/* ========================================================= */
export default function App() {
  const [screen, setScreen] = useState<'title' | 'levels' | 'profile' | 'game'>('title')
  const [sub, setSub] = useState<'playing' | 'paused' | 'clear' | 'over' | 'win'>('playing')
  const [lvl, setLvl] = useState(0)
  const [save, setSave] = useState<Save>(() => loadSave())
  const [ui, setUi] = useState<UiSnap | null>(null)
  const [toasts, setToasts] = useState<{ id: number; text: string; kind: string }[]>([])
  const [showTouch, setShowTouch] = useState(false)
  const [muted, setMutedUi] = useState(isMuted())

  const gameRef = useRef<GameState | null>(null)
  const inputRef = useRef({ desired: { x: 0, y: 0 } })
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const subRef = useRef(sub)
  subRef.current = sub
  const screenRef = useRef(screen)
  screenRef.current = screen
  const lvlRef = useRef(lvl)
  lvlRef.current = lvl
  const saveRef = useRef(save)
  saveRef.current = save
  const toastId = useRef(0)
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const pushToast = useCallback((text: string, kind: string) => {
    const id = ++toastId.current
    setToasts((p) => [...p.slice(-2), { id, text, kind }])
    window.setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3800)
  }, [])

  const startLevel = useCallback((n: number) => {
    ensureAudio()
    sfx.click()
    gameRef.current = createGame(n)
    inputRef.current.desired = { x: 0, y: 0 }
    setToasts([])
    setLvl(n)
    setSub('playing')
    setScreen('game')
  }, [])

  const toMenu = useCallback(() => {
    ensureAudio()
    sfx.click()
    gameRef.current = null
    setScreen('title')
    setSub('playing')
  }, [])

  const togglePause = useCallback(() => {
    if (screenRef.current !== 'game') return
    setSub((s) => (s === 'playing' ? 'paused' : s === 'paused' ? 'playing' : s))
  }, [])

  const handleEvent = useCallback(
    (e: GameEvent) => {
      const s = gameRef.current
      switch (e.type) {
        case 'pellet':
          sfx.waka(s ? s.wakaFlip : true)
          break
        case 'piiLeak':
          sfx.leak()
          pushToast(`DATA LEAK! ${e.text} — ghosts got faster!`, 'bad')
          break
        case 'piiSecure':
          sfx.secure()
          pushToast(`Data secured: ${e.text} (+50)`, 'good')
          break
        case 'power':
          sfx.power()
          pushToast(e.text === 'full' ? '2FA ARMED — threats muted 12s!' : '2FA half-armed (5s). Find both parts!', 'info')
          break
        case 'ent':
          sfx.ent()
          pushToast(
            e.text === 'up'
              ? 'UPPERCASE part saved — keep building the key!'
              : e.text === 'num'
                ? 'NUMBER part saved — keep building the key!'
                : 'SYMBOL part saved — keep building the key!',
            'good'
          )
          break
        case 'keyFull':
          sfx.keyFull()
          pushToast('MASTER KEY built! 2FA checkpoints fully armed.', 'good')
          break
        case 'magnet':
          sfx.magnet()
          pushToast('Sandbox Magnet — drag the gift to the vault (12s)', 'info')
          break
        case 'filter':
          sfx.pickup()
          pushToast('Privacy Filter up — screens can’t be peeked (10s)', 'good')
          break
        case 'gift':
          sfx.click()
          pushToast('A suspicious "free gift" appeared… don’t open it!', 'warn')
          break
        case 'magnetGrab':
          sfx.magnet()
          pushToast('Payload grabbed — drag it to the QUARANTINE VAULT!', 'info')
          break
        case 'quarantine':
          sfx.quarantine()
          pushToast('Payload quarantined! +150, exposure -5', 'good')
          break
        case 'malware':
          sfx.malware()
          pushToast('MALWARE OPENED! Never open unknown gifts (+15 exposure)', 'bad')
          break
        case 'copied':
          sfx.copied()
          pushToast('Shoulder-surfed! The Looker copied your key — wait for the light or grab a Filter', 'bad')
          break
        case 'bait':
          sfx.bait()
          pushToast('Bait tunnel! Spot the tracker before the 3s run out!', 'warn')
          break
        case 'baitWin':
          sfx.baitWin()
          pushToast('Tracker spotted! Door open, +500 earned', 'good')
          break
        case 'baitFail':
          sfx.baitFail()
          pushToast('Tracker slipped in! +10 exposure, Phish Bot alerted', 'bad')
          break
        case 'vpn':
          sfx.pickup()
          pushToast('VPN token — 10s of stealth', 'good')
          break
        case 'doorT':
          sfx.doorGood()
          pushToast('Verified link! Speed boost +100', 'good')
          break
        case 'doorF':
          sfx.doorBad()
          pushToast(`FAKE LINK! ${s ? s.def.fakeUrl : ''} — slowed!`, 'bad')
          break
        case 'gate':
          sfx.gate()
          pushToast('Incognito gate — 5s privacy bubble', 'info')
          break
        case 'ghostEat':
          sfx.ghosteat()
          pushToast(`${e.text} quarantined! +150, shield stored`, 'info')
          break
        case 'shieldOn':
          sfx.shieldon()
          pushToast('Privacy shield up — PII safe 5s', 'info')
          break
        case 'shieldBreak':
          sfx.shieldbreak()
          pushToast(`Your shield absorbed ${e.text}!`, 'warn')
          break
        case 'report':
          sfx.report()
          pushToast('Troll BLOCKED! Exposure -10 (+75)', 'good')
          break
        case 'deny':
          sfx.deny()
          pushToast(e.text || 'Not now!', 'warn')
          break
        case 'caught':
          sfx.caught()
          pushToast(`Caught by ${e.text}!`, 'bad')
          break
        case 'critical':
          sfx.critical()
          pushToast('CRITICAL BREACH — exposure 100%! One more catch and it is over.', 'bad')
          break
        case 'clear':
          sfx.fanfare()
          break
        case 'over':
          sfx.gameover()
          break
        case 'levelup':
          sfx.levelup()
          pushToast('RANK UP! New gear attached', 'good')
          break
        case 'dsShield':
          sfx.shieldbreak()
          pushToast('DATA SHIELD absorbed the hit — no life lost!', 'good')
          break
        case 'fight':
          sfx.power()
          pushToast(`You challenge ${e.text} — solve it to win!`, 'info')
          break
        case 'shopOpen':
          sfx.click()
          break
        case 'buy':
          sfx.pickup()
          pushToast(`${itemById(e.text ?? '')?.name ?? 'Item'} equipped!`, 'good')
          break
        case 'armorBreak':
          sfx.shieldbreak()
          pushToast('FIREWALL ARMOR shattered — it saved your heart!', 'warn')
          break
        case 'scnStart':
          sfx.scn()
          pushToast('CHALLENGE! Defeat the threat to quarantine it', 'info')
          break
        case 'scnPick':
          if (e.text === 'good') sfx.ent()
          else sfx.deny()
          break
        case 'scnEnd':
          if (e.text === 'win') {
            sfx.quarantine()
            pushToast('THREAT QUARANTINED! +250 XP', 'good')
          } else {
            sfx.baitFail()
            pushToast('DATA EXPOSED — the threat survives!', 'bad')
          }
          break
      }
    },
    [pushToast]
  )

  /* main loop */
  useEffect(() => {
    if (screen !== 'game') return
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    let raf = 0
    let last = performance.now()
    const loop = (t: number) => {
      const dt = Math.min(0.045, (t - last) / 1000)
      last = t
      const s = gameRef.current
      if (s) {
        if (subRef.current === 'playing') updateGame(s, inputRef.current, dt)
        if (s.events.length) {
          for (const e of s.events) handleEvent(e)
          s.events.length = 0
        }
        renderFrame(ctx, s, t / 1000)
        setUi({
          score: s.score,
          lives: s.lives,
          level: s.level,
          shieldCharge: s.shieldCharge,
          lvlT: s.lvlT,
          exposure: Math.round(s.exposure),
          bandwidth: Math.round(s.bandwidth),
          shields: s.shields,
          muteT: s.muteT,
          vpnT: s.vpnT,
          bubbleT: s.bubbleT,
          reportCd: s.reportCd,
          time: s.time,
          phase: s.phase,
          left: s.left,
          critical: s.critical,
          entUp: s.ent.up,
          entNum: s.ent.num,
          entSpec: s.ent.spec,
          baitActive: s.bait.active,
          baitT: s.bait.t,
          magnetT: s.magnetT,
          filterT: s.filterT,
          inLight: s.inLight,
          overReason: s.overReason,
          breach: [...s.breach],
          clearBonus: s.clearBonus,
          credits: s.credits,
          weapon: s.weapon,
          gear: s.gear,
          merchantNear: s.merchantNear,
          shopOpen: s.shopOpen,
          shopStock: [...s.shopStock],
          scn: s.scn.active
            ? {
                actor: s.scn.actor,
                actorName: s.scn.actorName,
                shout: s.scn.shout,
                kind: s.scn.ch?.kind ?? '',
                prompt: s.scn.ch?.prompt ?? '',
                riddle: s.scn.ch?.riddle ?? '',
                title: s.scn.data?.risk ?? '',
                risk: s.scn.data?.risk ?? '',
                goal: s.scn.data?.goal ?? '',
                items: (s.scn.ch?.items ?? []).map((it) => ({
                  text: it.text,
                  icon: it.icon,
                  picked: it.picked,
                  wrong: it.wrong,
                })),
                time: s.scn.ch?.time ?? 0,
                timeMax: s.scn.ch?.timeMax ?? 1,
                result: s.scn.result ? { verdict: s.scn.result.verdict, effects: s.scn.result.effects } : null,
              }
            : null,
        })
        if (subRef.current === 'playing') {
          if (s.phase === 'clear' && s.clearT > 1.1) {
            const ns: Save = {
              hi: Math.max(saveRef.current.hi, s.score),
              unlocked: Math.max(saveRef.current.unlocked, Math.min(3, lvlRef.current + 2)),
            }
            setSave(ns)
            persistSave(ns)
            setSub(lvlRef.current >= LEVELS.length - 1 ? 'win' : 'clear')
          } else if (s.phase === 'over' && s.overT > 1) {
            const ns: Save = { ...saveRef.current, hi: Math.max(saveRef.current.hi, s.score) }
            setSave(ns)
            persistSave(ns)
            setSub('over')
          }
        }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [screen, handleEvent])

  /* canvas fit */
  useEffect(() => {
    if (screen !== 'game') return
    const wrap = wrapRef.current
    const cv = canvasRef.current
    if (!wrap || !cv) return
    const fit = () => {
      const r = wrap.getBoundingClientRect()
      const lv = LEVELS[Math.min(lvlRef.current, LEVELS.length - 1)]
      const ar = lv.cols / lv.rows
      let w = r.width - 10
      let h = r.height - 10
      if (w / h > ar) w = h * ar
      else h = w / ar
      cv.style.width = `${Math.max(200, w)}px`
      cv.style.height = `${Math.max(150, h)}px`
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [screen, lvl])

  /* keyboard + touch detection */
  useEffect(() => {
    const D: Record<string, { x: number; y: number }> = {
      arrowup: { x: 0, y: -1 },
      w: { x: 0, y: -1 },
      arrowdown: { x: 0, y: 1 },
      s: { x: 0, y: 1 },
      arrowleft: { x: -1, y: 0 },
      a: { x: -1, y: 0 },
      arrowright: { x: 1, y: 0 },
      d: { x: 1, y: 0 },
    }
    const kd = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      ensureAudio()
      if (screenRef.current === 'game') {
        const scn = gameRef.current?.scn
        if (scn?.active) {
          if (scn.result) {
            if (k === 'enter' || k === ' ') {
              e.preventDefault()
              dismissScenario(gameRef.current!)
            }
            return
          }
          const digit = '123456789'.indexOf(k)
          if (digit >= 0 && scn.ch && digit < scn.ch.items.length) {
            e.preventDefault()
            challengeTap(gameRef.current!, digit)
            return
          }
          return
        }
        if (D[k]) {
          inputRef.current.desired = D[k]
          e.preventDefault()
          return
        }
        if (k === ' ' || k === 'e') {
          e.preventDefault()
          if (subRef.current === 'playing' && gameRef.current) doPrivacyShield(gameRef.current)
          return
        }
        if (k === 'r') {
          if (subRef.current === 'playing' && gameRef.current) doReportBlock(gameRef.current)
          return
        }
        if (k === 'x') {
          if (subRef.current === 'playing' && gameRef.current) doFight(gameRef.current)
          return
        }
        if (k === 'b') {
          actShop()
          return
        }
        if (k === 'escape') {
          if (gameRef.current?.shopOpen) {
            closeShop(gameRef.current)
            return
          }
          togglePause()
          return
        }
        if (k === 'p') {
          togglePause()
          return
        }
      }
      if (k === 'enter') {
        if (screenRef.current === 'title') startLevel(0)
        else if (screenRef.current === 'game' && subRef.current === 'clear') startLevel(lvlRef.current + 1)
        else if (screenRef.current === 'game' && subRef.current === 'win') startLevel(0)
      }
    }
    window.addEventListener('keydown', kd)
    const touch = () => setShowTouch(true)
    window.addEventListener('touchstart', touch, { once: true, passive: true })
    if ('ontouchstart' in window) setShowTouch(true)
    return () => {
      window.removeEventListener('keydown', kd)
      window.removeEventListener('touchstart', touch)
    }
  }, [startLevel, togglePause])

  const actShield = () => {
    ensureAudio()
    if (screenRef.current === 'game' && subRef.current === 'playing' && gameRef.current)
      doPrivacyShield(gameRef.current)
  }
  const actReport = () => {
    ensureAudio()
    if (screenRef.current === 'game' && subRef.current === 'playing' && gameRef.current)
      doReportBlock(gameRef.current)
  }

  const actFight = () => {
    ensureAudio()
    if (screenRef.current === 'game' && subRef.current === 'playing' && gameRef.current) doFight(gameRef.current)
  }
  const actShop = () => {
    ensureAudio()
    if (screenRef.current !== 'game' || !gameRef.current) return
    if (gameRef.current.shopOpen) closeShop(gameRef.current)
    else openShop(gameRef.current)
  }
  const actBuy = (i: number) => {
    const s = gameRef.current
    if (s) buyItem(s, i)
  }

  const trackerRef = useRef<number | null>(null)
  const baitActiveNow = ui?.baitActive ?? false
  useEffect(() => {
    if (baitActiveNow && trackerRef.current === null) trackerRef.current = Math.floor(Math.random() * 8)
    if (!baitActiveNow) trackerRef.current = null
  }, [baitActiveNow])
  const handleBaitPick = (i: number) => {
    const s = gameRef.current
    if (s && trackerRef.current !== null) resolveBait(s, i === trackerRef.current)
  }

  const setDesired = (x: number, y: number) => {
    ensureAudio()
    inputRef.current.desired = { x, y }
  }

  const fmt = (t: number) => {
    const m = Math.floor(t / 60)
    const s = Math.floor(t % 60)
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  /* ================= SCREENS ================= */
  if (screen === 'title') {
    return (
      <div className="relative h-full w-full overflow-hidden bg-[#04061a]">
        <Backdrop />
        <div className="relative z-10 flex h-full flex-col items-center justify-center gap-4 sm:gap-6 px-4">
          <div className="text-center">
            <div className="font-display text-5xl sm:text-7xl leading-none">
              <span className="text-[#26e5ff] text-glow-cyan">DATA</span>
              <span className="text-[#ffd23f] text-glow-yellow">-DASH</span>
            </div>
            <div className="mt-2 text-[11px] sm:text-sm font-extrabold tracking-[0.18em] text-white/70 uppercase">
              Eat the safe · Shield the private · Outsmart the threats
            </div>
          </div>
          <GhostIntroRow />
          <div className="flex flex-col items-center gap-2.5 w-full max-w-[240px]">
            <button
              onClick={() => startLevel(0)}
              className="btn-game w-full rounded-xl bg-[#ffd23f] py-3 text-xl text-[#3d2a00] shadow-[0_0_24px_rgba(255,210,63,0.45),0_4px_0_#c78f1a]"
            >
              NEW GAME
            </button>
            <button
              onClick={() => {
                ensureAudio()
                sfx.click()
                setScreen('levels')
              }}
              className="btn-game w-full rounded-xl bg-[#26e5ff] py-2.5 text-base text-[#003340] shadow-[0_0_18px_rgba(38,229,255,0.35),0_4px_0_#0f9db5]"
            >
              LEVELS
            </button>
            <button
              onClick={() => {
                ensureAudio()
                sfx.click()
                setScreen('profile')
              }}
              className="btn-game w-full rounded-xl bg-[#ff3fa4] py-2.5 text-base text-white shadow-[0_0_18px_rgba(255,63,164,0.4),0_4px_0_#b51d75]"
            >
              PROFILE
            </button>
          </div>
          <div className="mt-1 max-w-md rounded-lg border border-white/10 bg-[#0a1233]/80 px-3 py-2">
            <ControlsGuide />
          </div>
          <div className="text-[10px] font-bold text-white/40">
            A cyber-safety trainer for smart 11-year-olds · Hi-score {save.hi}
          </div>
        </div>
      </div>
    )
  }

  if (screen === 'levels') {
    return (
      <div className="relative h-full w-full overflow-hidden bg-[#04061a]">
        <Backdrop />
        <div className="relative z-10 flex h-full flex-col items-center justify-center gap-4 px-4">
          <h2 className="font-display text-3xl sm:text-4xl text-white text-glow-cyan">CHOOSE MISSION</h2>
          <div className="flex w-full max-w-lg flex-col gap-3">
            {LEVELS.map((lv, i) => {
              const locked = i + 1 > save.unlocked
              return (
                <button
                  key={lv.id}
                  disabled={locked}
                  onClick={() => !locked && startLevel(i)}
                  className={cn(
                    'panel flex items-center gap-3 rounded-xl px-4 py-3 text-left transition',
                    locked ? 'opacity-45' : 'hover:border-[#26e5ff]/60 active:scale-[0.98]'
                  )}
                >
                  <div
                    className="font-display flex h-11 w-11 items-center justify-center rounded-lg text-xl"
                    style={{ background: `${lv.theme.a}22`, color: lv.theme.a, border: `1.5px solid ${lv.theme.a}66` }}
                  >
                    {locked ? <IconLock /> : lv.id}
                  </div>
                  <div className="flex-1">
                    <div className="font-display text-base" style={{ color: locked ? '#8a93a6' : lv.theme.b }}>
                      {lv.name}
                    </div>
                    <div className="text-[11px] font-bold text-white/55">{lv.desc}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    {[0, 1, 2].map((d) => (
                      <div
                        key={d}
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: d < i + 1 ? '#ff4d5e' : '#22304f' }}
                      />
                    ))}
                  </div>
                  {!locked && <div className="font-display text-xs text-[#3dff8a]">PLAY</div>}
                </button>
              )
            })}
          </div>
          <button onClick={toMenu} className="btn-game rounded-xl bg-[#26e5ff] px-6 py-2 text-[#003340]">
            BACK
          </button>
        </div>
      </div>
    )
  }

  if (screen === 'profile') {
    return (
      <div className="relative h-full w-full overflow-hidden bg-[#04061a]">
        <Backdrop />
        <div className="relative z-10 flex h-full flex-col items-center justify-center gap-4 px-4">
          <h2 className="font-display text-3xl sm:text-4xl text-white text-glow-pink">PROFILE</h2>
          <div className="flex w-full max-w-md gap-3">
            <div className="panel flex-1 rounded-xl p-4 text-center">
              <div className="text-[10px] font-extrabold tracking-widest text-white/50">HI-SCORE</div>
              <div className="font-display text-3xl text-[#ffd23f] text-glow-yellow">{save.hi}</div>
            </div>
            <div className="panel flex-1 rounded-xl p-4 text-center">
              <div className="text-[10px] font-extrabold tracking-widest text-white/50">MISSIONS OPEN</div>
              <div className="font-display text-3xl text-[#35e0ff] text-glow-cyan">
                {save.unlocked}/3
              </div>
            </div>
          </div>
          <div className="panel w-full max-w-md rounded-xl p-4">
            <div className="mb-2 font-display text-sm text-[#3dff8a]">FIVE DIGITAL RULES</div>
            <ul className="space-y-1.5">
              {[
                'Never share your address, phone, school or password.',
                'Check web addresses for trick typos before clicking.',
                'Use a unique password + 2FA for every account.',
                'Be kind in chats: screenshot, block, report.',
                'Use public Wi-Fi only with a VPN.',
              ].map((r, i) => (
                <li key={i} className="flex gap-2 text-[12px] font-bold text-white/75">
                  <span className="font-display text-[#26e5ff]">{i + 1}.</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                const ns = { hi: 0, unlocked: 1 }
                setSave(ns)
                persistSave(ns)
                sfx.click()
              }}
              className="btn-game rounded-xl bg-[#2a3358] px-4 py-2 text-xs text-white/80"
            >
              RESET PROGRESS
            </button>
            <button onClick={toMenu} className="btn-game rounded-xl bg-[#26e5ff] px-6 py-2 text-[#003340]">
              BACK
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ============ GAME SCREEN ============ */
  const def = LEVELS[lvl]
  const expColor = ui && ui.exposure < 35 ? '#3dff8a' : ui && ui.exposure < 70 ? '#ffd23f' : '#ff4d5e'

  return (
    <div className="flex h-full w-full flex-col bg-[#04061a]">
      {/* TOP HUD */}
      <div className="z-20 flex h-12 shrink-0 items-center gap-2 border-b-2 border-[#26e5ff]/25 bg-[#0a1233] px-2 sm:gap-3 sm:px-3">
        <div
          className="font-display rounded-md px-2 py-0.5 text-xs"
          style={{ background: `${def.theme.a}26`, color: def.theme.a, border: `1px solid ${def.theme.a}66` }}
        >
          LV {lvl + 1}
        </div>
        <div className="hidden min-w-0 sm:block">
          <div className="font-display truncate text-sm leading-tight text-white" style={{ color: def.theme.b }}>
            {def.name}
          </div>
        </div>
        <div className="ml-1 flex items-baseline gap-2">
          <div className="text-[10px] font-extrabold tracking-widest text-white/45">SCORE</div>
          <div className="font-display text-2xl leading-none text-[#ffd23f] text-glow-yellow">{ui?.score ?? 0}</div>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-[#0d1440] px-2 py-1" style={{ border: '1px solid rgba(255,210,63,0.35)' }} title="Credits — spend them at the Merchant">
          <CoinIcon />
          <span className="font-display text-sm leading-none text-[#ffd23f]">{ui?.credits ?? 10}</span>
        </div>
        <div className="hidden items-baseline gap-1.5 md:flex">
          <div className="text-[10px] font-extrabold tracking-widest text-white/45">HI</div>
          <div className="font-display text-base leading-none text-white/70">{Math.max(save.hi, ui?.score ?? 0)}</div>
        </div>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-1.5 md:flex">
            <div className="text-[9px] font-extrabold tracking-widest text-white/45">TIME</div>
            <div className="font-display text-sm text-[#35e0ff]">{fmt(ui?.time ?? 0)}</div>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <div className="text-[8px] font-extrabold tracking-widest text-white/45">BANDWIDTH</div>
            <div className="h-2.5 w-20 overflow-hidden rounded-full bg-[#0d1440] sm:w-28">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#3dff8a] to-[#26e5ff] transition-[width] duration-200"
                style={{ width: `${ui?.bandwidth ?? 0}%` }}
              />
            </div>
          </div>
          <button
            onClick={() => {
              ensureAudio()
              const m = !muted
              setMuted(m)
              setMutedUi(m)
              if (!m) sfx.click()
            }}
            className="rounded-lg border border-white/15 bg-[#0d1440] p-1.5 text-white/70"
            aria-label="sound"
          >
            <IconSound muted={muted} />
          </button>
          <button
            onClick={togglePause}
            className="rounded-lg border border-white/15 bg-[#0d1440] p-1.5 text-white/80"
            aria-label="pause"
          >
            {sub === 'paused' ? <IconPlay /> : <IconPause />}
          </button>
        </div>
      </div>

      {/* PLAY AREA */}
      <div ref={wrapRef} className="relative min-h-0 flex-1 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={def.cols * 32 * 2}
            height={def.rows * 32 * 2}
            className="rounded-md"
            onTouchStart={(e) => {
              const t = e.touches[0]
              touchStart.current = { x: t.clientX, y: t.clientY }
            }}
            onTouchMove={(e) => {
              const t = e.touches[0]
              const st = touchStart.current
              if (!st) return
              const dx = t.clientX - st.x
              const dy = t.clientY - st.y
              if (Math.abs(dx) < 26 && Math.abs(dy) < 26) return
              if (Math.abs(dx) > Math.abs(dy)) setDesired(Math.sign(dx), 0)
              else setDesired(0, Math.sign(dy))
              touchStart.current = { x: t.clientX, y: t.clientY }
            }}
          />
        </div>

        {/* toasts */}
        <div className="pointer-events-none absolute left-1/2 top-2 z-30 flex -translate-x-1/2 flex-col items-center gap-1.5">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={cn(
                'anim-toast max-w-[94%] truncate rounded-lg border px-3.5 py-1.5 text-xs font-extrabold sm:text-sm',
                t.kind === 'bad' && 'border-[#ff4d5e] bg-[#2a0710]/95 text-[#ffb3bc]',
                t.kind === 'good' && 'border-[#3dff8a] bg-[#062a16]/95 text-[#a5ffd2]',
                t.kind === 'info' && 'border-[#35e0ff] bg-[#04202e]/95 text-[#a8ecff]',
                t.kind === 'warn' && 'border-[#ffd23f] bg-[#2b2106]/95 text-[#ffeaa5]'
              )}
            >
              {t.text}
            </div>
          ))}
        </div>

        {/* intro banner */}
        {ui && ui.time < 3.4 && ui.phase === 'play' && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            <div className="anim-intro rounded-2xl border-2 bg-[#040818]/85 px-8 py-4 text-center" style={{ borderColor: def.theme.a }}>
              <div className="font-display text-lg text-white/80 sm:text-xl">{def.sub.toUpperCase()}</div>
              <div className="font-display text-3xl sm:text-5xl" style={{ color: def.theme.b }}>
                {def.name}
              </div>
              <div className="mt-1.5 text-[11px] font-extrabold text-white/70">
                Grab yellow dots · never run over the red private data!
              </div>
            </div>
          </div>
        )}

        {/* touch controls */}
        {showTouch && (
          <>
            <div className="absolute bottom-2 left-2 z-30 grid w-[164px] grid-cols-3 gap-1">
              <div />
              <button className="dpad-btn h-13 py-2.5" onPointerDown={(e) => { e.preventDefault(); setDesired(0, -1) }} aria-label="up">
                <IconArrow dir="up" />
              </button>
              <div />
              <button className="dpad-btn h-13 py-2.5" onPointerDown={(e) => { e.preventDefault(); setDesired(-1, 0) }} aria-label="left">
                <IconArrow dir="left" />
              </button>
              <div className="flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-[#26e5ff]/40" />
              </div>
              <button className="dpad-btn h-13 py-2.5" onPointerDown={(e) => { e.preventDefault(); setDesired(1, 0) }} aria-label="right">
                <IconArrow dir="right" />
              </button>
              <div />
              <button className="dpad-btn h-13 py-2.5" onPointerDown={(e) => { e.preventDefault(); setDesired(0, 1) }} aria-label="down">
                <IconArrow dir="down" />
              </button>
              <div />
            </div>
            <div className="absolute bottom-2 right-2 z-30 grid grid-cols-2 gap-2">
              <button
                onPointerDown={(e) => { e.preventDefault(); actShield() }}
                className="dpad-btn h-16 w-16 flex-col gap-0.5 rounded-2xl! border-[#35e0ff]/70!"
              >
                <IconShield on size={22} />
                <span className="font-display text-[9px]">SHIELD</span>
              </button>
              <button
                onPointerDown={(e) => { e.preventDefault(); actReport() }}
                className="dpad-btn h-16 w-16 flex-col gap-0.5 rounded-2xl! border-[#ff4d5e]/70! text-[#ffb3bc]!"
              >
                <IconGavel />
                <span className="font-display text-[9px]">BLOCK</span>
              </button>
              <button
                onPointerDown={(e) => { e.preventDefault(); actFight() }}
                className="dpad-btn h-16 w-16 flex-col gap-0.5 rounded-2xl! border-[#ffd23f]/70! text-[#ffeaa5]!"
              >
                <svg viewBox="0 0 24 24" width="22" height="22">
                  <path d="M4 20L15 9l3 3L7 23z" fill="currentColor" />
                  <path d="M14 8l4-5 3 3-5 4z" fill="currentColor" opacity="0.7" />
                </svg>
                <span className="font-display text-[9px]">FIGHT</span>
              </button>
              <button
                onPointerDown={(e) => { e.preventDefault(); actShop() }}
                className={cn(
                  'dpad-btn h-16 w-16 flex-col gap-0.5 rounded-2xl! border-[#b06bff]/70! text-[#d9b8ff]!',
                  ui?.merchantNear && 'anim-pulse-soft'
                )}
              >
                <svg viewBox="0 0 24 24" width="22" height="22">
                  <path d="M4 7l1-3h14l1 3a3 3 0 01-6 0 3 3 0 01-6 0 3 3 0 01-4-0z" fill="currentColor" />
                  <rect x="5" y="11" width="14" height="9" rx="1.5" fill="none" stroke="currentColor" strokeWidth="2" />
                </svg>
                <span className="font-display text-[9px]">SHOP</span>
              </button>
            </div>
          </>
        )}

        {/* LEVEL-UP BANNER */}
        {ui && ui.lvlT > 0 && ui.phase === 'play' && !ui.scn && (
          <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
            <div
              className="anim-pop rounded-2xl border-2 border-[#ffd23f] bg-[#040818]/92 px-8 py-3.5 text-center"
              style={{ boxShadow: '0 0 34px rgba(255,210,63,0.45)' }}
            >
              <div className="font-display text-3xl text-[#ffd23f] text-glow-yellow">RANK {ui.level}!</div>
              <div className="mt-0.5 text-xs font-extrabold tracking-widest text-white/85">{GEAR_NAME[ui.level]}</div>
            </div>
          </div>
        )}

        {/* MERCHANT SHOP */}
        {ui?.shopOpen && (
          <ShopOverlay ui={ui} onBuy={actBuy} onClose={actShop} />
        )}

        {/* ASSESSMENT CHALLENGE */}
        {ui?.scn && (
          <ChallengeOverlay
            scn={ui.scn}
            onPick={(i) => {
              const s = gameRef.current
              if (s) challengeTap(s, i)
            }}
            onContinue={() => {
              const s = gameRef.current
              if (s) dismissScenario(s)
            }}
          />
        )}

        {/* BAIT & SWITCH PUZZLE */}
        {ui?.baitActive && trackerRef.current !== null && (
          <BaitPuzzle tracker={trackerRef.current} onPick={handleBaitPick} />
        )}

        {/* PAUSE */}
        {sub === 'paused' && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#04061a]/80 p-4">
            <div className="panel anim-pop w-full max-w-xs rounded-2xl p-5">
              <div className="font-display mb-3 text-center text-2xl text-[#26e5ff] text-glow-cyan">PAUSED</div>
              <ControlsGuide />
              <div className="mt-4 flex flex-col gap-2">
                <button onClick={togglePause} className="btn-game rounded-xl bg-[#ffd23f] py-2.5 text-base text-[#3d2a00]">
                  RESUME
                </button>
                <div className="flex gap-2">
                  <button onClick={() => startLevel(lvl)} className="btn-game flex-1 rounded-xl bg-[#26e5ff] py-2 text-sm text-[#003340]">
                    RESTART
                  </button>
                  <button onClick={toMenu} className="btn-game flex-1 rounded-xl bg-[#2a3358] py-2 text-sm text-white/85">
                    MENU
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LEVEL CLEAR */}
        {sub === 'clear' && ui && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#04061a]/75 p-4">
            <div className="panel anim-pop w-full max-w-sm rounded-2xl p-5 text-center">
              <div className="font-display text-3xl text-[#3dff8a]" style={{ textShadow: '0 0 18px rgba(61,255,138,0.6)' }}>
                MISSION CLEARED!
              </div>
              <div className="mt-1 text-xs font-extrabold tracking-widest text-white/55 uppercase">{def.name} complete</div>
              <div className="mx-auto mt-3 flex w-fit items-center gap-4">
                <div>
                  <div className="text-[9px] font-extrabold tracking-widest text-white/45">SCORE</div>
                  <div className="font-display text-2xl text-[#ffd23f]">{ui.score}</div>
                </div>
                <div>
                  <div className="text-[9px] font-extrabold tracking-widest text-white/45">CLEANUP BONUS</div>
                  <div className="font-display text-2xl text-[#35e0ff]">+{ui.clearBonus}</div>
                </div>
              </div>
              <div className="mt-3 rounded-xl border border-[#ffd23f]/30 bg-[#2b2106]/60 p-3 text-left">
                <div className="font-display mb-1 text-[10px] tracking-wide text-[#ffd23f]">SAFETY DEBRIEF</div>
                <p className="text-[12px] font-bold leading-snug text-white/85">{def.tip}</p>
              </div>
              <button
                onClick={() => startLevel(lvl + 1)}
                className="btn-game mt-4 w-full rounded-xl bg-[#3dff8a] py-3 text-lg text-[#06331a] shadow-[0_0_22px_rgba(61,255,138,0.45)]"
              >
                NEXT MISSION
              </button>
            </div>
          </div>
        )}

        {/* GAME OVER */}
        {sub === 'over' && ui && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#150308]/85 p-4">
            <div className="panel anim-pop w-full max-w-sm rounded-2xl border-[#ff4d5e]/50 p-5 text-center">
              <div className="font-display text-3xl text-[#ff4d5e] text-glow-red">ACCOUNT COMPROMISED</div>
              <div className="mt-1 text-[11px] font-extrabold tracking-widest text-white/60 uppercase">
                {ui.overReason === 'critical' ? 'Critical breach: exposure reached 100%' : 'The threats caught you 3 times'}
              </div>
              {ui.breach.length > 0 && (
                <div className="mt-3 rounded-xl border border-[#ff4d5e]/30 bg-[#2a0710]/70 p-3 text-left">
                  <div className="font-display mb-1.5 text-[10px] tracking-wide text-[#ff8f9b]">BREACH ROUTE — WHAT WENT WRONG</div>
                  <ol className="space-y-1">
                    {ui.breach.slice(-5).reverse().map((b, i) => (
                      <li key={i} className="flex gap-2 text-[11px] font-bold text-white/80">
                        <span className="font-display text-[#ff4d5e]">{i + 1}.</span>
                        {b}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              <div className="mt-2 text-[11px] font-bold text-white/55">
                Not bad luck — the chain started with that leak. Run it back!
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => startLevel(lvl)} className="btn-game flex-1 rounded-xl bg-[#ffd23f] py-2.5 text-base text-[#3d2a00]">
                  RETRY
                </button>
                <button onClick={toMenu} className="btn-game flex-1 rounded-xl bg-[#2a3358] py-2.5 text-base text-white/85">
                  MENU
                </button>
              </div>
            </div>
          </div>
        )}

        {/* WIN */}
        {sub === 'win' && ui && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#04061a]/85 p-4">
            <div className="panel anim-pop w-full max-w-sm rounded-2xl p-5 text-center">
              <div className="flex justify-center"><IconTrophy size={64} /></div>
              <div className="font-display mt-1 text-3xl text-[#ffd23f] text-glow-yellow">DATA DEFENDER!</div>
              <div className="mt-1 text-[11px] font-extrabold tracking-widest text-white/60 uppercase">
                All three missions cleared
              </div>
              <div className="mt-3">
                <div className="text-[9px] font-extrabold tracking-widest text-white/45">FINAL SCORE</div>
                <div className="font-display text-4xl text-[#35e0ff] text-glow-cyan">{ui.score}</div>
              </div>
              <div className="mt-3 rounded-xl border border-[#ffd23f]/30 bg-[#2b2106]/60 p-3">
                <p className="text-[12px] font-bold leading-snug text-white/85">{TIPS[Math.floor(ui.time) % TIPS.length]}</p>
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => startLevel(0)} className="btn-game flex-1 rounded-xl bg-[#ffd23f] py-2.5 text-base text-[#3d2a00]">
                  PLAY AGAIN
                </button>
                <button onClick={toMenu} className="btn-game flex-1 rounded-xl bg-[#2a3358] py-2.5 text-base text-white/85">
                  MENU
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM HUD */}
      <div className="z-20 flex h-14 shrink-0 items-center gap-2 border-t-2 border-[#26e5ff]/25 bg-[#0a1233] px-2 sm:gap-3 sm:px-3">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <IconHeart key={i} on={i < (ui?.lives ?? 3)} size={21} />
          ))}
        </div>
        <div
          className="flex items-center gap-1.5 rounded-lg bg-[#0d1440] px-2 py-1"
          style={{ border: '1px solid rgba(255,210,63,0.35)' }}
          title="Rank gear: shield / focus / speed / magnet"
        >
          <span className="font-display text-[10px] leading-none text-[#ffd23f]">RANK {ui?.level ?? 1}</span>
          <IconShield on={(ui?.level ?? 1) >= 2} size={14} />
          <IconHeadphone on={(ui?.level ?? 1) >= 3} />
          <IconBoltSm on={(ui?.level ?? 1) >= 4} />
          <IconMagnetSm on={(ui?.level ?? 1) >= 5} />
        </div>
        {(ui?.weapon || ui?.gear) && (
          <div className="hidden items-center gap-2 rounded-lg bg-[#0d1440] px-2 py-1 sm:flex" style={{ border: '1px solid rgba(176,107,255,0.4)' }}>
            {ui.weapon && (
              <span className="flex items-center gap-1" title={itemById(ui.weapon)?.name}>
                <ItemIcon id={ui.weapon} size={20} />
                <span className="text-[9px] font-extrabold text-white/70">{itemById(ui.weapon)?.name}</span>
              </span>
            )}
            {ui.gear && (
              <span className="flex items-center gap-1" title={itemById(ui.gear)?.name}>
                <ItemIcon id={ui.gear} size={20} />
                <span className="text-[9px] font-extrabold text-white/70">{itemById(ui.gear)?.name}</span>
              </span>
            )}
          </div>
        )}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-extrabold tracking-widest text-white/45">DATA EXPOSURE</span>
            <span
              className={cn('font-display text-xs leading-none', ui?.critical && 'anim-pulse-soft')}
              style={{ color: expColor }}
            >
              {ui?.exposure ?? 0}%
            </span>
          </div>
          <div className="relative h-4 w-32 overflow-hidden rounded-full bg-[#0d1440] sm:w-52">
            <div
              className={cn('absolute inset-0', ui?.critical && 'anim-pulse-soft')}
              style={{ background: 'linear-gradient(90deg,#3dff8a,#ffd23f 55%,#ff4d5e)' }}
            />
            <div
              className="absolute inset-y-0 right-0 bg-[#0d1440]"
              style={{ width: `${100 - (ui?.exposure ?? 0)}%`, transition: 'width 0.25s ease' }}
            />
          </div>
        </div>
        <div className="hidden items-center gap-0.5 sm:flex" title="Stored 2FA shields">
          {[0, 1, 2, 3].map((i) => (
            <IconShield key={i} on={i < (ui?.shields ?? 0)} size={20} />
          ))}
        </div>
        <div className="flex flex-col items-center gap-0.5" title="Password entropy key">
          <span className="text-[9px] font-extrabold tracking-widest text-white/45">2FA KEY</span>
          <div className="flex gap-1">
            <span
              className={cn(
                'font-display flex h-5 w-5 items-center justify-center rounded-md text-[11px] leading-none',
                ui?.entUp ? 'bg-[#ffd23f] text-[#3d2a00]' : 'bg-[#0d1440] text-white/35'
              )}
              style={ui?.entUp ? { boxShadow: '0 0 8px #ffd23f' } : { border: '1px solid #2a3358' }}
            >
              A
            </span>
            <span
              className={cn(
                'font-display flex h-5 w-5 items-center justify-center rounded-md text-[11px] leading-none',
                ui?.entNum ? 'bg-[#35e0ff] text-[#003340]' : 'bg-[#0d1440] text-white/35'
              )}
              style={ui?.entNum ? { boxShadow: '0 0 8px #35e0ff' } : { border: '1px solid #2a3358' }}
            >
              7
            </span>
            <span
              className={cn(
                'font-display flex h-5 w-5 items-center justify-center rounded-md text-[11px] leading-none',
                ui?.entSpec ? 'bg-[#ff3fa4] text-white' : 'bg-[#0d1440] text-white/35'
              )}
              style={ui?.entSpec ? { boxShadow: '0 0 8px #ff3fa4' } : { border: '1px solid #2a3358' }}
            >
              #
            </span>
          </div>
        </div>
        <div className="hidden flex-col gap-1 md:flex">
          {ui && ui.magnetT > 0 && (
            <span className="font-display rounded-md bg-[#3a2410] px-1.5 text-[10px] leading-5 text-[#ffb27a]" style={{ border: '1px solid #ff8a3d55' }}>
              MAGNET {Math.ceil(ui.magnetT)}s
            </span>
          )}
          {ui && ui.filterT > 0 && (
            <span className="font-display rounded-md bg-[#04202e] px-1.5 text-[10px] leading-5 text-[#8ff2ff]" style={{ border: '1px solid #35e0ff55' }}>
              FILTER {Math.ceil(ui.filterT)}s
            </span>
          )}
          {ui && ui.inLight && ui.filterT <= 0 && (
            <span className="anim-pulse-soft font-display rounded-md bg-[#2a0710] px-1.5 text-[10px] leading-5 text-[#ff8f9b]" style={{ border: '1px solid #ff4d5e66' }}>
              IN THE LIGHT!
            </span>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={actShield}
            className={cn(
              'btn-game relative overflow-hidden rounded-lg px-2.5 py-2 text-xs sm:px-3.5 sm:text-sm',
              (ui?.bubbleT ?? 0) > 0 ? 'bg-[#0a3d4d] text-[#9be9ff]' : 'bg-[#0e2c46] text-[#35e0ff]'
            )}
            style={{ border: '1.5px solid rgba(53,224,255,0.5)' }}
          >
            {ui && ui.bubbleT > 0 ? `SHIELD ${Math.ceil(ui.bubbleT)}s` : 'PRIVACY SHIELD'}
            <span className="ml-1 hidden rounded bg-white/10 px-1 text-[9px] text-white/60 sm:inline">E</span>
          </button>
          <button
            onClick={actReport}
            disabled={(ui?.reportCd ?? 0) > 0}
            className={cn(
              'btn-game relative overflow-hidden rounded-lg px-3 py-2 text-xs sm:px-4.5 sm:text-base',
              (ui?.reportCd ?? 0) > 0 ? 'bg-[#4d1a24] text-white/50' : 'bg-[#c2273a] text-white'
            )}
            style={{ border: '1.5px solid rgba(255,77,94,0.65)' }}
          >
            <span className="relative z-10 flex items-center gap-1.5">
              <IconGavel />
              REPORT &amp; BLOCK
            </span>
            {(ui?.reportCd ?? 0) > 0 && (
              <span
                className="absolute inset-x-0 bottom-0 z-0 bg-black/40"
                style={{ height: `${((ui?.reportCd ?? 0) / 12) * 100}%` }}
              />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
