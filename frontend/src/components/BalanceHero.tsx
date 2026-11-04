import AddRoundedIcon from '@mui/icons-material/AddRounded'
import ShoppingBagRoundedIcon from '@mui/icons-material/ShoppingBagRounded'
import { Box, Button, Stack, Typography } from '@mui/material'
import { useNavigate } from 'react-router'
import { formatDate } from '../lib/format'
import { formatCents } from '../lib/money'
import { brand, gradients } from '../theme/tokens'
import type { AccountDetail, Card } from '../types/api'
import { useAppActions } from './AppActions'

export function BalanceHero({ account, card }: { account: AccountDetail; card: Card | null | undefined }) {
  const { openDeposit } = useAppActions()
  const navigate = useNavigate()
  const formatted = formatCents(account.balance_cents)
  const [whole, cents] = formatted.split('.')

  return (
    <Box
      sx={{
        height: '100%',
        borderRadius: '24px',
        background: gradients.hero,
        color: '#FFFFFF',
        p: { xs: 3, md: 4 },
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: 4,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 20px 48px rgba(11,30,48,0.18)',
      }}
    >
      <Box>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="overline" sx={{ color: brand.mint }}>
            Available balance
          </Typography>
          <Box sx={{ px: 1.25, py: 0.25, borderRadius: 999, bgcolor: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.14)', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em' }}>
            SIMULATED HSA
          </Box>
        </Stack>
        <Typography
          component="p"
          className="tabular"
          aria-label={`Available balance ${formatted}`}
          sx={{ mt: 1, fontWeight: 750, letterSpacing: '-0.035em', lineHeight: 1, fontSize: { xs: '2.75rem', sm: '3.5rem', md: '3.75rem' } }}
        >
          {whole}
          <Box component="span" sx={{ fontSize: '0.5em', opacity: 0.7, letterSpacing: '-0.01em' }}>
            .{cents}
          </Box>
        </Typography>
        <Typography variant="body2" sx={{ mt: 1.5, color: 'rgba(255,255,255,0.7)' }}>
          {account.full_name} · Opened {formatDate(account.created_at)}
        </Typography>
        <Stack direction="row" sx={{ mt: 2.5, flexWrap: 'wrap', gap: 1 }}>
          <HeroFact
            label={card ? `Card •••• ${card.last_four} · ${card.status === 'active' ? 'Active' : 'Frozen'}` : card === null ? 'No card issued yet' : 'Loading card…'}
          />
          <HeroFact label={`${account.summary.approved_purchase_count} approved · ${account.summary.declined_purchase_count} declined`} />
        </Stack>
      </Box>
      <Box
        aria-hidden
        sx={{ position: 'absolute', right: { xs: -60, md: -30 }, bottom: { xs: -60, md: -40 }, width: 260, height: 260, opacity: 0.07, pointerEvents: 'none' }}
      >
        <svg viewBox="0 0 24 24" width="100%" height="100%">
          <path d="M12 1.5c.9 5.6 2.8 8.6 10.5 10.5C14.8 13.9 12.9 16.9 12 22.5 11.1 16.9 9.2 13.9 1.5 12 9.2 10.1 11.1 7.1 12 1.5z" fill="#FFFFFF" />
        </svg>
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ position: 'relative' }}>
        <Button
          size="large"
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={openDeposit}
          sx={{ bgcolor: brand.mint, color: brand.navy, '&:hover': { bgcolor: '#FFFFFF' } }}
        >
          Add funds
        </Button>
        <Button
          size="large"
          variant="outlined"
          startIcon={<ShoppingBagRoundedIcon />}
          onClick={() => navigate('/card#simulator')}
          sx={{ color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.35)', '&:hover': { borderColor: '#FFFFFF', bgcolor: 'rgba(255,255,255,0.06)' } }}
        >
          Simulate purchase
        </Button>
      </Stack>
    </Box>
  )
}

function HeroFact({ label }: { label: string }) {
  return (
    <Box
      className="tabular"
      sx={{ px: { xs: 1.1, sm: 1.5 }, py: 0.55, borderRadius: 999, fontSize: { xs: '0.75rem', sm: '0.8125rem' }, fontWeight: 600, whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.88)', bgcolor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
    >
      {label}
    </Box>
  )
}
