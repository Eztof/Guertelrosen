import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { worldService } from '@/services/world.service'
import { notificationService } from '@/services/notification.service'
import { useWorld } from '@/hooks/useWorld'
import { useNavigate } from 'react-router-dom'
import {
  Shield, UserPlus, Trash2, Edit2, Check, X,
  Search, Mail, Clock, CheckCircle, XCircle
} from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import { LoadingScreen } from '@/components/ui/Spinner'
import Modal from '@/components/ui/Modal'
import toast from 'react-hot-toast'

type WorldRole = 'gm' | 'editor' | 'player'

export default function GmPanelPage({ worldId }: { worldId: string }) {
  const { isGm } = useWorld()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showInvite, setShowInvite] = useState(false)
  const [userQuery, setUserQuery] = useState('')
  const [inviteRole, setInviteRole] = useState<'player' | 'editor'>('player')
  const [editingMember, setEditingMember] = useState<string | null>(null)
  const [editRole, setEditRole] = useState<WorldRole>('player')

  if (!isGm) {
    navigate('/')
    return null
  }

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['world-members', worldId],
    queryFn: () => worldService.getWorldMembers(worldId),
  })

  const { data: invitations, isLoading: invLoading } = useQuery({
    queryKey: ['world-invitations', worldId],
    queryFn: () => notificationService.listWorldInvitations(worldId),
  })

  const { data: searchResults } = useQuery({
    queryKey: ['user-search', userQuery],
    queryFn: () => notificationService.searchUsers(userQuery),
    enabled: userQuery.length >= 2,
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: WorldRole }) =>
      worldService.updateMemberRole(memberId, role),
    onSuccess: () => {
      toast.success('Rolle aktualisiert')
      qc.invalidateQueries({ queryKey: ['world-members', worldId] })
      setEditingMember(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => worldService.removeMember(memberId),
    onSuccess: () => {
      toast.success('Mitglied entfernt')
      qc.invalidateQueries({ queryKey: ['world-members', worldId] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const inviteMutation = useMutation({
    mutationFn: ({ userId }: { userId: string }) =>
      notificationService.inviteUser(worldId, userId, inviteRole),
    onSuccess: () => {
      toast.success('Einladung gesendet!')
      qc.invalidateQueries({ queryKey: ['world-invitations', worldId] })
      setShowInvite(false)
      setUserQuery('')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const revokeInviteMutation = useMutation({
    mutationFn: (invId: string) => notificationService.revokeInvitation(invId),
    onSuccess: () => {
      toast.success('Einladung widerrufen')
      qc.invalidateQueries({ queryKey: ['world-invitations', worldId] })
    },
  })

  const roleLabel = (role: string) =>
    role === 'gm' ? 'GM' : role === 'editor' ? 'Editor' : 'Spieler'

  const roleColor = (role: string) =>
    role === 'gm' ? 'text-amber-400' : role === 'editor' ? 'text-blue-400' : 'text-slate-300'

  const statusIcon = (status: string) => {
    if (status === 'accepted') return <CheckCircle size={14} className="text-emerald-400" />
    if (status === 'declined') return <XCircle size={14} className="text-red-400" />
    return <Clock size={14} className="text-yellow-400" />
  }

  const statusLabel = (status: string) =>
    status === 'accepted' ? 'Angenommen' : status === 'declined' ? 'Abgelehnt' : 'Ausstehend'

  if (membersLoading) return <LoadingScreen />

  return (
    <div>
      <PageHeader
        title="GM-Panel"
        subtitle="Mitgliederverwaltung & Einstellungen"
        actions={
          <button onClick={() => setShowInvite(true)} className="btn-primary">
            <UserPlus size={16} /> Nutzer einladen
          </button>
        }
      />

      <div className="p-6 max-w-3xl mx-auto space-y-8">

        {/* Members */}
        <section>
          <h2 className="text-base font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <Shield size={16} className="text-amber-400" />
            Aktive Mitglieder ({members?.length ?? 0})
          </h2>
          <div className="card divide-y divide-surface-600">
            {members?.map(m => {
              const profile = (m as any).profiles
              const isEditing = editingMember === m.id
              return (
                <div key={m.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-surface-600 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-slate-300">
                    {profile?.display_name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-200 truncate">
                      {profile?.display_name ?? 'Unbekannt'}
                    </div>
                    {isEditing ? (
                      <select
                        value={editRole}
                        onChange={e => setEditRole(e.target.value as WorldRole)}
                        className="input py-1 text-xs mt-1 w-36">
                        <option value="gm">GM</option>
                        <option value="editor">Editor</option>
                        <option value="player">Spieler</option>
                      </select>
                    ) : (
                      <div className={`text-xs ${roleColor(m.role)} flex items-center gap-1`}>
                        {m.role === 'gm' && <Shield size={10} />}
                        {roleLabel(m.role)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => updateRoleMutation.mutate({ memberId: m.id, role: editRole })}
                          className="btn-ghost p-1.5 text-emerald-400">
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => setEditingMember(null)}
                          className="btn-ghost p-1.5 text-slate-400">
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => { setEditingMember(m.id); setEditRole(m.role as WorldRole) }}
                          className="btn-ghost p-1.5 text-slate-400"
                          title="Rolle bearbeiten">
                          <Edit2 size={14} />
                        </button>
                        {m.role !== 'gm' && (
                          <button
                            onClick={() => {
                              if (confirm(`${profile?.display_name} aus der Welt entfernen?`))
                                removeMemberMutation.mutate(m.id)
                            }}
                            className="btn-ghost p-1.5 text-red-400"
                            title="Entfernen">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Invitations */}
        <section>
          <h2 className="text-base font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <Mail size={16} className="text-brand-400" />
            Einladungen
          </h2>
          {invitations && invitations.length > 0 ? (
            <div className="card divide-y divide-surface-600">
              {invitations.map(inv => {
                const profile = (inv as any).profiles
                return (
                  <div key={inv.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-surface-600 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-slate-300">
                      {profile?.display_name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-200 truncate">
                        {profile?.display_name ?? 'Unbekannt'}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-1.5">
                        {statusIcon(inv.status)}
                        {statusLabel(inv.status)} · {roleLabel(inv.role)}
                      </div>
                    </div>
                    {inv.status === 'pending' && (
                      <button
                        onClick={() => revokeInviteMutation.mutate(inv.id)}
                        className="btn-ghost p-1.5 text-red-400"
                        title="Einladung widerrufen">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="card p-6 text-center text-slate-500 text-sm">
              Keine Einladungen verschickt.
            </div>
          )}
        </section>

        {/* Role explanation */}
        <section className="card p-4">
          <h2 className="text-sm font-semibold text-slate-300 mb-3">Rollenbeschreibungen</h2>
          <div className="space-y-2 text-sm">
            <div className="flex gap-3">
              <span className="text-amber-400 font-medium w-16 flex-shrink-0">GM</span>
              <span className="text-slate-400">Voller Zugriff. Kann Mitglieder verwalten, GM-Inhalte sehen und alle Inhalte bearbeiten/löschen.</span>
            </div>
            <div className="flex gap-3">
              <span className="text-blue-400 font-medium w-16 flex-shrink-0">Editor</span>
              <span className="text-slate-400">Kann Artikel erstellen und bearbeiten, Sammlungen verwalten, Karten und Sessions bearbeiten. Kein GM-Zugriff.</span>
            </div>
            <div className="flex gap-3">
              <span className="text-slate-300 font-medium w-16 flex-shrink-0">Spieler</span>
              <span className="text-slate-400">Kann alle für Spieler sichtbaren Inhalte lesen. Kein Schreibzugriff.</span>
            </div>
          </div>
        </section>
      </div>

      {/* Invite Modal */}
      <Modal title="Nutzer einladen" open={showInvite} onClose={() => { setShowInvite(false); setUserQuery('') }} size="md">
        <div className="space-y-4">
          <div>
            <label className="label">Nutzer suchen</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={userQuery}
                onChange={e => setUserQuery(e.target.value)}
                className="input pl-9"
                placeholder="Anzeigename eingeben…"
                autoFocus
              />
            </div>
          </div>

          {searchResults && searchResults.length > 0 && (
            <div>
              <label className="label">Suchergebnisse</label>
              <div className="card divide-y divide-surface-600 max-h-48 overflow-y-auto">
                {searchResults.map(user => (
                  <div key={user.id} className="px-3 py-2.5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-surface-600 flex items-center justify-center text-sm font-semibold text-slate-300 flex-shrink-0">
                      {user.display_name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <span className="flex-1 text-sm text-slate-200">{user.display_name}</span>
                    <button
                      onClick={() => inviteMutation.mutate({ userId: user.id })}
                      disabled={inviteMutation.isPending}
                      className="btn-primary text-xs py-1 px-3">
                      Einladen
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {userQuery.length >= 2 && searchResults?.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-2">Kein Nutzer gefunden</p>
          )}

          <div>
            <label className="label">Rolle</label>
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value as 'player' | 'editor')} className="input">
              <option value="player">Spieler</option>
              <option value="editor">Editor</option>
            </select>
          </div>

          <div className="flex justify-end">
            <button onClick={() => { setShowInvite(false); setUserQuery('') }} className="btn-secondary">
              Schließen
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
