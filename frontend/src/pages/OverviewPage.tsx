import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import BlockRoundedIcon from '@mui/icons-material/BlockRounded'
import LocalHospitalRoundedIcon from '@mui/icons-material/LocalHospitalRounded'
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded'
import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded'
import { Box, Button, Card, Divider, Grid, Skeleton, Stack, Typography } from '@mui/material'
import { Fragment } from 'react'
import { useNavigate } from 'react-router'
import { useAppActions } from '../components/AppActions'
import { BalanceHero } from '../components/BalanceHero'
import { CardPanel } from '../components/CardPanel'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { GetStartedCard } from '../components/GetStartedCard'
import { MetricCard } from '../components/MetricCard'
import { PageHeader } from '../components/PageHeader'
import { SpendingBreakdown } from '../components/SpendingBreakdown'
import { TransactionRow } from '../components/TransactionRow'
import { WelcomeHero } from '../components/WelcomeHero'
import { greeting } from '../lib/format'
import { formatCents } from '../lib/money'
import { useAccounts } from '../state/AccountContext'
import { brand } from '../theme/tokens'

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

export function OverviewPage() {
  const { accounts, accountsError, account, accountError, recentTransactions, card, refresh, reloadAccounts } = useAccounts()
  const { openDeposit } = useAppActions()
  const navigate = useNavigate()

  if (accountsError) return <ErrorState message={accountsError} onRetry={reloadAccounts} />
  if (accounts !== null && accounts.length === 0) return <WelcomeHero />
  if (accountError) return <ErrorState message={accountError} onRetry={refresh} />

  if (!account) {
    return (
      <Stack spacing={3}>
        <Skeleton variant="rounded" height={56} width={320} />
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 7 }}><Skeleton variant="rounded" height={300} sx={{ borderRadius: '24px' }} /></Grid>
          <Grid size={{ xs: 12, lg: 5 }}><Skeleton variant="rounded" height={300} sx={{ borderRadius: '20px' }} /></Grid>
        </Grid>
        <Skeleton variant="rounded" height={140} />
      </Stack>
    )
  }

  const { summary } = account
  const firstName = account.full_name.split(' ')[0]
  // The guided checklist shows until the account has funds, a card and a purchase attempt.
  const getStarted =
    summary.total_deposited_cents === 0 || card === null || summary.approved_purchase_count + summary.declined_purchase_count === 0

  return (
    <Box>
      <PageHeader eyebrow="Overview" title={`${greeting()}, ${firstName}`} description="Here’s your health savings account at a glance." />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <BalanceHero account={account} card={card} />
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <CardPanel />
        </Grid>

        {getStarted && (
          <Grid size={12}>
            <GetStartedCard />
          </Grid>
        )}

        <Grid size={{ xs: 12, sm: 4 }}>
          <MetricCard
            icon={<SavingsRoundedIcon />}
            label="Total deposited"
            value={formatCents(summary.total_deposited_cents)}
            caption="All simulated contributions"
            tone={{ bg: brand.mint, fg: brand.tealDark }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <MetricCard
            icon={<LocalHospitalRoundedIcon />}
            label="Qualified spending"
            value={formatCents(summary.total_spent_cents)}
            caption={`${plural(summary.approved_purchase_count, 'approved purchase')}`}
            tone={{ bg: '#E8EEF3', fg: brand.navy }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <MetricCard
            icon={<BlockRoundedIcon />}
            label="Declined attempts"
            value={String(summary.declined_purchase_count)}
            caption="No money is taken when declined"
            tone={{ bg: brand.declineSoft, fg: brand.decline }}
          />
        </Grid>

        <Grid size={{ xs: 12, lg: 7 }}>
          <Card sx={{ p: { xs: 2.5, md: 3 }, height: '100%' }}>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h5" component="h2">Recent activity</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                  {plural(summary.transaction_count, 'transaction')} recorded
                </Typography>
              </Box>
              {summary.transaction_count > 0 && (
                <Button size="small" endIcon={<ArrowForwardRoundedIcon />} onClick={() => navigate('/activity')}>
                  View all
                </Button>
              )}
            </Stack>
            {recentTransactions === null ? (
              <Stack spacing={1.5} sx={{ mt: 2 }}>
                {[0, 1, 2].map((key) => <Skeleton key={key} variant="rounded" height={52} />)}
              </Stack>
            ) : recentTransactions.length === 0 ? (
              <EmptyState
                compact
                icon={<ReceiptLongRoundedIcon />}
                title="No activity yet"
                description={card ? 'Add funds, then simulate a purchase to see it here.' : 'Start by adding funds and issuing your virtual card.'}
                action={<Button variant="contained" onClick={openDeposit}>Add funds</Button>}
              />
            ) : (
              <Box sx={{ mt: 1 }}>
                {recentTransactions.map((transaction, index) => (
                  <Fragment key={transaction.id}>
                    {index > 0 && <Divider />}
                    <TransactionRow transaction={transaction} />
                  </Fragment>
                ))}
              </Box>
            )}
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <SpendingBreakdown summary={summary} />
        </Grid>
      </Grid>
    </Box>
  )
}
