// The virtual demo card visual. It shows only the stored last four digits;
// no full card number, CVV or expiry date exists anywhere in the system.
import AcUnitRoundedIcon from '@mui/icons-material/AcUnitRounded'
import ContactlessRoundedIcon from '@mui/icons-material/ContactlessRounded'
import { Box, Stack, Typography } from '@mui/material'
import { brand, gradients } from '../theme/tokens'
import type { Card } from '../types/api'
import { AsterMark } from './AsterMark'

interface VirtualCardProps {
  card: Card
  holderName: string
}

export function VirtualCard({ card, holderName }: VirtualCardProps) {
  const frozen = card.status === 'frozen'
  return (
    <Box
      role="img"
      aria-label={`Aster virtual demo card for ${holderName}, ending in ${card.last_four}, ${frozen ? 'frozen' : 'active'}. Not usable for payments.`}
      sx={{
        position: 'relative',
        width: '100%',
        maxWidth: 400,
        aspectRatio: '1.586',
        borderRadius: '20px',
        p: { xs: 2.25, sm: 2.75 },
        color: '#FFFFFF',
        overflow: 'hidden',
        background: frozen ? gradients.cardFrozen : gradients.card,
        boxShadow: '0 18px 40px rgba(11, 30, 48, 0.28), inset 0 0 0 1px rgba(255,255,255,0.10)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'transform 220ms ease, box-shadow 220ms ease, filter 220ms ease',
        '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 24px 48px rgba(11, 30, 48, 0.32), inset 0 0 0 1px rgba(255,255,255,0.12)' },
        // Soft decorative rings.
        '&::before, &::after': {
          content: '""',
          position: 'absolute',
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.10)',
          pointerEvents: 'none',
        },
        '&::before': { width: 340, height: 340, right: -150, top: -170 },
        '&::after': { width: 260, height: 260, right: -120, top: -130 },
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
          <AsterMark size={30} />
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: '1rem', lineHeight: 1.1, letterSpacing: '-0.01em' }}>Aster</Typography>
            <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.16em', opacity: 0.75 }}>HSA · VIRTUAL</Typography>
          </Box>
        </Stack>
        <Box
          sx={{
            px: 1.25,
            py: 0.4,
            borderRadius: 999,
            fontSize: '0.625rem',
            fontWeight: 800,
            letterSpacing: '0.14em',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            bgcolor: frozen ? 'rgba(255,255,255,0.22)' : 'rgba(223,245,236,0.18)',
            border: '1px solid rgba(255,255,255,0.25)',
          }}
        >
          {frozen ? <AcUnitRoundedIcon sx={{ fontSize: 12 }} /> : <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: brand.mint }} />}
          {frozen ? 'FROZEN' : 'ACTIVE'}
        </Box>
      </Stack>

      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        {/* Decorative chip */}
        <Box
          aria-hidden
          sx={{
            width: 38,
            height: 28,
            borderRadius: '6px',
            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.12)',
            backgroundImage: `linear-gradient(135deg, ${brand.warm} 0%, #D9C29A 100%), linear-gradient(transparent 45%, rgba(0,0,0,0.15) 45%, rgba(0,0,0,0.15) 55%, transparent 55%)`,
          }}
        />
        <ContactlessRoundedIcon aria-hidden sx={{ opacity: 0.8 }} />
      </Stack>

      <Box>
        <Typography
          className="tabular"
          sx={{ fontSize: { xs: '1.05rem', sm: '1.2rem' }, fontWeight: 700, letterSpacing: '0.14em', mb: 1.25, whiteSpace: 'nowrap' }}
        >
          •••• •••• •••• {card.last_four}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.16em', opacity: 0.65 }}>CARDHOLDER</Typography>
            <Typography noWrap sx={{ fontSize: '0.875rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {holderName}
            </Typography>
          </Box>
          <Typography sx={{ fontSize: '0.625rem', fontWeight: 800, letterSpacing: '0.14em', opacity: 0.8, flexShrink: 0 }}>DEMO ONLY</Typography>
        </Stack>
      </Box>
    </Box>
  )
}

/** Card-shaped placeholder shown before a card is issued. */
export function CardPlaceholder({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 400,
        aspectRatio: '1.586',
        borderRadius: '20px',
        border: `1.5px dashed ${brand.borderStrong}`,
        background: `linear-gradient(145deg, #FFFFFF 0%, ${brand.mintSoft} 100%)`,
        display: 'grid',
        placeItems: 'center',
        p: 3,
        textAlign: 'center',
      }}
    >
      {children}
    </Box>
  )
}
