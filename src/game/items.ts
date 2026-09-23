// Merchant inventory: weapons and gear the player can buy and equip.
export interface ItemDef {
  id: string
  slot: 'weapon' | 'gear'
  name: string
  price: number
  desc: string
}

export const ITEMS: ItemDef[] = [
  {
    id: 'sword',
    slot: 'weapon',
    name: 'NEON SWORD',
    price: 15,
    desc: 'Melee duel — reach threats about 1.5 tiles away (X to fight).',
  },
  {
    id: 'bow',
    slot: 'weapon',
    name: 'DATA BOW',
    price: 25,
    desc: 'Call a duel with a threat up to 6 tiles away (X to fight).',
  },
  {
    id: 'laser',
    slot: 'weapon',
    name: 'FIREWALL LASER',
    price: 35,
    desc: 'Longest reach — and +5s on every challenge timer.',
  },
  {
    id: 'spell',
    slot: 'weapon',
    name: 'SHIELD SPELL',
    price: 45,
    desc: 'Losing a duel no longer breaks your 2FA stance.',
  },
  {
    id: 'armor',
    slot: 'gear',
    name: 'FIREWALL ARMOR',
    price: 20,
    desc: 'Shatters instead of your last heart after a failed catch.',
  },
  {
    id: 'helmet',
    slot: 'gear',
    name: 'PRIVACY HELMET',
    price: 30,
    desc: 'The Looker cannot read you; +5s on every challenge timer.',
  },
]

export const itemById = (id: string | null) => (id ? ITEMS.find((i) => i.id === id) ?? null : null)

export const WEAPON_RANGE: Record<string, number> = {
  sword: 48,
  bow: 192,
  laser: 224,
  spell: 256,
}
