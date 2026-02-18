import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import PageHeader from '@/components/ui/PageHeader'
import toast from 'react-hot-toast'
import { User } from 'lucide-react'

export default function ProfilePage() {
  const { user } = useAuth()
  const qc = useQueryClient()

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', user!.id).single()
      return data
    },
    enabled: !!user,
  })

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('profiles').update({ display_name: displayName }).eq('id', user!.id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Profil gespeichert')
      qc.invalidateQueries({ queryKey: ['profile', user?.id] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div>
      <PageHeader title="Profil" />
      <div className="p-6 max-w-md mx-auto">
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-surface-600 flex items-center justify-center">
              <User size={32} className="text-slate-400" />
            </div>
            <div>
              <div className="font-semibold text-slate-100">{profile?.display_name ?? '…'}</div>
              <div className="text-sm text-slate-400">{user?.email}</div>
            </div>
          </div>
          <div>
            <label className="label">Anzeigename</label>
            <input
              value={displayName || profile?.display_name || ''}
              onChange={e => setDisplayName(e.target.value)}
              className="input"
              placeholder="Dein Name in der Gruppe"
            />
          </div>
          <button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            className="btn-primary w-full justify-center">
            {updateMutation.isPending ? 'Speichern…' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}
