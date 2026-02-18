import { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  breadcrumbs?: { label: string; href?: string }[]
}

export default function PageHeader({ title, subtitle, actions, breadcrumbs }: PageHeaderProps) {
  return (
    <div className="border-b border-surface-600 px-6 py-4">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
          {breadcrumbs.map((b, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span>/</span>}
              {b.href ? (
                <a href={b.href} className="hover:text-slate-300 transition-colors">{b.label}</a>
              ) : (
                <span>{b.label}</span>
              )}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">{title}</h1>
          {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
