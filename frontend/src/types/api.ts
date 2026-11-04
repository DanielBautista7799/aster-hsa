// TypeScript mirrors of the backend's Pydantic response models.
// All money values are integer cents.

export type TransactionType = 'deposit' | 'purchase'
export type TransactionStatus = 'approved' | 'declined'
export type DeclineReason = 'card_required' | 'card_frozen' | 'ineligible_expense' | 'insufficient_funds'
export type CardStatus = 'active' | 'frozen'
export type MerchantCategoryValue =
  | 'pharmacy'
  | 'hospital'
  | 'clinic'
  | 'dental'
  | 'vision'
  | 'restaurant'
  | 'electronics'
  | 'grocery'
  | 'clothing'

export interface Account {
  id: string
  full_name: string
  email: string
  balance_cents: number
  created_at: string
}

export interface CategorySpend {
  category: MerchantCategoryValue
  approved_cents: number
  approved_count: number
}

export interface AccountSummary {
  total_deposited_cents: number
  total_spent_cents: number
  approved_purchase_count: number
  declined_purchase_count: number
  transaction_count: number
  spending_by_category: CategorySpend[]
}

export interface AccountDetail extends Account {
  summary: AccountSummary
}

export interface Card {
  id: string
  account_id: string
  last_four: string
  status: CardStatus
  created_at: string
}

export interface Transaction {
  id: string
  account_id: string
  card_id: string | null
  type: TransactionType
  amount_cents: number
  merchant_name: string | null
  merchant_category: MerchantCategoryValue | null
  status: TransactionStatus
  decline_reason: DeclineReason | null
  balance_after_cents: number
  created_at: string
}

/** One page of history. `next_cursor` is opaque; pass it back to get older rows. */
export interface TransactionPage {
  items: Transaction[]
  next_cursor: string | null
  total_count: number
}

export interface TransactionResult {
  transaction: Transaction
  balance_cents: number
  message: string
}

export interface MerchantCategory {
  value: MerchantCategoryValue
  label: string
  eligible: boolean
  description: string
}

export interface LabAccount {
  account: Account
  card: Card
}
