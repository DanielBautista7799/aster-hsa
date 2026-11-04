// Money helpers. Amounts are integer cents everywhere; these functions convert
// between cents and the dollar strings people type and read, using string and
// integer operations only (never floating-point arithmetic on money).

export const MAX_AMOUNT_CENTS = 1_000_000 // $10,000.00, matches the backend limit

const dollarFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** 123456 -> "$1,234.56". Splits into whole dollars and cents first so the
 * formatter only ever sees an exact value. */
export function formatCents(cents: number): string {
  const negative = cents < 0
  const absolute = Math.abs(cents)
  const dollars = Math.floor(absolute / 100)
  const remainder = absolute % 100
  const wholeFormatted = dollarFormatter.format(dollars).replace(/\.00$/, '')
  return `${negative ? '-' : ''}${wholeFormatted}.${String(remainder).padStart(2, '0')}`
}

export type ParseResult = { ok: true; cents: number } | { ok: false; error: string }

// Digits (optionally with thousands commas) and an optional "." with 1-2
// decimal places, or just ".50"-style cents.
const AMOUNT_PATTERN = /^((\d{1,3}(,\d{3})*|\d+)(\.\d{1,2})?|\.\d{1,2})$/

/** Parse what a user typed ("12.34", "$1,200", "5.5") into integer cents. */
export function parseDollarsToCents(input: string): ParseResult {
  const text = input.trim().replace(/^\$/, '').trim()
  if (text === '') return { ok: false, error: 'Enter an amount.' }
  if (text.startsWith('-')) return { ok: false, error: 'Amount must be greater than $0.00.' }
  if (/\.\d{3,}$/.test(text)) return { ok: false, error: 'Use at most two decimal places (whole cents).' }
  if (!AMOUNT_PATTERN.test(text)) return { ok: false, error: 'Enter a dollar amount like 25 or 25.50.' }

  const [wholePart, fractionPart = ''] = text.replace(/,/g, '').split('.')
  if (wholePart.length > 9) return { ok: false, error: `Maximum amount is ${formatCents(MAX_AMOUNT_CENTS)}.` }
  const cents = Number(wholePart || '0') * 100 + Number(fractionPart.padEnd(2, '0'))

  if (cents <= 0) return { ok: false, error: 'Amount must be greater than $0.00.' }
  if (cents > MAX_AMOUNT_CENTS) return { ok: false, error: `Maximum amount is ${formatCents(MAX_AMOUNT_CENTS)}.` }
  return { ok: true, cents }
}
