import { Box } from '@mui/material'
import { brand, gradients } from '../theme/tokens'

/** The Aster logo: a four-pointed star on a navy-to-teal tile. */
export function AsterMark({ size = 36 }: { size?: number }) {
  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        borderRadius: `${size * 0.28}px`,
        background: gradients.mark,
        display: 'grid',
        placeItems: 'center',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12)',
        flexShrink: 0,
      }}
    >
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24">
        <path d="M12 1.5c.9 5.6 2.8 8.6 10.5 10.5C14.8 13.9 12.9 16.9 12 22.5 11.1 16.9 9.2 13.9 1.5 12 9.2 10.1 11.1 7.1 12 1.5z" fill={brand.mint} />
      </svg>
    </Box>
  )
}
