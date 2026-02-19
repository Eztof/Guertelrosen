import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { articleService } from '@/services/article.service'
import { useWorld } from '@/hooks/useWorld'
import { Edit, ArrowLeft, Clock, Link2, EyeOff, Paperclip, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'
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
import { useState } from 'react'

function ReadonlyEditor({ content }: { content: object }) {
  // Strip __meta from display content
  const displayContent = { ...(content as any) }
  delete displayContent.__meta

  const editor = useEditor({
    extensions: [
      StarterKit,
      ImageExtension,
      LinkExtension.configure({ openOnClick: true }),
      Table, TableRow, TableHeader, TableCell,
    ],
    content: displayContent,
    editable: false,
  })
  return <EditorContent editor={editor} />
}

function GalleryViewer({ images }: { images: string[] }) {
  const [idx, setIdx] = useState(0)
  if (images.length === 0) return null
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-slate-400 mb-3">Galerie</h3>
      <div className="relative rounded-xl overflow-hidden border border-surface-600">
        <img src={images[idx]} alt={`Bild ${idx + 1}`} className="w-full max-h-80 object-contain bg-surface-900" />
        {images.length > 1 && (
          <>
            <button onClick={() => setIdx((idx - 1 + images.length) % images.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/60 rounded-lg text-white hover:bg-black/80">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => setIdx((idx + 1) % images.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/60 rounded-lg text-white hover:bg-black/80">
              <ChevronRight size={18} />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {images.map((_, i) => (
                <button key={i} onClick={() => setIdx(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${i === idx ? 'bg-white' : 'bg-white/40'}`} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
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

  // Extract meta
  const meta = (article.content_json as any)?.__meta ?? {}
  const { coverImage, gallery, handouts, customFields, aliases, lore, articleLinks } = meta

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

      {/* Cover image */}
      {coverImage && (
        <div className="relative h-52 overflow-hidden border-b border-surface-600">
          <img src={coverImage} alt={article.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-900/80 to-transparent" />
        </div>
      )}

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

          {/* Aliases */}
          {aliases && (
            <p className="text-xs text-slate-500 mb-4 italic">
              Auch bekannt als: {aliases}
            </p>
          )}

          {/* Custom fields sidebar-style */}
          {customFields && customFields.length > 0 && (
            <div className="card p-4 mb-6 grid grid-cols-2 md:grid-cols-3 gap-3">
              {customFields.filter((f: any) => f.key && f.value).map((f: any, i: number) => (
                <div key={i}>
                  <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">{f.key}</div>
                  <div className="text-sm text-slate-200 mt-0.5">{f.value}</div>
                </div>
              ))}
            </div>
          )}

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

          {/* Gallery */}
          {gallery && gallery.length > 0 && (
            <GalleryViewer images={gallery} />
          )}

          {/* Handouts */}
          {handouts && handouts.length > 0 && (
            <div className="card p-4 mb-6">
              <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
                <Paperclip size={14} /> Handouts & Anhänge
              </h3>
              <div className="space-y-2">
                {handouts.map((h: any, i: number) => (
                  <a key={i} href={h.url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 text-sm text-brand-400 hover:underline">
                    <Paperclip size={12} /> {h.name}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* External links */}
          {articleLinks && articleLinks.filter(Boolean).length > 0 && (
            <div className="card p-4 mb-6">
              <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
                <ExternalLink size={14} /> Externe Links
              </h3>
              <div className="space-y-1">
                {articleLinks.filter(Boolean).map((link: string, i: number) => (
                  <a key={i} href={link} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 text-sm text-brand-400 hover:underline break-all">
                    <ExternalLink size={12} /> {link}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* GM Lore – only for GMs */}
          {isGm && lore && (
            <div className="card p-4 mb-6 border border-amber-800/40 bg-amber-900/5">
              <h3 className="text-sm font-semibold text-amber-400 mb-2 flex items-center gap-2">
                <EyeOff size={14} /> GM-Notizen
              </h3>
              <p className="text-sm text-slate-300 whitespace-pre-wrap">{lore}</p>
            </div>
          )}

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
