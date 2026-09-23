// Hands-on awareness challenges (not quiz dialogue): the player reads, spots,
// sorts or solves under time pressure. Educational explanations appear only
// AFTER the player responds.
import type { ScnCat } from './scenarios'

export type ChallengeKind = 'url' | 'tracker' | 'password' | 'pii' | 'riddle' | 'question'

export interface ChItem {
  text: string
  icon: number // for tracker: 0-6 loot, 7 = tracker; else -1
  correct: boolean
  picked: boolean
  wrong: boolean
}
export interface Challenge {
  kind: ChallengeKind
  prompt: string
  riddle: string
  items: ChItem[]
  need: number
  maxWrong: number
  time: number
  timeMax: number
  pickedCount: number
  wrongCount: number
}

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]
function shuffled<T>(a: T[]): T[] {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[b[i], b[j]] = [b[j], b[i]]
  }
  return b
}
const item = (text: string, correct: boolean, icon = -1): ChItem => ({
  text,
  icon,
  correct,
  picked: false,
  wrong: false,
})

const URL_SETS: [string, string, string][] = [
  ['roblox.com/dev', 'rob1ox-rewards.win', 'free-robu4.xyz'],
  ['discord.com/login', 'dlsc0rd-verify.ru', 'discord-gift.xyz'],
  ['instagram.com', 'insta-gr0ut.com/free', 'ig-followers.win'],
  ['tiktok.com', 'tik-t0k-gifts.xyz', 'tiktok-login.ru'],
  ['gmail.com', 'gmaill-secure.win', 'mail-verify.xyz'],
  ['netflix.com', 'netflix-free.xyz', 'n3tflix.com'],
]

const PASSWORD_SETS: { strong: string[]; weak: string[] }[] = [
  { strong: ['Troll$42', 'Mn7!qRz', 'Xk9#Lm2'], weak: ['blue123', 'sunshine', '2015'] },
  { strong: ['Vb3@Zk9', 'Qw8!Rx4', 'Mn5$Tt7'], weak: ['password', 'dragon', '12345'] },
  { strong: ['Gh4#Pq2', 'Zx9!Wm6', 'Kt3@Vb8'], weak: ['admin', 'qwerty', 'love123'] },
]

const PII_SETS: { priv: string[]; pub: string[] }[] = [
  {
    priv: ['Home address', 'Phone number', 'Password'],
    pub: ['Gaming high score', 'Favorite song', 'Meme you made'],
  },
  {
    priv: ['School name', 'Birthday', 'Wi-Fi name'],
    pub: ['Movie you watched', 'Food you like', 'Game you play'],
  },
  {
    priv: ['Live location', 'Full name + city', "Mom's name"],
    pub: ['Cartoon you like', 'Team you support', 'Pizza topping'],
  },
]

const RIDDLES: { q: string; a: [string, string, string] }[] = [
  { q: 'I wear a mask of a friend, but what I want is your password. What am I?', a: ['A phishing trap', 'A cookie', 'A backup file'] },
  { q: 'I fly with your photo, silently carrying your street name. What am I?', a: ['A kite', 'GPS metadata', 'A watermark'] },
  { q: 'The more you share with me, the more I sell about you to everyone. What am I?', a: ['A librarian', 'A data broker', 'A vault'] },
  { q: 'I am invisible, I hide inside every photo, and I know where you sleep. What am I?', a: ['Dust', 'A shadow', 'EXIF metadata'] },
  { q: 'They shout in the group chat until someone presses BLOCK. Who am I?', a: ['A mascot', 'A referee', 'A troll'] },
  { q: 'I pretend to be a lock, but the door is wide open. What am I?', a: ['A fake HTTPS badge', 'A real padlock', 'A keychain'] },
]

export function buildChallenge(cat: ScnCat): Challenge {
  const base: Challenge = {
    kind: 'url',
    prompt: '',
    riddle: '',
    items: [],
    need: 1,
    maxWrong: 1,
    time: 10,
    timeMax: 10,
    pickedCount: 0,
    wrongCount: 0,
  }
  let kind: ChallengeKind
  if (cat === 'phish') kind = pick(['url', 'tracker'] as ChallengeKind[])
  else if (cat === 'privacy') kind = pick(['pii', 'riddle'] as ChallengeKind[])
  else if (cat === 'bully') kind = pick(['pii', 'riddle'] as ChallengeKind[])
  else if (cat === 'biometric') kind = pick(['tracker', 'riddle'] as ChallengeKind[])
  else if (cat === 'network') kind = pick(['riddle', 'pii', 'tracker'] as ChallengeKind[])
  else kind = 'password'

  if (kind === 'url') {
    const [real, f1, f2] = pick(URL_SETS)
    return {
      ...base,
      kind,
      prompt: 'TAP THE REAL URL — the other two are traps',
      items: shuffled([item(real, true), item(f1, false), item(f2, false)]),
      need: 1,
      maxWrong: 1,
      time: 14,
      timeMax: 14,
    }
  }
  if (kind === 'tracker') {
    const trackerPos = Math.floor(Math.random() * 8)
    const items: ChItem[] = []
    for (let i = 0; i < 8; i++) items.push(item('', i === trackerPos, i === trackerPos ? 7 : i % 7))
    return {
      ...base,
      kind,
      prompt: 'TAP THE HIDDEN TRACKER hiding among the loot',
      items: shuffled(items),
      need: 1,
      maxWrong: 1,
      time: 11,
      timeMax: 11,
    }
  }
  if (kind === 'password') {
    const ds = pick(PASSWORD_SETS)
    const items = shuffled([...ds.strong.map((t) => item(t, true)), ...ds.weak.map((t) => item(t, false))])
    return {
      ...base,
      kind,
      prompt: 'TAP ALL 3 STRONG passwords (mix of cases, numbers, symbols)',
      items,
      need: 3,
      maxWrong: 1,
      time: 15,
      timeMax: 15,
    }
  }
  if (kind === 'pii') {
    const ds = pick(PII_SETS)
    const items = shuffled([...ds.priv.map((t) => item(t, true)), ...ds.pub.map((t) => item(t, false))])
    return {
      ...base,
      kind,
      prompt: 'TAP ALL 3 you would NEVER share with a stranger',
      items,
      need: 3,
      maxWrong: 1,
      time: 15,
      timeMax: 15,
    }
  }
  const r = pick(RIDDLES)
  return {
    ...base,
    kind,
    prompt: 'SOLVE THE RIDDLE',
    riddle: r.q,
    items: shuffled([item(r.a[0], true), item(r.a[1], false), item(r.a[2], false)]),
    need: 1,
    maxWrong: 1,
    time: 20,
    timeMax: 20,
  }
}

// Awareness question bank — used when a threat CATCHES you:
// answer the question to escape unharmed.
export interface ScnQuestion {
  q: string
  topic: string
  options: string[]
  correct: number
  why: string
}

export const QUESTIONS: ScnQuestion[] = [
  {
    q: 'A "friend" you met in a game asks for your home address to "send a gift." What do you do?',
    topic: 'Stranger danger & PII',
    options: ['Share it — it is a gift', 'Never share it, block & tell a parent', 'Share only your school name'],
    correct: 1,
    why: 'Strangers online can be anyone. Your address is a key to your door — never a gift.',
  },
  {
    q: 'An email screams: "URGENT! Your account is deleted in 1 hour! CLICK NOW." Best move?',
    topic: 'Phishing & urgency traps',
    options: ['Click fast before it is too late', 'Do not click — close it and report it', 'Re-type your password to "prove" you exist'],
    correct: 1,
    why: 'Urgency is a trap. Real services never threaten you in an hour.',
  },
  {
    q: 'A popup sticker offers +1000 coins if you type your password into it. That is…',
    topic: 'Password harvesting',
    options: ['A real bonus — type it!', 'A phishing trick — never type it', 'A school project, it is fine'],
    correct: 1,
    why: 'Free prizes want your password. No real game ever asks for one.',
  },
  {
    q: 'A classmate is bullied in the group chat. The strongest response is to…',
    topic: 'Cyberbullying & upstanding',
    options: ['Add an even worse insult', 'Report & block the bully, support the friend', 'Leave the group forever'],
    correct: 1,
    why: 'Upstanders stop bullying: report the behavior, support the person, tell an adult.',
  },
  {
    q: 'Which password is the strongest?',
    topic: 'Password strength',
    options: ['123456', 'mybirthday2014', 'Xk9$Mn7!Pqz'],
    correct: 2,
    why: 'Long + mixed characters + nothing personal = very hard to guess.',
  },
  {
    q: 'You want to log in while on mall public Wi-Fi. What do you do?',
    topic: 'Public networks',
    options: ['Log in normally, it is faster', 'Use a VPN or wait for home Wi-Fi', 'Log in twice to be extra safe'],
    correct: 1,
    why: 'Open networks let others read your traffic. VPN or wait.',
  },
  {
    q: 'A stranger DMs: "Send a selfie or I will tell your friends." You should…',
    topic: 'Blackmail & self-harm traps',
    options: ['Send it to keep the peace', 'Block, report, and tell a trusted adult', 'Ignore it and never tell anyone'],
    correct: 1,
    why: 'That is blackmail. Never send — block, report, and tell an adult. Hiding makes it grow.',
  },
  {
    q: 'Before posting a photo from your bedroom, what should you check?',
    topic: 'Photos & location clues',
    options: ['The lighting', 'That no window, street sign or address is visible', 'The camera flash'],
    correct: 1,
    why: 'Photos hide location clues — and metadata — about exactly where you live.',
  },
  {
    q: 'A new app wants camera, microphone AND location permission, but you only wanted filters. You…',
    topic: 'App permissions',
    options: ['Allow everything to be safe', 'Deny what it does not need', 'Allow for 1 hour only'],
    correct: 1,
    why: 'Give apps only the permissions they truly need. The rest is listening.',
  },
  {
    q: 'Your friend whispers: "Lend me your password just this once." You say…',
    topic: 'Password sharing',
    options: ['Sure — friends share', 'No — passwords are personal', 'Only if you share yours first'],
    correct: 1,
    why: 'Shared means lost. "Just this once" is how accounts get taken.',
  },
  {
    q: 'A profile with no photo and the name "Xx_Cool_2014" sends you a friend request. Best move?',
    topic: 'Verifying strangers',
    options: ['Accept — more friends!', 'Keep it private until you know who it is', 'Share your phone number to prove trust'],
    correct: 1,
    why: 'Verify before you trust. Real people verify themselves too.',
  },
  {
    q: 'A "verified badge" sticker in chat says: "Tap here to claim 500 gems!" You…',
    topic: 'Fake badges & lures',
    options: ['Tap it — it is verified!', 'Never tap; badges in chat are easy to fake', 'Tap it slowly and carefully'],
    correct: 1,
    why: 'Badges inside chats are drawn pixels, not proof. Lures always move fast.',
  },
]

export function buildQuestion(): { ch: Challenge; topic: string; why: string } {
  const q = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)]
  const idxs = [0, 1, 2]
  for (let i = idxs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[idxs[i], idxs[j]] = [idxs[j], idxs[i]]
  }
  const ch: Challenge = {
    kind: 'question',
    prompt: 'ANSWER TO ESCAPE!',
    riddle: q.q,
    items: idxs.map((i) => ({ text: q.options[i], icon: -1, correct: i === q.correct, picked: false, wrong: false })),
    need: 1,
    maxWrong: 1,
    time: 20,
    timeMax: 20,
    pickedCount: 0,
    wrongCount: 0,
  }
  return { ch, topic: q.topic, why: q.why }
}
