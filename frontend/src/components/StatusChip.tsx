// Approved/declined badge. Uses an icon and a word, never colour alone.
import BlockRoundedIcon from '@mui/icons-material/BlockRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import { Chip, Tooltip } from '@mui/material'
import { DECLINE_REASON_LABELS } from '../lib/format'
import { brand } from '../theme/tokens'
import type { Transaction } from '../types/api'

export function StatusChip({ transaction }: { transaction: Transaction }) {
  if (transaction.status === 'approved') {
    return (
      <Chip
        size="small"
        icon={<CheckCircleRoundedIcon />}
        label="Approved"
        sx={{ bgcolor: brand.mint, color: brand.tealDark, '& .MuiChip-icon': { color: brand.teal } }}
      />
    )
  }
  const reason = transaction.decline_reason ? DECLINE_REASON_LABELS[transaction.decline_reason] : 'Declined'
  return (
    <Tooltip title={reason} arrow>
      <Chip
        size="small"
        icon={<BlockRoundedIcon />}
        label="Declined"
        tabIndex={0}
        aria-label={`Declined: ${reason}`}
        sx={{ bgcolor: brand.declineSoft, color: brand.decline, '& .MuiChip-icon': { color: brand.decline } }}
      />
    </Tooltip>
  )
}
