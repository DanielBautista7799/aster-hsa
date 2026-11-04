// Date and label helpers for display.
import type { DeclineReason } from '../types/api'

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})
const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const timeFormatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })

export const formatDateTime = (iso: string) => dateTimeFormatter.format(new Date(iso))
export const formatDate = (iso: string) => dateFormatter.format(new Date(iso))
export const formatTime = (iso: string) => timeFormatter.format(new Date(iso))

export const DECLINE_REASON_LABELS: Record<DeclineReason, string> = {
  card_required: 'No card issued',
  card_frozen: 'Card frozen',
  ineligible_expense: 'Not a qualified medical expense',
  insufficient_funds: 'Insufficient funds',
}

export function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

export function greeting(now = new Date()): string {
  const hour = now.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}
