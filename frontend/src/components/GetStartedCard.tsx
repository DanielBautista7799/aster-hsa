// First-time path for a new account: three steps, each driven by real data,
// shown on the Overview until all three are done.
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import { Box, Button, Card, LinearProgress, Stack, Typography } from '@mui/material'
import { useNavigate } from 'react-router'
import { useAccounts } from '../state/AccountContext'
import { useCardActions } from '../state/useCardActions'
import { brand } from '../theme/tokens'
import { useAppActions } from './AppActions'

export function GetStartedCard() {
  const { account, card } = useAccounts()
  const { openDeposit } = useAppActions()
  const { issue, pending } = useCardActions()
  const navigate = useNavigate()

  if (!account || card === undefined) return null

  const steps = [
    {
      title: 'Add funds',
      detail: 'Make a simulated contribution to your balance.',
      done: account.summary.total_deposited_cents > 0,
      action: <Button variant="contained" size="small" onClick={openDeposit}>Add funds</Button>,
    },
    {
      title: 'Issue your virtual card',
      detail: 'One demo-only debit card per account.',
      done: card !== null,
      action: (
        <Button variant="contained" size="small" onClick={issue} disabled={pending}>
          {pending ? 'Issuing…' : 'Issue card'}
        </Button>
      ),
    },
    {
      title: 'Simulate a purchase',
      detail: 'See a pharmacy approved and a restaurant declined.',
      done: account.summary.approved_purchase_count + account.summary.declined_purchase_count > 0,
      action: <Button variant="contained" size="small" onClick={() => navigate('/card#simulator')}>Simulate</Button>,
    },
  ]
  const doneCount = steps.filter((step) => step.done).length
  if (doneCount === steps.length) return null
  const currentIndex = steps.findIndex((step) => !step.done)

  return (
    <Card sx={{ p: { xs: 2.5, md: 3 }, borderColor: '#BFE6D5', background: `linear-gradient(135deg, #FFFFFF 0%, ${brand.mintSoft} 100%)` }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 2 }}>
        <Box>
          <Typography variant="h5" component="h2">Get started with your account</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {doneCount === 0 ? 'Three quick steps to see everything Aster does.' : `${doneCount} of ${steps.length} done — nearly there.`}
          </Typography>
        </Box>
        <Box sx={{ minWidth: { sm: 160 } }}>
          <LinearProgress
            variant="determinate"
            value={(doneCount / steps.length) * 100}
            aria-label={`${doneCount} of ${steps.length} steps complete`}
            sx={{ height: 8, borderRadius: 999, bgcolor: '#CFE8DC', '& .MuiLinearProgress-bar': { borderRadius: 999, bgcolor: brand.teal } }}
          />
        </Box>
      </Stack>

      <Stack spacing={1}>
        {steps.map((step, index) => {
          const current = index === currentIndex
          return (
            <Stack
              key={step.title}
              direction="row"
              spacing={1.75}
              sx={{
                alignItems: 'center',
                p: 1.5,
                borderRadius: '14px',
                bgcolor: current ? '#FFFFFF' : 'transparent',
                border: `1px solid ${current ? brand.border : 'transparent'}`,
                opacity: step.done ? 0.7 : 1,
              }}
            >
              <Box
                aria-hidden
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  flexShrink: 0,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '0.8125rem',
                  fontWeight: 800,
                  bgcolor: step.done ? brand.teal : current ? brand.navy : '#FFFFFF',
                  color: step.done || current ? '#FFFFFF' : brand.slate,
                  border: `1.5px solid ${step.done ? brand.teal : current ? brand.navy : brand.borderStrong}`,
                }}
              >
                {step.done ? <CheckRoundedIcon sx={{ fontSize: 18 }} /> : index + 1}
              </Box>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ textDecoration: step.done ? 'line-through' : 'none' }}>
                  {step.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" component="div">
                  {step.detail}
                </Typography>
              </Box>
              {current && <Box sx={{ flexShrink: 0 }}>{step.action}</Box>}
            </Stack>
          )
        })}
      </Stack>
    </Card>
  )
}
