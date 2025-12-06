import { useEffect, useState } from 'react';
import api from '../api';

interface Usuario {
  id: number;
  username: string;
  gmail_email?: string;
  gmail_smtp_server?: string;
  gmail_smtp_port?: number;
  gmail_ssl_enabled?: boolean;
}

interface UsuarioCompleto extends Usuario {
  password?: string;
  gmail_password?: string;
}

// Interfaz para los toasts
interface Toast {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

// Componente de Toast
const ToastContainer = ({ toasts, removeToast }: { toasts: Toast[], removeToast: (id: number) => void }) => {
  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            padding: '12px 16px',
            borderRadius: '12px',
            background: 'var(--panel)',
            border: '1px solid var(--stroke)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            color: 'var(--text)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            minWidth: '300px',
            animation: 'slideIn 0.3s ease-out',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{
            width: '4px',
            height: '100%',
            position: 'absolute',
            left: 0,
            top: 0,
            backgroundColor: 
              toast.type === 'success' ? 'var(--brand-2)' :
              toast.type === 'error' ? 'var(--danger)' :
              toast.type === 'warning' ? '#ffb74d' : 'var(--brand)'
          }} />
          
          <div style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            backgroundColor: 
              toast.type === 'success' ? 'rgba(75, 224, 194, 0.2)' :
              toast.type === 'error' ? 'rgba(255, 100, 100, 0.2)' :
              toast.type === 'warning' ? 'rgba(255, 183, 77, 0.2)' : 'rgba(108, 162, 255, 0.2)',
            color: 
              toast.type === 'success' ? 'var(--brand-2)' :
              toast.type === 'error' ? 'var(--danger)' :
              toast.type === 'warning' ? '#ffb74d' : 'var(--brand)',
            fontSize: '14px'
          }}>
            {toast.type === 'success' ? '✓' : 
             toast.type === 'error' ? '✕' :
             toast.type === 'warning' ? '⚠' : 'ℹ'}
          </div>
          
          <div style={{ flex: 1, fontSize: '14px' }}>
            {toast.message}
          </div>
          
          <button
            onClick={() => removeToast(toast.id)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--muted)',
              cursor: 'pointer',
              fontSize: '16px',
              padding: 0,
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

// Confirmación modal para eliminación
const ConfirmModal = ({ isOpen, onConfirm, onCancel, username }: { 
  isOpen: boolean; 
  onConfirm: () => void; 
  onCancel: () => void;
  username: string;
}) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(11, 18, 32, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'var(--panel)',
        border: '1px solid var(--stroke)',
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
      }}>
        <h3 style={{ marginTop: 0, color: 'var(--text)' }}>Confirmar eliminación</h3>
        <p style={{ color: 'var(--muted)', lineHeight: '1.5' }}>
          ¿Estás seguro de que deseas eliminar al usuario <strong>{username}</strong>? Esta acción no se puede deshacer.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '10px 16px',
              borderRadius: '12px',
              border: '1px solid var(--stroke)',
              background: 'transparent',
              color: 'var(--text)',
              cursor: 'pointer'
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '10px 16px',
              borderRadius: '12px',
              border: 'none',
              background: 'var(--danger)',
              color: 'white',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
};

// Modal para configuración de Gmail
const GmailConfigModal = ({ 
  isOpen, 
  onClose, 
  usuario,
  onSave 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  usuario: Usuario | null;
  onSave: (config: any) => void;
}) => {
  const [config, setConfig] = useState({
    gmail_email: '',
    gmail_password: '',
    gmail_smtp_server: 'smtp.gmail.com',
    gmail_smtp_port: 587,
    gmail_ssl_enabled: true
  });

  useEffect(() => {
    if (usuario) {
      setConfig({
        gmail_email: usuario.gmail_email || '',
        gmail_password: '',
        gmail_smtp_server: usuario.gmail_smtp_server || 'smtp.gmail.com',
        gmail_smtp_port: usuario.gmail_smtp_port || 587,
        gmail_ssl_enabled: usuario.gmail_ssl_enabled !== undefined ? usuario.gmail_ssl_enabled : true
      });
    }
  }, [usuario]);

  if (!isOpen || !usuario) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(11, 18, 32, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'var(--panel)',
        border: '1px solid var(--stroke)',
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <h3 style={{ marginTop: 0, color: 'var(--text)' }}>
          Configuración Gmail - {usuario.username}
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '14px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
              Email de Gmail
            </label>
            <input
              className="input"
              type="email"
              placeholder="tuemail@gmail.com"
              value={config.gmail_email}
              onChange={e => setConfig({ ...config, gmail_email: e.target.value })}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '14px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
              Contraseña de aplicación Gmail
            </label>
            <input
              className="input"
              type="password"
              placeholder="Contraseña de aplicación"
              value={config.gmail_password}
              onChange={e => setConfig({ ...config, gmail_password: e.target.value })}
              style={{ width: '100%' }}
            />
            <small style={{ color: 'var(--muted)', fontSize: '12px' }}>
              Usa una contraseña de aplicación de Gmail, no tu contraseña personal
            </small>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '14px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                Servidor SMTP
              </label>
              <input
                className="input"
                type="text"
                value={config.gmail_smtp_server}
                onChange={e => setConfig({ ...config, gmail_smtp_server: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '14px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                Puerto SMTP
              </label>
              <input
                className="input"
                type="number"
                value={config.gmail_smtp_port}
                onChange={e => setConfig({ ...config, gmail_smtp_port: parseInt(e.target.value) || 587 })}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={config.gmail_ssl_enabled}
              onChange={e => setConfig({ ...config, gmail_ssl_enabled: e.target.checked })}
            />
            <span style={{ fontSize: '14px', color: 'var(--text)' }}>Usar SSL/TLS</span>
          </label>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
          
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 16px',
              borderRadius: '12px',
              border: '1px solid var(--stroke)',
              background: 'transparent',
              color: 'var(--text)',
              cursor: 'pointer'
            }}
          >
            Cancelar
          </button>
          
          <button
            type="button"
            onClick={() => onSave(config)}
            disabled={!config.gmail_email || !config.gmail_password}
            style={{
              padding: '10px 16px',
              borderRadius: '12px',
              border: 'none',
              background: 'var(--brand)',
              color: 'white',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};

export default function ConfiguracionUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [nuevo, setNuevo] = useState({ username: '', password: '' });
  const [editando, setEditando] = useState<UsuarioCompleto | null>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showGmailModal, setShowGmailModal] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<Usuario | null>(null);

  // Función para agregar toasts
  const addToast = (type: Toast['type'], message: string, duration = 5000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message, duration }]);
    
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  };

  // Función para eliminar toasts
  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const fetchUsuarios = async () => {
    try {
      setCargando(true);
      const res = await api.get('/usuarios');
      setUsuarios(res.data);
    } catch {
      setError('No se pudo cargar usuarios');
      addToast('error', 'Error al cargar los usuarios');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { fetchUsuarios(); }, []);

  const crearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post('/usuarios', nuevo);
      if (res.status === 201) {
        setNuevo({ username: '', password: '' });
        addToast('success', 'Usuario creado correctamente');
        fetchUsuarios();
      } else {
        setError(res.data.error || 'Error al crear usuario');
        addToast('error', res.data.error || 'Error al crear usuario');
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Error de conexión';
      setError(errorMsg);
      addToast('error', errorMsg);
    }
  };

  const actualizarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editando) return;
    setError('');
    try {
      const res = await api.put(`/usuarios/${editando.id}`, editando);
      if (res.status === 200) {
        setEditando(null);
        addToast('success', 'Usuario actualizado correctamente');
        fetchUsuarios();
      } else {
        setError(res.data.error || 'Error al actualizar usuario');
        addToast('error', res.data.error || 'Error al actualizar usuario');
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Error de conexión';
      setError(errorMsg);
      addToast('error', errorMsg);
    }
  };

  const actualizarConfigGmail = async (config: any) => {
    if (!usuarioSeleccionado) return;
    
    try {
      await api.put(`/usuarios/${usuarioSeleccionado.id}/gmail-config`, config);
      addToast('success', 'Configuración de Gmail actualizada correctamente');
      setShowGmailModal(false);
      setUsuarioSeleccionado(null);
      fetchUsuarios();
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Error al guardar configuración';
      addToast('error', errorMsg);
    }
  };

  const eliminarUsuario = async () => {
    if (!usuarioSeleccionado) return;
    
    try {
      await api.delete(`/usuarios/${usuarioSeleccionado.id}`);
      addToast('success', 'Usuario eliminado correctamente');
      fetchUsuarios();
    } catch {
      addToast('error', 'Error al eliminar el usuario');
    } finally {
      setShowConfirmModal(false);
      setUsuarioSeleccionado(null);
    }
  };

  const abrirConfigGmail = (usuario: Usuario) => {
    setUsuarioSeleccionado(usuario);
    setShowGmailModal(true);
  };

  return (
    <div className="page">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      <ConfirmModal 
        isOpen={showConfirmModal} 
        onConfirm={eliminarUsuario} 
        onCancel={() => {
          setShowConfirmModal(false);
          setUsuarioSeleccionado(null);
        }}
        username={usuarioSeleccionado?.username || ''}
      />
      
      <GmailConfigModal 
        isOpen={showGmailModal}
        onClose={() => {
          setShowGmailModal(false);
          setUsuarioSeleccionado(null);
        }}
        usuario={usuarioSeleccionado}
        onSave={actualizarConfigGmail}
      />
      
      <div className="panel">
        <div className="panel-head">
          <h2 style={{ margin: 0 }}>Gestión de Usuarios</h2>
          <span className="badge">{usuarios.length} usuarios</span>
        </div>
        
        <div className="panel-body">
          {error && (
            <div className="alert" style={{ marginBottom: '16px' }}>
              {error}
            </div>
          )}
          
          <form onSubmit={editando ? actualizarUsuario : crearUsuario} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '14px', color: 'var(--muted)' }}>
                Usuario
                <input
                  className="input"
                  type="text"
                  placeholder="Nombre de usuario"
                  value={editando ? editando.username : nuevo.username}
                  onChange={e => editando ? 
                    setEditando({ ...editando, username: e.target.value }) : 
                    setNuevo({ ...nuevo, username: e.target.value })
                  }
                  required
                  style={{ width: '100%', marginTop: '6px' }}
                />
              </label>
            </div>
            
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '14px', color: 'var(--muted)' }}>
                Contraseña
                <input
                  className="input"
                  type="password"
                  placeholder="Contraseña"
                  value={editando ? editando.password || '' : nuevo.password}
                  onChange={e => editando ? 
                    setEditando({ ...editando, password: e.target.value }) : 
                    setNuevo({ ...nuevo, password: e.target.value })
                  }
                  required
                  style={{ width: '100%', marginTop: '6px' }}
                />
              </label>
            </div>
            
            <div>
              <button type="submit" className="btn-primary">
                {editando ? 'Actualizar' : 'Crear'}
              </button>
            </div>
            
            {editando && (
              <div>
                <button 
                  type="button" 
                  onClick={() => setEditando(null)}
                  style={{
                    border: '1px solid var(--stroke)',
                    background: 'transparent',
                    color: 'var(--text)',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3 style={{ margin: 0 }}>Lista de Usuarios</h3>
          <span className="badge">{usuarios.length} registros</span>
        </div>
        
        <div className="panel-body">
          {cargando ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>
              Cargando usuarios...
            </div>
          ) : usuarios.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>
              No hay usuarios registrados
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--stroke)' }}>
                    <th style={{ textAlign: 'left', padding: '12px', color: 'var(--muted)', fontSize: '14px' }}>ID</th>
                    <th style={{ textAlign: 'left', padding: '12px', color: 'var(--muted)', fontSize: '14px' }}>Usuario</th>
                    <th style={{ textAlign: 'left', padding: '12px', color: 'var(--muted)', fontSize: '14px' }}>Gmail Configurado</th>
                    <th style={{ textAlign: 'right', padding: '12px', color: 'var(--muted)', fontSize: '14px' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--stroke)' }}>
                      <td style={{ padding: '12px', fontWeight: '600' }}>{u.id}</td>
                      <td style={{ padding: '12px' }}>{u.username}</td>
                      <td style={{ padding: '12px' }}>
                        {u.gmail_email ? (
                          <span style={{ color: 'var(--brand-2)', fontSize: '13px' }}>
                            ✅ {u.gmail_email}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--muted)', fontSize: '13px' }}>
                            ❌ No configurado
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button 
                            onClick={() => abrirConfigGmail(u)}
                            style={{
                              border: '1px solid var(--brand)',
                              background: 'transparent',
                              color: 'var(--brand)',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '13px'
                            }}
                          >
                            Gmail
                          </button>
                          <button 
                            onClick={() => setEditando(u as UsuarioCompleto)}
                            style={{
                              border: '1px solid var(--stroke)',
                              background: 'transparent',
                              color: 'var(--text)',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '13px'
                            }}
                          >
                            Editar
                          </button>
                          <button 
                            onClick={() => {
                              setUsuarioSeleccionado(u);
                              setShowConfirmModal(true);
                            }}
                            style={{
                              border: '1px solid var(--danger)',
                              background: 'transparent',
                              color: 'var(--danger)',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '13px'
                            }}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <style>
        {`
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}
      </style>
    </div>
  );
}