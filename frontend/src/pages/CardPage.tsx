import AcUnitRoundedIcon from '@mui/icons-material/AcUnitRounded'
import AddCardRoundedIcon from '@mui/icons-material/AddCardRounded'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import CreditCardRoundedIcon from '@mui/icons-material/CreditCardRounded'
import LockOpenRoundedIcon from '@mui/icons-material/LockOpenRounded'
import { Box, Button, Card, CircularProgress, Divider, Grid, Skeleton, Stack, Typography } from '@mui/material'
import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { useAppActions } from '../components/AppActions'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { PageHeader } from '../components/PageHeader'
import { PurchaseSimulator } from '../components/PurchaseSimulator'
import { CardPlaceholder, VirtualCard } from '../components/VirtualCard'
import { formatDate } from '../lib/format'
import { formatCents } from '../lib/money'
import { useAccounts } from '../state/AccountContext'
import { useCardActions } from '../state/useCardActions'
import { brand } from '../theme/tokens'

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', py: 1.25 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" className="tabular" sx={{ fontWeight: 650, textAlign: 'right' }}>{value}</Typography>
    </Stack>
  )
}

export function CardPage() {
  const { accounts, account, accountError, card, refresh } = useAccounts()
  const { issue, toggleFreeze, pending } = useCardActions()
  const { openCreateAccount, openDeposit } = useAppActions()
  const location = useLocation()

  // "Simulate purchase" buttons link to /card#simulator.
  useEffect(() => {
    if (location.hash === '#simulator' && account && card !== undefined) {
      document.getElementById('simulator')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [location.hash, account, card])

  if (accounts !== null && accounts.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<CreditCardRoundedIcon />}
          title="Create an account first"
          description="Cards are issued to an HSA account. Create one to get started."
          action={<Button variant="contained" onClick={openCreateAccount}>Create account</Button>}
        />
      </Card>
    )
  }
  if (accountError) return <ErrorState message={accountError} onRetry={refresh} />

  return (
    <Box>
      <PageHeader
        eyebrow="Card & purchases"
        title="Virtual card"
        description="Issue your demo debit card, then simulate purchases to see how qualified-expense rules and balance checks work."
      />

      <Grid container spacing={3} sx={{ alignItems: 'flex-start' }}>
        <Grid size={{ xs: 12, lg: 5 }}>
          <Card sx={{ p: { xs: 2.5, md: 3 } }}>
            {!account || card === undefined ? (
              <Stack spacing={2}>
                <Skeleton variant="rounded" sx={{ width: '100%', height: 'auto', aspectRatio: '1.586', borderRadius: '20px' }} />
                <Skeleton variant="rounded" height={120} />
              </Stack>
            ) : card === null ? (
              <Stack spacing={2.5} sx={{ alignItems: 'center' }}>
                <CardPlaceholder>
                  <Stack spacing={1} sx={{ alignItems: 'center' }}>
                    <AddCardRoundedIcon sx={{ fontSize: 36, color: brand.teal }} aria-hidden />
                    <Typography variant="h5" component="h2">No card yet</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 260 }}>
                      Each account can have one virtual demo card. Issuing again never creates a duplicate.
                    </Typography>
                  </Stack>
                </CardPlaceholder>
                <Button
                  size="large"
                  variant="contained"
                  fullWidth
                  onClick={issue}
                  disabled={pending}
                  startIcon={pending ? <CircularProgress size={18} color="inherit" /> : <AddCardRoundedIcon />}
                >
                  {pending ? 'Issuing…' : 'Issue virtual card'}
                </Button>
              </Stack>
            ) : (
              <Stack spacing={2.5}>
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <VirtualCard card={card} holderName={account.full_name} />
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={toggleFreeze}
                    disabled={pending}
                    startIcon={card.status === 'active' ? <AcUnitRoundedIcon /> : <LockOpenRoundedIcon />}
                  >
                    {card.status === 'active' ? 'Freeze card' : 'Unfreeze card'}
                  </Button>
                  <Button variant="outlined" fullWidth onClick={openDeposit} startIcon={<AddRoundedIcon />}>
                    Add funds
                  </Button>
                </Stack>
                <Box>
                  <DetailRow label="Available balance" value={formatCents(account.balance_cents)} />
                  <Divider />
                  <DetailRow label="Status" value={card.status === 'active' ? 'Active' : 'Frozen'} />
                  <Divider />
                  <DetailRow label="Card number" value={`•••• ${card.last_four}`} />
                  <Divider />
                  <DetailRow label="Issued" value={formatDate(card.created_at)} />
                  <Divider />
                  <DetailRow label="Cardholder" value={account.full_name} />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Virtual demo card — not usable for payments. Only four random display digits are stored;
                  there is no real card number, CVV or expiry date.
                </Typography>
              </Stack>
            )}
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 7 }}>
          <PurchaseSimulator key={account?.id} />
        </Grid>
      </Grid>
    </Box>
  )
}
