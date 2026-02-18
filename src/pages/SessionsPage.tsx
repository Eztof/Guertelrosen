import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { sessionService } from '@/services/session.service'
import { useWorld } from '@/hooks/useWorld'
import { Plus, Calendar } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import { LoadingScreen } from '@/components/ui/Spinner'

export default function SessionsPage({ worldId }: { worldId: string }) {
  const { canEdit } = useWorld()
  const { data: sessions, isLoading } = useQuery({
    queryKey: ['sessions', worldId],
    queryFn: () => sessionService.listSessions(worldId),
  })

  if (isLoading) return <LoadingScreen />

  return (
    <div>
      <PageHeader title="Sessions" subtitle={`${sessions?.length ?? 0} Sessions`}
        actions={canEdit ? (
          <Link to="/sessions/new" className="btn-primary"><Plus size={16} /> Neue Session</Link>
        ) : undefined}
      />
      <div className="p-6">
        {sessions && sessions.length > 0 ? (
          <div className="grid gap-3">
            {sessions.map(s => (
              <Link key={s.id} to={`/sessions/${s.id}`}
                className="card p-4 hover:border-surface-400 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-emerald-900/40 border border-emerald-800/50">
                    <Calendar size={20} className="text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-100 group-hover:text-brand-300 transition-colors">
                      {s.title}
                    </div>
                    {s.session_date && (
                      <div className="text-sm text-slate-400">
                        {new Date(s.session_date).toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                    )}
                    {s.recap && (
                      <p className="text-sm text-slate-500 truncate mt-1">{s.recap.slice(0, 100)}…</p>
                    )}
                  </div>
                  {s.visibility === 'gm' && (
                    <span className="badge bg-red-900/50 text-red-400 flex-shrink-0">GM</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-slate-400">
            <Calendar size={48} className="mx-auto mb-4 opacity-30" />
            <p>Keine Sessions vorhanden.</p>
            {canEdit && (
              <Link to="/sessions/new" className="btn-primary mt-4 inline-flex"><Plus size={16} /> Erste Session</Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
