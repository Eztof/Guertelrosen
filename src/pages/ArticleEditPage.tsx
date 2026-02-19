import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { articleService } from '@/services/article.service'
import { collectionService } from '@/services/collection.service'
import { assetService } from '@/services/asset.service'
import RichEditor from '@/components/editor/RichEditor'
import PageHeader from '@/components/ui/PageHeader'
import { TYPE_CONFIG } from '@/components/ui/ArticleTypeBadge'
import DsaDatePicker, { DsaDateBadge } from '@/components/ui/DsaDatePicker'
import { useWorld } from '@/hooks/useWorld'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import type { ArticleType, Visibility } from '@/types'
import type { DsaDate } from '@/lib/dsaCalendar'
import { dsaDateToString, dsaDateFromString, dsaDateToSortKey } from '@/lib/dsaCalendar'
import {
  Save, Eye, EyeOff, Trash2, ArrowLeft, ChevronDown, ChevronUp,
  Image, Upload, X, Tag, Link2, Plus, Paperclip, Calendar
} from 'lucide-react'
import { LoadingScreen } from '@/components/ui/Spinner'

const ALL_TYPES = Object.keys(TYPE_CONFIG) as ArticleType[]

function CoverImageUploader({ worldId, value, onChange }: { worldId: string; value: string; onChange: (url: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const handleFile = async (file: File) => {
    setUploading(true)
    try { const asset = await assetService.uploadFile(worldId, file); onChange(asset.publicUrl) }
    catch { toast.error('Upload fehlgeschlagen') }
    finally { setUploading(false) }
  }
  return (
    <div>
      <label className="label">Titelbild</label>
      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-surface-500 mb-2">
          <img src={value} alt="Titelbild" className="w-full h-40 object-cover" />
          <button type="button" onClick={() => onChange('')} className="absolute top-2 right-2 p-1 bg-black/60 rounded-lg text-white hover:bg-red-600 transition-colors"><X size={14} /></button>
        </div>
      ) : (
        <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-surface-500 rounded-xl p-8 text-center cursor-pointer hover:border-brand-500 transition-colors mb-2">
          {uploading ? <p className="text-slate-400 text-sm">Wird hochgeladen…</p> : <><Image size={28} className="mx-auto mb-2 text-slate-500" /><p className="text-slate-400 text-sm">Klicken zum Hochladen</p><p className="text-slate-600 text-xs mt-1">PNG, JPG, WebP</p></>}
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
    </div>
  )
}

interface Handout { name: string; url: string; path: string }

function HandoutUploader({ worldId, handouts, onChange }: { worldId: string; handouts: Handout[]; onChange: (h: Handout[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const handleFile = async (file: File) => {
    setUploading(true)
    try { const asset = await assetService.uploadFile(worldId, file); onChange([...handouts, { name: file.name, url: asset.publicUrl, path: asset.path }]) }
    catch { toast.error('Upload fehlgeschlagen') }
    finally { setUploading(false) }
  }
  return (
    <div>
      <label className="label">Handouts & Anhänge</label>
      <div className="space-y-2">
        {handouts.map((h, i) => (
          <div key={i} className="flex items-center gap-3 card px-3 py-2">
            <Paperclip size={14} className="text-slate-400 flex-shrink-0" />
            <a href={h.url} target="_blank" rel="noreferrer" className="flex-1 text-sm text-brand-400 hover:underline truncate">{h.name}</a>
            <button type="button" onClick={() => onChange(handouts.filter((_, idx) => idx !== i))} className="text-slate-500 hover:text-red-400"><X size={14} /></button>
          </div>
        ))}
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-secondary text-sm py-1.5 w-full justify-center">
          {uploading ? 'Wird hochgeladen…' : <><Upload size={14} /> Datei hochladen</>}
        </button>
      </div>
      <input ref={fileRef} type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
    </div>
  )
}

function TagManager({ worldId, articleId }: { worldId: string; articleId?: string }) {
  const [newTag, setNewTag] = useState('')
  const qc = useQueryClient()
  const { data: allTags } = useQuery({ queryKey: ['tags', worldId], queryFn: () => articleService.listTags(worldId) })
  const { data: currentTags, refetch } = useQuery({ queryKey: ['article-tags', articleId], queryFn: () => articleId ? articleService.getTagsForArticle(articleId) : Promise.resolve([]), enabled: !!articleId })
  const currentTagIds = (currentTags ?? []).filter(Boolean).map((t: any) => t.id)
  const toggleTag = async (tagId: string) => {
    if (!articleId) return
    const next = currentTagIds.includes(tagId) ? currentTagIds.filter(id => id !== tagId) : [...currentTagIds, tagId]
    await articleService.setTagsForArticle(articleId, next); refetch()
  }
  const createAndAdd = async () => {
    if (!newTag.trim()) return
    const tag = await articleService.createTag(worldId, newTag.trim())
    qc.invalidateQueries({ queryKey: ['tags', worldId] }); setNewTag('')
    if (articleId) { await articleService.setTagsForArticle(articleId, [...currentTagIds, tag.id]); refetch() }
  }
  return (
    <div>
      <label className="label flex items-center gap-1"><Tag size={12} /> Tags</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {(allTags ?? []).map(tag => {
          const active = currentTagIds.includes(tag.id)
          return <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)} className={`badge cursor-pointer transition-all ${active ? 'bg-brand-600 text-white' : 'bg-surface-600 text-slate-400 hover:bg-surface-500'}`} style={active && tag.color ? { backgroundColor: tag.color + 'cc' } : {}}>{tag.name}</button>
        })}
      </div>
      <div className="flex gap-2">
        <input value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); createAndAdd() } }} className="input text-sm py-1.5 flex-1" placeholder="Neuer Tag…" />
        <button type="button" onClick={createAndAdd} className="btn-secondary py-1.5 px-3"><Plus size={14} /></button>
      </div>
      {!articleId && <p className="text-xs text-slate-500 mt-1">Tags können nach dem ersten Speichern vergeben werden.</p>}
    </div>
  )
}

function BacklinksPanel({ articleId }: { articleId: string }) {
  const { data: backlinks } = useQuery({ queryKey: ['backlinks', articleId], queryFn: () => articleService.getBacklinks(articleId), enabled: !!articleId })
  if (!backlinks || backlinks.length === 0) return <p className="text-sm text-slate-500 italic">Noch keine Backlinks</p>
  return (
    <div className="flex flex-wrap gap-2">
      {backlinks.map(bl => { const source = (bl as any).articles; return source ? <a key={bl.source_article_id} href={`#/articles/${source.slug}`} className="badge bg-surface-700 text-slate-300 hover:bg-surface-600 transition-colors">← {source.title}</a> : null })}
    </div>
  )
}

function GalleryManager({ worldId, images, onChange }: { worldId: string; images: string[]; onChange: (imgs: string[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const handleFile = async (file: File) => {
    setUploading(true)
    try { const asset = await assetService.uploadFile(worldId, file); onChange([...images, asset.publicUrl]) }
    catch { toast.error('Upload fehlgeschlagen') }
    finally { setUploading(false) }
  }
  return (
    <div>
      <label className="label">Bildergalerie</label>
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-2">
          {images.map((url, i) => (
            <div key={i} className="relative rounded-lg overflow-hidden border border-surface-500 aspect-square">
              <img src={url} className="w-full h-full object-cover" alt="" />
              <button type="button" onClick={() => onChange(images.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 p-0.5 bg-black/60 rounded text-white hover:bg-red-600 transition-colors"><X size={12} /></button>
            </div>
          ))}
        </div>
      )}
      <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-secondary text-sm py-1.5 w-full justify-center">
        {uploading ? 'Wird hochgeladen…' : <><Image size={14} /> Bild hinzufügen</>}
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
    </div>
  )
}

interface CustomField { key: string; value: string }

function CustomFields({ fields, onChange }: { fields: CustomField[]; onChange: (f: CustomField[]) => void }) {
  return (
    <div>
      <label className="label">Eigene Felder</label>
      <div className="space-y-2 mb-2">
        {fields.map((f, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input value={f.key} onChange={e => onChange(fields.map((x, idx) => idx === i ? { ...x, key: e.target.value } : x))} className="input text-sm py-1.5 w-1/3" placeholder="Feldname" />
            <input value={f.value} onChange={e => onChange(fields.map((x, idx) => idx === i ? { ...x, value: e.target.value } : x))} className="input text-sm py-1.5 flex-1" placeholder="Wert" />
            <button type="button" onClick={() => onChange(fields.filter((_, idx) => idx !== i))} className="text-slate-500 hover:text-red-400"><X size={14} /></button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => onChange([...fields, { key: '', value: '' }])} className="btn-ghost text-sm py-1 text-slate-400"><Plus size={14} /> Feld hinzufügen</button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
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
  const [dsaDate, setDsaDate] = useState<DsaDate | null>(null)

  const [showAdvanced, setShowAdvanced] = useState(false)
  const [coverImage, setCoverImage] = useState('')
  const [gallery, setGallery] = useState<string[]>([])
  const [handouts, setHandouts] = useState<Handout[]>([])
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [aliases, setAliases] = useState('')
  const [lore, setLore] = useState('')
  const [articleLinks, setArticleLinks] = useState<string[]>([])

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
      // Load DSA date
      const dsaStr = (article as any).dsa_date_str
      if (dsaStr) setDsaDate(dsaDateFromString(dsaStr))
      const meta = (article.content_json as any)?.__meta
      if (meta) {
        setCoverImage(meta.coverImage ?? '')
        setGallery(meta.gallery ?? [])
        setHandouts(meta.handouts ?? [])
        setCustomFields(meta.customFields ?? [])
        setAliases(meta.aliases ?? '')
        setLore(meta.lore ?? '')
        setArticleLinks(meta.articleLinks ?? [])
      }
    }
  }, [article])

  useEffect(() => { if (!canEdit) navigate(-1) }, [canEdit])

  const buildPayloadContentJson = () => {
    const base = contentJson ?? {}
    const hasMeta = coverImage || gallery.length || handouts.length || customFields.length || aliases || lore || articleLinks.length
    if (!hasMeta) return base
    return { ...base, __meta: { coverImage, gallery, handouts, customFields, aliases, lore, articleLinks } }
  }

  const saveMutation = useMutation({
    mutationFn: async ({ publish }: { publish?: boolean } = {}) => {
      const mergedJson = buildPayloadContentJson()
      const payload: any = {
        title, type, summary, visibility,
        is_draft: publish ? false : isDraft,
        collection_id: collectionId || null,
        content_json: mergedJson ?? undefined,
        content_text: contentText,
        dsa_date_str: dsaDate ? dsaDateToString(dsaDate) : null,
        dsa_date_sort: dsaDate ? dsaDateToSortKey(dsaDate) : null,
      }
      if (isNew) return articleService.createArticle(worldId, payload)
      return articleService.updateArticle(article!.id, worldId, payload)
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
    setContentJson(json); setContentText(text); setSaved(false)
  }

  if (!isNew && articleLoading) return <LoadingScreen />

  return (
    <div className="h-screen flex flex-col">
      <PageHeader
        title={isNew ? 'Neuer Artikel' : `Bearbeiten: ${title}`}
        breadcrumbs={[{ label: 'Artikel', href: '#/articles' }, { label: isNew ? 'Neu' : title }]}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(isNew ? '/articles' : `/articles/${slug}`)} className="btn-ghost"><ArrowLeft size={16} /> Zurück</button>
            {!isNew && <button onClick={() => { if (confirm('Artikel wirklich löschen?')) deleteMutation.mutate() }} className="btn-ghost text-red-400 hover:bg-red-900/20"><Trash2 size={16} /></button>}
            <button onClick={() => saveMutation.mutate({ publish: false })} disabled={saveMutation.isPending || saved} className="btn-secondary">
              <Save size={16} /> {saved ? 'Gespeichert' : 'Speichern'}
            </button>
            {isDraft && <button onClick={() => saveMutation.mutate({ publish: true })} disabled={saveMutation.isPending} className="btn-primary"><Eye size={16} /> Veröffentlichen</button>}
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Basic fields */}
          <div className="card p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Titel *</label>
              <input value={title} onChange={e => { setTitle(e.target.value); setSaved(false) }} className="input text-lg font-semibold" placeholder="Artikeltitel…" required />
            </div>
            <div>
              <label className="label">Typ</label>
              <select value={type} onChange={e => setType(e.target.value as ArticleType)} className="input">
                {ALL_TYPES.map(t => <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>)}
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
                {collections?.map(c => <option key={c.id} value={c.id}>{c.parent_id ? '  └ ' : ''}{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <div className="flex items-center gap-3 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isDraft} onChange={e => { setIsDraft(e.target.checked); setSaved(false) }} className="rounded" />
                  <span className="text-sm text-slate-300">Entwurf</span>
                </label>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="label">Kurzbeschreibung</label>
              <textarea value={summary} onChange={e => { setSummary(e.target.value); setSaved(false) }} className="input resize-none h-16" placeholder="Kurze Zusammenfassung…" />
            </div>

            {/* DSA Date */}
            <div className="md:col-span-2">
              <label className="label flex items-center gap-1.5">
                <span className="text-brand-400 text-sm">⚔</span>
                Aventurisches Datum (BF)
                <span className="text-xs text-slate-500 font-normal">– optional, für Zeitleiste</span>
              </label>
              <DsaDatePicker
                value={dsaDate}
                onChange={d => { setDsaDate(d); setSaved(false) }}
                showWeekday
              />
            </div>
          </div>

          {/* Editor */}
          <div>
            <label className="label mb-2">Inhalt</label>
            <RichEditor content={contentJson} onChange={handleEditorChange} placeholder="Schreibe hier den Artikelinhalt…" worldId={worldId} articleTitles={allTitles ?? []} />
          </div>

          {/* Advanced toggle */}
          <div>
            <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-surface-500 hover:border-brand-500 text-slate-300 hover:text-slate-100 text-sm font-medium transition-all w-full justify-between bg-surface-800">
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-brand-600/30 text-brand-400 flex items-center justify-center text-xs">+</span>
                Erweiterte Optionen
                <span className="text-xs text-slate-500 font-normal">– Titelbild, Galerie, Handouts, Tags, eigene Felder…</span>
              </span>
              {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>

          {showAdvanced && (
            <div className="space-y-6">
              <div className="card p-4"><CoverImageUploader worldId={worldId} value={coverImage} onChange={v => { setCoverImage(v); setSaved(false) }} /></div>
              <div className="card p-4"><GalleryManager worldId={worldId} images={gallery} onChange={v => { setGallery(v); setSaved(false) }} /></div>
              <div className="card p-4"><HandoutUploader worldId={worldId} handouts={handouts} onChange={v => { setHandouts(v); setSaved(false) }} /></div>
              <div className="card p-4"><TagManager worldId={worldId} articleId={isNew ? undefined : article?.id} /></div>
              <div className="card p-4">
                <label className="label">Aliasse / Alternative Namen</label>
                <input value={aliases} onChange={e => { setAliases(e.target.value); setSaved(false) }} className="input" placeholder="Kommagetrennte Namen…" />
                <p className="text-xs text-slate-500 mt-1">Werden für die Suche verwendet</p>
              </div>
              <div className="card p-4">
                <label className="label flex items-center gap-1"><Link2 size={12} /> Externe Links</label>
                <div className="space-y-2 mb-2">
                  {articleLinks.map((link, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={link} onChange={e => { const next = [...articleLinks]; next[i] = e.target.value; setArticleLinks(next); setSaved(false) }} className="input text-sm py-1.5 flex-1" placeholder="https://…" />
                      <button type="button" onClick={() => setArticleLinks(articleLinks.filter((_, idx) => idx !== i))} className="text-slate-500 hover:text-red-400 px-2"><X size={14} /></button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => { setArticleLinks([...articleLinks, '']); setSaved(false) }} className="btn-ghost text-sm py-1 text-slate-400"><Plus size={14} /> Link hinzufügen</button>
              </div>
              <div className="card p-4 border border-amber-800/40 bg-amber-900/5">
                <label className="label text-amber-400 flex items-center gap-1"><EyeOff size={12} /> GM-Notizen</label>
                <textarea value={lore} onChange={e => { setLore(e.target.value); setSaved(false) }} className="input resize-none h-28 bg-amber-900/10 border-amber-800/40" placeholder="Geheime Hintergrundinformationen…" />
              </div>
              <div className="card p-4"><CustomFields fields={customFields} onChange={v => { setCustomFields(v); setSaved(false) }} /></div>
              {!isNew && article?.id && (
                <div className="card p-4">
                  <label className="label flex items-center gap-1"><Link2 size={12} /> Verlinkt von (Backlinks)</label>
                  <BacklinksPanel articleId={article.id} />
                </div>
              )}
            </div>
          )}

          {/* Bottom save bar */}
          <div className="flex justify-end gap-3 pt-2 pb-8">
            <button onClick={() => navigate(isNew ? '/articles' : `/articles/${slug}`)} className="btn-ghost">Abbrechen</button>
            <button onClick={() => saveMutation.mutate({ publish: false })} disabled={saveMutation.isPending || saved} className="btn-secondary">
              <Save size={16} /> {saved ? 'Gespeichert' : 'Speichern'}
            </button>
            {isDraft && <button onClick={() => saveMutation.mutate({ publish: true })} disabled={saveMutation.isPending} className="btn-primary"><Eye size={16} /> Veröffentlichen</button>}
          </div>
        </div>
      </div>
    </div>
  )
}
