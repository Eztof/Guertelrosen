import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Search, BookOpen } from 'lucide-react'
import ArticleTypeBadge from '@/components/ui/ArticleTypeBadge'
import PageHeader from '@/components/ui/PageHeader'
import Spinner from '@/components/ui/Spinner'
import type { ArticleType } from '@/types'
import { useDebounce } from '@/hooks/useDebounce'
import { useQuery } from '@tanstack/react-query'

async function searchArticlesFuzzy(worldId: string, query: string) {
  const { data, error } = await supabase
    .rpc('search_articles_fuzzy', { p_world_id: worldId, p_query: query })
  if (error) throw error
  return data ?? []
}

export default function SearchPage({ worldId }: { worldId: string }) {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)

  const { data: results, isLoading } = useQuery({
    queryKey: ['search-fuzzy', worldId, debouncedQuery],
    queryFn: () => searchArticlesFuzzy(worldId, debouncedQuery),
    enabled: debouncedQuery.length >= 1,
  })

  return (
    <div>
      <PageHeader title="Suche" />

      <div className="p-6 max-w-2xl mx-auto">
        <div className="relative mb-6">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="input pl-10 text-lg"
            placeholder="Artikel suchen…"
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Spinner size="sm" />
            </div>
          )}
        </div>

        {debouncedQuery.length >= 1 && (
          <>
            {results && results.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-slate-400 mb-4">
                  {results.length} Ergebnis{results.length !== 1 ? 'se' : ''}
                </p>
                {results.map((r: any) => (
                  <Link key={r.id} to={`/articles/${r.slug}`}
                    className="card p-4 flex items-start gap-3 hover:border-surface-400 transition-colors">
                    <ArticleTypeBadge type={r.type as ArticleType} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-100">{r.title}</div>
                      {r.summary && <p className="text-sm text-slate-400 truncate mt-0.5">{r.summary}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              !isLoading && (
                <div className="text-center py-12 text-slate-400">
                  <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
                  <p>Keine Ergebnisse für „{debouncedQuery}"</p>
                </div>
              )
            )}
          </>
        )}

        {debouncedQuery.length === 0 && (
          <p className="text-center text-slate-500 text-sm mt-8">Tippe, um zu suchen</p>
        )}
      </div>
    </div>
  )
}
