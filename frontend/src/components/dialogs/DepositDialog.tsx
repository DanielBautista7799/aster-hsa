import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded'
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, Typography } from '@mui/material'
import { useState, type FormEvent } from 'react'
import { depositFunds } from '../../api/aster'
import { errorMessage } from '../../api/client'
import { formatCents, parseDollarsToCents } from '../../lib/money'
import { brand } from '../../theme/tokens'
import type { AccountDetail, TransactionResult } from '../../types/api'
import { MoneyField } from '../MoneyField'

const QUICK_AMOUNTS = ['50', '100', '250', '500']

interface Props {
  open: boolean
  account: AccountDetail | null
  onClose: () => void
  onDeposited: (result: TransactionResult) => void
}

export function DepositDialog({ open, account, onClose, onDeposited }: Props) {
  const [amount, setAmount] = useState('')
  const [touched, setTouched] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const parsed = parseDollarsToCents(amount)
  const fieldError = touched && !parsed.ok ? parsed.error : null

  function reset() {
    setAmount('')
    setTouched(false)
    setFormError(null)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setTouched(true)
    if (!account || !parsed.ok || submitting) return
    setSubmitting(true)
    setFormError(null)
    try {
      const result = await depositFunds(account.id, parsed.cents)
      reset()
      onDeposited(result)
    } catch (error) {
      setFormError(errorMessage(error)) // keep the typed amount so it can be corrected
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose() {
    if (submitting) return
    reset()
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs" aria-labelledby="deposit-title">
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <DialogTitle id="deposit-title">
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Box sx={{ width: 40, height: 40, borderRadius: '12px', bgcolor: brand.mint, color: brand.tealDark, display: 'grid', placeItems: 'center' }}>
              <SavingsRoundedIcon />
            </Box>
            <span>Add funds</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            A simulated contribution to {account?.full_name ?? 'this account'}. No bank account is charged
            and no real money moves.
          </Typography>

          <MoneyField
            label="Amount"
            value={amount}
            onChange={(value) => {
              setAmount(value)
              setFormError(null)
            }}
            onBlur={() => setTouched(amount !== '')}
            error={Boolean(fieldError)}
            helperText={fieldError ?? 'Up to $10,000.00 per deposit, in whole cents.'}
            fullWidth
            autoFocus
            required
          />

          <Box sx={{ mt: 1.75, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }} role="group" aria-label="Quick amounts">
            {QUICK_AMOUNTS.map((quick) => (
              <Chip
                key={quick}
                label={`$${quick}`}
                onClick={() => {
                  setAmount(quick)
                  setTouched(true)
                }}
                variant={amount === quick ? 'filled' : 'outlined'}
                color={amount === quick ? 'primary' : 'default'}
                sx={{ fontWeight: 700, width: '100%' }}
              />
            ))}
          </Box>

          {account && (
            <Box sx={{ mt: 3, p: 2, borderRadius: '14px', bgcolor: brand.offWhite, border: `1px solid ${brand.border}` }}>
              <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Current balance</Typography>
                <Typography variant="body2" className="tabular" sx={{ fontWeight: 600 }}>{formatCents(account.balance_cents)}</Typography>
              </Stack>
              <Stack direction="row" sx={{ justifyContent: 'space-between', mt: 0.75 }}>
                <Typography variant="body2" color="text.secondary">Deposit</Typography>
                <Typography variant="body2" className="tabular" sx={{ fontWeight: 600 }}>
                  {parsed.ok ? `+${formatCents(parsed.cents)}` : '—'}
                </Typography>
              </Stack>
              <Divider sx={{ my: 1.25 }} />
              <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>Expected balance</Typography>
                <Typography variant="body2" className="tabular" sx={{ fontWeight: 800 }}>
                  {parsed.ok ? formatCents(account.balance_cents + parsed.cents) : '—'}
                </Typography>
              </Stack>
            </Box>
          )}
          {formError && <Alert severity="error" sx={{ mt: 2 }}>{formError}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
          <Button onClick={handleClose} color="inherit" disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={submitting || !account}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {submitting ? 'Depositing…' : parsed.ok ? `Deposit ${formatCents(parsed.cents)}` : 'Deposit'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
