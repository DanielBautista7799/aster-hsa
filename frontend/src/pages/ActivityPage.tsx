import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded'
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded'
import SearchOffRoundedIcon from '@mui/icons-material/SearchOffRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import { Alert, Box, Button, Card, CircularProgress, Divider, InputAdornment, LinearProgress, Skeleton, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { Fragment, useEffect, useState } from 'react'
import { listTransactions, type TransactionQuery } from '../api/aster'
import { errorMessage, isAbortError } from '../api/client'
import { useAppActions } from '../components/AppActions'
import { CATEGORY_LABELS, TransactionIcon } from '../components/CategoryIcon'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { PageHeader } from '../components/PageHeader'
import { StatusChip } from '../components/StatusChip'
import { SignedAmount, TransactionRow, transactionTitle } from '../components/TransactionRow'
import { DECLINE_REASON_LABELS, formatDateTime } from '../lib/format'
import { formatCents } from '../lib/money'
import { appendPage } from '../lib/pagination'
import { useAccounts } from '../state/AccountContext'
import { brand } from '../theme/tokens'
import type { Transaction, TransactionStatus, TransactionType } from '../types/api'

type TypeFilter = 'all' | TransactionType
type StatusFilter = 'all' | TransactionStatus

/** Rows fetched per request. The server caps a page at 200. */
export const PAGE_SIZE = 25
/** How long to wait after the last keystroke before searching. */
const SEARCH_DEBOUNCE_MS = 250

/** The query for one combination of filters and search (every page repeats it). */
function historyQuery(type: TypeFilter, status: StatusFilter, search: string): TransactionQuery {
  return {
    type: type === 'all' ? undefined : type,
    status: status === 'all' ? undefined : status,
    q: search || undefined,
    limit: PAGE_SIZE,
  }
}

/** Identifies what is being viewed: rows for another account, filter
 * combination or search are never shown as if they were this view's. */
function viewKeyFor(accountId: string | null, type: TypeFilter, status: StatusFilter, search: string): string {
  return `${accountId}|${type}|${status}|${search}`
}

/** The rows loaded so far for one combination of account, filters and search. */
interface LoadedView {
  viewKey: string
  accountId: string
  transactions: Transaction[]
  /** Cursor for the next (older) page; null once everything is loaded. */
  nextCursor: string | null
  /** Rows matching the filters across all pages, from the server. */
  totalCount: number
}

export function ActivityPage() {
  const { accounts, selectedAccountId, dataVersion } = useAccounts()
  const { openCreateAccount, openDeposit } = useAppActions()
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [view, setView] = useState<LoadedView | null>(null)
  const [error, setError] = useState<{ viewKey: string; message: string } | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)

  // Search is sent to the server (so it covers every page, not just the rows
  // already loaded), but only after the user pauses typing.
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [search])

  const viewKey = viewKeyFor(selectedAccountId, typeFilter, statusFilter, debouncedSearch)

  const current = view?.viewKey === viewKey ? view : null
  const loadError = error?.viewKey === viewKey ? error.message : null
  // While a new filter/search loads, keep the previous rows of the SAME
  // account on screen (dimmed, with a progress bar) instead of flashing a
  // skeleton. Another account's rows are never shown.
  const previous = !current && view?.accountId === selectedAccountId ? view : null

  // Load the first page whenever the view changes (or data is refreshed).
  useEffect(() => {
    if (!selectedAccountId) return
    const controller = new AbortController()
    const key = viewKeyFor(selectedAccountId, typeFilter, statusFilter, debouncedSearch)
    listTransactions(selectedAccountId, historyQuery(typeFilter, statusFilter, debouncedSearch), controller.signal)
      .then((page) => {
        setView({ viewKey: key, accountId: selectedAccountId, transactions: page.items, nextCursor: page.next_cursor, totalCount: page.total_count })
        setError(null)
        setLoadMoreError(null)
      })
      .catch((caught) => {
        if (!isAbortError(caught)) setError({ viewKey: key, message: errorMessage(caught) })
      })
    return () => controller.abort()
  }, [selectedAccountId, typeFilter, statusFilter, debouncedSearch, dataVersion, reloadKey])

  async function loadMore() {
    if (!current || !current.nextCursor || !selectedAccountId || loadingMore) return
    const { viewKey: key, nextCursor } = current
    setLoadingMore(true)
    setLoadMoreError(null)
    try {
      const page = await listTransactions(selectedAccountId, {
        ...historyQuery(typeFilter, statusFilter, debouncedSearch),
        cursor: nextCursor,
      })
      // Only extend the view this page was requested for; if the user changed
      // filters meanwhile, the response is simply dropped.
      setView((latest) =>
        latest && latest.viewKey === key && latest.nextCursor === nextCursor
          ? { ...latest, transactions: appendPage(latest.transactions, page.items), nextCursor: page.next_cursor, totalCount: page.total_count }
          : latest,
      )
    } catch (caught) {
      setLoadMoreError(errorMessage(caught))
    } finally {
      setLoadingMore(false)
    }
  }

  const filtersActive = typeFilter !== 'all' || statusFilter !== 'all' || search.trim() !== ''

  if (accounts !== null && accounts.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<ReceiptLongRoundedIcon />}
          title="No accounts yet"
          description="Create an account to start building a transaction history."
          action={<Button variant="contained" onClick={openCreateAccount}>Create account</Button>}
        />
      </Card>
    )
  }

  function clearFilters() {
    setTypeFilter('all')
    setStatusFilter('all')
    setSearch('')
  }

  const shown = current ?? previous
  const rows = shown?.transactions ?? null
  const remaining = current ? current.totalCount - current.transactions.length : 0

  function countLabel() {
    if (!shown) return 'Loading…'
    if (!current) return 'Updating…'
    const total = current.totalCount
    const noun = total === 1 ? 'transaction' : 'transactions'
    return remaining > 0 ? `Showing ${current.transactions.length} of ${total} ${noun}` : `${total} ${noun}`
  }

  return (
    <Box>
      <PageHeader
        eyebrow="Activity"
        title="Transaction history"
        description="Every deposit and purchase attempt, including declines, exactly as recorded by the server."
      />

      <Card sx={{ p: { xs: 2, md: 2.5 }, mb: 3 }}>
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} sx={{ alignItems: { lg: 'center' } }}>
          <TextField
            placeholder="Search merchant, category or reason"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            size="small"
            sx={{ flexGrow: 1, minWidth: { lg: 260 } }}
            slotProps={{
              htmlInput: { 'aria-label': 'Search transactions', maxLength: 80 },
              input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> },
            }}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={typeFilter}
              onChange={(_event, value: TypeFilter | null) => value && setTypeFilter(value)}
              aria-label="Filter by type"
              sx={{ '& .MuiToggleButton-root': { flex: { xs: 1, sm: 'initial' } } }}
            >
              <ToggleButton value="all">All types</ToggleButton>
              <ToggleButton value="deposit">Deposits</ToggleButton>
              <ToggleButton value="purchase">Purchases</ToggleButton>
            </ToggleButtonGroup>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={statusFilter}
              onChange={(_event, value: StatusFilter | null) => value && setStatusFilter(value)}
              aria-label="Filter by status"
              sx={{ '& .MuiToggleButton-root': { flex: { xs: 1, sm: 'initial' } } }}
            >
              <ToggleButton value="all">Any status</ToggleButton>
              <ToggleButton value="approved">Approved</ToggleButton>
              <ToggleButton value="declined">Declined</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </Stack>
      </Card>

      {loadError ? (
        <ErrorState message={loadError} onRetry={() => setReloadKey((key) => key + 1)} />
      ) : (
        <Card sx={{ position: 'relative', overflow: 'hidden' }}>
          {previous && (
            <LinearProgress aria-label="Loading transactions" sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3 }} />
          )}
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', px: { xs: 2, md: 3 }, py: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" aria-live="polite" className="tabular">
              {countLabel()}
            </Typography>
            {filtersActive && (
              <Button size="small" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </Stack>
          <Divider />

          {rows === null ? (
            <Stack spacing={1.5} sx={{ p: 3 }}>
              {[0, 1, 2, 3].map((key) => <Skeleton key={key} variant="rounded" height={48} />)}
            </Stack>
          ) : rows.length === 0 ? (
            filtersActive ? (
              <EmptyState
                icon={<SearchOffRoundedIcon />}
                title="No matching transactions"
                description="Try a different search or clear the filters."
                action={<Button variant="outlined" onClick={clearFilters}>Clear filters</Button>}
              />
            ) : (
              <EmptyState
                icon={<ReceiptLongRoundedIcon />}
                title="No transactions yet"
                description="Deposits and purchase attempts will appear here as soon as they happen."
                action={<Button variant="contained" onClick={openDeposit}>Add funds</Button>}
              />
            )
          ) : (
            <Box sx={{ opacity: previous ? 0.45 : 1, transition: 'opacity 160ms ease' }} aria-busy={Boolean(previous)}>
              {/* Desktop / tablet: table */}
              <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
                <Table aria-label="Transactions">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ pl: 3 }}>Description</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell align="right" sx={{ pr: 3 }}>Balance after</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((transaction) => (
                      <TableRow key={transaction.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                        <TableCell sx={{ pl: 3 }}>
                          <Stack direction="row" spacing={1.75} sx={{ alignItems: 'center' }}>
                            <TransactionIcon transaction={transaction} size={36} />
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="subtitle2" noWrap>{transactionTitle(transaction)}</Typography>
                              <Typography variant="caption" color="text.secondary" noWrap component="div">
                                {transaction.type === 'deposit'
                                  ? 'Contribution'
                                  : `${CATEGORY_LABELS[transaction.merchant_category!]}${transaction.decline_reason ? ` · ${DECLINE_REASON_LABELS[transaction.decline_reason]}` : ''}`}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }} className="tabular">
                          {formatDateTime(transaction.created_at)}
                        </TableCell>
                        <TableCell>
                          <StatusChip transaction={transaction} />
                        </TableCell>
                        <TableCell align="right">
                          <SignedAmount transaction={transaction} />
                        </TableCell>
                        <TableCell align="right" sx={{ pr: 3, color: 'text.secondary' }} className="tabular">
                          {formatCents(transaction.balance_after_cents)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Phone: list */}
              <Box sx={{ display: { xs: 'block', md: 'none' }, px: 2 }}>
                {rows.map((transaction, index) => (
                  <Fragment key={transaction.id}>
                    {index > 0 && <Divider />}
                    <TransactionRow transaction={transaction} />
                  </Fragment>
                ))}
              </Box>

              {current && (current.nextCursor || current.transactions.length > PAGE_SIZE) && (
                <>
                  <Divider />
                  <Stack spacing={1.5} sx={{ alignItems: 'center', px: 3, py: 2.5, bgcolor: brand.offWhite }}>
                    {current.nextCursor ? (
                      <>
                        <Button
                          variant="outlined"
                          onClick={loadMore}
                          disabled={loadingMore}
                          startIcon={loadingMore ? <CircularProgress size={16} color="inherit" /> : <ExpandMoreRoundedIcon />}
                          sx={{ bgcolor: '#FFFFFF', minWidth: 200 }}
                        >
                          {loadingMore ? 'Loading…' : `Load ${Math.min(PAGE_SIZE, remaining)} more`}
                        </Button>
                        <Typography variant="caption" color="text.secondary" className="tabular">
                          {remaining} older {remaining === 1 ? 'transaction' : 'transactions'} not shown yet
                        </Typography>
                        {loadMoreError && (
                          <Alert severity="error" sx={{ width: '100%', maxWidth: 480 }} action={<Button color="inherit" size="small" onClick={loadMore}>Retry</Button>}>
                            {loadMoreError}
                          </Alert>
                        )}
                      </>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        That’s the whole history: all {current.totalCount} transactions are shown.
                      </Typography>
                    )}
                  </Stack>
                </>
              )}
            </Box>
          )}
        </Card>
      )}
    </Box>
  )
}
