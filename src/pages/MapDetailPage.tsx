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

  // Zoom & pan state
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const lastTouchDist = useRef<number | null>(null)

  // Drag state for pins
  const draggingPinId = useRef<string | null>(null)
  const dragStartPos = useRef<{ clientX: number; clientY: number } | null>(null)
  const isDragging = useRef(false)

  const mapContainerRef = useRef<HTMLDivElement>(null)
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
      setImgSize({ w: imgRef.current.naturalWidth, h: imgRef.current.naturalHeight })
    }
  }

  // ── Zoom helpers ────────────────────────────────────────────────────────────
  const clampZoom = (z: number) => Math.min(Math.max(z, 0.5), 5)

  // Attach native (non-passive) wheel listener so preventDefault works
  useEffect(() => {
    const container = mapContainerRef.current
    if (!container) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = container.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
      setZoom(prev => {
        const next = clampZoom(prev * factor)
        const scale = next / prev
        setPan(p => ({
          x: cx - scale * (cx - p.x),
          y: cy - scale * (cy - p.y),
        }))
        return next
      })
    }

    container.addEventListener('wheel', onWheel, { passive: false })
    return () => container.removeEventListener('wheel', onWheel)
  }, [])

  // Touch pinch-to-zoom — also needs non-passive touchmove
  useEffect(() => {
    const container = mapContainerRef.current
    if (!container) return

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && lastTouchDist.current !== null) {
        e.preventDefault()
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const dist = Math.sqrt(dx * dx + dy * dy)
        const factor = dist / lastTouchDist.current
        lastTouchDist.current = dist

        const rect = container.getBoundingClientRect()
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top

        setZoom(prev => {
          const next = clampZoom(prev * factor)
          const scale = next / prev
          setPan(p => ({
            x: cx - scale * (cx - p.x),
            y: cy - scale * (cy - p.y),
          }))
          return next
        })
      }
    }

    container.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => container.removeEventListener('touchmove', onTouchMove)
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastTouchDist.current = Math.sqrt(dx * dx + dy * dy)
    }
  }, [])

  // Kept as stub — actual logic is in the native listener above
  const handleTouchMove = useCallback((_e: React.TouchEvent<HTMLDivElement>) => {
    // handled by native non-passive listener
  }, [])

  const handleTouchEnd = useCallback(() => {
    lastTouchDist.current = null
  }, [])

  // ── Image click for placing pins ────────────────────────────────────────────
  const getImageCoords = useCallback((clientX: number, clientY: number): { x: number; y: number } | null => {
    const img = imgRef.current
    if (!img) return null
    const rect = img.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * 100
    const y = ((clientY - rect.top) / rect.height) * 100
    if (x < 0 || x > 100 || y < 0 || y > 100) return null
    return { x, y }
  }, [])

  const handleImageClick = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    if (!addingPin || !canEdit) return
    e.stopPropagation()
    const coords = getImageCoords(e.clientX, e.clientY)
    if (!coords) return
    setPinForm({ ...coords, title: '', notes: '', related_article_id: '', visibility: 'players', dsa_date_str: null })
    setPinDsaDate(null)
  }, [addingPin, canEdit, getImageCoords])

  // ── Drag & Drop pins ────────────────────────────────────────────────────────
  const updatePinMutation = useMutation({
    mutationFn: ({ pinId, x, y }: { pinId: string; x: number; y: number }) =>
      mapService.updatePin(pinId, { x, y }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['map-pins', id] })
    },
    onError: () => toast.error('Position konnte nicht gespeichert werden'),
  })

  const handlePinMouseDown = useCallback((e: React.MouseEvent, pinId: string) => {
    if (!canEdit || addingPin) return
    e.preventDefault()
    e.stopPropagation()
    draggingPinId.current = pinId
    dragStartPos.current = { clientX: e.clientX, clientY: e.clientY }
    isDragging.current = false

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!dragStartPos.current) return
      const dx = moveEvent.clientX - dragStartPos.current.clientX
      const dy = moveEvent.clientY - dragStartPos.current.clientY
      if (!isDragging.current && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
        isDragging.current = true
      }
      if (!isDragging.current) return

      const coords = getImageCoords(moveEvent.clientX, moveEvent.clientY)
      if (!coords || !draggingPinId.current) return

      // Optimistically update pin position in DOM
      const el = document.getElementById(`pin-${draggingPinId.current}`)
      if (el) {
        el.style.left = `${coords.x}%`
        el.style.top = `${coords.y}%`
      }
    }

    const onMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)

      if (isDragging.current && draggingPinId.current) {
        const coords = getImageCoords(upEvent.clientX, upEvent.clientY)
        if (coords) {
          updatePinMutation.mutate({ pinId: draggingPinId.current, x: coords.x, y: coords.y })
        } else {
          // Snap back by refetching
          qc.invalidateQueries({ queryKey: ['map-pins', id] })
        }
      } else {
        // It was a click, not a drag
        if (draggingPinId.current && !addingPin) {
          setSelectedPin(prev => prev === draggingPinId.current ? null : draggingPinId.current!)
        }
      }

      draggingPinId.current = null
      dragStartPos.current = null
      isDragging.current = false
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [canEdit, addingPin, getImageCoords, updatePinMutation, qc, id])

  // Touch drag for pins
  const handlePinTouchStart = useCallback((e: React.TouchEvent, pinId: string) => {
    if (!canEdit || addingPin || e.touches.length !== 1) return
    e.stopPropagation()
    const touch = e.touches[0]
    draggingPinId.current = pinId
    dragStartPos.current = { clientX: touch.clientX, clientY: touch.clientY }
    isDragging.current = false
  }, [canEdit, addingPin])

  const handlePinTouchMove = useCallback((e: React.TouchEvent, pinId: string) => {
    if (draggingPinId.current !== pinId || e.touches.length !== 1) return
    e.stopPropagation()
    const touch = e.touches[0]
    if (!dragStartPos.current) return
    const dx = touch.clientX - dragStartPos.current.clientX
    const dy = touch.clientY - dragStartPos.current.clientY
    if (!isDragging.current && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      isDragging.current = true
    }
    if (!isDragging.current) return

    const coords = getImageCoords(touch.clientX, touch.clientY)
    if (!coords) return
    const el = document.getElementById(`pin-${pinId}`)
    if (el) {
      el.style.left = `${coords.x}%`
      el.style.top = `${coords.y}%`
    }
  }, [getImageCoords])

  const handlePinTouchEnd = useCallback((e: React.TouchEvent, pinId: string) => {
    if (draggingPinId.current !== pinId) return
    if (isDragging.current) {
      const touch = e.changedTouches[0]
      const coords = getImageCoords(touch.clientX, touch.clientY)
      if (coords) {
        updatePinMutation.mutate({ pinId, x: coords.x, y: coords.y })
      } else {
        qc.invalidateQueries({ queryKey: ['map-pins', id] })
      }
    } else {
      if (!addingPin) setSelectedPin(prev => prev === pinId ? null : pinId)
    }
    draggingPinId.current = null
    dragStartPos.current = null
    isDragging.current = false
  }, [getImageCoords, updatePinMutation, qc, id, addingPin])

  // ── Mutations ───────────────────────────────────────────────────────────────
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
            {/* Zoom controls */}
            <div className="flex items-center gap-1 bg-surface-700 rounded-lg px-2">
              <button onClick={() => setZoom(z => clampZoom(z / 1.25))} className="btn-ghost p-1 text-slate-400 text-xs">−</button>
              <span className="text-xs text-slate-400 w-12 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => clampZoom(z * 1.25))} className="btn-ghost p-1 text-slate-400 text-xs">+</button>
              <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }} className="btn-ghost p-1 text-slate-500 text-xs ml-1" title="Reset">↺</button>
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
        {/* Map area — overflow hidden, zoom via transform */}
        <div
          ref={mapContainerRef}
          className={`flex-1 overflow-hidden bg-surface-900 relative ${addingPin ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ touchAction: 'none' }}
        >
          {/* Transformed map canvas */}
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              display: 'inline-block',
              position: 'relative',
              lineHeight: 0,
              userSelect: 'none',
            }}
          >
            <img
              ref={imgRef}
              src={imageUrl}
              alt={map.title}
              className="block max-w-none"
              style={{ maxWidth: 'none' }}
              onClick={handleImageClick}
              onLoad={handleImageLoad}
              draggable={false}
            />

            {/* SVG overlay for chronological path */}
            {showPath && chronoPins.length >= 2 && imgRef.current && (
              <svg
                className="absolute inset-0 pointer-events-none"
                width={imgRef.current.offsetWidth}
                height={imgRef.current.offsetHeight}
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
                  const iw = imgRef.current!.offsetWidth
                  const ih = imgRef.current!.offsetHeight
                  const x1 = (prev.x / 100) * iw
                  const y1 = (prev.y / 100) * ih
                  const x2 = (pin.x / 100) * iw
                  const y2 = (pin.y / 100) * ih
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
                {/* Order numbers */}
                {chronoPins.map((pin, i) => {
                  const iw = imgRef.current!.offsetWidth
                  const ih = imgRef.current!.offsetHeight
                  // Position the order badge above the pin dot (12px above center)
                  const cx = (pin.x / 100) * iw
                  const cy = (pin.y / 100) * ih - 12
                  return (
                    <g key={`order-${pin.id}`}>
                      <circle cx={cx} cy={cy} r="9" fill="#1a35f5" opacity="0.9" />
                      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="9" fontWeight="bold" fill="white" fontFamily="Inter, system-ui, sans-serif">
                        {i + 1}
                      </text>
                    </g>
                  )
                })}
              </svg>
            )}

            {/* Render pins
                KEY FIX: The pin anchor point is at (x%, y%) = the exact click position.
                The circle icon is centered on that point via translate(-50%, -50%).
                Label and date are appended BELOW the icon, not affecting the anchor. */}
            {filteredPins.map(pin => {
              const typedPin = pin as PinWithDate
              const isChronoPinItem = chronoPins.some(p => p.id === pin.id)
              const isSelected = selectedPin === pin.id
              return (
                <div
                  id={`pin-${pin.id}`}
                  key={pin.id}
                  onMouseDown={e => handlePinMouseDown(e, pin.id)}
                  onTouchStart={e => handlePinTouchStart(e, pin.id)}
                  onTouchMove={e => handlePinTouchMove(e, pin.id)}
                  onTouchEnd={e => handlePinTouchEnd(e, pin.id)}
                  style={{
                    position: 'absolute',
                    left: `${pin.x}%`,
                    top: `${pin.y}%`,
                    // Do NOT use transform to offset — we want (left, top) to be the exact anchor
                    pointerEvents: 'auto',
                    cursor: canEdit && !addingPin ? 'grab' : 'pointer',
                    // The content is rendered offset so the dot center aligns with (left, top)
                  }}
                  title={pin.title}
                >
                  {/* This inner wrapper shifts content so the dot center sits at the anchor */}
                  <div style={{ position: 'absolute', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {/* The pin dot — centered exactly at anchor */}
                    <div className={`transition-transform ${isSelected ? 'scale-125' : 'hover:scale-110'}`}>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-lg ${
                        pin.visibility === 'gm'
                          ? 'bg-amber-500 border-amber-300'
                          : isChronoPinItem
                            ? 'bg-brand-500 border-brand-200 ring-2 ring-brand-400/40'
                            : 'bg-brand-500 border-brand-300'
                      }`}>
                        <MapPin size={12} className="text-white" />
                      </div>
                    </div>
                    {/* Label and date are appended below — they don't shift the anchor */}
                    <div className="mt-1 flex flex-col items-center pointer-events-none select-none">
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

            {/* Ghost pin while filling form — same anchor logic */}
            {pinForm && (
              <div
                style={{
                  position: 'absolute',
                  left: `${pinForm.x}%`,
                  top: `${pinForm.y}%`,
                  pointerEvents: 'none',
                }}
              >
                <div style={{ position: 'absolute', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
                    {canEdit && (
                      <span className="badge bg-surface-600 text-slate-400 text-xs">Ziehen zum Verschieben</span>
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

      {/* Chronological legend */}
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
