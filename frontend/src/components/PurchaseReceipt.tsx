// The outcome of a simulated purchase, built only from the server response.
import BlockRoundedIcon from '@mui/icons-material/BlockRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import { Box, Divider, Stack, Typography } from '@mui/material'
import { DECLINE_REASON_LABELS, formatTime } from '../lib/format'
import { formatCents } from '../lib/money'
import { brand } from '../theme/tokens'
import type { TransactionResult } from '../types/api'
import { CATEGORY_LABELS } from './CategoryIcon'

function ReceiptLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" className="tabular" sx={{ fontWeight: strong ? 800 : 600, textAlign: 'right' }}>{value}</Typography>
    </Stack>
  )
}

export function PurchaseReceipt({ result, cardLastFour }: { result: TransactionResult; cardLastFour?: string }) {
  const { transaction } = result
  const approved = transaction.status === 'approved'
  const tone = approved
    ? { bg: brand.mintSoft, border: '#BFE6D5', fg: brand.tealDark, icon: <CheckCircleRoundedIcon /> }
    : { bg: brand.declineSoft, border: '#F4CFC6', fg: brand.decline, icon: <BlockRoundedIcon /> }

  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        borderRadius: '18px',
        border: `1px solid ${tone.border}`,
        bgcolor: tone.bg,
        p: { xs: 2.25, sm: 2.75 },
        animation: 'receiptIn 220ms ease-out',
        '@keyframes receiptIn': { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'none' } },
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
        <Box sx={{ color: tone.fg, display: 'flex', '& svg': { fontSize: 30 } }}>{tone.icon}</Box>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="h5" component="h3" sx={{ color: tone.fg }}>
            {approved ? 'Purchase approved' : `Declined · ${DECLINE_REASON_LABELS[transaction.decline_reason!]}`}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, color: 'text.primary' }}>
            {result.message}
          </Typography>
        </Box>
      </Stack>

      <Divider sx={{ my: 2, borderColor: tone.border }} />

      <Stack spacing={0.9}>
        <ReceiptLine label="Merchant" value={transaction.merchant_name ?? '—'} />
        <ReceiptLine label="Category" value={transaction.merchant_category ? CATEGORY_LABELS[transaction.merchant_category] : '—'} />
        <ReceiptLine label="Amount" value={formatCents(transaction.amount_cents)} />
        {cardLastFour && transaction.card_id && <ReceiptLine label="Card" value={`Virtual •••• ${cardLastFour}`} />}
        <ReceiptLine label="Time" value={formatTime(transaction.created_at)} />
        <ReceiptLine
          label={approved ? 'New balance' : 'Balance (unchanged)'}
          value={formatCents(result.balance_cents)}
          strong
        />
      </Stack>
      {!approved && (
        <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: tone.fg, fontWeight: 650 }}>
          No money was deducted. The attempt is recorded in your activity.
        </Typography>
      )}
    </Box>
  )
}
