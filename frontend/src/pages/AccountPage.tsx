// Account details: who the account belongs to, its status, and lifetime
// totals. Everything shown here is stored or derived server-side.
import AcUnitRoundedIcon from '@mui/icons-material/AcUnitRounded'
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded'
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded'
import { Box, Button, Card, Chip, Divider, Grid, IconButton, Skeleton, Stack, Tooltip, Typography } from '@mui/material'
import { useNavigate } from 'react-router'
import { AccountAvatar } from '../components/AccountSwitcher'
import { useAppActions } from '../components/AppActions'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { PageHeader } from '../components/PageHeader'
import { useToast } from '../components/ToastProvider'
import { formatDate } from '../lib/format'
import { formatCents } from '../lib/money'
import { useAccounts } from '../state/AccountContext'
import { brand } from '../theme/tokens'

function DetailRow({ label, value, action }: { label: string; value: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between', py: 1.5 }}>
      <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
        {label}
      </Typography>
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', minWidth: 0 }}>
        <Typography variant="body2" className="tabular" sx={{ fontWeight: 650, textAlign: 'right', overflowWrap: 'anywhere' }}>
          {value}
        </Typography>
        {action}
      </Stack>
    </Stack>
  )
}

function TotalTile({ label, value, caption }: { label: string; value: string; caption: string }) {
  return (
    <Box sx={{ p: 2, borderRadius: '14px', bgcolor: brand.offWhite, border: `1px solid ${brand.border}` }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 650 }}>
        {label}
      </Typography>
      <Typography className="tabular" sx={{ fontSize: '1.375rem', fontWeight: 750, letterSpacing: '-0.02em', mt: 0.25 }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {caption}
      </Typography>
    </Box>
  )
}

export function AccountPage() {
  const { accounts, account, card, accountError, refresh } = useAccounts()
  const { openCreateAccount, openDeposit } = useAppActions()
  const showToast = useToast()
  const navigate = useNavigate()

  if (accounts !== null && accounts.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<PersonOutlineRoundedIcon />}
          title="No account yet"
          description="Open an HSA account to see its details here."
          action={<Button variant="contained" onClick={openCreateAccount}>Open account</Button>}
        />
      </Card>
    )
  }
  if (accountError) return <ErrorState message={accountError} onRetry={refresh} />

  if (!account || card === undefined) {
    return (
      <Stack spacing={3}>
        <Skeleton variant="rounded" height={56} width={280} />
        <Skeleton variant="rounded" height={320} sx={{ borderRadius: '20px' }} />
      </Stack>
    )
  }

  const { summary } = account
  // A short, stable reference derived from the account's UUID. Real providers
  // show an account number; this is the demo equivalent.
  const reference = `AST-${account.id.slice(0, 8).toUpperCase()}`

  async function copyReference() {
    try {
      await navigator.clipboard.writeText(account!.id)
      showToast('Account ID copied to the clipboard.', 'info')
    } catch {
      showToast('Couldn’t access the clipboard in this browser.', 'error')
    }
  }

  return (
    <Box>
      <PageHeader
        eyebrow="Account"
        title="Account details"
        description="Who this HSA belongs to, its current status, and what has happened in it so far."
        actions={
          <Button variant="outlined" startIcon={<SwapHorizRoundedIcon />} onClick={openCreateAccount}>
            Open another account
          </Button>
        }
      />

      <Grid container spacing={3} sx={{ alignItems: 'flex-start' }}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Card sx={{ p: { xs: 2.5, md: 3 } }}>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <AccountAvatar name={account.full_name} size={56} />
              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Typography variant="h4" component="h2" noWrap>
                  {account.full_name}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {account.email}
                </Typography>
              </Box>
              <Chip
                size="small"
                label="Open"
                sx={{ bgcolor: brand.mint, color: brand.tealDark, flexShrink: 0 }}
              />
            </Stack>

            <Divider sx={{ my: 2.5 }} />

            <DetailRow label="Type" value="Health savings account" />
            <Divider />
            <DetailRow label="Available balance" value={formatCents(account.balance_cents)} />
            <Divider />
            <DetailRow label="Opened" value={formatDate(account.created_at)} />
            <Divider />
            <DetailRow
              label="Account reference"
              value={reference}
              action={
                <Tooltip title="Copy the full account ID" arrow>
                  <IconButton size="small" aria-label="Copy account ID" onClick={copyReference}>
                    <ContentCopyRoundedIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              }
            />
            <Divider />
            <DetailRow
              label="Virtual card"
              value={
                card ? (
                  <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                    {card.status === 'frozen' && <AcUnitRoundedIcon sx={{ fontSize: 16, color: brand.slate }} />}
                    <Box component="span" sx={{ whiteSpace: 'nowrap' }}>•••• {card.last_four} · {card.status === 'active' ? 'Active' : 'Frozen'}</Box>
                  </Stack>
                ) : (
                  'Not issued yet'
                )
              }
              action={
                <Button size="small" endIcon={<ArrowForwardRoundedIcon />} onClick={() => navigate('/card')} sx={{ ml: 1 }}>
                  {card ? 'Manage' : 'Issue'}
                </Button>
              }
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 3 }}>
              <Button variant="contained" onClick={openDeposit}>Add funds</Button>
              <Button variant="outlined" onClick={() => navigate('/activity')}>View full history</Button>
            </Stack>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Stack spacing={3}>
            <Card sx={{ p: { xs: 2.5, md: 3 } }}>
              <Typography variant="h5" component="h2">Lifetime totals</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, mb: 2 }}>
                Computed from this account’s recorded history.
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                <TotalTile label="Deposited" value={formatCents(summary.total_deposited_cents)} caption="All contributions" />
                <TotalTile label="Spent" value={formatCents(summary.total_spent_cents)} caption={`${summary.approved_purchase_count} approved`} />
                <TotalTile label="Declined" value={String(summary.declined_purchase_count)} caption="Nothing deducted" />
                <TotalTile label="Transactions" value={String(summary.transaction_count)} caption="Deposits + attempts" />
              </Box>
            </Card>

            <Card sx={{ p: { xs: 2.5, md: 3 } }}>
              <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 1 }}>
                <ShieldOutlinedIcon sx={{ color: brand.teal }} />
                <Typography variant="h5" component="h2">What Aster stores</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Only your name, email and balance, plus the history you see in Activity. There is no SSN, date of birth,
                bank account or real card number anywhere in this demo, and the virtual card keeps just four display digits.
              </Typography>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  )
}
