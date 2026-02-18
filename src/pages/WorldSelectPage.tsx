import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { worldService } from '@/services/world.service'
import { Globe, Plus, Key, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import { LoadingScreen } from '@/components/ui/Spinner'

const WORLD_KEY = '7g_world_id'

export default function WorldSelectPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [inviteCode, setInviteCode] = useState('')

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

  const joinMutation = useMutation({
    mutationFn: () => worldService.useInviteCode(inviteCode),
    onSuccess: (worldId) => {
      toast.success('Erfolgreich beigetreten!')
      qc.invalidateQueries({ queryKey: ['my-worlds'] })
      setShowJoin(false)
      selectWorld(worldId)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const selectWorld = (worldId: string) => {
    localStorage.setItem(WORLD_KEY, worldId)
    navigate('/')
  }

  if (isLoading) return <LoadingScreen />

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-100">Welt auswählen</h1>
          <p className="text-slate-400 mt-1">Wähle eine Kampagnenwelt oder erstelle eine neue</p>
        </div>

        <div className="grid gap-3 mb-6">
          {worlds?.map(({ worlds: world, role }) => {
            const w = world as any
            return w && (
              <button key={w.id} onClick={() => selectWorld(w.id)}
                className="card p-4 flex items-center justify-between hover:border-brand-500 transition-colors group text-left">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-brand-900/50 border border-brand-700 flex items-center justify-center">
                    <Globe size={24} className="text-brand-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-100">{w.name}</div>
                    {w.description && <div className="text-sm text-slate-400">{w.description}</div>}
                    <div className="text-xs text-slate-500 mt-1">Rolle: {role}</div>
                  </div>
                </div>
                <ArrowRight size={18} className="text-slate-500 group-hover:text-brand-400 transition-colors" />
              </button>
            )
          })}
          {(!worlds || worlds.length === 0) && (
            <div className="card p-8 text-center text-slate-400">
              Noch keine Welten. Erstelle eine oder tritt mit einem Einladungscode bei.
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button onClick={() => setShowCreate(true)} className="btn-primary flex-1 justify-center">
            <Plus size={18} /> Neue Welt erstellen
          </button>
          <button onClick={() => setShowJoin(true)} className="btn-secondary flex-1 justify-center">
            <Key size={18} /> Mit Code beitreten
          </button>
        </div>
      </div>

      {/* Create World Modal */}
      <Modal title="Neue Welt erstellen" open={showCreate} onClose={() => setShowCreate(false)}>
        <form onSubmit={e => { e.preventDefault(); createMutation.mutate() }} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="input"
              placeholder="z.B. DSA – Sieben Gezeichnete" required />
          </div>
          <div>
            <label className="label">Beschreibung (optional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              className="input resize-none h-20" placeholder="Kurzbeschreibung der Kampagne…" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Abbrechen</button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary">
              {createMutation.isPending ? 'Erstellen…' : 'Erstellen'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Join World Modal */}
      <Modal title="Mit Einladungscode beitreten" open={showJoin} onClose={() => setShowJoin(false)}>
        <form onSubmit={e => { e.preventDefault(); joinMutation.mutate() }} className="space-y-4">
          <div>
            <label className="label">Einladungscode</label>
            <input value={inviteCode} onChange={e => setInviteCode(e.target.value)} className="input"
              placeholder="z.B. AB3F8C" required />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowJoin(false)} className="btn-secondary">Abbrechen</button>
            <button type="submit" disabled={joinMutation.isPending} className="btn-primary">
              {joinMutation.isPending ? 'Beitreten…' : 'Beitreten'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
