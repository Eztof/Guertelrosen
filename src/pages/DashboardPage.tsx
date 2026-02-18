import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { articleService } from '@/services/article.service'
import { sessionService } from '@/services/session.service'
import { BookOpen, Calendar, Map, Plus, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'
import ArticleTypeBadge from '@/components/ui/ArticleTypeBadge'
import { useWorld } from '@/hooks/useWorld'
import PageHeader from '@/components/ui/PageHeader'

export default function DashboardPage({ worldId }: { worldId: string }) {
  const { canEdit } = useWorld()

  const { data: articles } = useQuery({
    queryKey: ['articles', worldId, 'recent'],
    queryFn: async () => {
      const all = await articleService.listArticles(worldId)
      return all.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 6)
    },
  })

  const { data: sessions } = useQuery({
    queryKey: ['sessions', worldId, 'recent'],
    queryFn: async () => {
      const all = await sessionService.listSessions(worldId)
      return all.slice(0, 4)
    },
  })

  const stats = [
    { label: 'Artikel', value: articles?.length ?? 0, icon: <BookOpen size={20} />, href: '/articles', color: 'text-blue-400' },
    { label: 'Sessions', value: sessions?.length ?? 0, icon: <Calendar size={20} />, href: '/sessions', color: 'text-emerald-400' },
  ]

  return (
    <div>
      <PageHeader title="Dashboard"
        subtitle="Willkommen in der Welt der Sieben Gezeichneten"
        actions={canEdit ? (
          <Link to="/articles/new" className="btn-primary">
            <Plus size={16} /> Artikel
          </Link>
        ) : undefined}
      />

      <div className="p-6 space-y-8">
        {/* Quick actions */}
        {canEdit && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Neuer Artikel', to: '/articles/new', icon: <BookOpen size={18} />, color: 'bg-blue-600' },
              { label: 'Neue Session', to: '/sessions/new', icon: <Calendar size={18} />, color: 'bg-emerald-600' },
              { label: 'Alle Karten', to: '/maps', icon: <Map size={18} />, color: 'bg-amber-600' },
              { label: 'Suche', to: '/search', icon: <Clock size={18} />, color: 'bg-purple-600' },
            ].map(a => (
              <Link key={a.to} to={a.to}
                className="card p-4 flex items-center gap-3 hover:border-surface-400 transition-colors">
                <div className={`p-2 rounded-lg ${a.color}`}>{a.icon}</div>
                <span className="text-sm font-medium text-slate-200">{a.label}</span>
              </Link>
            ))}
          </div>
        )}

        {/* Recent articles */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-slate-100">Zuletzt bearbeitet</h2>
            <Link to="/articles" className="text-sm text-brand-400 hover:underline">Alle →</Link>
          </div>
          <div className="grid gap-2">
            {articles?.map(article => (
              <Link key={article.id} to={`/articles/${article.slug}`}
                className="card p-3 flex items-center gap-3 hover:border-surface-400 transition-colors">
                <ArticleTypeBadge type={article.type as any} />
                <span className="flex-1 text-sm font-medium text-slate-200 truncate">{article.title}</span>
                {article.is_draft && <span className="badge bg-yellow-900/50 text-yellow-400 text-xs">Entwurf</span>}
                <span className="text-xs text-slate-500 flex-shrink-0">
                  {formatDistanceToNow(new Date(article.updated_at), { addSuffix: true, locale: de })}
                </span>
              </Link>
            ))}
            {(!articles || articles.length === 0) && (
              <div className="card p-6 text-center text-slate-400 text-sm">
                Noch keine Artikel. {canEdit && <Link to="/articles/new" className="text-brand-400 hover:underline">Ersten Artikel erstellen</Link>}
              </div>
            )}
          </div>
        </section>

        {/* Recent sessions */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-slate-100">Letzte Sessions</h2>
            <Link to="/sessions" className="text-sm text-brand-400 hover:underline">Alle →</Link>
          </div>
          <div className="grid gap-2">
            {sessions?.map(s => (
              <Link key={s.id} to={`/sessions/${s.id}`}
                className="card p-3 flex items-center gap-3 hover:border-surface-400 transition-colors">
                <div className="p-2 rounded-lg bg-emerald-900/50 border border-emerald-800">
                  <Calendar size={16} className="text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-200 truncate">{s.title}</div>
                  {s.session_date && (
                    <div className="text-xs text-slate-500">{new Date(s.session_date).toLocaleDateString('de-DE')}</div>
                  )}
                </div>
              </Link>
            ))}
            {(!sessions || sessions.length === 0) && (
              <div className="card p-6 text-center text-slate-400 text-sm">
                Noch keine Sessions. {canEdit && <Link to="/sessions/new" className="text-brand-400 hover:underline">Session anlegen</Link>}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
