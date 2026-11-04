import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded'
import CreditCardRoundedIcon from '@mui/icons-material/CreditCardRounded'
import LocalHospitalRoundedIcon from '@mui/icons-material/LocalHospitalRounded'
import { Alert, Box, Button, CircularProgress, Dialog, DialogContent, IconButton, Stack, TextField, Typography } from '@mui/material'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import { useState, type FormEvent } from 'react'
import { createAccount } from '../../api/aster'
import { ApiError, errorMessage } from '../../api/client'
import { brand, gradients } from '../../theme/tokens'
import type { Account } from '../../types/api'
import { AsterMark } from '../AsterMark'

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

const INCLUDED = [
  { icon: AccountBalanceWalletRoundedIcon, text: 'Starts at $0.00, ready for simulated contributions' },
  { icon: CreditCardRoundedIcon, text: 'One virtual demo card, issued whenever you choose' },
  { icon: LocalHospitalRoundedIcon, text: 'Purchases checked against qualified-expense rules' },
]

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (account: Account) => void
}

type Field = 'fullName' | 'email'

function validateField(field: Field, value: string): string | undefined {
  const trimmed = value.trim()
  if (field === 'fullName') {
    if (!trimmed) return 'Enter the account holder’s full name.'
    if (trimmed.length > 120) return 'Keep the name under 120 characters.'
  } else {
    if (!trimmed) return 'Enter an email address.'
    if (!EMAIL_PATTERN.test(trimmed)) return 'Enter a valid email address, like name@example.com.'
  }
  return undefined
}

export function CreateAccountDialog({ open, onClose, onCreated }: Props) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function reset() {
    setFullName('')
    setEmail('')
    setErrors({})
    setTouched({})
    setFormError(null)
  }

  /** Validate one field once the user has left it, so feedback arrives early
   * but never while they are still typing a first value. */
  function handleBlur(field: Field, value: string) {
    setTouched((current) => ({ ...current, [field]: true }))
    setErrors((current) => ({ ...current, [field]: validateField(field, value) }))
  }

  function handleChange(field: Field, value: string) {
    if (field === 'fullName') setFullName(value)
    else setEmail(value)
    setFormError(null)
    if (touched[field]) setErrors((current) => ({ ...current, [field]: validateField(field, value) }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return
    const next = { fullName: validateField('fullName', fullName), email: validateField('email', email) }
    setErrors(next)
    setTouched({ fullName: true, email: true })
    if (next.fullName || next.email) return

    setSubmitting(true)
    setFormError(null)
    try {
      const account = await createAccount(fullName.trim(), email.trim())
      reset()
      onCreated(account)
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setErrors({ email: error.message })
      } else if (error instanceof ApiError && error.status === 422) {
        setErrors({ fullName: error.fieldErrors.full_name, email: error.fieldErrors.email })
      } else {
        setFormError(errorMessage(error))
      }
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
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" aria-labelledby="create-account-title">
      {/* Branded header: this is an account opening, not a settings form. */}
      <Box sx={{ background: gradients.hero, color: '#FFFFFF', px: { xs: 3, sm: 4 }, pt: 3, pb: 3.5, position: 'relative' }}>
        <IconButton
          aria-label="Close"
          onClick={handleClose}
          disabled={submitting}
          sx={{ position: 'absolute', top: 12, right: 12, color: 'rgba(255,255,255,0.8)', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
        >
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
          <AsterMark size={36} />
          <Typography variant="overline" sx={{ color: brand.mint }}>
            New account
          </Typography>
        </Stack>
        <Typography id="create-account-title" variant="h3" component="h2">
          Open your Aster HSA
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.75, color: 'rgba(255,255,255,0.75)', maxWidth: 420 }}>
          Takes about ten seconds. This is a simulation, so use fictional details — no real account is opened.
        </Typography>
      </Box>

      <Box component="form" onSubmit={handleSubmit} noValidate>
        <DialogContent sx={{ px: { xs: 3, sm: 4 }, pt: 3.5, pb: 3 }}>
          <Stack spacing={2.5}>
            <TextField
              label="Full name"
              value={fullName}
              onChange={(event) => handleChange('fullName', event.target.value)}
              onBlur={(event) => handleBlur('fullName', event.target.value)}
              error={Boolean(errors.fullName)}
              helperText={errors.fullName ?? 'Shown as the cardholder name on your virtual card.'}
              placeholder="e.g. Jordan Rivera"
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { maxLength: 120, autoComplete: 'off' } }}
              autoFocus
              fullWidth
              required
            />
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(event) => handleChange('email', event.target.value)}
              onBlur={(event) => handleBlur('email', event.target.value)}
              error={Boolean(errors.email)}
              helperText={errors.email ?? 'Your account’s unique identity. One account per email.'}
              placeholder="e.g. jordan@example.com"
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { maxLength: 254, autoComplete: 'off' } }}
              fullWidth
              required
            />

            <Box sx={{ borderRadius: '16px', border: `1px solid ${brand.border}`, bgcolor: brand.offWhite, p: 2.25 }}>
              <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1.25 }}>
                What’s included
              </Typography>
              <Stack spacing={1.25}>
                {INCLUDED.map(({ icon: Icon, text }) => (
                  <Stack key={text} direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                    <Box sx={{ width: 28, height: 28, borderRadius: '9px', bgcolor: brand.mint, color: brand.tealDark, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      <Icon sx={{ fontSize: 16 }} />
                    </Box>
                    <Typography variant="body2">{text}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>

            {formError && <Alert severity="error">{formError}</Alert>}
          </Stack>
        </DialogContent>

        <Stack
          direction={{ xs: 'column-reverse', sm: 'row' }}
          spacing={1.5}
          sx={{ px: { xs: 3, sm: 4 }, pb: 3, alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 260 }}>
            We store only a name, an email and a balance. No SSN, bank or card details are ever collected.
          </Typography>
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
            <Button onClick={handleClose} color="inherit" disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {submitting ? 'Opening…' : 'Open account'}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Dialog>
  )
}
