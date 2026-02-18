import { useQuery } from '@tanstack/react-query'
import { worldService } from '@/services/world.service'
import { useWorld } from '@/hooks/useWorld'
import { useAuth } from '@/hooks/useAuth'
import { Shield, Edit, User } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import { LoadingScreen } from '@/components/ui/Spinner'

export default function MembersPage({ worldId }: { worldId: string }) {
  const { isGm } = useWorld()
  const { user } = useAuth()

  const { data: members, isLoading } = useQuery({
    queryKey: ['world-members', worldId],
    queryFn: () => worldService.getWorldMembers(worldId),
  })

  if (isLoading) return <LoadingScreen />

  const roleIcon = (role: string) =>
    role === 'gm' ? <Shield size={14} className="text-amber-400" /> :
    role === 'editor' ? <Edit size={14} className="text-blue-400" /> :
    <User size={14} className="text-slate-400" />

  const roleLabel = (role: string) =>
    role === 'gm' ? 'GM' : role === 'editor' ? 'Editor' : 'Spieler'

  return (
    <div>
      <PageHeader title="Mitglieder" />

      <div className="p-6 max-w-2xl mx-auto">
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
                  <div className="text-sm font-medium text-slate-200">
                    {profile?.display_name ?? 'Unbekannt'}
                    {m.user_id === user?.id && <span className="text-slate-500 ml-1">(Du)</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 badge bg-surface-700 text-slate-300">
                  {roleIcon(m.role)}
                  {roleLabel(m.role)}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
