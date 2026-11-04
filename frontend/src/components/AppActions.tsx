// Lets any page open the "Create account" and "Add funds" dialogs, and
// handles what happens after they succeed (select account, refetch, toast).
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { formatCents } from '../lib/money'
import { useAccounts } from '../state/AccountContext'
import type { Account, TransactionResult } from '../types/api'
import { CreateAccountDialog } from './dialogs/CreateAccountDialog'
import { DepositDialog } from './dialogs/DepositDialog'
import { useToast } from './ToastProvider'

interface AppActions {
  openCreateAccount: () => void
  openDeposit: () => void
}

const AppActionsContext = createContext<AppActions | null>(null)

export function AppActionsProvider({ children }: { children: ReactNode }) {
  const { account, selectAccount, refresh, reloadAccounts } = useAccounts()
  const showToast = useToast()
  const navigate = useNavigate()
  const [createOpen, setCreateOpen] = useState(false)
  const [depositOpen, setDepositOpen] = useState(false)

  const openCreateAccount = useCallback(() => setCreateOpen(true), [])
  const openDeposit = useCallback(() => setDepositOpen(true), [])

  async function handleCreated(created: Account) {
    setCreateOpen(false)
    await reloadAccounts()
    selectAccount(created.id)
    navigate('/')
    showToast(`Welcome, ${created.full_name.split(' ')[0]} — your Aster HSA is open with a $0.00 balance.`)
  }

  async function handleDeposited(result: TransactionResult) {
    setDepositOpen(false)
    await refresh()
    showToast(`${result.message} New balance ${formatCents(result.balance_cents)}`)
  }

  const value = useMemo(() => ({ openCreateAccount, openDeposit }), [openCreateAccount, openDeposit])

  return (
    <AppActionsContext.Provider value={value}>
      {children}
      <CreateAccountDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={handleCreated} />
      <DepositDialog open={depositOpen} account={account} onClose={() => setDepositOpen(false)} onDeposited={handleDeposited} />
    </AppActionsContext.Provider>
  )
}

export function useAppActions(): AppActions {
  const context = useContext(AppActionsContext)
  if (!context) throw new Error('useAppActions must be used inside <AppActionsProvider>')
  return context
}
