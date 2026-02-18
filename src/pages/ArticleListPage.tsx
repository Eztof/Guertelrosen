import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { articleService } from '@/services/article.service'
import { collectionService } from '@/services/collection.service'
import { Plus, Filter, BookOpen } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'
import ArticleTypeBadge, { TYPE_CONFIG } from '@/components/ui/ArticleTypeBadge'
import PageHeader from '@/components/ui/PageHeader'
import { useWorld } from '@/hooks/useWorld'
import type { ArticleType } from '@/types'
import { LoadingScreen } from '@/components/ui/Spinner'

const ALL_TYPES = Object.keys(TYPE_CONFIG) as ArticleType[]

export default function ArticleListPage({ worldId }: { worldId: string }) {
  const { canEdit } = useWorld()
  const [searchParams, setSearchParams] = useSearchParams()
  const [filterType, setFilterType] = useState<ArticleType | ''>('')
  const [filterDraft, setFilterDraft] = useState<boolean | undefined>(undefined)
  const collectionId = searchParams.get('collection') ?? undefined

  const { data: articles, isLoading } = useQuery({
    queryKey: ['articles', worldId, filterType, collectionId, filterDraft],
    queryFn: () => articleService.listArticles(worldId, {
      type: filterType || undefined,
      collectionId,
      isDraft: filterDraft,
    }),
  })

  const { data: collections } = useQuery({
    queryKey: ['collections', worldId],
    queryFn: () => collectionService.listCollections(worldId),
  })

  const currentCollection = collections?.find(c => c.id === collectionId)

  if (isLoading) return <LoadingScreen />

  return (
    <div>
      <PageHeader
        title={currentCollection ? currentCollection.name : 'Alle Artikel'}
        subtitle={`${articles?.length ?? 0} Artikel`}
        breadcrumbs={currentCollection ? [
          { label: 'Artikel', href: '#/articles' },
          { label: currentCollection.name },
        ] : undefined}
        actions={
          <div className="flex items-center gap-2">
            {canEdit && (
              <Link to="/articles/new" className="btn-primary">
                <Plus size={16} /> Neuer Artikel
              </Link>
            )}
          </div>
        }
      />

      {/* Filters */}
      <div className="px-6 py-3 border-b border-surface-600 flex flex-wrap gap-2">
        <select value={filterType} onChange={e => setFilterType(e.target.value as ArticleType | '')}
          className="input py-1.5 w-auto text-sm">
          <option value="">Alle Typen</option>
          {ALL_TYPES.map(t => (
            <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>
          ))}
        </select>
        <select value={filterDraft === undefined ? '' : String(filterDraft)}
          onChange={e => setFilterDraft(e.target.value === '' ? undefined : e.target.value === 'true')}
          className="input py-1.5 w-auto text-sm">
          <option value="">Alle Status</option>
          <option value="false">Veröffentlicht</option>
          <option value="true">Entwurf</option>
        </select>
        {collectionId && (
          <button onClick={() => setSearchParams({})} className="btn-ghost text-sm py-1.5 px-3">
            Sammlung: {currentCollection?.name} ×
          </button>
        )}
      </div>

      {/* Article grid */}
      <div className="p-6">
        {articles && articles.length > 0 ? (
          <div className="grid gap-2">
            {articles.map(article => (
              <Link key={article.id} to={`/articles/${article.slug}`}
                className="card p-4 flex items-center gap-4 hover:border-surface-400 transition-colors group">
                <ArticleTypeBadge type={article.type as ArticleType} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-100 group-hover:text-brand-300 transition-colors truncate">
                      {article.title}
                    </span>
                    {article.is_draft && (
                      <span className="badge bg-yellow-900/50 text-yellow-400 text-xs flex-shrink-0">Entwurf</span>
                    )}
                    {article.visibility === 'gm' && (
                      <span className="badge bg-red-900/50 text-red-400 text-xs flex-shrink-0">GM</span>
                    )}
                  </div>
                  {article.summary && (
                    <p className="text-sm text-slate-400 truncate mt-0.5">{article.summary}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs text-slate-500">
                    {formatDistanceToNow(new Date(article.updated_at), { addSuffix: true, locale: de })}
                  </div>
                  {(article.collections as any)?.name && (
                    <div className="text-xs text-slate-600 mt-0.5">{(article.collections as any).name}</div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-slate-400">
            <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
            <p>Keine Artikel gefunden.</p>
            {canEdit && (
              <Link to="/articles/new" className="btn-primary mt-4 inline-flex">
                <Plus size={16} /> Ersten Artikel erstellen
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
