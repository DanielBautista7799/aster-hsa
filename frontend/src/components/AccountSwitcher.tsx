import AddRoundedIcon from '@mui/icons-material/AddRounded'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import UnfoldMoreRoundedIcon from '@mui/icons-material/UnfoldMoreRounded'
import { Avatar, Box, ButtonBase, Divider, ListItemIcon, ListItemText, Menu, MenuItem, Skeleton, Typography } from '@mui/material'
import { useState } from 'react'
import { initials } from '../lib/format'
import { formatCents } from '../lib/money'
import { useAccounts } from '../state/AccountContext'
import { brand } from '../theme/tokens'
import { useAppActions } from './AppActions'

export function AccountAvatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <Avatar sx={{ width: size, height: size, fontSize: size * 0.38, fontWeight: 750, bgcolor: brand.warm, color: brand.navy }}>
      {initials(name)}
    </Avatar>
  )
}

/** Shows the selected account and lets the user switch or create one. */
export function AccountSwitcher({ compact = false }: { compact?: boolean }) {
  const { accounts, selectedAccountId, selectAccount } = useAccounts()
  const { openCreateAccount } = useAppActions()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)

  if (accounts === null) {
    return <Skeleton variant="rounded" width={compact ? 40 : 220} height={44} />
  }

  const selected = accounts.find((account) => account.id === selectedAccountId) ?? null

  return (
    <>
      <ButtonBase
        onClick={(event) => setAnchor(event.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        aria-label={selected ? `Selected account: ${selected.full_name}. Switch account` : 'Choose an account'}
        sx={{
          gap: 1.25,
          p: compact ? 0.5 : 0.75,
          pr: compact ? 0.5 : 1.25,
          borderRadius: '14px',
          border: `1px solid ${compact ? 'transparent' : brand.border}`,
          bgcolor: compact ? 'transparent' : '#FFFFFF',
          textAlign: 'left',
          transition: 'border-color 160ms ease, box-shadow 160ms ease',
          '&:hover': { borderColor: compact ? 'transparent' : brand.borderStrong, boxShadow: compact ? 'none' : '0 2px 8px rgba(15,28,42,0.06)' },
        }}
      >
        {selected ? (
          <AccountAvatar name={selected.full_name} size={compact ? 34 : 36} />
        ) : (
          <Avatar sx={{ width: 34, height: 34, bgcolor: brand.mint, color: brand.tealDark }}>
            <AddRoundedIcon fontSize="small" />
          </Avatar>
        )}
        {!compact && (
          <Box sx={{ minWidth: 0, maxWidth: 180 }}>
            <Typography variant="subtitle2" noWrap>
              {selected?.full_name ?? 'No account selected'}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap component="div">
              {selected ? selected.email : 'Create one to get started'}
            </Typography>
          </Box>
        )}
        {!compact && <UnfoldMoreRoundedIcon fontSize="small" sx={{ color: 'text.secondary', ml: 0.5 }} />}
      </ButtonBase>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { mt: 1, minWidth: 300, maxWidth: 'calc(100vw - 32px)', borderRadius: '16px', border: `1px solid ${brand.border}`, boxShadow: '0 16px 40px rgba(11,30,48,0.14)' } } }}
      >
        <Typography variant="overline" color="text.secondary" sx={{ px: 2, pt: 0.5, display: 'block' }}>
          Accounts
        </Typography>
        {accounts.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1 }}>
            No accounts yet.
          </Typography>
        )}
        {accounts.map((account) => (
          <MenuItem
            key={account.id}
            selected={account.id === selectedAccountId}
            onClick={() => {
              selectAccount(account.id)
              setAnchor(null)
            }}
            sx={{ py: 1.25, gap: 1.5, borderRadius: '10px', mx: 1 }}
          >
            <AccountAvatar name={account.full_name} size={32} />
            <ListItemText
              primary={account.full_name}
              secondary={`${account.email} · ${formatCents(account.balance_cents)}`}
              slotProps={{ primary: { sx: { fontWeight: 650, fontSize: '0.875rem' } }, secondary: { className: 'tabular', noWrap: true, sx: { fontSize: '0.75rem' } } }}
              sx={{ minWidth: 0 }}
            />
            {account.id === selectedAccountId && <CheckRoundedIcon fontSize="small" sx={{ color: brand.teal }} />}
          </MenuItem>
        ))}
        <Divider sx={{ my: 1 }} />
        <MenuItem
          onClick={() => {
            setAnchor(null)
            openCreateAccount()
          }}
          sx={{ py: 1.25, borderRadius: '10px', mx: 1, color: brand.tealDark, fontWeight: 650 }}
        >
          <ListItemIcon sx={{ color: 'inherit' }}>
            <AddRoundedIcon fontSize="small" />
          </ListItemIcon>
          Create new account
        </MenuItem>
      </Menu>
    </>
  )
}
