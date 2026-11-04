import { describe, expect, it } from 'vitest'
import { formatCents, parseDollarsToCents } from './money'

describe('formatCents', () => {
  it.each([
    [0, '$0.00'],
    [1, '$0.01'],
    [99, '$0.99'],
    [100, '$1.00'],
    [123456, '$1,234.56'],
    [1000000, '$10,000.00'],
    [-2500, '-$25.00'],
  ])('formats %i as %s', (cents, expected) => {
    expect(formatCents(cents)).toBe(expected)
  })
})

describe('parseDollarsToCents', () => {
  it.each([
    ['12.34', 1234],
    ['12.3', 1230],
    ['12', 1200],
    ['0.01', 1],
    ['$50', 5000],
    [' 7.5 ', 750],
    ['1,200.50', 120050],
    ['10000', 1000000],
    ['.5', 50],
    ['.05', 5],
    // Values that are inexact in binary floating point still convert exactly.
    ['0.29', 29],
    ['1.15', 115],
    ['4.35', 435],
  ])('parses %s as %i cents', (input, cents) => {
    expect(parseDollarsToCents(input)).toEqual({ ok: true, cents })
  })

  it.each([
    ['', 'Enter an amount.'],
    ['   ', 'Enter an amount.'],
    ['0', 'Amount must be greater than $0.00.'],
    ['0.00', 'Amount must be greater than $0.00.'],
    ['-5', 'Amount must be greater than $0.00.'],
    ['1.234', 'Use at most two decimal places (whole cents).'],
    ['1e3', 'Enter a dollar amount like 25 or 25.50.'],
    ['abc', 'Enter a dollar amount like 25 or 25.50.'],
    ['NaN', 'Enter a dollar amount like 25 or 25.50.'],
    ['12.', 'Enter a dollar amount like 25 or 25.50.'],
    ['.', 'Enter a dollar amount like 25 or 25.50.'],
    ['$', 'Enter an amount.'],
    ['1,00', 'Enter a dollar amount like 25 or 25.50.'],
    ['10000.01', 'Maximum amount is $10,000.00.'],
    ['99999999999999999999', 'Maximum amount is $10,000.00.'],
  ])('rejects %j', (input, error) => {
    expect(parseDollarsToCents(input)).toEqual({ ok: false, error })
  })
})
