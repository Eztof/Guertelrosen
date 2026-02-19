import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import PageHeader from '@/components/ui/PageHeader'
import toast from 'react-hot-toast'
import { User, Lock, Eye, EyeOff } from 'lucide-react'

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

  const [displayName, setDisplayName] = useState('')

  useEffect(() => {
    if (profile?.display_name) setDisplayName(profile.display_name)
  }, [profile])

  const updateProfileMutation = useMutation({
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

  // ── Password change ───────────────────────────────────────────────────────
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) throw new Error('Passwörter stimmen nicht überein')
      if (newPassword.length < 6) throw new Error('Neues Passwort muss mindestens 6 Zeichen haben')

      // Re-authenticate with old password first
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user!.email!,
        password: oldPassword,
      })
      if (signInError) throw new Error('Altes Passwort ist falsch')

      // Now update to new password
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Passwort geändert!')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const passwordMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword

  return (
    <div>
      <PageHeader title="Profil" />
      <div className="p-6 max-w-md mx-auto space-y-6">

        {/* Display name */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-surface-600 flex items-center justify-center">
              <User size={24} className="text-slate-400" />
            </div>
            <div>
              <div className="font-semibold text-slate-100">{profile?.display_name ?? '…'}</div>
              <div className="text-sm text-slate-400">{user?.email}</div>
            </div>
          </div>
          <div>
            <label className="label">Anzeigename</label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="input"
              placeholder="Dein Name in der Gruppe"
            />
          </div>
          <button
            onClick={() => updateProfileMutation.mutate()}
            disabled={updateProfileMutation.isPending}
            className="btn-primary w-full justify-center">
            {updateProfileMutation.isPending ? 'Speichern…' : 'Speichern'}
          </button>
        </div>

        {/* Password change */}
        <div className="card p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-200 flex items-center gap-2">
            <Lock size={16} className="text-brand-400" />
            Passwort ändern
          </h2>

          <div>
            <label className="label">Altes Passwort</label>
            <div className="relative">
              <input
                type={showOld ? 'text' : 'password'}
                value={oldPassword}
                onChange={e => setOldPassword(e.target.value)}
                className="input pr-10"
                placeholder="Aktuelles Passwort"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowOld(!showOld)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="label">Neues Passwort</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="input pr-10"
                placeholder="Mindestens 6 Zeichen"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="label">Neues Passwort bestätigen</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className={`input pr-10 ${passwordMismatch ? 'border-red-500 focus:ring-red-500' : ''}`}
                placeholder="Passwort wiederholen"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {passwordMismatch && (
              <p className="text-xs text-red-400 mt-1">Passwörter stimmen nicht überein</p>
            )}
          </div>

          <button
            onClick={() => changePasswordMutation.mutate()}
            disabled={
              changePasswordMutation.isPending ||
              !oldPassword ||
              !newPassword ||
              !confirmPassword ||
              passwordMismatch
            }
            className="btn-primary w-full justify-center">
            {changePasswordMutation.isPending ? 'Wird geändert…' : 'Passwort ändern'}
          </button>
        </div>

      </div>
    </div>
  )
}
