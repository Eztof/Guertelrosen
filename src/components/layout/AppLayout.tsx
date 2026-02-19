import { useState, ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  BookOpen, Map, Calendar, Users, FolderOpen, Search,
  LogOut, User, ChevronLeft, Menu, Globe, Shield,
  Home, Plus, Bell, Inbox
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useWorld } from '@/hooks/useWorld'
import { useQuery } from '@tanstack/react-query'
import { worldService } from '@/services/world.service'
import { collectionService } from '@/services/collection.service'
import { notificationService } from '@/services/notification.service'

const WORLD_KEY = '7g_world_id'

interface NavItem {
  to: string
  icon: React.ReactNode
  label: string
}

function useNavItems(isGm: boolean): NavItem[] {
  const base: NavItem[] = [
    { to: '/', icon: <Home size={18} />, label: 'Dashboard' },
    { to: '/articles', icon: <BookOpen size={18} />, label: 'Artikel' },
    { to: '/collections', icon: <FolderOpen size={18} />, label: 'Sammlungen' },
    { to: '/sessions', icon: <Calendar size={18} />, label: 'Sessions' },
    { to: '/maps', icon: <Map size={18} />, label: 'Karten' },
    { to: '/members', icon: <Users size={18} />, label: 'Mitglieder' },
    { to: '/search', icon: <Search size={18} />, label: 'Suche' },
  ]
  if (isGm) {
    base.push({ to: '/gm', icon: <Shield size={18} />, label: 'GM-Panel' })
  }
  return base
}

function Sidebar({ worldId, collapsed, onToggle }: { worldId: string; collapsed: boolean; onToggle: () => void }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { isGm, canEdit } = useWorld()
  const navItems = useNavItems(isGm)

  const { data: world } = useQuery({
    queryKey: ['world', worldId],
    queryFn: () => worldService.getWorld(worldId),
  })

  const { data: collections } = useQuery({
    queryKey: ['collections', worldId],
    queryFn: () => collectionService.listCollections(worldId),
  })

  const { data: unreadCount } = useQuery({
    queryKey: ['unread-count'],
    queryFn: () => notificationService.getUnreadCount(),
    refetchInterval: 30000,
  })

  const handleSwitchWorld = () => {
    localStorage.removeItem(WORLD_KEY)
    navigate('/worlds')
  }

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  if (collapsed) {
    return (
      <div className="flex flex-col items-center w-14 bg-surface-800 border-r border-surface-600 h-full py-4 gap-2">
        <button onClick={onToggle} className="btn-ghost p-2 rounded-lg">
          <Menu size={18} />
        </button>
        {navItems.map(item => (
          <Link key={item.to} to={item.to}
            className={`p-2 rounded-lg transition-colors ${isActive(item.to) ? 'bg-brand-600 text-white' : 'text-slate-400 hover:bg-surface-700 hover:text-slate-200'}`}
            title={item.label}>
            {item.icon}
          </Link>
        ))}
        <Link to="/inbox"
          className={`relative p-2 rounded-lg transition-colors ${isActive('/inbox') ? 'bg-brand-600 text-white' : 'text-slate-400 hover:bg-surface-700 hover:text-slate-200'}`}
          title="Posteingang">
          <Bell size={18} />
          {(unreadCount ?? 0) > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold">
              {unreadCount}
            </span>
          )}
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-64 bg-surface-800 border-r border-surface-600 h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-600">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
            <Globe size={16} className="text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-100 truncate">{world?.name ?? '…'}</div>
            {isGm && <div className="text-xs text-amber-400 flex items-center gap-1"><Shield size={10} /> GM</div>}
          </div>
        </div>
        <button onClick={onToggle} className="btn-ghost p-1">
          <ChevronLeft size={16} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {navItems.map(item => (
          <Link key={item.to} to={item.to}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive(item.to)
                ? 'bg-brand-600 text-white'
                : 'text-slate-400 hover:bg-surface-700 hover:text-slate-200'
            }`}>
            {item.icon}
            {item.label}
          </Link>
        ))}

        {/* Inbox with badge */}
        <Link to="/inbox"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
            isActive('/inbox')
              ? 'bg-brand-600 text-white'
              : 'text-slate-400 hover:bg-surface-700 hover:text-slate-200'
          }`}>
          <div className="relative">
            <Bell size={18} />
            {(unreadCount ?? 0) > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-500 rounded-full text-[9px] flex items-center justify-center text-white font-bold">
                {unreadCount}
              </span>
            )}
          </div>
          Posteingang
          {(unreadCount ?? 0) > 0 && (
            <span className="ml-auto badge bg-red-500 text-white text-xs">{unreadCount}</span>
          )}
        </Link>

        {collections && collections.length > 0 && (
          <div className="pt-3 mt-3 border-t border-surface-600">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider px-3 mb-2">Sammlungen</div>
            {collections.filter(c => !c.parent_id).map(col => (
              <div key={col.id}>
                <Link to={`/articles?collection=${col.id}`}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:bg-surface-700 hover:text-slate-200 transition-colors">
                  <FolderOpen size={14} />
                  {col.name}
                </Link>
                {collections.filter(c => c.parent_id === col.id).map(child => (
                  <Link key={child.id} to={`/articles?collection=${child.id}`}
                    className="flex items-center gap-2 pl-7 pr-3 py-1.5 rounded-lg text-sm text-slate-500 hover:bg-surface-700 hover:text-slate-200 transition-colors">
                    <FolderOpen size={12} />
                    {child.name}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        )}

        {canEdit && (
          <div className="pt-2">
            <Link to="/articles/new"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-surface-700 hover:text-slate-200 border border-dashed border-surface-500 transition-colors">
              <Plus size={14} />
              Neuer Artikel
            </Link>
          </div>
        )}
      </nav>

      <div className="border-t border-surface-600 p-3 space-y-1">
        <button onClick={handleSwitchWorld}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-surface-700 hover:text-slate-200 transition-colors">
          <Globe size={16} />
          Welt wechseln
        </button>
        <Link to="/profile"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-surface-700 hover:text-slate-200 transition-colors">
          <User size={16} />
          <span className="truncate">{user?.email}</span>
        </Link>
        <button onClick={signOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-900/20 transition-colors">
          <LogOut size={16} />
          Abmelden
        </button>
      </div>
    </div>
  )
}

export default function AppLayout({ worldId, children }: { worldId: string; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar worldId={worldId} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <main className="flex-1 overflow-auto bg-surface-900">
        {children}
      </main>
    </div>
  )
}
