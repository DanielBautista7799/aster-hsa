// One transaction as a compact list row (overview, mobile activity, lab).
import { Box, Stack, Typography } from '@mui/material'
import { DECLINE_REASON_LABELS, formatDateTime } from '../lib/format'
import { formatCents } from '../lib/money'
import { brand } from '../theme/tokens'
import type { Transaction } from '../types/api'
import { CATEGORY_LABELS, TransactionIcon } from './CategoryIcon'
import { StatusChip } from './StatusChip'

export function transactionTitle(transaction: Transaction): string {
  return transaction.type === 'deposit' ? 'Deposit' : transaction.merchant_name ?? 'Purchase'
}

export function transactionSubtitle(transaction: Transaction): string {
  if (transaction.type === 'deposit') return 'Contribution'
  const category = transaction.merchant_category ? CATEGORY_LABELS[transaction.merchant_category] : 'Purchase'
  if (transaction.status === 'declined' && transaction.decline_reason) {
    return `${category} · ${DECLINE_REASON_LABELS[transaction.decline_reason]}`
  }
  return category
}

/** "+$500.00" for deposits, "−$50.00" for approved purchases, plain for declines. */
export function SignedAmount({ transaction }: { transaction: Transaction }) {
  const declined = transaction.status === 'declined'
  const isDeposit = transaction.type === 'deposit'
  const sign = declined ? '' : isDeposit ? '+' : '−'
  return (
    <Typography
      className="tabular"
      sx={{
        fontWeight: 700,
        fontSize: '0.9375rem',
        whiteSpace: 'nowrap',
        color: declined ? 'text.secondary' : isDeposit ? brand.tealDark : 'text.primary',
        textDecoration: declined ? 'line-through' : 'none',
        textDecorationColor: 'rgba(100,116,139,0.6)',
      }}
    >
      {sign}
      {formatCents(transaction.amount_cents)}
    </Typography>
  )
}

export function TransactionRow({ transaction, showBalance = false }: { transaction: Transaction; showBalance?: boolean }) {
  return (
    <Stack direction="row" spacing={1.75} sx={{ alignItems: 'center', py: 1.5, minWidth: 0 }}>
      <TransactionIcon transaction={transaction} />
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="subtitle2" noWrap>
          {transactionTitle(transaction)}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap component="div">
          {transactionSubtitle(transaction)}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap component="div" className="tabular" sx={{ opacity: 0.85 }}>
          {formatDateTime(transaction.created_at)}
        </Typography>
      </Box>
      <Stack spacing={0.5} sx={{ alignItems: 'flex-end', flexShrink: 0 }}>
        <SignedAmount transaction={transaction} />
        {showBalance ? (
          <Typography variant="caption" color="text.secondary" className="tabular">
            Bal. {formatCents(transaction.balance_after_cents)}
          </Typography>
        ) : (
          <StatusChip transaction={transaction} />
        )}
      </Stack>
    </Stack>
  )
}
