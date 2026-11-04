import { Box, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { brand } from '../theme/tokens'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: ReactNode
  action?: ReactNode
  compact?: boolean
}

export function EmptyState({ icon, title, description, action, compact = false }: EmptyStateProps) {
  return (
    <Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center', py: compact ? 4 : 7, px: 3 }}>
      <Box
        aria-hidden
        sx={{
          width: 64,
          height: 64,
          borderRadius: '20px',
          display: 'grid',
          placeItems: 'center',
          color: brand.teal,
          background: `linear-gradient(145deg, ${brand.mint} 0%, ${brand.warmSoft} 100%)`,
          border: `1px solid ${brand.border}`,
          '& svg': { fontSize: 30 },
        }}
      >
        {icon}
      </Box>
      <Typography variant="h5" component="h3">
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 380 }}>
        {description}
      </Typography>
      {action && <Box sx={{ pt: 1 }}>{action}</Box>}
    </Stack>
  )
}
