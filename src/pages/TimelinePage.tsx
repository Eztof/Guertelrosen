import { useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { timelineService, type TimelineEventInput } from '@/services/timeline.service'
import { articleService } from '@/services/article.service'
import { useWorld } from '@/hooks/useWorld'
import {
  Plus, Trash2, Edit2, X, Check, ChevronDown, ChevronUp,
  Calendar, BookOpen, Eye, EyeOff, Scroll, Clock
} from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import Modal from '@/components/ui/Modal'
import { LoadingScreen } from '@/components/ui/Spinner'
import DsaDatePicker from '@/components/ui/DsaDatePicker'
import { TYPE_CONFIG } from '@/components/ui/ArticleTypeBadge'
import type { DsaDate } from '@/lib/dsaCalendar'
import {
  dsaDateToString, dsaDateFromString, dsaDateToSortKey,
  formatDsaDate, DSA_MONTHS
} from '@/lib/dsaCalendar'
import toast from 'react-hot-toast'
import type { Visibility } from '@/types'

// ─── Color palette for event types ───────────────────────────────────────────
const TYPE_COLORS: Record<string, { bg: string; border: string; dot: string; text: string }> = {
  location:     { bg: 'bg-emerald-900/40', border: 'border-emerald-700/60', dot: 'bg-emerald-400', text: 'text-emerald-300' },
  npc:          { bg: 'bg-blue-900/40',    border: 'border-blue-700/60',    dot: 'bg-blue-400',    text: 'text-blue-300' },
  faction:      { bg: 'bg-purple-900/40',  border: 'border-purple-700/60',  dot: 'bg-purple-400',  text: 'text-purple-300' },
  item:         { bg: 'bg-yellow-900/40',  border: 'border-yellow-700/60',  dot: 'bg-yellow-400',  text: 'text-yellow-300' },
  deity:        { bg: 'bg-amber-900/40',   border: 'border-amber-700/60',   dot: 'bg-amber-400',   text: 'text-amber-300' },
  plot:         { bg: 'bg-red-900/40',     border: 'border-red-700/60',     dot: 'bg-red-400',     text: 'text-red-300' },
  rule:         { bg: 'bg-slate-700/40',   border: 'border-slate-600/60',   dot: 'bg-slate-400',   text: 'text-slate-300' },
  handout:      { bg: 'bg-teal-900/40',    border: 'border-teal-700/60',    dot: 'bg-teal-400',    text: 'text-teal-300' },
  session_report:{ bg:'bg-indigo-900/40', border: 'border-indigo-700/60',   dot: 'bg-indigo-400',  text: 'text-indigo-300' },
  note:         { bg: 'bg-surface-700/40', border: 'border-surface-500/60', dot: 'bg-slate-400',   text: 'text-slate-300' },
  default:      { bg: 'bg-brand-900/40',   border: 'border-brand-700/60',   dot: 'bg-brand-400',   text: 'text-brand-300' },
}

function getTypeColor(type?: string | null) {
  return TYPE_COLORS[type ?? ''] ?? TYPE_COLORS.default
}

// ─── Format DSA date string from storage ─────────────────────────────────────
function formatDsaStr(str: string | null | undefined, short = false): string {
  if (!str) return '?'
  const d = dsaDateFromString(str)
  if (!d) return str
  return formatDsaDate(d, { short })
}

// ─── Event Form Modal ─────────────────────────────────────────────────────────
interface EventFormProps {
  open: boolean
  onClose: () => void
  onSave: (input: TimelineEventInput) => void
  initial?: Partial<TimelineEventInput>
  loading?: boolean
  articles: { id: string; title: string; slug: string; type: string }[]
  isGm: boolean
}

function EventFormModal({ open, onClose, onSave, initial, loading, articles, isGm }: EventFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [startDate, setStartDate] = useState<DsaDate | null>(
    initial?.dsa_start_str ? dsaDateFromString(initial.dsa_start_str) : null
  )
  const [endDate, setEndDate] = useState<DsaDate | null>(
    initial?.dsa_end_str ? dsaDateFromString(initial.dsa_end_str) : null
  )
  const [articleId, setArticleId] = useState(initial?.related_article_id ?? '')
  const [visibility, setVisibility] = useState<Visibility>(initial?.visibility ?? 'players')

  const handleSave = () => {
    if (!title.trim()) { toast.error('Titel fehlt'); return }
    onSave({
      title: title.trim(),
      description: description || null,
      dsa_start_str: startDate ? dsaDateToString(startDate) : null,
      dsa_start_sort: startDate ? dsaDateToSortKey(startDate) : null,
      dsa_end_str: endDate ? dsaDateToString(endDate) : null,
      dsa_end_sort: endDate ? dsaDateToSortKey(endDate) : null,
      related_article_id: articleId || null,
      visibility,
    })
  }

  return (
    <Modal title={initial?.title ? 'Ereignis bearbeiten' : 'Neues Ereignis'} open={open} onClose={onClose} size="lg">
      <div className="space-y-4">
        <div>
          <label className="label">Titel *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} className="input" placeholder="Ereignis..." autoFocus />
        </div>
        <div>
          <label className="label">Beschreibung</label>
          <textarea value={description ?? ''} onChange={e => setDescription(e.target.value)} className="input resize-none h-20" placeholder="Was geschah..." />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label flex items-center gap-1.5">
              <span className="text-brand-400 text-sm">⚔</span> Datum (von)
            </label>
            <DsaDatePicker value={startDate} onChange={setStartDate} placeholder="Startdatum..." showWeekday={false} />
          </div>
          <div>
            <label className="label flex items-center gap-1.5">
              <span className="text-brand-400 text-sm">⚔</span> Datum (bis, optional)
            </label>
            <DsaDatePicker value={endDate} onChange={setEndDate} placeholder="Enddatum..." showWeekday={false} />
          </div>
        </div>
        <div>
          <label className="label">Verlinkter Artikel</label>
          <select value={articleId} onChange={e => setArticleId(e.target.value)} className="input">
            <option value="">— Kein Artikel —</option>
            {articles.map(a => (
              <option key={a.id} value={a.id}>
                [{TYPE_CONFIG[a.type as keyof typeof TYPE_CONFIG]?.label ?? a.type}] {a.title}
              </option>
            ))}
          </select>
        </div>
        {isGm && (
          <div>
            <label className="label">Sichtbarkeit</label>
            <select value={visibility} onChange={e => setVisibility(e.target.value as Visibility)} className="input">
              <option value="players">Alle Spieler</option>
              <option value="gm">Nur GM</option>
            </select>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="btn-secondary">Abbrechen</button>
          <button onClick={handleSave} disabled={loading} className="btn-primary">
            {loading ? 'Speichern…' : 'Speichern'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Timeline List Manager ────────────────────────────────────────────────────
interface TimelineManagerProps {
  worldId: string
  selectedId: string | null
  onSelect: (id: string) => void
  canEdit: boolean
}

function TimelineManager({ worldId, selectedId, onSelect, canEdit }: TimelineManagerProps) {
  const qc = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')

  const { data: timelines } = useQuery({
    queryKey: ['timelines', worldId],
    queryFn: () => timelineService.listTimelines(worldId),
  })

  const createMutation = useMutation({
    mutationFn: () => timelineService.createTimeline(worldId, newName, newDesc),
    onSuccess: (data) => {
      toast.success('Zeitleiste erstellt!')
      qc.invalidateQueries({ queryKey: ['timelines', worldId] })
      setCreating(false)
      setNewName(''); setNewDesc('')
      onSelect(data.id)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => timelineService.deleteTimeline(id),
    onSuccess: () => {
      toast.success('Zeitleiste gelöscht')
      qc.invalidateQueries({ queryKey: ['timelines', worldId] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="flex items-center gap-2 flex-wrap px-6 py-3 border-b border-surface-600 bg-surface-800/50">
      <Scroll size={14} className="text-slate-500 flex-shrink-0" />
      {timelines?.map(t => (
        <button
          key={t.id}
          onClick={() => onSelect(t.id)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
            selectedId === t.id
              ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/50'
              : 'bg-surface-700 text-slate-300 hover:bg-surface-600'
          }`}
        >
          {t.title}
          {canEdit && selectedId === t.id && (
            <span
              onClick={e => {
                e.stopPropagation()
                if (confirm(`"${t.title}" löschen?`)) deleteMutation.mutate(t.id)
              }}
              className="ml-1 hover:text-red-400 text-slate-400 transition-colors cursor-pointer"
            >
              <X size={12} />
            </span>
          )}
        </button>
      ))}
      {canEdit && (
        creating ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createMutation.mutate()}
              placeholder="Name..."
              className="input py-1 px-2 text-sm w-40"
            />
            <button onClick={() => createMutation.mutate()} disabled={!newName.trim()} className="btn-primary py-1 px-2 text-sm">
              <Check size={14} />
            </button>
            <button onClick={() => { setCreating(false); setNewName('') }} className="btn-ghost py-1 px-2 text-sm">
              <X size={14} />
            </button>
          </div>
        ) : (
          <button onClick={() => setCreating(true)} className="btn-ghost py-1 px-2 text-sm text-slate-400">
            <Plus size={14} /> Neu
          </button>
        )
      )}
    </div>
  )
}

// ─── Year/Month ruler ────────────────────────────────────────────────────────
function dsaSortToLabel(sort: number): string {
  const year = Math.floor(sort / 400)
  const dayOfYear = sort % 400
  const monthIdx = Math.min(Math.floor((dayOfYear - 1) / 30), 12)
  return `${DSA_MONTHS[monthIdx]?.short ?? '?'} ${year} BF`
}

interface RulerMark {
  sort: number
  label: string
  isYear: boolean
  x: number
}

function buildRuler(minSort: number, maxSort: number, totalWidth: number): RulerMark[] {
  const marks: RulerMark[] = []
  const range = maxSort - minSort || 1
  const minYear = Math.floor(minSort / 400)
  const maxYear = Math.ceil(maxSort / 400)

  for (let y = minYear; y <= maxYear; y++) {
    const yearStart = y * 400 + 1
    if (yearStart >= minSort - 100 && yearStart <= maxSort + 100) {
      marks.push({
        sort: yearStart,
        label: `${y} BF`,
        isYear: true,
        x: ((yearStart - minSort) / range) * totalWidth,
      })
    }
    // Month marks
    for (let m = 0; m < 13; m++) {
      const monthSort = y * 400 + m * 30 + 1
      if (monthSort >= minSort && monthSort <= maxSort) {
        marks.push({
          sort: monthSort,
          label: DSA_MONTHS[m]?.short ?? '',
          isYear: false,
          x: ((monthSort - minSort) / range) * totalWidth,
        })
      }
    }
  }
  return marks.sort((a, b) => a.sort - b.sort)
}

// ─── Visual Timeline ──────────────────────────────────────────────────────────
interface VisualTimelineProps {
  events: any[]
  canEdit: boolean
  isGm: boolean
  onEdit: (event: any) => void
  onDelete: (id: string) => void
  onAddAt: (sort: number) => void
}

const LANE_HEIGHT = 72
const CARD_HEIGHT = 60
const DOT_SIZE = 10
const RULER_HEIGHT = 52
const PX_PER_SORT = 3.2
const MIN_WIDTH = 800

function VisualTimeline({ events, canEdit, isGm, onEdit, onDelete, onAddAt }: VisualTimelineProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <Clock size={48} className="opacity-20 mb-4" />
        <p className="text-lg font-medium">Keine Ereignisse</p>
        <p className="text-sm text-slate-500 mt-1">Füge Ereignisse mit dem + Button hinzu</p>
      </div>
    )
  }

  const sorted = [...events].filter(e => e.dsa_start_sort != null).sort((a, b) => a.dsa_start_sort - b.dsa_start_sort)
  const unsorted = events.filter(e => e.dsa_start_sort == null)

  if (sorted.length === 0) {
    return (
      <div className="p-4">
        <p className="text-sm text-slate-500 mb-4">Ereignisse ohne Datum:</p>
        {unsorted.map(e => <UnsortedCard key={e.id} event={e} canEdit={canEdit} onEdit={onEdit} onDelete={onDelete} />)}
      </div>
    )
  }

  const minSort = sorted[0].dsa_start_sort - 30
  const maxSort = sorted[sorted.length - 1].dsa_start_sort + 150

  const totalWidth = Math.max(MIN_WIDTH, (maxSort - minSort) * PX_PER_SORT)

  // Lane assignment: greedy, avoid overlap
  const lanes: { endX: number }[] = []
  const eventLanes: number[] = []

  for (const ev of sorted) {
    const startX = ((ev.dsa_start_sort - minSort) / (maxSort - minSort)) * totalWidth
    const endSort = ev.dsa_end_sort ?? (ev.dsa_start_sort + 30)
    const endX = ((endSort - minSort) / (maxSort - minSort)) * totalWidth + 180
    let assigned = -1
    for (let l = 0; l < lanes.length; l++) {
      if (startX > lanes[l].endX + 8) {
        assigned = l
        lanes[l].endX = endX
        break
      }
    }
    if (assigned === -1) {
      assigned = lanes.length
      lanes.push({ endX })
    }
    eventLanes.push(assigned)
  }

  const numLanes = Math.max(1, lanes.length)
  const svgHeight = RULER_HEIGHT + numLanes * LANE_HEIGHT + 24

  const rulerMarks = buildRuler(minSort, maxSort, totalWidth)

  return (
    <div className="overflow-x-auto" ref={containerRef}>
      <div style={{ width: totalWidth + 64, minWidth: totalWidth + 64 }} className="relative">
        {/* SVG for spine line, dots, duration bars */}
        <svg
          width={totalWidth + 64}
          height={svgHeight}
          className="absolute top-0 left-0 pointer-events-none"
          style={{ zIndex: 1 }}
        >
          {/* Ruler background */}
          <rect x={0} y={0} width={totalWidth + 64} height={RULER_HEIGHT} fill="rgba(22,22,30,0.8)" />

          {/* Ruler marks */}
          {rulerMarks.map((m, i) => (
            <g key={i}>
              <line
                x1={m.x + 32} y1={m.isYear ? 16 : 28}
                x2={m.x + 32} y2={RULER_HEIGHT}
                stroke={m.isYear ? '#5577ff' : '#2e2e42'}
                strokeWidth={m.isYear ? 1.5 : 1}
              />
              <text
                x={m.x + 35} y={m.isYear ? 28 : 42}
                fill={m.isYear ? '#85a6ff' : '#3d3d55'}
                fontSize={m.isYear ? 11 : 9}
                fontWeight={m.isYear ? '600' : '400'}
                fontFamily="Inter, system-ui, sans-serif"
              >
                {m.label}
              </text>
            </g>
          ))}

          {/* Horizontal spine */}
          <line
            x1={32} y1={RULER_HEIGHT + 1}
            x2={totalWidth + 32} y2={RULER_HEIGHT + 1}
            stroke="#2e2e42"
            strokeWidth={2}
          />

          {/* Lane lines */}
          {Array.from({ length: numLanes }).map((_, l) => (
            <line
              key={l}
              x1={32} y1={RULER_HEIGHT + l * LANE_HEIGHT + LANE_HEIGHT}
              x2={totalWidth + 32} y2={RULER_HEIGHT + l * LANE_HEIGHT + LANE_HEIGHT}
              stroke="#1e1e2a"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          ))}

          {/* Duration bars and dots */}
          {sorted.map((ev, i) => {
            const lane = eventLanes[i]
            const startX = ((ev.dsa_start_sort - minSort) / (maxSort - minSort)) * totalWidth + 32
            const endSort = ev.dsa_end_sort ?? ev.dsa_start_sort
            const endX = ev.dsa_end_sort
              ? ((ev.dsa_end_sort - minSort) / (maxSort - minSort)) * totalWidth + 32
              : startX
            const y = RULER_HEIGHT + lane * LANE_HEIGHT + LANE_HEIGHT / 2

            const colors = getTypeColor(ev.articles?.type)
            const isHovered = hoveredId === ev.id
            const isGmOnly = ev.visibility === 'gm'

            return (
              <g key={ev.id}>
                {/* Vertical connector from spine to card */}
                <line
                  x1={startX} y1={RULER_HEIGHT + 1}
                  x2={startX} y2={y - DOT_SIZE / 2 - 2}
                  stroke={isHovered ? '#5577ff' : '#2e2e42'}
                  strokeWidth={isHovered ? 2 : 1}
                  strokeDasharray={isGmOnly ? '3 3' : undefined}
                />

                {/* Duration bar */}
                {ev.dsa_end_sort && ev.dsa_end_sort > ev.dsa_start_sort && (
                  <rect
                    x={startX}
                    y={y - 3}
                    width={endX - startX}
                    height={6}
                    rx={3}
                    fill="#1a35f5"
                    opacity={0.3}
                  />
                )}

                {/* Dot */}
                <circle
                  cx={startX}
                  cy={y}
                  r={isHovered ? DOT_SIZE : DOT_SIZE - 2}
                  fill={isGmOnly ? '#b45309' : '#3355ff'}
                  stroke={isHovered ? '#85a6ff' : '#0f0f14'}
                  strokeWidth={2}
                />

                {/* GM indicator */}
                {isGmOnly && (
                  <text x={startX - 4} y={y + 4} fontSize={8} fill="white" fontFamily="monospace">GM</text>
                )}
              </g>
            )
          })}
        </svg>

        {/* Event cards */}
        <div style={{ position: 'relative', height: svgHeight, zIndex: 2 }}>
          {sorted.map((ev, i) => {
            const lane = eventLanes[i]
            const startX = ((ev.dsa_start_sort - minSort) / (maxSort - minSort)) * totalWidth + 32
            const y = RULER_HEIGHT + lane * LANE_HEIGHT + (LANE_HEIGHT - CARD_HEIGHT) / 2
            const colors = getTypeColor(ev.articles?.type)

            return (
              <div
                key={ev.id}
                style={{
                  position: 'absolute',
                  left: startX + DOT_SIZE + 4,
                  top: y,
                  width: 172,
                  height: CARD_HEIGHT,
                }}
                onMouseEnter={() => setHoveredId(ev.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div
                  className={`
                    h-full rounded-lg border px-2.5 py-1.5 flex flex-col justify-between
                    cursor-pointer transition-all group select-none
                    ${colors.bg} ${colors.border}
                    ${hoveredId === ev.id ? 'shadow-lg scale-105 z-10' : 'hover:scale-102'}
                    ${ev.visibility === 'gm' ? 'border-dashed border-amber-700/60 bg-amber-900/20' : ''}
                  `}
                  onClick={() => onEdit(ev)}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className={`text-xs font-semibold leading-tight truncate ${colors.text} flex-1`}>
                      {ev.title}
                    </span>
                    {canEdit && (
                      <button
                        onClick={e => { e.stopPropagation(); if (confirm('Ereignis löschen?')) onDelete(ev.id) }}
                        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all flex-shrink-0"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors.dot}`} />
                    <span className="text-[10px] text-slate-500 truncate">
                      {formatDsaStr(ev.dsa_start_str, true)}
                      {ev.dsa_end_str && ` → ${formatDsaStr(ev.dsa_end_str, true)}`}
                    </span>
                  </div>
                  {ev.articles && (
                    <Link
                      to={`/articles/${ev.articles.slug}`}
                      onClick={e => e.stopPropagation()}
                      className="text-[10px] text-brand-400 hover:underline truncate"
                    >
                      → {ev.articles.title}
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Unsorted events at the bottom */}
        {unsorted.length > 0 && (
          <div className="px-4 pt-2 pb-4 border-t border-surface-600 mt-2">
            <p className="text-xs text-slate-500 mb-2">Ohne Datum ({unsorted.length})</p>
            <div className="flex flex-wrap gap-2">
              {unsorted.map(ev => (
                <UnsortedCard key={ev.id} event={ev} canEdit={canEdit} onEdit={onEdit} onDelete={onDelete} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function UnsortedCard({ event: ev, canEdit, onEdit, onDelete }: {
  event: any; canEdit: boolean; onEdit: (e: any) => void; onDelete: (id: string) => void
}) {
  const colors = getTypeColor(ev.articles?.type)
  return (
    <div
      className={`rounded-lg border px-3 py-2 cursor-pointer group flex items-center gap-2 ${colors.bg} ${colors.border}`}
      onClick={() => onEdit(ev)}
    >
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
      <span className={`text-xs font-medium ${colors.text}`}>{ev.title}</span>
      {canEdit && (
        <button
          onClick={e => { e.stopPropagation(); if (confirm('Ereignis löschen?')) onDelete(ev.id) }}
          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all ml-1"
        >
          <X size={11} />
        </button>
      )}
    </div>
  )
}

// ─── Event Detail Sidebar ────────────────────────────────────────────────────
function EventDetail({ event: ev, onClose, onEdit }: { event: any; onClose: () => void; onEdit: () => void }) {
  const colors = getTypeColor(ev.articles?.type)
  return (
    <div className="w-72 border-l border-surface-600 bg-surface-800 flex flex-col flex-shrink-0 overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-600">
        <h3 className="font-semibold text-slate-100 truncate">{ev.title}</h3>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300 ml-2"><X size={16} /></button>
      </div>
      <div className="p-4 space-y-3 flex-1">
        {ev.visibility === 'gm' && (
          <span className="badge bg-amber-900/50 text-amber-400 flex items-center gap-1 text-xs">
            <EyeOff size={10} /> Nur GM
          </span>
        )}

        {ev.articles && (
          <div className={`rounded-lg border px-3 py-2 ${colors.bg} ${colors.border}`}>
            <span className="text-xs text-slate-400">Verlinkter Artikel</span>
            <Link
              to={`/articles/${ev.articles.slug}`}
              className={`block text-sm font-medium mt-0.5 hover:underline ${colors.text}`}
            >
              {ev.articles.title}
            </Link>
            {ev.articles.summary && (
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{ev.articles.summary}</p>
            )}
          </div>
        )}

        <div>
          <span className="text-xs text-slate-500 uppercase tracking-wider">Datum</span>
          <p className="text-sm text-slate-300 mt-0.5">
            {formatDsaStr(ev.dsa_start_str)}
            {ev.dsa_end_str && <span className="text-slate-500"> bis <br />{formatDsaStr(ev.dsa_end_str)}</span>}
          </p>
        </div>

        {ev.timelines?.title && (
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider">Zeitleiste</span>
            <p className="text-sm text-slate-300 mt-0.5">{ev.timelines.title}</p>
          </div>
        )}

        {ev.description && (
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider">Beschreibung</span>
            <p className="text-sm text-slate-300 mt-0.5 whitespace-pre-wrap">{ev.description}</p>
          </div>
        )}
      </div>
      <div className="p-4 border-t border-surface-600">
        <button onClick={onEdit} className="btn-primary w-full justify-center text-sm">
          <Edit2 size={14} /> Bearbeiten
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TimelinePage({ worldId }: { worldId: string }) {
  const { canEdit, isGm } = useWorld()
  const qc = useQueryClient()
  const [selectedTimelineId, setSelectedTimelineId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<any | null>(null)
  const [detailEvent, setDetailEvent] = useState<any | null>(null)

  const { data: timelines, isLoading: timelinesLoading } = useQuery({
    queryKey: ['timelines', worldId],
    queryFn: () => timelineService.listTimelines(worldId),
    onSuccess: (data) => {
      if (!selectedTimelineId && data.length > 0) setSelectedTimelineId(data[0].id)
    },
  })

  // Auto-select first timeline
  if (!selectedTimelineId && timelines && timelines.length > 0 && !timelinesLoading) {
    setSelectedTimelineId(timelines[0].id)
  }

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['timeline-events', selectedTimelineId],
    queryFn: () => timelineService.getEvents(selectedTimelineId!),
    enabled: !!selectedTimelineId,
  })

  const { data: articles } = useQuery({
    queryKey: ['article-titles', worldId],
    queryFn: () => articleService.getAllTitles(worldId),
  })

  const articlesWithType = useQuery({
    queryKey: ['articles-for-timeline', worldId],
    queryFn: async () => {
      const { supabase: sb } = await import('@/lib/supabase')
      const { data } = await sb.from('articles').select('id, title, slug, type').eq('world_id', worldId).order('title')
      return data ?? []
    },
  })

  const createMutation = useMutation({
    mutationFn: (input: TimelineEventInput) =>
      timelineService.createEvent(selectedTimelineId!, worldId, input),
    onSuccess: () => {
      toast.success('Ereignis hinzugefügt!')
      qc.invalidateQueries({ queryKey: ['timeline-events', selectedTimelineId] })
      setShowAddModal(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<TimelineEventInput> }) =>
      timelineService.updateEvent(id, input),
    onSuccess: (data) => {
      toast.success('Gespeichert!')
      qc.invalidateQueries({ queryKey: ['timeline-events', selectedTimelineId] })
      setEditingEvent(null)
      setDetailEvent(data)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => timelineService.deleteEvent(id),
    onSuccess: () => {
      toast.success('Ereignis gelöscht')
      qc.invalidateQueries({ queryKey: ['timeline-events', selectedTimelineId] })
      setDetailEvent(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const handleCardClick = (event: any) => {
    if (canEdit) {
      setEditingEvent(event)
    } else {
      setDetailEvent(event)
    }
  }

  if (timelinesLoading) return <LoadingScreen />

  return (
    <div className="h-screen flex flex-col">
      <PageHeader
        title="Zeitstrahl"
        subtitle="Aventurischer Kalender"
        actions={
          <div className="flex items-center gap-2">
            {canEdit && selectedTimelineId && (
              <button onClick={() => setShowAddModal(true)} className="btn-primary">
                <Plus size={16} /> Ereignis
              </button>
            )}
          </div>
        }
      />

      {/* Timeline selector */}
      <TimelineManager
        worldId={worldId}
        selectedId={selectedTimelineId}
        onSelect={id => { setSelectedTimelineId(id); setDetailEvent(null) }}
        canEdit={canEdit}
      />

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto">
          {!selectedTimelineId ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Scroll size={48} className="opacity-20 mb-4" />
              <p className="text-lg font-medium">Keine Zeitleiste ausgewählt</p>
              <p className="text-sm text-slate-500 mt-1">Erstelle eine Zeitleiste um zu beginnen</p>
            </div>
          ) : eventsLoading ? (
            <LoadingScreen />
          ) : (
            <div className="p-4">
              {/* Legend */}
              <div className="flex flex-wrap items-center gap-3 mb-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-brand-500" /> Ereignis
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-8 h-1.5 rounded bg-brand-500/40" /> Zeitraum
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Nur GM
                </span>
                {Object.entries(TYPE_COLORS).slice(0, 4).map(([type, c]) => (
                  <span key={type} className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                    {TYPE_CONFIG[type as keyof typeof TYPE_CONFIG]?.label ?? type}
                  </span>
                ))}
              </div>

              <VisualTimeline
                events={events ?? []}
                canEdit={canEdit}
                isGm={isGm}
                onEdit={handleCardClick}
                onDelete={id => deleteMutation.mutate(id)}
                onAddAt={() => {}}
              />
            </div>
          )}
        </div>

        {/* Detail panel */}
        {detailEvent && !editingEvent && (
          <EventDetail
            event={detailEvent}
            onClose={() => setDetailEvent(null)}
            onEdit={() => { setEditingEvent(detailEvent); setDetailEvent(null) }}
          />
        )}
      </div>

      {/* Add modal */}
      {showAddModal && (
        <EventFormModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSave={input => createMutation.mutate(input)}
          loading={createMutation.isPending}
          articles={articlesWithType.data ?? []}
          isGm={isGm}
        />
      )}

      {/* Edit modal */}
      {editingEvent && (
        <EventFormModal
          open={!!editingEvent}
          onClose={() => setEditingEvent(null)}
          initial={editingEvent}
          onSave={input => updateMutation.mutate({ id: editingEvent.id, input })}
          loading={updateMutation.isPending}
          articles={articlesWithType.data ?? []}
          isGm={isGm}
        />
      )}
    </div>
  )
}
