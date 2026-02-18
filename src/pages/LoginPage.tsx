import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { authService } from '@/services/auth.service'
import toast from 'react-hot-toast'
import { Globe, Sword } from 'lucide-react'

const WORLD_KEY = '7g_world_id'

export default function LoginPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'register' | 'magic'>('login')
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
    console.log('Login session:', data.session)  // ← was steht hier?
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
      toast.success('Registrierung erfolgreich! Bitte E-Mail bestätigen.')
      setMode('login')
    } catch (e: unknown) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await authService.signInWithMagicLink(email)
      if (error) throw error
      toast.success('Magic Link gesendet! Prüfe deine E-Mails.')
    } catch (e: unknown) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-600 rounded-2xl mb-4">
            <Sword size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-100">7G Wiki</h1>
          <p className="text-slate-400 mt-1">Sieben Gezeichnete – Kampagnen-Enzyklopädie</p>
        </div>

        <div className="card p-6">
          {/* Mode tabs */}
          <div className="flex rounded-lg bg-surface-700 p-1 mb-6">
            {(['login', 'register', 'magic'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${mode === m ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                {m === 'login' ? 'Anmelden' : m === 'register' ? 'Registrieren' : 'Magic Link'}
              </button>
            ))}
          </div>

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="label">E-Mail</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="input" placeholder="held@aventurien.de" required />
              </div>
              <div>
                <label className="label">Passwort</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  className="input" placeholder="••••••••" required />
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
                  className="input" placeholder="Aldric der Barbar" required />
              </div>
              <div>
                <label className="label">E-Mail</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="input" placeholder="held@aventurien.de" required />
              </div>
              <div>
                <label className="label">Passwort</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  className="input" placeholder="••••••••" minLength={6} required />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
                {loading ? 'Registrieren…' : 'Konto erstellen'}
              </button>
            </form>
          )}

          {mode === 'magic' && (
            <form onSubmit={handleMagicLink} className="space-y-4">
              <p className="text-sm text-slate-400">Wir senden dir einen Einmal-Link, mit dem du dich ohne Passwort anmelden kannst.</p>
              <div>
                <label className="label">E-Mail</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="input" placeholder="held@aventurien.de" required />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
                {loading ? 'Senden…' : 'Magic Link senden'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-slate-500 mt-4">
          Du hast einen Einladungscode?{' '}
          <a href="#/invite" className="text-brand-400 hover:underline">Hier einlösen</a>
        </p>
      </div>
    </div>
  )
}
