// Small typed functions, one per backend endpoint.
import type {
  Account,
  AccountDetail,
  Card,
  CardStatus,
  LabAccount,
  MerchantCategory,
  MerchantCategoryValue,
  TransactionPage,
  TransactionResult,
  TransactionStatus,
  TransactionType,
} from '../types/api'
import { request } from './client'

const json = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) })

export const listAccounts = (signal?: AbortSignal) => request<Account[]>('/accounts', { signal })

export const createAccount = (fullName: string, email: string) =>
  request<Account>('/accounts', json({ full_name: fullName, email }))

export const getAccount = (accountId: string, signal?: AbortSignal) =>
  request<AccountDetail>(`/accounts/${accountId}`, { signal })

export const depositFunds = (accountId: string, amountCents: number) =>
  request<TransactionResult>(`/accounts/${accountId}/deposits`, json({ amount_cents: amountCents }))

/** Returns the account's card, or null when no card has been issued yet. */
export const getCard = (accountId: string, signal?: AbortSignal) =>
  request<Card | null>(`/accounts/${accountId}/cards`, { signal })

export const issueCard = (accountId: string) =>
  request<Card>(`/accounts/${accountId}/cards`, { method: 'POST' })

export const setCardStatus = (accountId: string, status: CardStatus) =>
  request<Card>(`/accounts/${accountId}/cards`, { method: 'PATCH', body: JSON.stringify({ status }) })

export interface PurchaseInput {
  merchantName: string
  merchantCategory: MerchantCategoryValue
  amountCents: number
}

export const simulatePurchase = (accountId: string, purchase: PurchaseInput) =>
  request<TransactionResult>(
    `/accounts/${accountId}/purchases`,
    json({
      merchant_name: purchase.merchantName,
      merchant_category: purchase.merchantCategory,
      amount_cents: purchase.amountCents,
    }),
  )

export interface TransactionQuery {
  type?: TransactionType
  status?: TransactionStatus
  /** Case-insensitive search on merchant, category, decline reason or type. */
  q?: string
  /** Page size (server default 50, maximum 200). */
  limit?: number
  /** `next_cursor` from the previous page; omit for the first page. */
  cursor?: string
}

/** One page of history, newest first. Filters must be repeated on every page. */
export function listTransactions(accountId: string, query: TransactionQuery = {}, signal?: AbortSignal) {
  const params = new URLSearchParams()
  if (query.type) params.set('type', query.type)
  if (query.status) params.set('status', query.status)
  if (query.q) params.set('q', query.q)
  if (query.limit) params.set('limit', String(query.limit))
  if (query.cursor) params.set('cursor', query.cursor)
  return request<TransactionPage>(`/accounts/${accountId}/transactions?${params}`, { signal })
}

export const listMerchantCategories = (signal?: AbortSignal) =>
  request<MerchantCategory[]>('/merchant-categories', { signal })

export const createLabAccount = (startingBalanceCents: number) =>
  request<LabAccount>('/lab/accounts', json({ starting_balance_cents: startingBalanceCents }))
