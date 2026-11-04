// Holds the selected account and the server data shown for it.
//
// Rule of thumb: the backend is the source of truth. After every change
// (deposit, purchase, card issuance...) callers run `refresh()`, which re-reads
// the balance, card and history from the API instead of doing arithmetic in
// the browser.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { getAccount, getCard, listAccounts, listMerchantCategories, listTransactions } from '../api/aster'
import { errorMessage } from '../api/client'
import type { Account, AccountDetail, Card, MerchantCategory, Transaction } from '../types/api'

const SELECTED_ACCOUNT_KEY = 'aster.selectedAccountId'
const RECENT_LIMIT = 6

interface AccountContextValue {
  /** null while loading the first time */
  accounts: Account[] | null
  accountsError: string | null
  selectedAccountId: string | null
  selectAccount: (accountId: string) => void

  /** Data for the selected account; null while loading or when none selected. */
  account: AccountDetail | null
  /** undefined = still loading, null = no card issued */
  card: Card | null | undefined
  recentTransactions: Transaction[] | null
  accountError: string | null

  categories: MerchantCategory[]
  /** Increments after every load so pages with their own queries can refetch. */
  dataVersion: number
  /** Re-read the selected account (and the account list) from the API. */
  refresh: () => Promise<void>
  reloadAccounts: () => Promise<void>
}

/** Everything loaded for one account, tagged with that account's id. */
interface LoadedAccount {
  accountId: string
  account: AccountDetail
  card: Card | null
  recentTransactions: Transaction[]
}

type LoadOutcome = { data: LoadedAccount } | { error: string }

/** Fetch everything shown for one account. Never throws. */
async function fetchAccountData(accountId: string): Promise<LoadOutcome> {
  try {
    const [account, card, recentPage] = await Promise.all([
      getAccount(accountId),
      getCard(accountId),
      listTransactions(accountId, { limit: RECENT_LIMIT }),
    ])
    return { data: { accountId, account, card, recentTransactions: recentPage.items } }
  } catch (error) {
    return { error: errorMessage(error) }
  }
}

const AccountContext = createContext<AccountContextValue | null>(null)

function readStoredAccountId(): string | null {
  try {
    return window.localStorage.getItem(SELECTED_ACCOUNT_KEY)
  } catch {
    return null
  }
}

function storeAccountId(accountId: string) {
  try {
    window.localStorage.setItem(SELECTED_ACCOUNT_KEY, accountId)
  } catch {
    // Storage can be unavailable (private mode); selection still works in memory.
  }
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<Account[] | null>(null)
  const [accountsError, setAccountsError] = useState<string | null>(null)
  const [preferredAccountId, setPreferredAccountId] = useState<string | null>(readStoredAccountId)
  const [loaded, setLoaded] = useState<LoadedAccount | null>(null)
  const [loadError, setLoadError] = useState<{ accountId: string; message: string } | null>(null)
  const [categories, setCategories] = useState<MerchantCategory[]>([])
  const [dataVersion, setDataVersion] = useState(0)

  // The selection is derived, not stored separately: the preferred account if
  // it still exists, otherwise the first account (e.g. after a database reset).
  const selectedAccountId = useMemo(() => {
    if (accounts === null) return null
    if (preferredAccountId && accounts.some((item) => item.id === preferredAccountId)) return preferredAccountId
    return accounts[0]?.id ?? null
  }, [accounts, preferredAccountId])

  // Which account the latest load is for, so a slow response for a previously
  // selected account can never overwrite the current one.
  const latestAccountId = useRef<string | null>(null)
  // Every load gets a number. If two refreshes overlap (e.g. two quick
  // purchases) and the older response arrives last, it is ignored.
  const loadSequence = useRef(0)
  const appliedSequence = useRef(0)

  const reloadAccounts = useCallback(async () => {
    try {
      const list = await listAccounts()
      setAccounts(list)
      setAccountsError(null)
    } catch (error) {
      setAccountsError(errorMessage(error))
    }
  }, [])

  // Store a finished load, unless the user has since switched accounts.
  const applyLoad = useCallback((accountId: string, sequence: number, outcome: LoadOutcome) => {
    if (latestAccountId.current !== accountId) return
    if (sequence < appliedSequence.current) return // a newer load already landed
    appliedSequence.current = sequence
    if ('data' in outcome) {
      setLoaded(outcome.data)
      setLoadError(null)
    } else {
      setLoadError({ accountId, message: outcome.error })
    }
    setDataVersion((version) => version + 1)
  }, [])

  const loadAccount = useCallback(
    async (accountId: string) => {
      const sequence = ++loadSequence.current
      applyLoad(accountId, sequence, await fetchAccountData(accountId))
    },
    [applyLoad],
  )

  const refresh = useCallback(async () => {
    const accountId = latestAccountId.current
    await Promise.all([reloadAccounts(), accountId ? loadAccount(accountId) : Promise.resolve()])
  }, [loadAccount, reloadAccounts])

  const selectAccount = useCallback((accountId: string) => {
    storeAccountId(accountId)
    setPreferredAccountId(accountId)
  }, [])

  // Initial load: account list and merchant categories.
  useEffect(() => {
    const controller = new AbortController()
    listMerchantCategories(controller.signal)
      .then(setCategories)
      .catch(() => undefined) // the simulator form shows a disabled category field instead
    listAccounts(controller.signal)
      .then((list) => {
        setAccounts(list)
        setAccountsError(null)
      })
      .catch((error) => {
        if (!controller.signal.aborted) setAccountsError(errorMessage(error))
      })
    return () => controller.abort()
  }, [])

  // Load the selected account whenever the selection changes.
  useEffect(() => {
    latestAccountId.current = selectedAccountId
    if (!selectedAccountId) return
    const sequence = ++loadSequence.current
    fetchAccountData(selectedAccountId).then((outcome) => applyLoad(selectedAccountId, sequence, outcome))
  }, [selectedAccountId, applyLoad])

  // Only expose data that belongs to the currently selected account.
  const current = loaded?.accountId === selectedAccountId ? loaded : null
  const accountError = loadError?.accountId === selectedAccountId ? loadError.message : null

  const value = useMemo<AccountContextValue>(
    () => ({
      accounts,
      accountsError,
      selectedAccountId,
      selectAccount,
      account: current?.account ?? null,
      card: current ? current.card : undefined,
      recentTransactions: current?.recentTransactions ?? null,
      accountError,
      categories,
      dataVersion,
      refresh,
      reloadAccounts,
    }),
    [accounts, accountsError, selectedAccountId, selectAccount, current, accountError, categories, dataVersion, refresh, reloadAccounts],
  )

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

export function useAccounts(): AccountContextValue {
  const context = useContext(AccountContext)
  if (!context) throw new Error('useAccounts must be used inside <AccountProvider>')
  return context
}
