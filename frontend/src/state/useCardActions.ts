// Issue / freeze / unfreeze the selected account's card, then refetch.
import { useState } from 'react'
import { issueCard, setCardStatus } from '../api/aster'
import { errorMessage } from '../api/client'
import { useToast } from '../components/ToastProvider'
import { useAccounts } from './AccountContext'

export function useCardActions() {
  const { selectedAccountId, card, refresh } = useAccounts()
  const showToast = useToast()
  const [pending, setPending] = useState(false)

  async function issue() {
    if (!selectedAccountId || pending) return
    setPending(true)
    try {
      const issued = await issueCard(selectedAccountId)
      await refresh()
      showToast(`Virtual card ending in ${issued.last_four} is ready to use.`)
    } catch (error) {
      showToast(errorMessage(error), 'error')
    } finally {
      setPending(false)
    }
  }

  async function toggleFreeze() {
    if (!selectedAccountId || !card || pending) return
    const nextStatus = card.status === 'active' ? 'frozen' : 'active'
    setPending(true)
    try {
      await setCardStatus(selectedAccountId, nextStatus)
      await refresh()
      showToast(nextStatus === 'frozen' ? 'Card frozen. New purchases will be declined.' : 'Card unfrozen and ready to use.', 'info')
    } catch (error) {
      showToast(errorMessage(error), 'error')
    } finally {
      setPending(false)
    }
  }

  return { issue, toggleFreeze, pending }
}
