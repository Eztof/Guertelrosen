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

type PinWithDate = Awaited<ReturnType<typeof mapService.getPins>>[number] & {
  dsa_date_str?: string | null
  dsa_date_sort?: number | null
}

// ── Zoom/Pan state lives in a ref to avoid re-render overhead ────────────────
interface Transform {
  x: number   // pan offset in pixels
  y: number
  scale: number
}

const MIN_SCALE = 0.25
const MAX_SCALE = 8
const ZOOM_FACTOR = 1.12

function clampScale(s: number) {
  return Math.min(Math.max(s, MIN_SCALE), MAX_SCALE)
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

  // ── Transform state ──────────────────────────────────────────────────────
  // We keep transform in state (for re-rendering) but use a ref to avoid
  // stale closures in event handlers.
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 })
  const transformRef = useRef<Transform>({ x: 0, y: 0, scale: 1 })

  const applyTransform = useCallback((t: Transform) => {
    transformRef.current = t
    setTransform(t)
  }, [])

  // ── Refs ──────────────────────────────────────────────────────────────────
  const outerRef = useRef<HTMLDivElement>(null)   // the overflow:hidden viewport
  const imgRef = useRef<HTMLImageElement>(null)
  const [imgLoaded, setImgLoaded] = useState(false)

  // pan state
  const isPanning = useRef(false)
  const panStart = useRef({ clientX: 0, clientY: 0, tx: 0, ty: 0 })

  // touch pinch
  const lastPinchDist = useRef<number | null>(null)
  const lastPinchCenter = useRef<{ x: number; y: number } | null>(null)

  // drag pin
  const draggingPinId = useRef<string | null>(null)
  const dragDidMove = useRef(false)
  const dragAnchor = useRef<{ clientX: number; clientY: number } | null>(null)

  // ── Queries ───────────────────────────────────────────────────────────────
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

  // ── Wheel zoom (non-passive, mouse-centered) ──────────────────────────────
  useEffect(() => {
    const el = outerRef.current
    if (!el) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      // Mouse position relative to the viewport div
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top

      const t = transformRef.current
      const factor = e.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR
      const newScale = clampScale(t.scale * factor)

      // Zoom toward mouse: keep the point under the mouse fixed
      // (mx - tx) / scale == (mx - newTx) / newScale
      // => newTx = mx - (mx - tx) * (newScale / scale)
      const newX = mx - (mx - t.x) * (newScale / t.scale)
      const newY = my - (my - t.y) * (newScale / t.scale)

      applyTransform({ x: newX, y: newY, scale: newScale })
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [applyTransform])

  // ── Pan (mouse) ───────────────────────────────────────────────────────────
  const onMouseDownPan = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Don't start pan if clicking a pin or if adding a pin
    if (addingPin) return
    if ((e.target as HTMLElement).closest('[data-pin]')) return
    isPanning.current = true
    panStart.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      tx: transformRef.current.x,
      ty: transformRef.current.y,
    }
    e.currentTarget.style.cursor = 'grabbing'
  }, [addingPin])

  const onMouseMovePan = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning.current) return
    const dx = e.clientX - panStart.current.clientX
    const dy = e.clientY - panStart.current.clientY
    applyTransform({
      ...transformRef.current,
      x: panStart.current.tx + dx,
      y: panStart.current.ty + dy,
    })
  }, [applyTransform])

  const onMouseUpPan = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    isPanning.current = false
    e.currentTarget.style.cursor = addingPin ? 'crosshair' : 'grab'
  }, [addingPin])

  // ── Touch handlers ────────────────────────────────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const a = e.touches[0], b = e.touches[1]
      const dx = a.clientX - b.clientX, dy = a.clientY - b.clientY
      lastPinchDist.current = Math.sqrt(dx * dx + dy * dy)
      lastPinchCenter.current = {
        x: (a.clientX + b.clientX) / 2,
        y: (a.clientY + b.clientY) / 2,
      }
    } else if (e.touches.length === 1) {
      isPanning.current = true
      panStart.current = {
        clientX: e.touches[0].clientX,
        clientY: e.touches[0].clientY,
        tx: transformRef.current.x,
        ty: transformRef.current.y,
      }
    }
  }, [])

  useEffect(() => {
    const el = outerRef.current
    if (!el) return
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && lastPinchDist.current !== null && lastPinchCenter.current !== null) {
        e.preventDefault()
        const a = e.touches[0], b = e.touches[1]
        const dx = a.clientX - b.clientX, dy = a.clientY - b.clientY
        const dist = Math.sqrt(dx * dx + dy * dy)
        const factor = dist / lastPinchDist.current
        lastPinchDist.current = dist

        const rect = el.getBoundingClientRect()
        const cx = lastPinchCenter.current.x - rect.left
        const cy = lastPinchCenter.current.y - rect.top

        const t = transformRef.current
        const newScale = clampScale(t.scale * factor)
        const newX = cx - (cx - t.x) * (newScale / t.scale)
        const newY = cy - (cy - t.y) * (newScale / t.scale)

        lastPinchCenter.current = {
          x: (a.clientX + b.clientX) / 2,
          y: (a.clientY + b.clientY) / 2,
        }
        applyTransform({ x: newX, y: newY, scale: newScale })
      } else if (e.touches.length === 1 && isPanning.current) {
        e.preventDefault()
        const dx = e.touches[0].clientX - panStart.current.clientX
        const dy = e.touches[0].clientY - panStart.current.clientY
        applyTransform({
          ...transformRef.current,
          x: panStart.current.tx + dx,
          y: panStart.current.ty + dy,
        })
      }
    }
    const onTouchEnd = () => {
      lastPinchDist.current = null
      lastPinchCenter.current = null
      isPanning.current = false
    }
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)
    return () => {
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [applyTransform])

  // ── Image coordinate helpers ──────────────────────────────────────────────
  /**
   * Convert client (screen) coordinates to image-percentage coordinates (0-100).
   * The image is rendered at position (tx, ty) with scale `scale` inside the outer div.
   */
  const clientToImagePercent = useCallback((clientX: number, clientY: number): { x: number; y: number } | null => {
    const outer = outerRef.current
    const img = imgRef.current
    if (!outer || !img) return null
    const rect = outer.getBoundingClientRect()

    // Position within outer div
    const px = clientX - rect.left
    const py = clientY - rect.top

    const t = transformRef.current
    // Image in the transformed space starts at (t.x, t.y)
    // Image rendered width = naturalWidth * scale (but we use CSS which scales the container)
    // Actually the image fills 100% of the inner div, so its rendered size is:
    //   w = img.naturalWidth * t.scale  ... but we don't care about natural size
    // The img element's rendered rect tells us the actual pixel rect on screen.
    const imgRect = img.getBoundingClientRect()
    const ix = clientX - imgRect.left
    const iy = clientY - imgRect.top
    const x = (ix / imgRect.width) * 100
    const y = (iy / imgRect.height) * 100
    if (x < 0 || x > 100 || y < 0 || y > 100) return null
    return { x, y }
  }, [])

  // ── Image click → place pin ───────────────────────────────────────────────
  const onImageClick = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    if (!addingPin || !canEdit) return
    e.stopPropagation()
    const coords = clientToImagePercent(e.clientX, e.clientY)
    if (!coords) return
    setPinForm({ ...coords, title: '', notes: '', related_article_id: '', visibility: 'players', dsa_date_str: null })
    setPinDsaDate(null)
  }, [addingPin, canEdit, clientToImagePercent])

  // ── Pin drag ──────────────────────────────────────────────────────────────
  const updatePinMutation = useMutation({
    mutationFn: ({ pinId, x, y }: { pinId: string; x: number; y: number }) =>
      mapService.updatePin(pinId, { x, y }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['map-pins', id] }),
    onError: () => {
      toast.error('Position konnte nicht gespeichert werden')
      qc.invalidateQueries({ queryKey: ['map-pins', id] })
    },
  })

  const onPinMouseDown = useCallback((e: React.MouseEvent, pinId: string) => {
    if (!canEdit || addingPin) return
    e.preventDefault()
    e.stopPropagation()
    draggingPinId.current = pinId
    dragDidMove.current = false
    dragAnchor.current = { clientX: e.clientX, clientY: e.clientY }

    const onMove = (me: MouseEvent) => {
      if (!dragAnchor.current) return
      const dx = Math.abs(me.clientX - dragAnchor.current.clientX)
      const dy = Math.abs(me.clientY - dragAnchor.current.clientY)
      if (!dragDidMove.current && (dx > 4 || dy > 4)) dragDidMove.current = true
      if (!dragDidMove.current) return

      const coords = clientToImagePercent(me.clientX, me.clientY)
      if (!coords || !draggingPinId.current) return
      const el = document.getElementById(`pin-${draggingPinId.current}`)
      if (el) { el.style.left = `${coords.x}%`; el.style.top = `${coords.y}%` }
    }

    const onUp = (ue: MouseEvent) => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      if (dragDidMove.current && draggingPinId.current) {
        const coords = clientToImagePercent(ue.clientX, ue.clientY)
        if (coords) updatePinMutation.mutate({ pinId: draggingPinId.current, x: coords.x, y: coords.y })
        else qc.invalidateQueries({ queryKey: ['map-pins', id] })
      } else {
        if (draggingPinId.current && !addingPin) {
          setSelectedPin(prev => prev === draggingPinId.current ? null : draggingPinId.current!)
        }
      }
      draggingPinId.current = null; dragAnchor.current = null; dragDidMove.current = false
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [canEdit, addingPin, clientToImagePercent, updatePinMutation, qc, id])

  // ── Mutations ─────────────────────────────────────────────────────────────
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
      setPinForm(null); setPinDsaDate(null); setAddingPin(false)
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

  // ── Derived data ──────────────────────────────────────────────────────────
  const visiblePins = (pins as PinWithDate[] ?? []).filter(p => isGm || p.visibility !== 'gm')
  const filteredPins = visiblePins.filter(p => !isGm ? true : (showGmPins || p.visibility !== 'gm'))
  const chronoPins = filteredPins
    .filter(p => p.dsa_date_sort != null)
    .sort((a, b) => (a.dsa_date_sort ?? 0) - (b.dsa_date_sort ?? 0))

  if (mapLoading || pinsLoading) return <LoadingScreen />
  if (!map) return <div className="p-8 text-center text-slate-400">Karte nicht gefunden</div>

  const imageUrl = assetService.getPublicUrl(map.image_path)
  const panelOpen = !!(selectedPin || pinForm)

  const { x: tx, y: ty, scale } = transform

  return (
    <div className="h-screen flex flex-col">
      <PageHeader
        title={map.title}
        breadcrumbs={[{ label: 'Karten', href: '#/maps' }, { label: map.title }]}
        actions={
          <div className="flex gap-2 flex-wrap">
            <Link to="/maps" className="btn-ghost"><ArrowLeft size={16} /> Zurück</Link>

            {/* Zoom controls */}
            <div className="flex items-center gap-1 bg-surface-700 rounded-lg px-2">
              <button
                onClick={() => {
                  const outer = outerRef.current
                  if (!outer) return
                  const rect = outer.getBoundingClientRect()
                  const cx = rect.width / 2, cy = rect.height / 2
                  const t = transformRef.current
                  const newScale = clampScale(t.scale / 1.25)
                  applyTransform({ x: cx - (cx - t.x) * (newScale / t.scale), y: cy - (cy - t.y) * (newScale / t.scale), scale: newScale })
                }}
                className="btn-ghost p-1 text-slate-400 text-xs">−
              </button>
              <span className="text-xs text-slate-400 w-12 text-center">{Math.round(scale * 100)}%</span>
              <button
                onClick={() => {
                  const outer = outerRef.current
                  if (!outer) return
                  const rect = outer.getBoundingClientRect()
                  const cx = rect.width / 2, cy = rect.height / 2
                  const t = transformRef.current
                  const newScale = clampScale(t.scale * 1.25)
                  applyTransform({ x: cx - (cx - t.x) * (newScale / t.scale), y: cy - (cy - t.y) * (newScale / t.scale), scale: newScale })
                }}
                className="btn-ghost p-1 text-slate-400 text-xs">+
              </button>
              <button
                onClick={() => applyTransform({ x: 0, y: 0, scale: 1 })}
                className="btn-ghost p-1 text-slate-500 text-xs ml-1" title="Reset">↺
              </button>
            </div>

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
        {/* ── Map viewport ── */}
        <div
          ref={outerRef}
          className={`flex-1 overflow-hidden bg-surface-900 relative select-none ${addingPin ? 'cursor-crosshair' : 'cursor-grab'}`}
          style={{ touchAction: 'none' }}
          onMouseDown={onMouseDownPan}
          onMouseMove={onMouseMovePan}
          onMouseUp={onMouseUpPan}
          onMouseLeave={onMouseUpPan}
          onTouchStart={onTouchStart}
        >
          {/* ── Transformed canvas ── */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              // We use a wrapper that is translated+scaled; the image inside fills it naturally
            }}
          >
            <div
              style={{
                position: 'absolute',
                transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
                transformOrigin: '0 0',
                // Size: let the image determine its natural size
                display: 'inline-block',
                lineHeight: 0,
              }}
            >
              <img
                ref={imgRef}
                src={imageUrl}
                alt={map.title}
                draggable={false}
                onLoad={() => setImgLoaded(true)}
                onClick={onImageClick}
                style={{ display: 'block', maxWidth: 'none', userSelect: 'none' }}
              />

              {/* ── SVG overlay for chronological path ── */}
              {imgLoaded && showPath && chronoPins.length >= 2 && imgRef.current && (() => {
                const iw = imgRef.current.naturalWidth || imgRef.current.offsetWidth
                const ih = imgRef.current.naturalHeight || imgRef.current.offsetHeight
                return (
                  <svg
                    width={iw}
                    height={ih}
                    style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible' }}
                  >
                    <defs>
                      <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                        <polygon points="0 0, 8 3, 0 6" fill="#3355ff" opacity="0.8" />
                      </marker>
                    </defs>
                    {chronoPins.map((pin, i) => {
                      if (i === 0) return null
                      const prev = chronoPins[i - 1]
                      const x1 = (prev.x / 100) * iw, y1 = (prev.y / 100) * ih
                      const x2 = (pin.x / 100) * iw,  y2 = (pin.y / 100) * ih
                      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - 30
                      return (
                        <g key={`${prev.id}-${pin.id}`}>
                          <path d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
                            fill="none" stroke="#3355ff" strokeWidth="2"
                            strokeDasharray="6 4" opacity="0.6" markerEnd="url(#arrowhead)" />
                        </g>
                      )
                    })}
                    {chronoPins.map((pin, i) => {
                      const cx = (pin.x / 100) * iw
                      const cy = (pin.y / 100) * ih - 14
                      return (
                        <g key={`order-${pin.id}`}>
                          <circle cx={cx} cy={cy} r="9" fill="#1a35f5" opacity="0.9" />
                          <text x={cx} y={cy + 4} textAnchor="middle" fontSize="9" fontWeight="bold"
                            fill="white" fontFamily="Inter, system-ui, sans-serif">{i + 1}</text>
                        </g>
                      )
                    })}
                  </svg>
                )
              })()}

              {/* ── Pins ── */}
              {imgLoaded && imgRef.current && filteredPins.map(pin => {
                const typedPin = pin as PinWithDate
                const isChronoPin = chronoPins.some(p => p.id === pin.id)
                const isSelected = selectedPin === pin.id
                const iw = imgRef.current!.naturalWidth || imgRef.current!.offsetWidth
                const ih = imgRef.current!.naturalHeight || imgRef.current!.offsetHeight

                return (
                  <div
                    id={`pin-${pin.id}`}
                    key={pin.id}
                    data-pin="true"
                    onMouseDown={e => onPinMouseDown(e, pin.id)}
                    style={{
                      position: 'absolute',
                      left: `${pin.x}%`,
                      top: `${pin.y}%`,
                      transform: 'translate(-50%, -50%)',
                      cursor: canEdit && !addingPin ? 'grab' : 'pointer',
                      zIndex: isSelected ? 20 : 10,
                    }}
                    title={pin.title}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div className={`transition-transform ${isSelected ? 'scale-125' : 'hover:scale-110'}`}>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-lg ${
                          pin.visibility === 'gm'
                            ? 'bg-amber-500 border-amber-300'
                            : isChronoPin
                              ? 'bg-brand-500 border-brand-200 ring-2 ring-brand-400/40'
                              : 'bg-brand-500 border-brand-300'
                        }`}>
                          <MapPin size={12} className="text-white" />
                        </div>
                      </div>
                      <div className="mt-1 flex flex-col items-center pointer-events-none">
                        <div className="text-xs text-white bg-black/75 px-1.5 py-0.5 rounded whitespace-nowrap max-w-[8rem] truncate">
                          {pin.title}
                        </div>
                        {typedPin.dsa_date_str && (
                          <div className="text-[10px] text-brand-300 bg-black/70 px-1 py-0.5 rounded mt-0.5 whitespace-nowrap">
                            ⚔ {formatDsaStr(typedPin.dsa_date_str)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* ── Ghost pin while placing ── */}
              {pinForm && (
                <div style={{ position: 'absolute', left: `${pinForm.x}%`, top: `${pinForm.y}%`, transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 30 }}>
                  <div className="w-6 h-6 rounded-full border-2 bg-emerald-500 border-emerald-300 flex items-center justify-center shadow-lg animate-pulse">
                    <MapPin size={12} className="text-white" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Side panel ── */}
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
                  <input value={pinForm.title}
                    onChange={e => setPinForm(p => p ? { ...p, title: e.target.value } : null)}
                    className="input text-sm" placeholder="Ort / Marker…" autoFocus />
                </div>
                <div>
                  <label className="label text-xs">Notizen</label>
                  <textarea value={pinForm.notes}
                    onChange={e => setPinForm(p => p ? { ...p, notes: e.target.value } : null)}
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
                    {canEdit && <span className="badge bg-surface-600 text-slate-400 text-xs">Ziehen zum Verschieben</span>}
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

      {/* Chronological legend */}
      {showPath && chronoPins.length >= 2 && (
        <div className="border-t border-surface-600 bg-surface-800/80 px-4 py-2 flex-shrink-0">
          <div className="flex items-center gap-1 flex-wrap">
            <GitCommitHorizontal size={12} className="text-brand-400 flex-shrink-0" />
            <span className="text-xs text-slate-500 mr-2">Zeitlicher Pfad:</span>
            {chronoPins.map((pin, i) => (
              <div key={pin.id} className="flex items-center gap-1">
                {i > 0 && <span className="text-slate-600 text-xs">→</span>}
                <button onClick={() => setSelectedPin(pin.id)}
                  className="text-xs text-brand-300 hover:text-brand-200 flex items-center gap-1">
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
