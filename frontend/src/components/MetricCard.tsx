import { Box, Card, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'

interface MetricCardProps {
  icon: ReactNode
  label: string
  value: string
  caption: string
  tone: { bg: string; fg: string }
}

/** A headline number. Stacked on larger screens; a compact single row on phones. */
export function MetricCard({ icon, label, value, caption, tone }: MetricCardProps) {
  return (
    <Card sx={{ p: { xs: 2, sm: 2.75 }, height: '100%' }}>
      <Stack direction={{ xs: 'row', sm: 'column' }} spacing={{ xs: 1.5, sm: 0 }} sx={{ alignItems: { xs: 'center', sm: 'stretch' } }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexGrow: { xs: 1, sm: 0 }, minWidth: 0 }}>
          <Box aria-hidden sx={{ flexShrink: 0, width: 36, height: 36, borderRadius: '11px', bgcolor: tone.bg, color: tone.fg, display: 'grid', placeItems: 'center', '& svg': { fontSize: 19 } }}>
            {icon}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              {label}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap component="div" sx={{ display: { xs: 'block', sm: 'none' } }}>
              {caption}
            </Typography>
          </Box>
        </Stack>
        <Typography className="tabular" sx={{ mt: { xs: 0, sm: 2 }, fontSize: { xs: '1.25rem', sm: '1.625rem' }, fontWeight: 750, letterSpacing: '-0.025em', flexShrink: 0 }}>
          {value}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
          {caption}
        </Typography>
      </Stack>
    </Card>
  )
}
