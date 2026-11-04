import { Navigate, Route, Routes } from 'react-router'
import { AppShell } from './components/AppShell'
import { AccountPage } from './pages/AccountPage'
import { ActivityPage } from './pages/ActivityPage'
import { CardPage } from './pages/CardPage'
import { LabPage } from './pages/LabPage'
import { OverviewPage } from './pages/OverviewPage'

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/activity" element={<ActivityPage />} />
        <Route path="/card" element={<CardPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/lab" element={<LabPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  )
}
