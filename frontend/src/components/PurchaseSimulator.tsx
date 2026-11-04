import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import ShoppingBagRoundedIcon from '@mui/icons-material/ShoppingBagRounded'
import { Alert, Box, Button, ButtonBase, Card, CircularProgress, MenuItem, Stack, TextField, Tooltip, Typography } from '@mui/material'
import { useState, type FormEvent } from 'react'
import { simulatePurchase } from '../api/aster'
import { ApiError, errorMessage } from '../api/client'
import { formatCents, parseDollarsToCents } from '../lib/money'
import { useAccounts } from '../state/AccountContext'
import { brand } from '../theme/tokens'
import type { MerchantCategoryValue, TransactionResult } from '../types/api'
import { CategoryGlyph } from './CategoryIcon'
import { MoneyField } from './MoneyField'
import { PurchaseReceipt } from './PurchaseReceipt'

// The assignment's four example scenarios, one click each.
const PRESETS: { label: string; merchant: string; category: MerchantCategoryValue; amount: string }[] = [
  { label: 'Pharmacy', merchant: 'Northside Pharmacy', category: 'pharmacy', amount: '24.99' },
  { label: 'Hospital', merchant: 'Lakeside Medical Center', category: 'hospital', amount: '180.00' },
  { label: 'Restaurant', merchant: 'Blue Fern Bistro', category: 'restaurant', amount: '42.50' },
  { label: 'Electronics', merchant: 'Volt Electronics', category: 'electronics', amount: '349.00' },
]

interface FieldErrors {
  merchant?: string
  category?: string
  amount?: string
}

export function PurchaseSimulator() {
  const { account, card, categories, refresh } = useAccounts()
  const [merchant, setMerchant] = useState('')
  const [category, setCategory] = useState<MerchantCategoryValue | ''>('')
  const [amount, setAmount] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<TransactionResult | null>(null)

  const selectedRule = categories.find((item) => item.value === category)
  const parsedAmount = parseDollarsToCents(amount)
  const hasCard = Boolean(card)
  const disabled = !account || !hasCard || submitting

  function applyPreset(preset: (typeof PRESETS)[number]) {
    setMerchant(preset.merchant)
    setCategory(preset.category)
    setAmount(preset.amount)
    setErrors({})
    setFormError(null)
  }

  function validate(): FieldErrors {
    const next: FieldErrors = {}
    if (!merchant.trim()) next.merchant = 'Enter a merchant name.'
    else if (merchant.trim().length > 80) next.merchant = 'Keep the merchant name under 80 characters.'
    if (!category) next.category = 'Choose a merchant category.'
    if (!parsedAmount.ok) next.amount = parsedAmount.error
    return next
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!account || submitting) return
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0 || !parsedAmount.ok || !category) return

    setSubmitting(true)
    setFormError(null)
    try {
      const outcome = await simulatePurchase(account.id, {
        merchantName: merchant.trim(),
        merchantCategory: category,
        amountCents: parsedAmount.cents,
      })
      setResult(outcome)
      await refresh() // re-read the real balance and history from the server
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        setErrors({
          merchant: error.fieldErrors.merchant_name,
          category: error.fieldErrors.merchant_category,
          amount: error.fieldErrors.amount_cents,
        })
      }
      setFormError(errorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card id="simulator" sx={{ p: { xs: 2.5, md: 3 }, scrollMarginTop: 96 }}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h4" component="h2">
            Purchase simulator
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Run a card purchase through the same checks a real HSA card would face.
          </Typography>
        </Box>
        <Tooltip
          arrow
          title="Simplified rule for this demo: the merchant category decides eligibility (pharmacy, hospital, clinic, dental and vision qualify). Real HSA eligibility depends on what is purchased — this is not tax advice."
        >
          <InfoOutlinedIcon tabIndex={0} aria-label="How eligibility is decided" sx={{ color: 'text.secondary', cursor: 'help', mt: 0.5 }} />
        </Tooltip>
      </Stack>

      {!hasCard && card !== undefined && (
        <Alert severity="info" sx={{ mt: 2.5 }}>
          Issue a virtual card first — purchases can’t be approved without one.
        </Alert>
      )}
      {card?.status === 'frozen' && (
        <Alert severity="warning" sx={{ mt: 2.5 }}>
          This card is frozen, so purchases will be declined. Unfreeze it to approve purchases.
        </Alert>
      )}

      <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mt: 3, mb: 1 }}>
        Quick scenarios
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 1 }}>
        {PRESETS.map((preset) => {
          const eligible = categories.find((item) => item.value === preset.category)?.eligible ?? false
          const active = merchant === preset.merchant && category === preset.category && amount === preset.amount
          return (
            <ButtonBase
              key={preset.label}
              onClick={() => applyPreset(preset)}
              disabled={disabled}
              aria-pressed={active}
              aria-label={`${preset.label} scenario: ${preset.merchant}, $${preset.amount}, ${eligible ? 'qualified' : 'not qualified'}`}
              sx={{
                display: 'block',
                textAlign: 'left',
                p: 1.5,
                borderRadius: '14px',
                border: `1.5px solid ${active ? (eligible ? brand.teal : brand.caution) : brand.border}`,
                bgcolor: active ? (eligible ? brand.mintSoft : brand.cautionSoft) : '#FFFFFF',
                opacity: disabled ? 0.5 : 1,
                transition: 'border-color 160ms ease, background-color 160ms ease, transform 160ms ease',
                '&:hover': { borderColor: eligible ? brand.tealLight : '#D9A35B', transform: 'translateY(-1px)' },
              }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <CategoryGlyph category={preset.category} sx={{ fontSize: 18, color: eligible ? brand.teal : brand.caution }} />
                <Typography variant="subtitle2">{preset.label}</Typography>
              </Stack>
              <Typography className="tabular" sx={{ mt: 0.5, fontWeight: 750, fontSize: '0.9375rem' }}>${preset.amount}</Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, color: eligible ? brand.tealDark : brand.caution }}>
                {eligible ? 'Qualified' : 'Not qualified'}
              </Typography>
            </ButtonBase>
          )
        })}
      </Box>

      <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 3 }}>
        <Stack spacing={2.25}>
          <TextField
            label="Merchant name"
            value={merchant}
            onChange={(event) => setMerchant(event.target.value)}
            error={Boolean(errors.merchant)}
            helperText={errors.merchant}
            disabled={disabled}
            autoComplete="off"
            placeholder="e.g. Northside Pharmacy"
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
            required
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.25}>
            <TextField
              select
              label="Merchant category"
              value={category}
              onChange={(event) => setCategory(event.target.value as MerchantCategoryValue)}
              error={Boolean(errors.category)}
              helperText={errors.category}
              disabled={disabled || categories.length === 0}
              fullWidth
              required
              slotProps={{
                inputLabel: { shrink: true },
                select: {
                  displayEmpty: true,
                  renderValue: (value) => {
                    const rule = categories.find((item) => item.value === value)
                    return rule ? rule.label : <Box component="span" sx={{ color: 'text.disabled' }}>Choose a category</Box>
                  },
                },
              }}
            >
              {categories.map((item) => {
                return (
                  <MenuItem key={item.value} value={item.value} sx={{ gap: 1.5 }}>
                    <CategoryGlyph category={item.value} sx={{ fontSize: 20, color: item.eligible ? brand.teal : brand.slate }} />
                    <Box component="span" sx={{ flexGrow: 1 }}>{item.label}</Box>
                    <Typography component="span" variant="caption" sx={{ color: item.eligible ? brand.tealDark : brand.caution, fontWeight: 700 }}>
                      {item.eligible ? 'Qualified' : 'Not qualified'}
                    </Typography>
                  </MenuItem>
                )
              })}
            </TextField>
            <MoneyField
              label="Amount"
              value={amount}
              onChange={setAmount}
              error={Boolean(errors.amount)}
              helperText={errors.amount}
              disabled={disabled}
              fullWidth
              required
            />
          </Stack>

          {selectedRule && (
            <Box
              sx={{
                display: 'flex',
                gap: 1,
                alignItems: 'center',
                px: 1.75,
                py: 1.25,
                borderRadius: '12px',
                bgcolor: selectedRule.eligible ? brand.mintSoft : brand.cautionSoft,
                color: selectedRule.eligible ? brand.tealDark : brand.caution,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 650 }}>
                {selectedRule.eligible
                  ? `${selectedRule.label} is treated as a qualified medical expense.`
                  : `${selectedRule.label} is not a qualified medical expense — this purchase will be declined.`}
              </Typography>
            </Box>
          )}

          {formError && <Alert severity="error">{formError}</Alert>}

          <Button
            type="submit"
            size="large"
            variant="contained"
            disabled={disabled}
            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <ShoppingBagRoundedIcon />}
          >
            {submitting ? 'Processing…' : parsedAmount.ok ? `Simulate ${formatCents(parsedAmount.cents)} purchase` : 'Simulate purchase'}
          </Button>
        </Stack>
      </Box>

      {result && (
        <Box sx={{ mt: 3 }}>
          <PurchaseReceipt result={result} cardLastFour={card?.last_four} />
        </Box>
      )}
    </Card>
  )
}
