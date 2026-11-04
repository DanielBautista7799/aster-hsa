// Small toast (snackbar) system: call `useToast()(message, severity)` anywhere.
import { Alert, Snackbar, type AlertColor } from '@mui/material'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type ShowToast = (message: string, severity?: AlertColor) => void

const ToastContext = createContext<ShowToast>(() => undefined)

interface Toast {
  id: number
  message: string
  severity: AlertColor
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null)
  const [open, setOpen] = useState(false)

  const showToast = useCallback<ShowToast>((message, severity = 'success') => {
    setToast({ id: Date.now(), message, severity })
    setOpen(true)
  }, [])

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <Snackbar
        key={toast?.id}
        open={open}
        autoHideDuration={4500}
        onClose={(_event, reason) => reason !== 'clickaway' && setOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ bottom: { xs: 88, md: 24 } }}
      >
        <Alert
          onClose={() => setOpen(false)}
          severity={toast?.severity ?? 'success'}
          variant="filled"
          sx={{ minWidth: { sm: 360 }, boxShadow: '0 12px 32px rgba(11,30,48,0.22)', fontWeight: 600 }}
        >
          {toast?.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
