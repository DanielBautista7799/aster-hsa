import CreditCardRoundedIcon from '@mui/icons-material/CreditCardRounded'
import DataObjectRoundedIcon from '@mui/icons-material/DataObjectRounded'
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded'
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded'
import ScienceRoundedIcon from '@mui/icons-material/ScienceRounded'
import SpaceDashboardRoundedIcon from '@mui/icons-material/SpaceDashboardRounded'
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded'
import { BottomNavigation, BottomNavigationAction, Box, Link, Paper, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router'
import { brand } from '../theme/tokens'
import { AccountSwitcher } from './AccountSwitcher'
import { AsterMark } from './AsterMark'

const SIDEBAR_WIDTH = 256

const NAV_ITEMS = [
  { to: '/', label: 'Overview', shortLabel: 'Overview', icon: SpaceDashboardRoundedIcon },
  { to: '/activity', label: 'Activity', shortLabel: 'Activity', icon: ReceiptLongRoundedIcon },
  { to: '/card', label: 'Card & purchases', shortLabel: 'Card', icon: CreditCardRoundedIcon },
  { to: '/account', label: 'Account', shortLabel: 'Account', icon: PersonOutlineRoundedIcon },
  { to: '/lab', label: 'Concurrency Lab', shortLabel: 'Lab', icon: ScienceRoundedIcon },
]

function Brand({ inverted = false }: { inverted?: boolean }) {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
      <AsterMark size={34} />
      <Box>
        <Typography sx={{ fontWeight: 800, fontSize: '1.125rem', lineHeight: 1.1, letterSpacing: '-0.02em', color: inverted ? '#FFFFFF' : brand.navy }}>
          Aster
        </Typography>
        <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color: inverted ? 'rgba(255,255,255,0.6)' : brand.slate }}>
          HSA simulator
        </Typography>
      </Box>
    </Stack>
  )
}

function Sidebar() {
  return (
    <Box
      component="nav"
      aria-label="Main"
      sx={{
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        position: 'fixed',
        inset: '0 auto 0 0',
        width: SIDEBAR_WIDTH,
        bgcolor: brand.midnight,
        backgroundImage: 'radial-gradient(120% 50% at 0% 0%, rgba(16,126,120,0.22) 0%, rgba(16,126,120,0) 60%)',
        color: '#FFFFFF',
        px: 2,
        py: 3,
      }}
    >
      <Box sx={{ px: 1, mb: 4 }}>
        <Brand inverted />
      </Box>
      <Stack spacing={0.5}>
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <Box
            key={to}
            component={NavLink}
            to={to}
            end={to === '/'}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              px: 1.5,
              py: 1.25,
              borderRadius: '12px',
              color: 'rgba(255,255,255,0.72)',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.9375rem',
              position: 'relative',
              transition: 'background-color 160ms ease, color 160ms ease',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.06)', color: '#FFFFFF' },
              '&:focus-visible': { outline: `3px solid ${brand.tealLight}`, outlineOffset: 2 },
              '&.active': {
                bgcolor: 'rgba(223,245,236,0.10)',
                color: '#FFFFFF',
                '&::before': { content: '""', position: 'absolute', left: -16, top: 10, bottom: 10, width: 3, borderRadius: 4, bgcolor: brand.tealLight },
                '& svg': { color: brand.tealLight },
              },
            }}
          >
            <Icon fontSize="small" />
            {label}
          </Box>
        ))}
      </Stack>

      <Box sx={{ flexGrow: 1 }} />

      <Box sx={{ p: 2, borderRadius: '16px', bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.75 }}>
          <VerifiedUserRoundedIcon sx={{ fontSize: 18, color: brand.tealLight }} />
          <Typography variant="subtitle2" sx={{ color: '#FFFFFF' }}>
            Demo environment
          </Typography>
        </Stack>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.65)', display: 'block' }}>
          Simulated balances and cards. No real money, payments or tax advice.
        </Typography>
        <Link
          href="/api/docs"
          target="_blank"
          rel="noreferrer"
          underline="hover"
          sx={{ mt: 1.25, display: 'inline-flex', alignItems: 'center', gap: 0.75, color: brand.mint, fontSize: '0.75rem', fontWeight: 650 }}
        >
          <DataObjectRoundedIcon sx={{ fontSize: 16 }} /> API reference
        </Link>
      </Box>
    </Box>
  )
}

function MobileBottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const current = NAV_ITEMS.find((item) => (item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)))?.to ?? '/'
  return (
    <Paper
      component="nav"
      aria-label="Main"
      square
      sx={{
        display: { xs: 'block', md: 'none' },
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: (theme) => theme.zIndex.appBar,
        borderTop: `1px solid ${brand.border}`,
        pb: 'env(safe-area-inset-bottom)',
      }}
    >
      <BottomNavigation value={current} onChange={(_event, value: string) => navigate(value)} showLabels sx={{ height: 64 }}>
        {NAV_ITEMS.map(({ to, shortLabel, icon: Icon }) => (
          <BottomNavigationAction
            key={to}
            value={to}
            label={shortLabel}
            icon={<Icon />}
            sx={{ minWidth: 0, '&.Mui-selected': { color: brand.teal }, '& .MuiBottomNavigationAction-label': { fontWeight: 650, fontSize: '0.6875rem' }, '& .MuiBottomNavigationAction-label.Mui-selected': { fontSize: '0.6875rem' } }}
          />
        ))}
      </BottomNavigation>
    </Paper>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar />
      <Box sx={{ ml: { md: `${SIDEBAR_WIDTH}px` }, minWidth: 0 }}>
        <Box
          component="header"
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: (theme) => theme.zIndex.appBar,
            bgcolor: 'rgba(246,248,247,0.82)',
            backdropFilter: 'saturate(180%) blur(12px)',
            borderBottom: `1px solid ${brand.border}`,
          }}
        >
          <Stack
            direction="row"
            spacing={2}
            sx={{ alignItems: 'center', justifyContent: 'space-between', maxWidth: 1200, mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, height: { xs: 64, md: 72 } }}
          >
            <Box sx={{ display: { xs: 'block', md: 'none' } }}>
              <Brand />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1 }}>
              <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: brand.teal, boxShadow: `0 0 0 4px ${brand.mint}` }} />
              Simulation mode — balances are fictional
            </Typography>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <AccountSwitcher />
            </Box>
            <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
              <AccountSwitcher compact />
            </Box>
          </Stack>
        </Box>
        <Box
          component="main"
          // Re-keyed per route so each page fades and lifts in briefly.
          key={location.pathname}
          sx={{
            maxWidth: 1200,
            mx: 'auto',
            px: { xs: 2, sm: 3, md: 4 },
            pt: { xs: 3, md: 4 },
            pb: { xs: 12, md: 6 },
            animation: 'pageIn 220ms ease-out',
            '@keyframes pageIn': { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'none' } },
          }}
        >
          {children}
        </Box>
      </Box>
      <MobileBottomNav />
    </Box>
  )
}
