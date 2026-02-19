import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationService } from '@/services/notification.service'
import { Bell, Check, CheckCheck, Globe, UserPlus, Info } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'
import PageHeader from '@/components/ui/PageHeader'
import toast from 'react-hot-toast'

const WORLD_KEY = '7g_world_id'

export default function InboxPage() {
  const qc = useQueryClient()

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.listNotifications(),
    refetchInterval: 30000,
  })

  const { data: invitations } = useQuery({
    queryKey: ['pending-invitations'],
    queryFn: () => notificationService.listPendingInvitations(),
  })

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationService.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const respondMutation = useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) =>
      notificationService.respondToInvitation(id, accept),
    onSuccess: (_, { accept }) => {
      toast.success(accept ? 'Einladung angenommen!' : 'Einladung abgelehnt')
      qc.invalidateQueries({ queryKey: ['pending-invitations'] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['my-worlds'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const unreadCount = notifications?.filter(n => !n.read).length ?? 0

  return (
    <div>
      <PageHeader
        title="Posteingang"
        subtitle={unreadCount > 0 ? `${unreadCount} ungelesen` : 'Alles gelesen'}
        actions={
          unreadCount > 0 ? (
            <button onClick={() => markAllReadMutation.mutate()} className="btn-secondary text-sm">
              <CheckCheck size={14} /> Alle als gelesen markieren
            </button>
          ) : undefined
        }
      />

      <div className="p-6 max-w-2xl mx-auto space-y-6">
        {/* Pending Invitations */}
        {invitations && invitations.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Offene Einladungen
            </h2>
            <div className="space-y-3">
              {invitations.map(inv => (
                <div key={inv.id} className="card p-4 border-l-4 border-brand-500">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-brand-900/50 border border-brand-700 flex-shrink-0">
                      <Globe size={18} className="text-brand-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-100">
                        Einladung zu „{(inv.worlds as any)?.name ?? '...'}"
                      </p>
                      <p className="text-sm text-slate-400 mt-0.5">
                        Von {(inv.profiles as any)?.display_name ?? 'Unbekannt'} · Rolle: {
                          inv.role === 'editor' ? 'Editor' : 'Spieler'
                        }
                      </p>
                      {(inv.worlds as any)?.description && (
                        <p className="text-sm text-slate-500 mt-1 truncate">{(inv.worlds as any).description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 ml-11">
                    <button
                      onClick={() => respondMutation.mutate({ id: inv.id, accept: true })}
                      disabled={respondMutation.isPending}
                      className="btn-primary text-sm py-1.5">
                      Annehmen
                    </button>
                    <button
                      onClick={() => respondMutation.mutate({ id: inv.id, accept: false })}
                      disabled={respondMutation.isPending}
                      className="btn-secondary text-sm py-1.5">
                      Ablehnen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* All Notifications */}
        <section>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Benachrichtigungen
          </h2>
          {notifications && notifications.length > 0 ? (
            <div className="space-y-2">
              {notifications.map(n => (
                <div
                  key={n.id}
                  className={`card p-4 flex items-start gap-3 transition-colors ${
                    !n.read ? 'border-brand-600/50 bg-brand-900/10' : ''
                  }`}>
                  <div className={`p-2 rounded-lg flex-shrink-0 ${
                    n.type === 'world_invite' ? 'bg-brand-900/50 border border-brand-700' :
                    'bg-surface-700 border border-surface-500'
                  }`}>
                    {n.type === 'world_invite' ? <Globe size={16} className="text-brand-400" /> :
                     n.type === 'role_changed' ? <UserPlus size={16} className="text-emerald-400" /> :
                     <Info size={16} className="text-slate-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${n.read ? 'text-slate-300' : 'text-slate-100'}`}>
                      {n.title}
                    </p>
                    {n.body && <p className="text-sm text-slate-400 mt-0.5">{n.body}</p>}
                    <p className="text-xs text-slate-500 mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: de })}
                    </p>
                  </div>
                  {!n.read && (
                    <button
                      onClick={() => markReadMutation.mutate(n.id)}
                      className="btn-ghost p-1 flex-shrink-0"
                      title="Als gelesen markieren">
                      <Check size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-10 text-center text-slate-400">
              <Bell size={40} className="mx-auto mb-3 opacity-30" />
              <p>Keine Benachrichtigungen</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
