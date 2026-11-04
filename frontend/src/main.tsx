import '@fontsource-variable/manrope'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { App } from './App'
import { AppActionsProvider } from './components/AppActions'
import { ToastProvider } from './components/ToastProvider'
import { AccountProvider } from './state/AccountContext'
import { theme } from './theme/theme'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <ToastProvider>
          <AccountProvider>
            <AppActionsProvider>
              <App />
            </AppActionsProvider>
          </AccountProvider>
        </ToastProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
