import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { worldService } from '@/services/world.service'
import { useAuth } from '@/hooks/useAuth'
import { Globe, Plus, ArrowRight, LogOut } from 'lucide-react'
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

  const selectWorld = (worldId: string) => {
    localStorage.setItem(WORLD_KEY, worldId)
    navigate('/')
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  if (isLoading) return <LoadingScreen />

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-slate-100">Welt auswählen</h1>
          {user && (
            <p className="text-sm text-slate-500 mt-1">{user.email}</p>
          )}
        </div>

        <div className="grid gap-3 mb-6">
          {worlds?.map(({ worlds: world, role }) => {
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
          {(!worlds || worlds.length === 0) && (
            <div className="card p-6 text-center text-slate-400 text-sm">
              Noch keine Welten vorhanden. Erstelle eine oder warte auf eine Einladung!
            </div>
          )}
        </div>

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
