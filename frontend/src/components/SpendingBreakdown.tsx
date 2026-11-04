// Approved spending by category, straight from the account summary endpoint.
import DonutSmallRoundedIcon from '@mui/icons-material/DonutSmallRounded'
import { Box, Card, LinearProgress, Stack, Typography } from '@mui/material'
import { formatCents } from '../lib/money'
import { brand } from '../theme/tokens'
import type { AccountSummary } from '../types/api'
import { CATEGORY_LABELS, CategoryGlyph } from './CategoryIcon'
import { EmptyState } from './EmptyState'

export function SpendingBreakdown({ summary }: { summary: AccountSummary }) {
  const rows = summary.spending_by_category
  const total = summary.total_spent_cents

  return (
    <Card sx={{ p: { xs: 2.5, md: 3 }, height: '100%' }}>
      <Typography variant="h5" component="h2">
        Qualified spending
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
        Approved purchases by category
      </Typography>
      {rows.length === 0 ? (
        <EmptyState compact icon={<DonutSmallRoundedIcon />} title="No spending yet" description="Approved purchases will be broken down here by category." />
      ) : (
        <Stack spacing={2.25} sx={{ mt: 3 }}>
          {rows.map((row) => {
            // Share of total, for the bar only (display, not money math).
            const percent = total > 0 ? Math.round((row.approved_cents / total) * 100) : 0
            return (
              <Box key={row.category}>
                <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 0.75 }}>
                  <CategoryGlyph category={row.category} sx={{ fontSize: 18, color: brand.teal }} />
                  <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                    {CATEGORY_LABELS[row.category]}
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.75 }}>
                      {row.approved_count} {row.approved_count === 1 ? 'purchase' : 'purchases'}
                    </Typography>
                  </Typography>
                  <Typography variant="subtitle2" className="tabular">
                    {formatCents(row.approved_cents)}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={percent}
                  aria-label={`${CATEGORY_LABELS[row.category]}: ${percent}% of qualified spending`}
                  sx={{ height: 8, borderRadius: 999, bgcolor: brand.mintSoft, '& .MuiLinearProgress-bar': { borderRadius: 999, bgcolor: brand.teal } }}
                />
              </Box>
            )
          })}
        </Stack>
      )}
    </Card>
  )
}
