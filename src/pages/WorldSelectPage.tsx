import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { worldService } from '@/services/world.service'
import { notificationService } from '@/services/notification.service'
import { useAuth } from '@/hooks/useAuth'
import { Globe, Plus, ArrowRight, LogOut, Mail, Check, X, Bell } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import { LoadingScreen } from '@/components/ui/Spinner'

const WORLD_KEY = '7g_world_id'

export default function WorldSelectPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user, signOut } = useAuth()
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const { data: worlds, isLoading } = useQuery({
    queryKey: ['my-worlds'],
    queryFn: () => worldService.listMyWorlds(),
  })

  const { data: invitations, isLoading: invLoading } = useQuery({
    queryKey: ['pending-invitations'],
    queryFn: () => notificationService.listPendingInvitations(),
  })

  const createMutation = useMutation({
    mutationFn: () => worldService.createWorld(name, description),
    onSuccess: (data) => {
      toast.success('Welt erstellt!')
      qc.invalidateQueries({ queryKey: ['my-worlds'] })
      setShowCreate(false)
      selectWorld(data.id)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const respondMutation = useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) =>
      notificationService.respondToInvitation(id, accept),
    onSuccess: (_, { accept }) => {
      toast.success(accept ? 'Einladung angenommen!' : 'Einladung abgelehnt')
      qc.invalidateQueries({ queryKey: ['pending-invitations'] })
      qc.invalidateQueries({ queryKey: ['my-worlds'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const selectWorld = (worldId: string) => {
    localStorage.setItem(WORLD_KEY, worldId)
    navigate('/')
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  if (isLoading || invLoading) return <LoadingScreen />

  const pendingInvitations = invitations ?? []

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-brand-600 rounded-2xl mb-3">
            <Globe size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-100">Welt auswählen</h1>
          {user && (
            <p className="text-sm text-slate-500 mt-1">{user.email}</p>
          )}
        </div>

        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <Bell size={14} className="text-brand-400" />
              <span className="text-sm font-medium text-brand-300">
                {pendingInvitations.length} offene Einladung{pendingInvitations.length > 1 ? 'en' : ''}
              </span>
            </div>
            <div className="space-y-3">
              {pendingInvitations.map(inv => {
                const world = (inv.worlds as any)
                const inviter = (inv.profiles as any)
                return (
                  <div key={inv.id} className="card p-4 border-l-4 border-brand-500">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-900/50 border border-brand-700 flex items-center justify-center flex-shrink-0">
                        <Mail size={18} className="text-brand-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-100">
                          {world?.name ?? 'Unbekannte Welt'}
                        </p>
                        <p className="text-sm text-slate-400 mt-0.5">
                          Einladung von {inviter?.display_name ?? 'Unbekannt'} ·{' '}
                          <span className={inv.role === 'editor' ? 'text-blue-400' : 'text-slate-300'}>
                            {inv.role === 'editor' ? 'Editor' : 'Spieler'}
                          </span>
                        </p>
                        {world?.description && (
                          <p className="text-xs text-slate-500 mt-1 truncate">{world.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3 pl-13">
                      <button
                        onClick={() => respondMutation.mutate({ id: inv.id, accept: true })}
                        disabled={respondMutation.isPending}
                        className="btn-primary text-sm py-1.5">
                        <Check size={14} /> Annehmen
                      </button>
                      <button
                        onClick={() => respondMutation.mutate({ id: inv.id, accept: false })}
                        disabled={respondMutation.isPending}
                        className="btn-secondary text-sm py-1.5">
                        <X size={14} /> Ablehnen
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            {(worlds && worlds.length > 0) && (
              <div className="border-t border-surface-600 mt-5 mb-5" />
            )}
          </div>
        )}

        {/* My Worlds */}
        {worlds && worlds.length > 0 && (
          <div className="mb-5">
            {pendingInvitations.length > 0 && (
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Meine Welten</p>
            )}
            <div className="grid gap-3">
              {worlds.map(({ worlds: world, role }) => {
                const w = world as any
                return w && (
                  <button key={w.id} onClick={() => selectWorld(w.id)}
                    className="card p-4 flex items-center justify-between hover:border-brand-500 transition-colors group text-left">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-brand-900/50 border border-brand-700 flex items-center justify-center">
                        <Globe size={20} className="text-brand-400" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-100">{w.name}</div>
                        {w.description && <div className="text-sm text-slate-400">{w.description}</div>}
                        <div className="text-xs text-slate-500 mt-0.5">
                          {role === 'gm' ? '⚔️ GM' : role === 'editor' ? '✏️ Editor' : '👤 Spieler'}
                        </div>
                      </div>
                    </div>
                    <ArrowRight size={18} className="text-slate-500 group-hover:text-brand-400 transition-colors" />
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Empty state – no worlds and no invitations */}
        {(!worlds || worlds.length === 0) && pendingInvitations.length === 0 && (
          <div className="card p-6 text-center text-slate-400 text-sm mb-5">
            Noch keine Welten vorhanden. Erstelle eine oder warte auf eine Einladung!
          </div>
        )}

        <div className="space-y-3">
          <button onClick={() => setShowCreate(true)} className="btn-primary w-full justify-center">
            <Plus size={18} /> Neue Welt erstellen
          </button>
          <button onClick={handleSignOut} className="btn-ghost w-full justify-center text-red-400 hover:bg-red-900/20">
            <LogOut size={18} /> Abmelden
          </button>
        </div>
      </div>

      <Modal title="Neue Welt" open={showCreate} onClose={() => setShowCreate(false)}>
        <form onSubmit={e => { e.preventDefault(); createMutation.mutate() }} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="input"
              placeholder="z.B. DSA – Sieben Gezeichnete" required />
          </div>
          <div>
            <label className="label">Beschreibung</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              className="input resize-none h-16" placeholder="Optional…" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Abbrechen</button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary">
              {createMutation.isPending ? 'Erstellen…' : 'Erstellen'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
