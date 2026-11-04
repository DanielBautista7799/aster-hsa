// First-run state: no accounts exist yet.
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import CreditCardRoundedIcon from '@mui/icons-material/CreditCardRounded'
import LocalPharmacyRoundedIcon from '@mui/icons-material/LocalPharmacyRounded'
import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded'
import { Box, Button, Card, Grid, Stack, Typography } from '@mui/material'
import { brand, gradients } from '../theme/tokens'
import { useAppActions } from './AppActions'
import { AsterMark } from './AsterMark'

const STEPS = [
  { icon: SavingsRoundedIcon, title: 'Add funds', text: 'Make a simulated contribution to your HSA balance.' },
  { icon: CreditCardRoundedIcon, title: 'Issue a virtual card', text: 'Each account gets one demo-only debit card.' },
  { icon: LocalPharmacyRoundedIcon, title: 'Simulate purchases', text: 'See which merchant categories qualify, and why.' },
]

/** A decorative preview of the virtual card, shown before any account exists. */
function CardPreview() {
  return (
    <Box
      aria-hidden
      sx={{
        width: 320,
        aspectRatio: '1.586',
        borderRadius: '18px',
        p: 2.5,
        color: '#FFFFFF',
        background: gradients.card,
        boxShadow: '0 24px 48px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.14)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transform: 'rotate(-6deg) translateY(6px)',
      }}
    >
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <AsterMark size={26} />
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', lineHeight: 1.1 }}>Aster</Typography>
            <Typography sx={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.16em', opacity: 0.75 }}>HSA · VIRTUAL</Typography>
          </Box>
        </Stack>
        <Box sx={{ px: 1, py: 0.3, borderRadius: 999, fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.14em', bgcolor: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.25)' }}>
          PREVIEW
        </Box>
      </Stack>
      <Box>
        <Typography className="tabular" sx={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.14em', mb: 1 }}>
          •••• •••• •••• ••••
        </Typography>
        <Typography sx={{ fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.16em', opacity: 0.65 }}>CARDHOLDER</Typography>
        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, letterSpacing: '0.04em' }}>YOUR NAME</Typography>
      </Box>
    </Box>
  )
}

export function WelcomeHero() {
  const { openCreateAccount } = useAppActions()
  return (
    <Stack spacing={3}>
      <Box
        sx={{
          borderRadius: '24px',
          background: gradients.hero,
          color: '#FFFFFF',
          p: { xs: 3.5, md: 6 },
          position: 'relative',
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr auto' },
          gap: 4,
          alignItems: 'center',
        }}
      >
        <Box>
          <Typography variant="overline" sx={{ color: brand.mint, opacity: 0.9 }}>
            Welcome to Aster
          </Typography>
          <Typography variant="h1" sx={{ fontSize: { xs: '2rem', md: '2.75rem' }, maxWidth: 560, mt: 1 }}>
            Health savings, simulated beautifully.
          </Typography>
          <Typography sx={{ mt: 2, maxWidth: 520, color: 'rgba(255,255,255,0.75)', fontSize: '1.0625rem' }}>
            Open a fictional HSA account to explore deposits, a virtual debit card and qualified-expense purchases.
            Nothing here uses real money.
          </Typography>
          <Button
            size="large"
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={openCreateAccount}
            sx={{ mt: 4, bgcolor: brand.mint, color: brand.navy, '&:hover': { bgcolor: '#FFFFFF' } }}
          >
            Open your first account
          </Button>
        </Box>
        <Box sx={{ display: { xs: 'none', md: 'block' }, pr: 2 }}>
          <CardPreview />
        </Box>
      </Box>
      <Grid container spacing={2}>
        {STEPS.map(({ icon: Icon, title, text }, index) => (
          <Grid key={title} size={{ xs: 12, md: 4 }}>
            <Card sx={{ p: 3, height: '100%' }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1.5 }}>
                <Box sx={{ width: 40, height: 40, borderRadius: '12px', bgcolor: brand.mint, color: brand.tealDark, display: 'grid', placeItems: 'center' }}>
                  <Icon fontSize="small" />
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  STEP {index + 1}
                </Typography>
              </Stack>
              <Typography variant="h5" component="h2">
                {title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {text}
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Stack>
  )
}
