// Concurrency Lab: fires several purchases at an isolated sandbox account at
// the same moment, then shows exactly what the server decided. Nothing here is
// hard-coded: every status and balance comes from real API responses.
import BlockRoundedIcon from '@mui/icons-material/BlockRounded'
import BoltRoundedIcon from '@mui/icons-material/BoltRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded'
import ScienceRoundedIcon from '@mui/icons-material/ScienceRounded'
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded'
import { Alert, Box, Button, Card, CircularProgress, Divider, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { Fragment, useState } from 'react'
import { createLabAccount, getAccount, listTransactions, simulatePurchase } from '../api/aster'
import { errorMessage } from '../api/client'
import { PageHeader } from '../components/PageHeader'
import { TransactionRow } from '../components/TransactionRow'
import { DECLINE_REASON_LABELS } from '../lib/format'
import { formatCents } from '../lib/money'
import { brand } from '../theme/tokens'
import type { AccountDetail, LabAccount, Transaction } from '../types/api'

const STARTING_BALANCE_CENTS = 10_000

const SCENARIOS = {
  pair: { label: '$80 + $50', description: 'The assignment’s example: two charges that cannot both fit in $100.', amounts: [8_000, 5_000] },
  burst: { label: '20 × $10', description: 'Twenty $10 charges at once. Exactly ten can be approved.', amounts: Array<number>(20).fill(1_000) },
} as const

type ScenarioKey = keyof typeof SCENARIOS

interface RequestState {
  index: number
  amountCents: number
  status: 'pending' | 'approved' | 'declined' | 'error'
  detail?: string
  arrivedOrder?: number
}

interface RunResult {
  lab: LabAccount
  finalAccount: AccountDetail
  serverOrder: Transaction[]
}

const DEBIT_SQL = `UPDATE accounts
   SET balance_cents = balance_cents - :amount
 WHERE id = :account_id
   AND balance_cents >= :amount
RETURNING balance_cents;`

export function LabPage() {
  const [scenario, setScenario] = useState<ScenarioKey>('pair')
  const [running, setRunning] = useState(false)
  const [phase, setPhase] = useState<string | null>(null)
  const [requests, setRequests] = useState<RequestState[]>([])
  const [result, setResult] = useState<RunResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function runExperiment() {
    setRunning(true)
    setError(null)
    setResult(null)
    const amounts = SCENARIOS[scenario].amounts
    setRequests(amounts.map((amountCents, index) => ({ index, amountCents, status: 'pending' })))

    try {
      setPhase('Creating an isolated sandbox account with $100.00 and a card…')
      const lab = await createLabAccount(STARTING_BALANCE_CENTS)

      setPhase(`Sending ${amounts.length} purchases at the same moment…`)
      let arrived = 0
      // All requests are started before any is awaited, so they are in flight together.
      const inFlight = amounts.map((amountCents, index) =>
        simulatePurchase(lab.account.id, { merchantName: 'Lab Pharmacy', merchantCategory: 'pharmacy', amountCents })
          .then((response) => {
            arrived += 1
            const { status, decline_reason } = response.transaction
            const update: RequestState = {
              index,
              amountCents,
              status,
              detail: status === 'approved' ? `Balance after: ${formatCents(response.balance_cents)}` : DECLINE_REASON_LABELS[decline_reason!],
              arrivedOrder: arrived,
            }
            setRequests((current) => current.map((item) => (item.index === index ? update : item)))
          })
          .catch((caught) => {
            setRequests((current) => current.map((item) => (item.index === index ? { ...item, status: 'error', detail: errorMessage(caught) } : item)))
          }),
      )
      await Promise.all(inFlight)

      setPhase('Reading the final balance and history back from the server…')
      const [finalAccount, history] = await Promise.all([
        getAccount(lab.account.id),
        listTransactions(lab.account.id, { type: 'purchase', limit: 100 }),
      ])
      setResult({ lab, finalAccount, serverOrder: [...history.items].reverse() })
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setPhase(null)
      setRunning(false)
    }
  }

  const approved = requests.filter((item) => item.status === 'approved')
  const declinedCount = requests.filter((item) => item.status === 'declined').length
  const errorCount = requests.filter((item) => item.status === 'error').length
  const approvedCents = approved.reduce((sum, item) => sum + item.amountCents, 0)
  const balanceMatches = result !== null && STARTING_BALANCE_CENTS - approvedCents === result.finalAccount.balance_cents
  const verdictOk = balanceMatches && errorCount === 0

  return (
    <Box>
      <PageHeader
        eyebrow="Concurrency Lab"
        title="Can two charges overspend $100?"
        description="Fire simultaneous purchases at a fresh, isolated sandbox account and watch PostgreSQL decide. Your real accounts are never touched."
      />

      {/* Grid areas: on phones the results sit right under the Run button. */}
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          alignItems: 'start',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 5fr) minmax(0, 7fr)' },
          gridTemplateAreas: { xs: '"experiment" "results" "why"', lg: '"experiment results" "why results"' },
        }}
      >
            <Card sx={{ p: { xs: 2.5, md: 3 }, gridArea: 'experiment' }}>
              <Typography variant="h5" component="h2">Experiment</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2.5 }}>
                Each run creates a new sandbox account with {formatCents(STARTING_BALANCE_CENTS)} and an active card.
              </Typography>
              <ToggleButtonGroup
                exclusive
                fullWidth
                value={scenario}
                onChange={(_event, value: ScenarioKey | null) => value && setScenario(value)}
                disabled={running}
                aria-label="Scenario"
              >
                {(Object.keys(SCENARIOS) as ScenarioKey[]).map((key) => (
                  <ToggleButton key={key} value={key} className="tabular">
                    {SCENARIOS[key].label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, minHeight: 44 }}>
                {SCENARIOS[scenario].description}
              </Typography>
              <Button
                size="large"
                variant="contained"
                fullWidth
                onClick={runExperiment}
                disabled={running}
                startIcon={running ? <CircularProgress size={18} color="inherit" /> : <BoltRoundedIcon />}
                sx={{ mt: 2 }}
              >
                {running ? 'Running…' : 'Run simultaneous purchases'}
              </Button>
              {phase && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }} aria-live="polite">
                  {phase}
                </Typography>
              )}
              {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            </Card>

            <Card sx={{ p: { xs: 2.5, md: 3 }, gridArea: 'why' }}>
              <Typography variant="h5" component="h2">Why only valid charges win</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Each purchase debits with one conditional SQL statement inside a database transaction:
              </Typography>
              <Box
                component="pre"
                className="tabular"
                sx={{ mt: 2, mb: 2, p: 2, borderRadius: '14px', bgcolor: brand.midnight, color: brand.mint, fontSize: '0.8125rem', lineHeight: 1.6, overflowX: 'auto', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' }}
              >
                {DEBIT_SQL}
              </Box>
              <Stack spacing={1.25}>
                {[
                  'Each purchase first locks its account row, so a competing purchase waits its turn.',
                  'When its turn comes, the UPDATE checks balance_cents >= amount against the latest balance.',
                  'If the check fails, zero rows change and the purchase is recorded as declined.',
                  'A CHECK (balance_cents >= 0) constraint makes a negative balance impossible.',
                ].map((line, index) => (
                  <Stack key={line} direction="row" spacing={1.25}>
                    <Box sx={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%', bgcolor: brand.mint, color: brand.tealDark, fontSize: '0.75rem', fontWeight: 800, display: 'grid', placeItems: 'center' }}>
                      {index + 1}
                    </Box>
                    <Typography variant="body2">{renderCode(line)}</Typography>
                  </Stack>
                ))}
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                Browsers open a limited number of connections per site, so large bursts may arrive in a few
                waves. The automated test suite also races requests on separate database connections released
                by a barrier at the same instant.
              </Typography>
            </Card>

          <Card sx={{ p: { xs: 2.5, md: 3 }, gridArea: 'results' }}>
            <Typography variant="h5" component="h2">Results</Typography>
            {requests.length === 0 ? (
              <Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center', py: 8 }}>
                <Box sx={{ width: 64, height: 64, borderRadius: '20px', bgcolor: brand.mint, color: brand.teal, display: 'grid', placeItems: 'center' }}>
                  <ScienceRoundedIcon sx={{ fontSize: 30 }} />
                </Box>
                <Typography variant="subtitle1">Run an experiment to see live results</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360 }}>
                  You’ll see each request’s real response and the final balance read back from the database.
                </Typography>
              </Stack>
            ) : (
              <>
                <Box
                  sx={{
                    mt: 2,
                    display: 'grid',
                    gap: 1,
                    gridTemplateColumns: requests.length > 2 ? { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)', md: 'repeat(5, 1fr)' } : '1fr 1fr',
                  }}
                >
                  {requests.map((item) => (
                    <RequestTile key={item.index} request={item} large={requests.length <= 2} />
                  ))}
                </Box>

                {result && (
                  <Box
                    sx={{ mt: 3, p: 2.5, borderRadius: '16px', bgcolor: verdictOk ? brand.mintSoft : brand.cautionSoft, border: `1px solid ${verdictOk ? '#BFE6D5' : '#F0D3A8'}` }}
                    role="status"
                  >
                    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                      {verdictOk ? <VerifiedRoundedIcon sx={{ color: brand.teal }} /> : <ErrorOutlineRoundedIcon sx={{ color: brand.caution }} />}
                      <Typography variant="subtitle1" sx={{ color: verdictOk ? brand.tealDark : brand.caution }}>
                        {approved.length} approved · {declinedCount} declined{errorCount > 0 ? ` · ${errorCount} failed` : ''} · final balance{' '}
                        <span className="tabular">{formatCents(result.finalAccount.balance_cents)}</span>
                      </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ mt: 1 }} className="tabular">
                      {formatCents(STARTING_BALANCE_CENTS)} start − {formatCents(approvedCents)} approved ={' '}
                      {formatCents(STARTING_BALANCE_CENTS - approvedCents)}
                      {balanceMatches
                        ? ' — matches the balance stored in PostgreSQL.'
                        : ' — does NOT match the stored balance.'}
                    </Typography>
                    {errorCount > 0 && (
                      <Typography variant="body2" sx={{ mt: 0.5, color: brand.caution }}>
                        {errorCount} request{errorCount === 1 ? '' : 's'} failed before getting an answer (not a decline). Check that the API is running.
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      Sandbox: {result.lab.account.full_name} (hidden from your account list)
                    </Typography>
                  </Box>
                )}

                {result && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle1">Order the server committed them</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Read back from the sandbox’s transaction history, oldest first, with the balance after each.
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      {result.serverOrder.map((transaction, index) => (
                        <Fragment key={transaction.id}>
                          {index > 0 && <Divider />}
                          <TransactionRow transaction={transaction} showBalance />
                        </Fragment>
                      ))}
                    </Box>
                  </Box>
                )}
              </>
            )}
          </Card>
      </Box>
    </Box>
  )
}

/** Show SQL fragments like `balance_cents >= amount` in a monospace font. */
function renderCode(line: string) {
  return line.split(/(balance_cents >= amount|balance_cents >= 0)/).map((part, index) =>
    index % 2 === 1 ? (
      <Box key={index} component="code" sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '0.8125rem', px: 0.5, py: 0.1, borderRadius: '6px', bgcolor: brand.mintSoft, color: brand.tealDark }}>
        {part}
      </Box>
    ) : (
      part
    ),
  )
}

function RequestTile({ request, large }: { request: RequestState; large: boolean }) {
  const tones = {
    pending: { bg: '#FFFFFF', fg: brand.slate, icon: <CircularProgress size={18} color="inherit" />, label: 'In flight' },
    approved: { bg: brand.mint, fg: brand.tealDark, icon: <CheckCircleRoundedIcon fontSize="small" />, label: 'Approved' },
    declined: { bg: brand.declineSoft, fg: brand.decline, icon: <BlockRoundedIcon fontSize="small" />, label: 'Declined' },
    error: { bg: brand.cautionSoft, fg: brand.caution, icon: <ErrorOutlineRoundedIcon fontSize="small" />, label: 'Error' },
  }
  const tone = tones[request.status]
  return (
    <Box
      sx={{
        p: large ? 2.25 : 1.25,
        borderRadius: '14px',
        bgcolor: tone.bg,
        border: `1px solid ${request.status === 'pending' ? brand.border : 'transparent'}`,
        color: tone.fg,
        transition: 'background-color 200ms ease',
      }}
    >
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
        {tone.icon}
        <Typography variant={large ? 'subtitle2' : 'caption'} sx={{ fontWeight: 750 }}>
          {tone.label}
        </Typography>
      </Stack>
      <Typography className="tabular" sx={{ mt: 0.75, fontWeight: 750, fontSize: large ? '1.75rem' : '1rem', color: 'text.primary', letterSpacing: '-0.02em' }}>
        {formatCents(request.amountCents)}
      </Typography>
      {large && (
        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', minHeight: 18 }}>
          {request.detail ?? `Request ${request.index + 1}`}
          {request.arrivedOrder ? ` · response #${request.arrivedOrder}` : ''}
        </Typography>
      )}
    </Box>
  )
}
