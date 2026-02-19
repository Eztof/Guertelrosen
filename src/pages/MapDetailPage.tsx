import { useState, useRef, useCallback, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { mapService } from '@/services/map.service'
import { articleService } from '@/services/article.service'
import { assetService } from '@/services/asset.service'
import { useWorld } from '@/hooks/useWorld'
import { ArrowLeft, Plus, Trash2, X, MapPin, Eye, EyeOff, GitCommitHorizontal } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import { LoadingScreen } from '@/components/ui/Spinner'
import DsaDatePicker, { DsaDateBadge } from '@/components/ui/DsaDatePicker'
import type { DsaDate } from '@/lib/dsaCalendar'
import { dsaDateToString, dsaDateFromString, dsaDateToSortKey, formatDsaDate } from '@/lib/dsaCalendar'
import toast from 'react-hot-toast'
import type { Visibility } from '@/types'

interface PinForm {
  x: number
  y: number
  title: string
  notes: string
  related_article_id: string
  visibility: Visibility
  dsa_date_str: string | null
}

// Extend pin type to include DSA date fields stored in notes JSON or meta
type PinWithDate = Awaited<ReturnType<typeof mapService.getPins>>[number] & {
  dsa_date_str?: string | null
  dsa_date_sort?: number | null
}

export default function MapDetailPage({ worldId }: { worldId: string }) {
  const { id } = useParams<{ id: string }>()
  const { canEdit, isGm } = useWorld()
  const qc = useQueryClient()

  const [addingPin, setAddingPin] = useState(false)
  const [pinForm, setPinForm] = useState<PinForm | null>(null)
  const [selectedPin, setSelectedPin] = useState<string | null>(null)
  const [showGmPins, setShowGmPins] = useState(true)
  const [showPath, setShowPath] = useState(true)
  const [pinDsaDate, setPinDsaDate] = useState<DsaDate | null>(null)

  // For SVG path overlay we need the image dimensions
  const imgRef = useRef<HTMLImageElement>(null)
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null)

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

  const handleImageLoad = () => {
    if (imgRef.current) {
      setImgSize({ w: imgRef.current.offsetWidth, h: imgRef.current.offsetHeight })
    }
  }

  useEffect(() => {
    const handleResize = () => {
      if (imgRef.current) {
        setImgSize({ w: imgRef.current.offsetWidth, h: imgRef.current.offsetHeight })
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleImageClick = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    if (!addingPin || !canEdit) return
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setPinForm({ x, y, title: '', notes: '', related_article_id: '', visibility: 'players', dsa_date_str: null })
    setPinDsaDate(null)
  }, [addingPin, canEdit])

  const createPinMutation = useMutation({
    mutationFn: (form: PinForm) => mapService.createPin(id!, {
      x: form.x, y: form.y, title: form.title,
      notes: form.notes || undefined,
      related_article_id: form.related_article_id || null,
      visibility: form.visibility,
      dsa_date_str: form.dsa_date_str || null,
      dsa_date_sort: form.dsa_date_str ? dsaDateToSortKey(dsaDateFromString(form.dsa_date_str)!) : null,
    }),
    onSuccess: () => {
      toast.success('Pin gesetzt!')
      qc.invalidateQueries({ queryKey: ['map-pins', id] })
      setPinForm(null)
      setPinDsaDate(null)
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

  const visiblePins = (pins as PinWithDate[] ?? []).filter(p => isGm || p.visibility !== 'gm')
  const filteredPins = visiblePins.filter(p => !isGm ? true : (showGmPins || p.visibility !== 'gm'))

  // Build chronological path from pins that have a DSA date
  const chronoPins = filteredPins
    .filter(p => p.dsa_date_sort != null)
    .sort((a, b) => (a.dsa_date_sort ?? 0) - (b.dsa_date_sort ?? 0))

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
            {chronoPins.length >= 2 && (
              <button onClick={() => setShowPath(!showPath)}
                className={`btn-ghost ${showPath ? 'text-brand-400' : 'text-slate-500'}`}
                title="Zeitlichen Pfad anzeigen">
                <GitCommitHorizontal size={16} /> Pfad
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
        {/* Map area */}
        <div className="flex-1 overflow-auto bg-surface-900 p-4">
          <div
            className={`relative inline-block select-none ${addingPin ? 'cursor-crosshair' : ''}`}
            style={{ lineHeight: 0 }}
          >
            <img
              ref={imgRef}
              src={imageUrl}
              alt={map.title}
              className="block max-w-full h-auto"
              onClick={handleImageClick}
              onLoad={handleImageLoad}
              draggable={false}
            />

            {/* SVG overlay for chronological path */}
            {showPath && chronoPins.length >= 2 && imgSize && (
              <svg
                className="absolute inset-0 pointer-events-none"
                width={imgSize.w}
                height={imgSize.h}
                style={{ position: 'absolute', top: 0, left: 0 }}
              >
                <defs>
                  <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                    <polygon points="0 0, 8 3, 0 6" fill="#3355ff" opacity="0.8" />
                  </marker>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                {chronoPins.map((pin, i) => {
                  if (i === 0) return null
                  const prev = chronoPins[i - 1]
                  const x1 = (prev.x / 100) * imgSize.w
                  const y1 = (prev.y / 100) * imgSize.h
                  const x2 = (pin.x / 100) * imgSize.w
                  const y2 = (pin.y / 100) * imgSize.h

                  // Midpoint for curved path
                  const mx = (x1 + x2) / 2
                  const my = (y1 + y2) / 2 - 30

                  return (
                    <g key={`path-${prev.id}-${pin.id}`}>
                      <path
                        d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
                        fill="none"
                        stroke="#3355ff"
                        strokeWidth="2"
                        strokeDasharray="6 4"
                        opacity="0.6"
                        markerEnd="url(#arrowhead)"
                        filter="url(#glow)"
                      />
                      {/* Step number badge on midpoint */}
                      <circle
                        cx={mx + (x2 - x1) * 0.05}
                        cy={my + (y2 - y1) * 0.05 - 8}
                        r="9"
                        fill="#1a35f5"
                        opacity="0.85"
                      />
                      <text
                        x={mx + (x2 - x1) * 0.05}
                        y={my + (y2 - y1) * 0.05 - 4}
                        textAnchor="middle"
                        fontSize="9"
                        fontWeight="bold"
                        fill="white"
                        fontFamily="Inter, system-ui, sans-serif"
                      >
                        {i}
                      </text>
                    </g>
                  )
                })}
                {/* Order numbers on the pins themselves */}
                {chronoPins.map((pin, i) => {
                  const cx = (pin.x / 100) * imgSize.w
                  const cy = (pin.y / 100) * imgSize.h - 28
                  return (
                    <g key={`order-${pin.id}`}>
                      <circle cx={cx} cy={cy} r="9" fill="#1a35f5" opacity="0.9" />
                      <text
                        x={cx} y={cy + 4}
                        textAnchor="middle"
                        fontSize="9"
                        fontWeight="bold"
                        fill="white"
                        fontFamily="Inter, system-ui, sans-serif"
                      >
                        {i + 1}
                      </text>
                    </g>
                  )
                })}
              </svg>
            )}

            {/* Render pins */}
            {filteredPins.map(pin => {
              const typedPin = pin as PinWithDate
              const isChronoPinItem = chronoPins.some(p => p.id === pin.id)
              return (
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
                        : isChronoPinItem
                          ? 'bg-brand-500 border-brand-200 ring-2 ring-brand-400/40'
                          : 'bg-brand-500 border-brand-300'
                    }`}>
                      <MapPin size={12} className="text-white" />
                    </div>
                    <div className="text-xs text-white bg-black/75 px-1.5 py-0.5 rounded mt-0.5 whitespace-nowrap max-w-[8rem] truncate">
                      {pin.title}
                    </div>
                    {typedPin.dsa_date_str && (
                      <div className="text-[10px] text-brand-300 bg-black/70 px-1 py-0.5 rounded mt-0.5 whitespace-nowrap">
                        ⚔ {formatDsaStr(typedPin.dsa_date_str)}
                      </div>
                    )}
                  </div>
                </button>
              )
            })}

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
                  <label className="label text-xs flex items-center gap-1">
                    <span className="text-brand-400">⚔</span> Aventurisches Datum (optional)
                  </label>
                  <DsaDatePicker
                    value={pinDsaDate}
                    onChange={d => {
                      setPinDsaDate(d)
                      setPinForm(p => p ? { ...p, dsa_date_str: d ? dsaDateToString(d) : null } : null)
                    }}
                    showWeekday={false}
                    placeholder="Datum wählen…"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Pins mit Datum werden chronologisch verbunden</p>
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
              const pin = (pins as PinWithDate[])?.find(p => p.id === selectedPin)
              if (!pin) return null
              const chronoIndex = chronoPins.findIndex(p => p.id === pin.id)
              return (
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-100">{pin.title}</h3>
                    <button onClick={() => setSelectedPin(null)} className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {pin.visibility === 'gm' && <span className="badge bg-amber-900/50 text-amber-400 text-xs">Nur GM</span>}
                    {chronoIndex >= 0 && (
                      <span className="badge bg-brand-900/50 text-brand-300 text-xs flex items-center gap-1">
                        <GitCommitHorizontal size={10} /> Station {chronoIndex + 1} von {chronoPins.length}
                      </span>
                    )}
                  </div>
                  {pin.dsa_date_str && (() => {
                    const d = dsaDateFromString(pin.dsa_date_str)
                    return d ? (
                      <div className="flex items-center gap-2 text-sm text-slate-300 bg-surface-700 rounded-lg px-3 py-2">
                        <span className="text-brand-400">⚔</span>
                        <DsaDateBadge date={d} />
                      </div>
                    ) : null
                  })()}
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

      {/* Chronological legend if path is shown */}
      {showPath && chronoPins.length >= 2 && (
        <div className="border-t border-surface-600 bg-surface-800/80 px-4 py-2 flex-shrink-0">
          <div className="flex items-center gap-1 flex-wrap">
            <GitCommitHorizontal size={12} className="text-brand-400 flex-shrink-0" />
            <span className="text-xs text-slate-500 mr-2">Zeitlicher Pfad:</span>
            {chronoPins.map((pin, i) => (
              <div key={pin.id} className="flex items-center gap-1">
                {i > 0 && <span className="text-slate-600 text-xs">→</span>}
                <button
                  onClick={() => setSelectedPin(pin.id)}
                  className="text-xs text-brand-300 hover:text-brand-200 flex items-center gap-1"
                >
                  <span className="w-4 h-4 rounded-full bg-brand-600 text-white text-[9px] flex items-center justify-center font-bold">{i + 1}</span>
                  <span className="truncate max-w-[80px]">{pin.title}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function formatDsaStr(str: string): string {
  const d = dsaDateFromString(str)
  if (!d) return str
  return formatDsaDate(d, { short: true })
}
