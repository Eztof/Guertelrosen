import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { worldService } from '@/services/world.service'
import { useWorld } from '@/hooks/useWorld'
import { useAuth } from '@/hooks/useAuth'
import { Users, Plus, Copy, Shield, Edit, User } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import Modal from '@/components/ui/Modal'
import { LoadingScreen } from '@/components/ui/Spinner'
import toast from 'react-hot-toast'

export default function MembersPage({ worldId }: { worldId: string }) {
  const { isGm } = useWorld()
  const { user } = useAuth()
  const qc = useQueryClient()
  const [showInvite, setShowInvite] = useState(false)
  const [inviteRole, setInviteRole] = useState<'editor' | 'player'>('player')
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)

  const { data: members, isLoading } = useQuery({
    queryKey: ['world-members', worldId],
    queryFn: () => worldService.getWorldMembers(worldId),
  })

  const { data: inviteCodes } = useQuery({
    queryKey: ['invite-codes', worldId],
    queryFn: () => worldService.getInviteCodes(worldId),
    enabled: isGm,
  })

  const createCodeMutation = useMutation({
    mutationFn: () => worldService.createInviteCode(worldId, inviteRole),
    onSuccess: (data) => {
      setGeneratedCode(data.code)
      qc.invalidateQueries({ queryKey: ['invite-codes', worldId] })
      toast.success('Einladungscode erstellt!')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (!isGm) return <div className="p-8 text-center text-slate-400">Nur GMs können die Mitgliederliste verwalten.</div>
  if (isLoading) return <LoadingScreen />

  const roleIcon = (role: string) => role === 'gm' ? <Shield size={14} className="text-amber-400" /> : role === 'editor' ? <Edit size={14} className="text-blue-400" /> : <User size={14} className="text-slate-400" />

  return (
    <div>
      <PageHeader title="Mitglieder"
        actions={
          <button onClick={() => { setShowInvite(true); setGeneratedCode(null) }} className="btn-primary">
            <Plus size={16} /> Einladen
          </button>
        }
      />

      <div className="p-6 max-w-2xl mx-auto space-y-6">
        {/* Members list */}
        <div className="card divide-y divide-surface-600">
          {members?.map(m => {
            const profile = (m as any).profiles
            return (
              <div key={m.id} className="px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-surface-600 flex items-center justify-center flex-shrink-0">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} className="w-full h-full rounded-full object-cover" alt="" />
                  ) : (
                    <span className="text-sm font-medium text-slate-300">
                      {profile?.display_name?.[0]?.toUpperCase() ?? '?'}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-200">{profile?.display_name ?? 'Unbekannt'}</div>
                </div>
                <div className="flex items-center gap-1 badge bg-surface-700 text-slate-300">
                  {roleIcon(m.role)}
                  {m.role}
                </div>
                {m.user_id === user?.id && (
                  <span className="text-xs text-slate-500">(Du)</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Active invite codes */}
        {inviteCodes && inviteCodes.filter(c => !c.used_by).length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-400 mb-3">Aktive Einladungscodes</h3>
            <div className="space-y-2">
              {inviteCodes.filter(c => !c.used_by).map(code => (
                <div key={code.id} className="card p-3 flex items-center gap-3">
                  <code className="text-lg font-mono text-brand-300 tracking-widest">{code.code}</code>
                  <span className="badge bg-surface-700 text-slate-400">{code.role}</span>
                  <button onClick={() => { navigator.clipboard.writeText(code.code); toast.success('Kopiert!') }}
                    className="ml-auto btn-ghost p-1 text-slate-400"><Copy size={14} /></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create invite modal */}
      <Modal title="Einladungscode erstellen" open={showInvite} onClose={() => setShowInvite(false)} size="sm">
        {generatedCode ? (
          <div className="text-center space-y-4">
            <p className="text-slate-400 text-sm">Teile diesen Code mit deinem Mitspieler:</p>
            <div className="bg-surface-700 rounded-xl p-4">
              <code className="text-3xl font-mono font-bold text-brand-300 tracking-widest">{generatedCode}</code>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(generatedCode); toast.success('Kopiert!') }}
              className="btn-secondary w-full justify-center">
              <Copy size={16} /> Code kopieren
            </button>
            <p className="text-xs text-slate-500">Der Code kann einmalig verwendet werden.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="label">Rolle für neues Mitglied</label>
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value as 'editor' | 'player')} className="input">
                <option value="player">Spieler (nur lesen)</option>
                <option value="editor">Editor (lesen & schreiben)</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowInvite(false)} className="btn-secondary">Abbrechen</button>
              <button onClick={() => createCodeMutation.mutate()} disabled={createCodeMutation.isPending} className="btn-primary">
                {createCodeMutation.isPending ? 'Erstellen…' : 'Code erstellen'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
