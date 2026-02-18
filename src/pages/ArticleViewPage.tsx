import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { articleService } from '@/services/article.service'
import { useWorld } from '@/hooks/useWorld'
import { Edit, ArrowLeft, Clock, Link2, Tag, Eye, EyeOff } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'
import ArticleTypeBadge from '@/components/ui/ArticleTypeBadge'
import type { ArticleType } from '@/types'
import { LoadingScreen } from '@/components/ui/Spinner'
import PageHeader from '@/components/ui/PageHeader'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import ImageExtension from '@tiptap/extension-image'
import LinkExtension from '@tiptap/extension-link'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'

function ReadonlyEditor({ content }: { content: object }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      ImageExtension,
      LinkExtension.configure({ openOnClick: true }),
      Table, TableRow, TableHeader, TableCell,
    ],
    content,
    editable: false,
  })
  return <EditorContent editor={editor} />
}

export default function ArticleViewPage({ worldId }: { worldId: string }) {
  const { slug } = useParams<{ slug: string }>()
  const { canEdit, isGm } = useWorld()
  const navigate = useNavigate()

  const { data: article, isLoading } = useQuery({
    queryKey: ['article', worldId, slug],
    queryFn: () => articleService.getArticle(worldId, slug!),
    enabled: !!slug,
  })

  const { data: backlinks } = useQuery({
    queryKey: ['backlinks', article?.id],
    queryFn: () => articleService.getBacklinks(article!.id),
    enabled: !!article?.id,
  })

  const { data: versions } = useQuery({
    queryKey: ['versions', article?.id],
    queryFn: () => articleService.getVersions(article!.id),
    enabled: !!article?.id && canEdit,
  })

  const { data: tags } = useQuery({
    queryKey: ['article-tags', article?.id],
    queryFn: () => articleService.getTagsForArticle(article!.id),
    enabled: !!article?.id,
  })

  if (isLoading) return <LoadingScreen />
  if (!article) return (
    <div className="p-8 text-center text-slate-400">
      Artikel nicht gefunden. <Link to="/articles" className="text-brand-400 hover:underline">Zurück zur Liste</Link>
    </div>
  )

  if (article.visibility === 'gm' && !isGm) {
    return <div className="p-8 text-center text-slate-400">Kein Zugriff auf diesen Artikel.</div>
  }

  return (
    <div>
      <PageHeader
        title={article.title}
        breadcrumbs={[
          { label: 'Artikel', href: '#/articles' },
          ...(article.collections ? [{ label: (article.collections as any).name }] : []),
          { label: article.title },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link to="/articles" className="btn-ghost">
              <ArrowLeft size={16} /> Zurück
            </Link>
            {canEdit && (
              <Link to={`/articles/${slug}/edit`} className="btn-primary">
                <Edit size={16} /> Bearbeiten
              </Link>
            )}
          </div>
        }
      />

      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          {/* Article header */}
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <ArticleTypeBadge type={article.type as ArticleType} />
            {article.is_draft && <span className="badge bg-yellow-900/50 text-yellow-400">Entwurf</span>}
            {article.visibility === 'gm' && (
              <span className="badge bg-red-900/50 text-red-400 flex items-center gap-1">
                <EyeOff size={12} /> Nur GM
              </span>
            )}
            {tags && tags.length > 0 && (
              <div className="flex gap-1.5">
                {tags.map((tag: any) => tag && (
                  <span key={tag.id} className="badge"
                    style={{ backgroundColor: tag.color ? `${tag.color}30` : undefined, color: tag.color ?? undefined }}>
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
            <span className="text-xs text-slate-500 ml-auto">
              <Clock size={12} className="inline mr-1" />
              {formatDistanceToNow(new Date(article.updated_at), { addSuffix: true, locale: de })}
            </span>
          </div>

          {/* Summary */}
          {article.summary && (
            <div className="card p-4 mb-6 border-l-4 border-brand-600">
              <p className="text-slate-300 italic">{article.summary}</p>
            </div>
          )}

          {/* Content */}
          <div className="card p-6 mb-6">
            {article.content_json ? (
              <ReadonlyEditor content={article.content_json as object} />
            ) : (
              <p className="text-slate-400 italic">Kein Inhalt vorhanden.</p>
            )}
          </div>

          {/* Backlinks */}
          {backlinks && backlinks.length > 0 && (
            <div className="card p-4 mb-4">
              <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
                <Link2 size={14} /> Verlinkt von
              </h3>
              <div className="flex flex-wrap gap-2">
                {backlinks.map(bl => {
                  const source = (bl as any).articles
                  return source ? (
                    <Link key={bl.source_article_id} to={`/articles/${source.slug}`}
                      className="badge bg-surface-700 text-slate-300 hover:bg-surface-600 transition-colors">
                      {source.title}
                    </Link>
                  ) : null
                })}
              </div>
            </div>
          )}

          {/* Version history */}
          {canEdit && versions && versions.length > 0 && (
            <details className="card p-4">
              <summary className="cursor-pointer text-sm font-semibold text-slate-400 select-none">
                Versionshistorie ({versions.length})
              </summary>
              <div className="mt-3 space-y-2">
                {versions.map(v => (
                  <div key={v.id} className="flex items-center gap-3 text-sm">
                    <span className="badge bg-surface-700 text-slate-400">v{v.version_no}</span>
                    <span className="text-slate-400">{(v as any).profiles?.display_name ?? 'Unbekannt'}</span>
                    <span className="text-slate-500 text-xs">
                      {formatDistanceToNow(new Date(v.created_at), { addSuffix: true, locale: de })}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  )
}
