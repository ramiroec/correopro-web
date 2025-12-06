import { type FormEvent, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation() as any
  const from = location.state?.from?.pathname || '/'

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const ok = await login(user.trim(), pass)
    if (ok) navigate(from, { replace: true })
    else setError('Usuario o clave inválidos')
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={onSubmit}>
        <h1>CorreoPRO</h1>
        <p className="muted">Accedé con tu usuario y clave</p>

        <label>
          Usuario
          <input
            type="text"
            value={user}
            onChange={e => setUser(e.target.value)}
            placeholder="Nombre de Usuario"
            autoFocus
            required
          />
        </label>

        <label>
          Clave
          <input
            type="password"
            value={pass}
            onChange={e => setPass(e.target.value)}
            placeholder="●●●●●●●●"
            required
          />
        </label>

        {error && <div className="alert">{error}</div>}

        <button type="submit" className="btn-primary">Ingresar</button>

        <div className="hint">
          <strong>Solicita tu clave de acceso</strong>
        </div>
      </form>
    </div>
  )
}
