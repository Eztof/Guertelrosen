import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { WorldProvider } from '@/hooks/useWorld'

// Pages
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import WorldSelectPage from '@/pages/WorldSelectPage'
import ArticleListPage from '@/pages/ArticleListPage'
import ArticleViewPage from '@/pages/ArticleViewPage'
import ArticleEditPage from '@/pages/ArticleEditPage'
import SessionsPage from '@/pages/SessionsPage'
import SessionDetailPage from '@/pages/SessionDetailPage'
import MapsPage from '@/pages/MapsPage'
import MapDetailPage from '@/pages/MapDetailPage'
import CollectionsPage from '@/pages/CollectionsPage'
import MembersPage from '@/pages/MembersPage'
import SearchPage from '@/pages/SearchPage'
import ProfilePage from '@/pages/ProfilePage'
import GmPanelPage from '@/pages/GmPanelPage'
import InboxPage from '@/pages/InboxPage'

// Layout
import AppLayout from '@/components/layout/AppLayout'

const WORLD_KEY = '7g_world_id'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen text-slate-400">Laden…</div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function WorldRoutes() {
  const worldId = localStorage.getItem(WORLD_KEY) || ''
  if (!worldId) return <Navigate to="/worlds" replace />

  return (
    <WorldProvider worldId={worldId}>
      <AppLayout worldId={worldId}>
        <Routes>
          <Route path="/" element={<DashboardPage worldId={worldId} />} />
          <Route path="/articles" element={<ArticleListPage worldId={worldId} />} />
          <Route path="/articles/new" element={<ArticleEditPage worldId={worldId} />} />
          <Route path="/articles/:slug/edit" element={<ArticleEditPage worldId={worldId} />} />
          <Route path="/articles/:slug" element={<ArticleViewPage worldId={worldId} />} />
          <Route path="/collections" element={<CollectionsPage worldId={worldId} />} />
          <Route path="/sessions" element={<SessionsPage worldId={worldId} />} />
          <Route path="/sessions/new" element={<SessionDetailPage worldId={worldId} isNew />} />
          <Route path="/sessions/:id" element={<SessionDetailPage worldId={worldId} />} />
          <Route path="/maps" element={<MapsPage worldId={worldId} />} />
          <Route path="/maps/:id" element={<MapDetailPage worldId={worldId} />} />
          <Route path="/members" element={<MembersPage worldId={worldId} />} />
          <Route path="/search" element={<SearchPage worldId={worldId} />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/gm" element={<GmPanelPage worldId={worldId} />} />
          <Route path="/inbox" element={<InboxPage />} />
        </Routes>
      </AppLayout>
    </WorldProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/worlds" element={<RequireAuth><WorldSelectPage /></RequireAuth>} />
          <Route path="/*" element={<RequireAuth><WorldRoutes /></RequireAuth>} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}
