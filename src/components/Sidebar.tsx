import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Sidebar() {
  const [open, setOpen] = useState(false)
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <>
      <button
        className="sidebar-toggle"
        aria-label="Abrir menú"
        onClick={() => setOpen(o => !o)}
      >
        ☰
      </button>

      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand">Correo<span>PRO</span></div>
          <button className="close" onClick={() => setOpen(false)} aria-label="Cerrar">✕</button>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" className={({ isActive }) => isActive ? 'link active' : 'link'} onClick={() => setOpen(false)}>
            📊 Dashboard
          </NavLink>
          <NavLink to="/enviar" className={({ isActive }) => isActive ? 'link active' : 'link'} onClick={() => setOpen(false)}>
            ✉️ Enviar
          </NavLink>
          <NavLink to="/historial" className={({ isActive }) => isActive ? 'link active' : 'link'} onClick={() => setOpen(false)}>
            🕘 Historial
          </NavLink>
          <NavLink to="/listas" className={({ isActive }) => isActive ? 'link active' : 'link'} onClick={() => setOpen(false)}>
            👥 Listas
          </NavLink>
          <NavLink to="/configuracion/usuarios" className={({ isActive }) => isActive ? 'link active' : 'link'} onClick={() => setOpen(false)}>
            👨‍👨‍👦‍👦 Usuarios
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <button className="btn-logout" onClick={handleLogout}>Cerrar sesión</button>
        </div>
      </aside>
    </>
  )
}
