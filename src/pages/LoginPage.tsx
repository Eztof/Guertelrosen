import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { authService } from '@/services/auth.service'
import toast from 'react-hot-toast'
import { Sword } from 'lucide-react'

export default function LoginPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/" replace />

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data, error } = await authService.signInWithPassword(email, password)
      if (error) throw error
      navigate('/')
    } catch (e: unknown) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authService.signUp(email, password, displayName)
      toast.success('Konto erstellt! Du kannst dich jetzt anmelden.')
      setMode('login')
    } catch (e: unknown) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-600 rounded-2xl mb-3">
            <Sword size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">7G Wiki</h1>
          <p className="text-sm text-slate-500 mt-1">Sieben Gezeichnete</p>
        </div>

        <div className="card p-6">
          <div className="flex rounded-lg bg-surface-700 p-1 mb-5">
            {(['login', 'register'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${mode === m ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                {m === 'login' ? 'Anmelden' : 'Registrieren'}
              </button>
            ))}
          </div>

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="label">E-Mail</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="input" required autoFocus />
              </div>
              <div>
                <label className="label">Passwort</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  className="input" required />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
                {loading ? 'Anmelden…' : 'Anmelden'}
              </button>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="label">Anzeigename</label>
                <input value={displayName} onChange={e => setDisplayName(e.target.value)}
                  className="input" required autoFocus />
              </div>
              <div>
                <label className="label">E-Mail</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="input" required />
              </div>
              <div>
                <label className="label">Passwort</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  className="input" minLength={6} required />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
                {loading ? 'Registrieren…' : 'Konto erstellen'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
