import { useState, useRef, useCallback, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { mapService } from '@/services/map.service'
import { articleService } from '@/services/article.service'
import { assetService } from '@/services/asset.service'
import { useWorld } from '@/hooks/useWorld'
import { ArrowLeft, Plus, Trash2, X, MapPin, Eye, EyeOff } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import { LoadingScreen } from '@/components/ui/Spinner'
import toast from 'react-hot-toast'
import type { Visibility } from '@/types'

interface PinForm {
  x: number
  y: number
  title: string
  notes: string
  related_article_id: string
  visibility: Visibility
}

export default function MapDetailPage({ worldId }: { worldId: string }) {
  const { id } = useParams<{ id: string }>()
  const { canEdit, isGm } = useWorld()
  const qc = useQueryClient()

  const [addingPin, setAddingPin] = useState(false)
  const [pinForm, setPinForm] = useState<PinForm | null>(null)
  const [selectedPin, setSelectedPin] = useState<string | null>(null)
  const [showGmPins, setShowGmPins] = useState(true)

  const { data: map, isLoading: mapLoading } = useQuery({
    queryKey: ['map', id],
    queryFn: () => mapService.getMap(id!),
    enabled: !!id,
  })

  const { data: pins, isLoading: pinsLoading } = useQuery({
    queryKey: ['map-pins', id],
    queryFn: () => mapService.getPins(id!),
    enabled: !!id,
  })

  const { data: articles } = useQuery({
    queryKey: ['article-titles', worldId],
    queryFn: () => articleService.getAllTitles(worldId),
  })

  // Click handler directly on the image — coordinates are always relative to the image
  const handleImageClick = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    if (!addingPin || !canEdit) return
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setPinForm({ x, y, title: '', notes: '', related_article_id: '', visibility: 'players' })
  }, [addingPin, canEdit])

  const createPinMutation = useMutation({
    mutationFn: (form: PinForm) => mapService.createPin(id!, {
      x: form.x, y: form.y, title: form.title,
      notes: form.notes || undefined,
      related_article_id: form.related_article_id || null,
      visibility: form.visibility,
    }),
    onSuccess: () => {
      toast.success('Pin gesetzt!')
      qc.invalidateQueries({ queryKey: ['map-pins', id] })
      setPinForm(null)
      setAddingPin(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deletePinMutation = useMutation({
    mutationFn: (pinId: string) => mapService.deletePin(pinId),
    onSuccess: () => {
      toast.success('Pin entfernt')
      qc.invalidateQueries({ queryKey: ['map-pins', id] })
      setSelectedPin(null)
    },
  })

  const visiblePins = pins?.filter(p => isGm || p.visibility !== 'gm') ?? []

  if (mapLoading || pinsLoading) return <LoadingScreen />
  if (!map) return <div className="p-8 text-center text-slate-400">Karte nicht gefunden</div>

  const imageUrl = assetService.getPublicUrl(map.image_path)
  const panelOpen = !!(selectedPin || pinForm)

  return (
    <div className="h-screen flex flex-col">
      <PageHeader
        title={map.title}
        breadcrumbs={[{ label: 'Karten', href: '#/maps' }, { label: map.title }]}
        actions={
          <div className="flex gap-2">
            <Link to="/maps" className="btn-ghost"><ArrowLeft size={16} /> Zurück</Link>
            {isGm && (
              <button onClick={() => setShowGmPins(!showGmPins)}
                className={`btn-ghost ${showGmPins ? 'text-amber-400' : 'text-slate-500'}`}>
                {showGmPins ? <Eye size={16} /> : <EyeOff size={16} />} GM-Pins
              </button>
            )}
            {canEdit && (
              <button onClick={() => { setAddingPin(!addingPin); setPinForm(null) }}
                className={addingPin ? 'btn-secondary' : 'btn-primary'}>
                <MapPin size={16} /> {addingPin ? 'Abbrechen' : 'Pin setzen'}
              </button>
            )}
          </div>
        }
      />

      <div className="flex-1 overflow-hidden flex min-h-0">
        {/* Map area - scrollable */}
        <div className="flex-1 overflow-auto bg-surface-900 p-4">
          {/*
            FIX: The pin container wraps tightly around the image using inline-block.
            Pins use position:absolute with left/top in %, which are always
            percentage of the wrapper = percentage of the image.
            Opening/closing the side panel or resizing the window does NOT affect
            pin positions because they're relative to the image, not the viewport.
          */}
          <div
            className={`relative inline-block select-none ${addingPin ? 'cursor-crosshair' : ''}`}
            style={{ lineHeight: 0 }}
          >
            <img
              src={imageUrl}
              alt={map.title}
              className="block max-w-full h-auto"
              onClick={handleImageClick}
              draggable={false}
            />

            {/* Render pins absolutely over image */}
            {visiblePins
              .filter(p => !isGm ? true : (showGmPins || p.visibility !== 'gm'))
              .map(pin => (
                <button
                  key={pin.id}
                  onClick={e => {
                    e.stopPropagation()
                    if (addingPin) return
                    setSelectedPin(pin.id === selectedPin ? null : pin.id)
                  }}
                  style={{
                    position: 'absolute',
                    left: `${pin.x}%`,
                    top: `${pin.y}%`,
                    transform: 'translate(-50%, -100%)',
                    lineHeight: 'normal',
                  }}
                  className="z-10 group"
                  title={pin.title}
                >
                  <div className={`flex flex-col items-center transition-transform ${selectedPin === pin.id ? 'scale-125' : 'hover:scale-110'}`}>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-lg ${
                      pin.visibility === 'gm'
                        ? 'bg-amber-500 border-amber-300'
                        : 'bg-brand-500 border-brand-300'
                    }`}>
                      <MapPin size={12} className="text-white" />
                    </div>
                    <div className="text-xs text-white bg-black/75 px-1.5 py-0.5 rounded mt-0.5 whitespace-nowrap max-w-[8rem] truncate">
                      {pin.title}
                    </div>
                  </div>
                </button>
              ))}

            {/* Ghost pin while filling form */}
            {pinForm && (
              <div
                style={{
                  position: 'absolute',
                  left: `${pinForm.x}%`,
                  top: `${pinForm.y}%`,
                  transform: 'translate(-50%, -100%)',
                  lineHeight: 'normal',
                  pointerEvents: 'none',
                }}
              >
                <div className="flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full border-2 bg-emerald-500 border-emerald-300 flex items-center justify-center shadow-lg animate-pulse">
                    <MapPin size={12} className="text-white" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Side panel */}
        {panelOpen && (
          <div className="w-72 border-l border-surface-600 bg-surface-800 flex flex-col flex-shrink-0 overflow-y-auto">
            {pinForm && (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-100">Neuer Pin</h3>
                  <button onClick={() => { setPinForm(null); setAddingPin(false) }} className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
                </div>
                <p className="text-xs text-slate-500">Position: {pinForm.x.toFixed(1)}% / {pinForm.y.toFixed(1)}%</p>
                <div>
                  <label className="label text-xs">Name *</label>
                  <input value={pinForm.title} onChange={e => setPinForm(p => p ? { ...p, title: e.target.value } : null)}
                    className="input text-sm" placeholder="Ort / Marker…" autoFocus />
                </div>
                <div>
                  <label className="label text-xs">Notizen</label>
                  <textarea value={pinForm.notes} onChange={e => setPinForm(p => p ? { ...p, notes: e.target.value } : null)}
                    className="input text-sm resize-none h-20" />
                </div>
                <div>
                  <label className="label text-xs">Verlinkter Artikel</label>
                  <select value={pinForm.related_article_id}
                    onChange={e => setPinForm(p => p ? { ...p, related_article_id: e.target.value } : null)}
                    className="input text-sm">
                    <option value="">—</option>
                    {articles?.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label text-xs">Sichtbarkeit</label>
                  <select value={pinForm.visibility}
                    onChange={e => setPinForm(p => p ? { ...p, visibility: e.target.value as Visibility } : null)}
                    className="input text-sm">
                    <option value="players">Alle Spieler</option>
                    <option value="gm">Nur GM</option>
                  </select>
                </div>
                <button onClick={() => pinForm && createPinMutation.mutate(pinForm)}
                  disabled={!pinForm.title || createPinMutation.isPending}
                  className="btn-primary w-full justify-center">
                  {createPinMutation.isPending ? 'Speichern…' : 'Pin setzen'}
                </button>
              </div>
            )}

            {selectedPin && !pinForm && (() => {
              const pin = pins?.find(p => p.id === selectedPin)
              if (!pin) return null
              return (
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-100">{pin.title}</h3>
                    <button onClick={() => setSelectedPin(null)} className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
                  </div>
                  {pin.visibility === 'gm' && <span className="badge bg-amber-900/50 text-amber-400 text-xs">Nur GM</span>}
                  {pin.notes && <p className="text-sm text-slate-300 whitespace-pre-wrap">{pin.notes}</p>}
                  {(pin as any).articles && (
                    <Link to={`/articles/${(pin as any).articles.slug}`} className="text-sm text-brand-400 hover:underline block">
                      → {(pin as any).articles.title}
                    </Link>
                  )}
                  {canEdit && (
                    <button onClick={() => { if (confirm('Pin löschen?')) deletePinMutation.mutate(pin.id) }}
                      className="btn-ghost text-red-400 text-sm w-full justify-center mt-2">
                      <Trash2 size={14} /> Pin löschen
                    </button>
                  )}
                </div>
              )
            })()}
          </div>
        )}
      </div>

      {addingPin && !pinForm && (
        <div className="bg-brand-900/60 border-t border-brand-700 px-4 py-2 text-sm text-brand-300 text-center flex-shrink-0">
          ✦ Klicke auf die Karte, um einen Pin zu platzieren
        </div>
      )}
    </div>
  )
}
