import CloudOffRoundedIcon from '@mui/icons-material/CloudOffRounded'
import { Button, Card } from '@mui/material'
import { EmptyState } from './EmptyState'

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card>
      <EmptyState
        icon={<CloudOffRoundedIcon />}
        title="We couldn’t load this"
        description={message}
        action={onRetry && <Button variant="outlined" onClick={onRetry}>Try again</Button>}
      />
    </Card>
  )
}
