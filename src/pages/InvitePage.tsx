import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { worldService } from '@/services/world.service'
import { useAuth } from '@/hooks/useAuth'
import { authService } from '@/services/auth.service'
import toast from 'react-hot-toast'
import { Key, Sword } from 'lucide-react'

const WORLD_KEY = '7g_world_id'

export default function InvitePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'code' | 'register'>(user ? 'code' : 'code')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (!user) {
        // Register first
        await authService.signUp(email, password, displayName)
        await new Promise(r => setTimeout(r, 1000)) // wait for auth
      }
      const worldId = await worldService.useInviteCode(code)
      toast.success('Willkommen!')
      localStorage.setItem(WORLD_KEY, worldId)
      navigate('/')
    } catch (e: unknown) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-600 rounded-2xl mb-4">
            <Key size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Einladung einlösen</h1>
          <p className="text-slate-400 mt-1">Tritt einer Kampagnenwelt bei</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Einladungscode *</label>
              <input value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                className="input font-mono text-lg tracking-widest text-center uppercase"
                placeholder="ABC123" maxLength={8} required />
            </div>

            {!user && (
              <>
                <hr className="border-surface-500" />
                <p className="text-sm text-slate-400 text-center">Erstelle einen Account, um beizutreten</p>
                <div>
                  <label className="label">Anzeigename *</label>
                  <input value={displayName} onChange={e => setDisplayName(e.target.value)}
                    className="input" placeholder="Dein Charaktername" required={!user} />
                </div>
                <div>
                  <label className="label">E-Mail *</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="input" required={!user} />
                </div>
                <div>
                  <label className="label">Passwort *</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    className="input" minLength={6} required={!user} />
                </div>
              </>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
              {loading ? 'Beitreten…' : 'Beitreten'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-4">
          <a href="#/login" className="text-brand-400 hover:underline">Zurück zum Login</a>
        </p>
      </div>
    </div>
  )
}
