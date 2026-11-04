// Aster brand tokens. Components read colours from the MUI theme; these raw
// values exist so the theme (and a few gradients) have one source of truth.
export const brand = {
  navy: '#12263A',
  midnight: '#0B1E30',
  teal: '#107E78',
  tealDark: '#0B625D',
  tealLight: '#3FA69F',
  mint: '#DFF5EC',
  mintSoft: '#EEF9F4',
  offWhite: '#F6F8F7',
  warm: '#F3E8D4',
  warmSoft: '#FBF6EC',
  slate: '#64748B',
  ink: '#0F1C2A',
  border: '#E3E9E7',
  borderStrong: '#D3DCD9',
  decline: '#B4321F',
  declineSoft: '#FDF1EE',
  caution: '#9A5B13',
  cautionSoft: '#FDF5E7',
} as const

export const gradients = {
  hero: `radial-gradient(120% 140% at 100% 0%, rgba(63,166,159,0.38) 0%, rgba(63,166,159,0) 55%), linear-gradient(135deg, ${brand.midnight} 0%, ${brand.navy} 55%, #163A4D 100%)`,
  card: `radial-gradient(90% 120% at 100% 100%, rgba(223,245,236,0.22) 0%, rgba(223,245,236,0) 60%), linear-gradient(135deg, ${brand.navy} 0%, #134456 48%, ${brand.teal} 100%)`,
  cardFrozen: 'linear-gradient(135deg, #4A5A68 0%, #66788A 55%, #8A9AA8 100%)',
  mark: `linear-gradient(135deg, ${brand.navy} 0%, ${brand.teal} 100%)`,
} as const

export const radii = { sm: 10, md: 16, lg: 20, xl: 24 } as const
