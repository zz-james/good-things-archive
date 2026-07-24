import { useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'

interface Props {
  onClose: () => void
}

type Tab = 'login' | 'register'

export default function AuthModal({ onClose }: Props) {
  const { login, register } = useAuth()
  const [tab, setTab] = useState<Tab>('login')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')

  function switchTab(t: Tab) {
    setTab(t)
    setError('')
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(email, password)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await register(name, regEmail, regPassword)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="modal-tabs">
          <button className={tab === 'login' ? 'active' : ''} onClick={() => switchTab('login')}>
            Log in
          </button>
          <button className={tab === 'register' ? 'active' : ''} onClick={() => switchTab('register')}>
            Register
          </button>
        </div>

        {error && <p className="modal-error" role="alert">{error}</p>}

        {tab === 'login' ? (
          <form onSubmit={e => void handleLogin(e)} className="modal-form">
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </label>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Logging in…' : 'Log in'}
            </button>
          </form>
        ) : (
          <form onSubmit={e => void handleRegister(e)} className="modal-form">
            <label>
              Name
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoFocus
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={regEmail}
                onChange={e => setRegEmail(e.target.value)}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={regPassword}
                onChange={e => setRegPassword(e.target.value)}
                required
              />
            </label>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Registering…' : 'Register'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
