// Overview widget: the card if issued, otherwise an issuance prompt.
import AddCardRoundedIcon from '@mui/icons-material/AddCardRounded'
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import { Button, Card, CircularProgress, Skeleton, Stack, Typography } from '@mui/material'
import { useNavigate } from 'react-router'
import { useAccounts } from '../state/AccountContext'
import { useCardActions } from '../state/useCardActions'
import { brand } from '../theme/tokens'
import { CardPlaceholder, VirtualCard } from './VirtualCard'

export function CardPanel() {
  const { account, card } = useAccounts()
  const { issue, pending } = useCardActions()
  const navigate = useNavigate()

  return (
    <Card sx={{ p: { xs: 2.5, md: 3 }, height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h5" component="h2">
          Virtual card
        </Typography>
        {card && (
          <Button size="small" endIcon={<ArrowForwardRoundedIcon />} onClick={() => navigate('/card')}>
            Manage
          </Button>
        )}
      </Stack>

      <Stack sx={{ alignItems: 'center', justifyContent: 'center', flexGrow: 1 }}>
        {card === undefined || !account ? (
          <Skeleton variant="rounded" sx={{ width: '100%', maxWidth: 400, height: 'auto', aspectRatio: '1.586', borderRadius: '20px' }} />
        ) : card ? (
          <VirtualCard card={card} holderName={account.full_name} />
        ) : (
          <CardPlaceholder>
            <Stack spacing={1.25} sx={{ alignItems: 'center' }}>
              <AddCardRoundedIcon sx={{ fontSize: 32, color: brand.teal }} aria-hidden />
              <Typography variant="subtitle1">No card issued yet</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 240 }}>
                Issue a virtual demo card to start simulating purchases.
              </Typography>
              <Button
                variant="contained"
                onClick={issue}
                disabled={pending}
                startIcon={pending ? <CircularProgress size={16} color="inherit" /> : <AddCardRoundedIcon />}
              >
                {pending ? 'Issuing…' : 'Issue virtual card'}
              </Button>
            </Stack>
          </CardPlaceholder>
        )}
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
        Virtual demo card · not usable for payments
      </Typography>
    </Card>
  )
}
