import type { ArticleType } from '@/types'

const TYPE_CONFIG: Record<ArticleType, { label: string; color: string }> = {
  location: { label: 'Ort', color: 'bg-emerald-900/60 text-emerald-300' },
  npc: { label: 'NPC', color: 'bg-blue-900/60 text-blue-300' },
  faction: { label: 'Fraktion', color: 'bg-purple-900/60 text-purple-300' },
  item: { label: 'Gegenstand', color: 'bg-yellow-900/60 text-yellow-300' },
  deity: { label: 'Gottheiten/Dämonen', color: 'bg-amber-900/60 text-amber-300' },
  plot: { label: 'Abenteuer', color: 'bg-red-900/60 text-red-300' },
  rule: { label: 'Regel', color: 'bg-slate-700 text-slate-300' },
  handout: { label: 'Handout', color: 'bg-teal-900/60 text-teal-300' },
  session_report: { label: 'Session', color: 'bg-indigo-900/60 text-indigo-300' },
  note: { label: 'Notiz', color: 'bg-surface-600 text-slate-300' },
}

export default function ArticleTypeBadge({ type }: { type: ArticleType }) {
  const cfg = TYPE_CONFIG[type] ?? { label: type, color: 'bg-surface-600 text-slate-300' }
  return (
    <span className={`badge ${cfg.color}`}>{cfg.label}</span>
  )
}

export { TYPE_CONFIG }
