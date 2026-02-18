import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { articleService } from '@/services/article.service'
import { collectionService } from '@/services/collection.service'
import RichEditor from '@/components/editor/RichEditor'
import PageHeader from '@/components/ui/PageHeader'
import { TYPE_CONFIG } from '@/components/ui/ArticleTypeBadge'
import { useWorld } from '@/hooks/useWorld'
import toast from 'react-hot-toast'
import type { ArticleType, Visibility } from '@/types'
import { Save, Eye, EyeOff, Trash2, ArrowLeft } from 'lucide-react'
import { LoadingScreen } from '@/components/ui/Spinner'

const ALL_TYPES = Object.keys(TYPE_CONFIG) as ArticleType[]

export default function ArticleEditPage({ worldId }: { worldId: string }) {
  const navigate = useNavigate()
  const { slug } = useParams()
  const isNew = !slug
  const { canEdit } = useWorld()
  const qc = useQueryClient()

  const [title, setTitle] = useState('')
  const [type, setType] = useState<ArticleType>('note')
  const [summary, setSummary] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('players')
  const [isDraft, setIsDraft] = useState(true)
  const [collectionId, setCollectionId] = useState<string>('')
  const [contentJson, setContentJson] = useState<object | null>(null)
  const [contentText, setContentText] = useState('')
  const [saved, setSaved] = useState(true)

  const { data: article, isLoading: articleLoading } = useQuery({
    queryKey: ['article', worldId, slug],
    queryFn: () => articleService.getArticle(worldId, slug!),
    enabled: !isNew,
  })

  const { data: collections } = useQuery({
    queryKey: ['collections', worldId],
    queryFn: () => collectionService.listCollections(worldId),
  })

  const { data: allTitles } = useQuery({
    queryKey: ['article-titles', worldId],
    queryFn: () => articleService.getAllTitles(worldId),
  })

  useEffect(() => {
    if (article) {
      setTitle(article.title)
      setType(article.type as ArticleType)
      setSummary(article.summary ?? '')
      setVisibility(article.visibility as Visibility)
      setIsDraft(article.is_draft)
      setCollectionId(article.collection_id ?? '')
      setContentJson(article.content_json as object ?? null)
    }
  }, [article])

  useEffect(() => {
    if (!canEdit) navigate(-1)
  }, [canEdit])

  const saveMutation = useMutation({
    mutationFn: async ({ publish }: { publish?: boolean } = {}) => {
      const payload = {
        title, type, summary, visibility,
        is_draft: publish ? false : isDraft,
        collection_id: collectionId || null,
        content_json: contentJson ?? undefined,
        content_text: contentText,
      }
      if (isNew) {
        return articleService.createArticle(worldId, payload)
      } else {
        return articleService.updateArticle(article!.id, worldId, payload)
      }
    },
    onSuccess: (data) => {
      toast.success(isNew ? 'Artikel erstellt!' : 'Gespeichert!')
      qc.invalidateQueries({ queryKey: ['articles', worldId] })
      setSaved(true)
      if (isNew) navigate(`/articles/${data.slug}`)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: () => articleService.deleteArticle(article!.id),
    onSuccess: () => {
      toast.success('Artikel gelöscht')
      qc.invalidateQueries({ queryKey: ['articles', worldId] })
      navigate('/articles')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const handleEditorChange = (json: object, text: string) => {
    setContentJson(json)
    setContentText(text)
    setSaved(false)
  }

  if (!isNew && articleLoading) return <LoadingScreen />

  return (
    <div className="h-screen flex flex-col">
      <PageHeader
        title={isNew ? 'Neuer Artikel' : `Bearbeiten: ${title}`}
        breadcrumbs={[
          { label: 'Artikel', href: '#/articles' },
          { label: isNew ? 'Neu' : title },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(isNew ? '/articles' : `/articles/${slug}`)} className="btn-ghost">
              <ArrowLeft size={16} /> Zurück
            </button>
            {!isNew && (
              <button onClick={() => {
                if (confirm('Artikel wirklich löschen?')) deleteMutation.mutate()
              }} className="btn-ghost text-red-400 hover:bg-red-900/20">
                <Trash2 size={16} />
              </button>
            )}
            <button onClick={() => saveMutation.mutate({ publish: false })}
              disabled={saveMutation.isPending || saved}
              className="btn-secondary">
              <Save size={16} /> {saved ? 'Gespeichert' : 'Speichern'}
            </button>
            {isDraft && (
              <button onClick={() => saveMutation.mutate({ publish: true })}
                disabled={saveMutation.isPending}
                className="btn-primary">
                <Eye size={16} /> Veröffentlichen
              </button>
            )}
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Metadata */}
          <div className="card p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Titel *</label>
              <input value={title} onChange={e => { setTitle(e.target.value); setSaved(false) }}
                className="input text-lg font-semibold" placeholder="Artikeltitel…" required />
            </div>
            <div>
              <label className="label">Typ</label>
              <select value={type} onChange={e => setType(e.target.value as ArticleType)} className="input">
                {ALL_TYPES.map(t => (
                  <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Sichtbarkeit</label>
              <select value={visibility} onChange={e => setVisibility(e.target.value as Visibility)} className="input">
                <option value="players">Alle Spieler</option>
                <option value="gm">Nur GM</option>
              </select>
            </div>
            <div>
              <label className="label">Sammlung</label>
              <select value={collectionId} onChange={e => setCollectionId(e.target.value)} className="input">
                <option value="">Keine</option>
                {collections?.map(c => (
                  <option key={c.id} value={c.id}>{c.parent_id ? '  └ ' : ''}{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <div className="flex items-center gap-3 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isDraft}
                    onChange={e => { setIsDraft(e.target.checked); setSaved(false) }}
                    className="rounded" />
                  <span className="text-sm text-slate-300">Entwurf</span>
                </label>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="label">Kurzbeschreibung</label>
              <textarea value={summary} onChange={e => { setSummary(e.target.value); setSaved(false) }}
                className="input resize-none h-16" placeholder="Kurze Zusammenfassung (wird in Listen angezeigt)…" />
            </div>
          </div>

          {/* Editor */}
          <div>
            <label className="label mb-2">Inhalt</label>
            <RichEditor
              content={contentJson}
              onChange={handleEditorChange}
              placeholder="Schreibe hier den Artikelinhalt…"
              worldId={worldId}
              articleTitles={allTitles ?? []}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
