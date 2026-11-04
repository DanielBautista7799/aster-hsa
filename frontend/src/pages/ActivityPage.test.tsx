// Component test for the Activity page against a fake API: first page,
// "Load more", server-side search and filters, and a failed page load.
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BrowserRouter } from 'react-router'
import { AppActionsProvider } from '../components/AppActions'
import { ToastProvider } from '../components/ToastProvider'
import { AccountProvider } from '../state/AccountContext'
import type { Transaction, TransactionPage } from '../types/api'
import { ActivityPage, PAGE_SIZE } from './ActivityPage'

const ACCOUNT_ID = '11111111-1111-4111-8111-111111111111'
const account = { id: ACCOUNT_ID, full_name: 'Pat Pager', email: 'pat@example.com', balance_cents: 100, created_at: '2026-11-01T10:00:00Z' }
const detail = {
  ...account,
  summary: { total_deposited_cents: 0, total_spent_cents: 0, approved_purchase_count: 0, declined_purchase_count: 0, transaction_count: 0, spending_by_category: [] },
}

/** 60 rows, newest first: 50 deposits and 10 declined restaurant purchases. */
const ALL_ROWS: Transaction[] = Array.from({ length: 60 }, (_, index) => {
  const isPurchase = index % 6 === 5
  return {
    id: `row-${index}`,
    account_id: ACCOUNT_ID,
    card_id: null,
    type: isPurchase ? 'purchase' : 'deposit',
    amount_cents: (60 - index) * 100,
    merchant_name: isPurchase ? `Blue Fern Bistro ${index}` : null,
    merchant_category: isPurchase ? 'restaurant' : null,
    status: isPurchase ? 'declined' : 'approved',
    decline_reason: isPurchase ? 'ineligible_expense' : null,
    balance_after_cents: 100,
    created_at: new Date(Date.UTC(2026, 10, 1, 12, 0, 60 - index)).toISOString(),
  }
})

/** A tiny in-memory version of the history endpoint. The cursor is just the
 * offset of the next row, which is fine here because the data never changes. */
function fakeHistory(url: URL): TransactionPage {
  const q = url.searchParams.get('q')?.toLowerCase()
  const type = url.searchParams.get('type')
  const status = url.searchParams.get('status')
  const limit = Number(url.searchParams.get('limit') ?? 50)
  const start = Number(url.searchParams.get('cursor') ?? 0)
  const matching = ALL_ROWS.filter(
    (row) =>
      (!type || row.type === type) &&
      (!status || row.status === status) &&
      (!q || `${row.merchant_name ?? ''} ${row.merchant_category ?? ''} ${row.type}`.toLowerCase().includes(q)),
  )
  const items = matching.slice(start, start + limit)
  const nextIndex = start + limit
  return { items, next_cursor: nextIndex < matching.length ? String(nextIndex) : null, total_count: matching.length }
}

const requests: URL[] = []
let failNextPage = false

function installFakeApi() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), 'http://localhost')
      requests.push(url)
      const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
      if (url.pathname === '/api/merchant-categories') return json([])
      if (url.pathname === '/api/accounts') return json([account])
      if (url.pathname === `/api/accounts/${ACCOUNT_ID}`) return json(detail)
      if (url.pathname === `/api/accounts/${ACCOUNT_ID}/cards`) return json(null)
      if (url.pathname === `/api/accounts/${ACCOUNT_ID}/transactions`) {
        if (failNextPage && url.searchParams.has('cursor')) {
          failNextPage = false
          return json({ detail: 'Simulated outage' }, 500)
        }
        return json(fakeHistory(url))
      }
      return json({ detail: `Unexpected request: ${url.pathname}` }, 404)
    }),
  )
}

function renderPage() {
  return render(
    <BrowserRouter>
      <ToastProvider>
        <AccountProvider>
          <AppActionsProvider>
            <ActivityPage />
          </AppActionsProvider>
        </AccountProvider>
      </ToastProvider>
    </BrowserRouter>,
  )
}

const tableRows = () => within(screen.getByRole('table', { name: 'Transactions' })).getAllByRole('row').slice(1) // minus header
const historyRequests = () => requests.filter((url) => url.pathname.endsWith('/transactions'))

beforeEach(() => {
  requests.length = 0
  failNextPage = false
  window.localStorage.clear()
  installFakeApi()
})
afterEach(() => {
  cleanup() // vitest runs without globals, so RTL's automatic unmount doesn't
  vi.unstubAllGlobals()
})

describe('ActivityPage pagination', () => {
  it('shows the first page with an honest count and a Load more button', async () => {
    renderPage()
    expect(await screen.findByText(`Showing ${PAGE_SIZE} of 60 transactions`)).toBeTruthy()
    expect(tableRows()).toHaveLength(PAGE_SIZE)
    expect(screen.getByRole('button', { name: `Load ${PAGE_SIZE} more` })).toBeTruthy()
    expect(screen.getByText('35 older transactions not shown yet')).toBeTruthy()
    expect(historyRequests()[0].searchParams.get('limit')).toBe(String(PAGE_SIZE))
    expect(historyRequests()[0].searchParams.has('cursor')).toBe(false)
  })

  it('appends older rows on Load more until everything is shown', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: `Load ${PAGE_SIZE} more` }))

    expect(await screen.findByText('Showing 50 of 60 transactions')).toBeTruthy()
    expect(tableRows()).toHaveLength(50)
    const secondPage = historyRequests().at(-1)!
    expect(secondPage.searchParams.get('cursor')).toBe('25') // the cursor from page one was sent back

    await user.click(screen.getByRole('button', { name: 'Load 10 more' }))
    expect(await screen.findByText('60 transactions')).toBeTruthy()
    expect(tableRows()).toHaveLength(60)
    expect(screen.queryByRole('button', { name: /Load \d+ more/ })).toBeNull()
    expect(screen.getByText(/That’s the whole history/)).toBeTruthy()
    // Every row exactly once, newest first.
    expect(new Set(tableRows().map((row) => row.textContent)).size).toBe(60)
  })

  it('searches on the server and resets to the first page', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: `Load ${PAGE_SIZE} more` }))
    await screen.findByText('Showing 50 of 60 transactions')

    await user.type(screen.getByLabelText('Search transactions'), 'bistro')
    expect(await screen.findByText('10 transactions')).toBeTruthy()
    expect(tableRows()).toHaveLength(10)
    const searchRequest = historyRequests().at(-1)!
    expect(searchRequest.searchParams.get('q')).toBe('bistro')
    expect(searchRequest.searchParams.has('cursor')).toBe(false) // a new search starts from page one

    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(await screen.findByText(`Showing ${PAGE_SIZE} of 60 transactions`)).toBeTruthy()
  })

  it('combines a status filter with paging', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText(`Showing ${PAGE_SIZE} of 60 transactions`)

    await user.click(screen.getByRole('button', { name: 'Approved' }))
    expect(await screen.findByText(`Showing ${PAGE_SIZE} of 50 transactions`)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: `Load ${PAGE_SIZE} more` }))
    expect(await screen.findByText('50 transactions')).toBeTruthy()
    const lastRequest = historyRequests().at(-1)!
    expect(lastRequest.searchParams.get('status')).toBe('approved')
    expect(lastRequest.searchParams.get('cursor')).toBe('25')
    expect(tableRows().every((row) => within(row).queryByText('Approved'))).toBe(true)
  })

  it('keeps loaded rows and offers a retry when a later page fails', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText(`Showing ${PAGE_SIZE} of 60 transactions`)

    failNextPage = true
    await user.click(screen.getByRole('button', { name: `Load ${PAGE_SIZE} more` }))
    expect(await screen.findByText('Simulated outage')).toBeTruthy()
    expect(tableRows()).toHaveLength(PAGE_SIZE) // nothing was lost

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('Showing 50 of 60 transactions')).toBeTruthy()
  })

  it('shows an empty state with a shortcut to clear a search that matches nothing', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText(`Showing ${PAGE_SIZE} of 60 transactions`)
    await user.type(screen.getByLabelText('Search transactions'), 'zzz')
    expect(await screen.findByText('No matching transactions')).toBeTruthy()
    await waitFor(() => expect(screen.queryByRole('table')).toBeNull())
  })
})
