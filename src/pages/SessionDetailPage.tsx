import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sessionService, SessionInput } from '@/services/session.service'
import { useWorld } from '@/hooks/useWorld'
import { Save, Trash2, ArrowLeft, CheckSquare, Square, Plus, X } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import { LoadingScreen } from '@/components/ui/Spinner'
import toast from 'react-hot-toast'
import type { Visibility } from '@/types'

interface Todo { text: string; done: boolean }
interface Loot { name: string; amount?: string }

export default function SessionDetailPage({ worldId, isNew = false }: { worldId: string; isNew?: boolean }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { canEdit, isGm } = useWorld()
  const qc = useQueryClient()

  const [editing, setEditing] = useState(isNew)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [recap, setRecap] = useState('')
  const [agenda, setAgenda] = useState('')
  const [hooks, setHooks] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('players')
  const [todos, setTodos] = useState<Todo[]>([])
  const [loot, setLoot] = useState<Loot[]>([])
  const [newTodo, setNewTodo] = useState('')

  const { data: session, isLoading } = useQuery({
    queryKey: ['session', id],
    queryFn: () => sessionService.getSession(id!),
    enabled: !isNew && !!id,
  })

  useEffect(() => {
    if (session) {
      setTitle(session.title)
      setDate(session.session_date ?? '')
      setRecap(session.recap ?? '')
      setAgenda(session.agenda ?? '')
      setHooks(session.hooks ?? '')
      setVisibility(session.visibility as Visibility)
      setTodos((session.todos as Todo[]) ?? [])
      setLoot((session.loot as Loot[]) ?? [])
    }
  }, [session])

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: SessionInput = {
        title, visibility, recap, agenda, hooks,
        session_date: date || null,
        todos, loot,
      }
      if (isNew) return sessionService.createSession(worldId, payload)
      return sessionService.updateSession(id!, payload)
    },
    onSuccess: (data) => {
      toast.success('Gespeichert!')
      qc.invalidateQueries({ queryKey: ['sessions', worldId] })
      setEditing(false)
      if (isNew) navigate(`/sessions/${data.id}`)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: () => sessionService.deleteSession(id!),
    onSuccess: () => {
      toast.success('Session gelöscht')
      navigate('/sessions')
    },
  })

  const toggleTodo = (i: number) => {
    setTodos(prev => prev.map((t, idx) => idx === i ? { ...t, done: !t.done } : t))
  }

  const addTodo = () => {
    if (!newTodo.trim()) return
    setTodos(prev => [...prev, { text: newTodo.trim(), done: false }])
    setNewTodo('')
  }

  if (!isNew && isLoading) return <LoadingScreen />

  return (
    <div>
      <PageHeader
        title={isNew ? 'Neue Session' : title || 'Session'}
        breadcrumbs={[{ label: 'Sessions', href: '#/sessions' }, { label: isNew ? 'Neu' : title }]}
        actions={
          <div className="flex gap-2">
            <Link to="/sessions" className="btn-ghost"><ArrowLeft size={16} /> Zurück</Link>
            {!isNew && canEdit && !editing && (
              <>
                <button onClick={() => setEditing(true)} className="btn-primary">Bearbeiten</button>
                <button onClick={() => { if (confirm('Löschen?')) deleteMutation.mutate() }}
                  className="btn-ghost text-red-400"><Trash2 size={16} /></button>
              </>
            )}
            {(editing || isNew) && (
              <>
                {!isNew && <button onClick={() => setEditing(false)} className="btn-secondary">Abbrechen</button>}
                <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="btn-primary">
                  <Save size={16} /> Speichern
                </button>
              </>
            )}
          </div>
        }
      />

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Main info */}
        <div className="card p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="label">Titel *</label>
            {editing ? (
              <input value={title} onChange={e => setTitle(e.target.value)} className="input text-lg" required />
            ) : (
              <p className="text-lg font-semibold text-slate-100">{title}</p>
            )}
          </div>
          <div>
            <label className="label">Datum</label>
            {editing ? (
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input" />
            ) : (
              <p className="text-slate-300">{date ? new Date(date).toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</p>
            )}
          </div>
          <div>
            <label className="label">Sichtbarkeit</label>
            {editing ? (
              <select value={visibility} onChange={e => setVisibility(e.target.value as Visibility)} className="input">
                <option value="players">Alle Spieler</option>
                <option value="gm">Nur GM</option>
              </select>
            ) : (
              <span className="badge bg-surface-700 text-slate-300">{visibility === 'gm' ? 'Nur GM' : 'Alle'}</span>
            )}
          </div>
        </div>

        {/* Agenda */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-slate-400 mb-3">📋 Agenda</h3>
          {editing ? (
            <textarea value={agenda} onChange={e => setAgenda(e.target.value)}
              className="input resize-none h-24" placeholder="Geplante Punkte für diese Session…" />
          ) : (
            <p className="text-slate-300 whitespace-pre-wrap">{agenda || <span className="text-slate-500 italic">Keine Agenda</span>}</p>
          )}
        </div>

        {/* Recap */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-slate-400 mb-3">📖 Recap</h3>
          {editing ? (
            <textarea value={recap} onChange={e => setRecap(e.target.value)}
              className="input resize-none h-32" placeholder="Was ist in dieser Session passiert…" />
          ) : (
            <p className="text-slate-300 whitespace-pre-wrap">{recap || <span className="text-slate-500 italic">Kein Recap</span>}</p>
          )}
        </div>

        {/* Todos */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-slate-400 mb-3">✅ ToDos</h3>
          <div className="space-y-2">
            {todos.map((todo, i) => (
              <div key={i} className="flex items-center gap-3 group">
                <button onClick={() => { toggleTodo(i) }}
                  className="flex-shrink-0 text-slate-400 hover:text-brand-400">
                  {todo.done ? <CheckSquare size={18} className="text-emerald-400" /> : <Square size={18} />}
                </button>
                <span className={`flex-1 text-sm ${todo.done ? 'line-through text-slate-500' : 'text-slate-300'}`}>
                  {todo.text}
                </span>
                {editing && (
                  <button onClick={() => setTodos(prev => prev.filter((_, idx) => idx !== i))}
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400">
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {editing && (
            <div className="flex gap-2 mt-3">
              <input value={newTodo} onChange={e => setNewTodo(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTodo()}
                className="input text-sm flex-1" placeholder="Neues ToDo…" />
              <button onClick={addTodo} className="btn-secondary"><Plus size={16} /></button>
            </div>
          )}
        </div>

        {/* Loot */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-slate-400 mb-3">💰 Loot</h3>
          {loot.length > 0 ? (
            <table className="w-full text-sm">
              <thead><tr><th className="text-left text-slate-500 font-normal pb-2">Gegenstand</th><th className="text-left text-slate-500 font-normal pb-2">Menge</th>{editing && <th />}</tr></thead>
              <tbody>
                {loot.map((l, i) => (
                  <tr key={i}>
                    <td className="text-slate-300 py-1">{l.name}</td>
                    <td className="text-slate-400 py-1">{l.amount ?? '—'}</td>
                    {editing && (
                      <td><button onClick={() => setLoot(p => p.filter((_, idx) => idx !== i))} className="text-slate-500 hover:text-red-400"><X size={14} /></button></td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-slate-500 italic text-sm">Kein Loot</p>}
          {editing && (
            <button onClick={() => setLoot(p => [...p, { name: 'Gegenstand', amount: '1' }])}
              className="btn-ghost mt-3 text-sm"><Plus size={14} /> Loot hinzufügen</button>
          )}
        </div>

        {/* Hooks */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-slate-400 mb-3">🪝 Nächste Hooks</h3>
          {editing ? (
            <textarea value={hooks} onChange={e => setHooks(e.target.value)}
              className="input resize-none h-24" placeholder="Was passiert als nächstes? Offene Fäden…" />
          ) : (
            <p className="text-slate-300 whitespace-pre-wrap">{hooks || <span className="text-slate-500 italic">Keine Hooks</span>}</p>
          )}
        </div>
      </div>
    </div>
  )
}
