import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE_URL } from '../api'

type Stat = { 
  label: string; 
  value: string | number; 
  hint?: string;
  trend?: 'up' | 'down' | 'neutral';
  change?: string;
  icon?: string;
  color?: string;
}

type EnvioReciente = {
  id: number;
  fecha: string;
  asunto: string;
  correos_enviados: number;
  correos_abiertos: number;
  tasa_apertura: number;
  usuario: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stat[]>([])
  const [enviosRecientes, setEnviosRecientes] = useState<EnvioReciente[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const navigate = useNavigate()

  useEffect(() => {
    cargarDatosDashboard()
  }, [])

  const cargarDatosDashboard = async () => {
    try {
      setCargando(true)
      setError(null)

      // Cargar estadísticas generales
      const [estadisticasRes, enviosRes, listasRes, correosRes] = await Promise.all([
        fetch(`${API_BASE_URL}/correos/estadisticas`),
        fetch(`${API_BASE_URL}/correos/envios?limit=5`),
        fetch(`${API_BASE_URL}/listas`),
        fetch(`${API_BASE_URL}/correos`)
      ])

      if (!estadisticasRes.ok || !enviosRes.ok || !listasRes.ok || !correosRes.ok) {
        throw new Error('Error al cargar datos del dashboard')
      }

      const estadisticas = await estadisticasRes.json()
      const envios = await enviosRes.json()
      const listas = await listasRes.json()
      const correos = await correosRes.json()

      // Procesar estadísticas
      const nuevasStats: Stat[] = [
        { 
          label: 'Total de contactos', 
          value: correos.length.toLocaleString(),
          icon: '👥',
          color: '#4fe0c2'
        },
        { 
          label: 'Listas activas', 
          value: listas.length,
          icon: '📋',
          color: '#ffb74d'
        },
        { 
          label: 'Campañas enviadas', 
          value: estadisticas.general?.total_envios || 0,
          hint: 'Total histórico',
          icon: '📧',
          color: '#64b5f6'
        },
        { 
          label: 'Correos entregados', 
          value: (estadisticas.general?.correos_entregados || 0).toLocaleString(),
          icon: '✅',
          color: '#81c784'
        },
        { 
          label: 'Tasa de apertura', 
          value: estadisticas.general?.tasa_apertura_avg ? 
                 `${Math.round(estadisticas.general.tasa_apertura_avg)}%` : '0%',
          hint: 'Promedio histórico',
          icon: '📊',
          color: '#ba68c8'
        },
        { 
          label: 'Correos rebotados', 
          value: (estadisticas.general?.correos_rebotados || 0).toLocaleString(),
          icon: '❌',
          color: '#ff6464'
        }
      ]

      setStats(nuevasStats)
      setEnviosRecientes(envios.slice(0, 5))
    } catch (err) {
      console.error('Error cargando dashboard:', err)
      setError('No se pudieron cargar los datos del dashboard')
      
      // Datos de fallback
      setStats([
        { label: 'Total de contactos', value: '0', icon: '👥', color: '#4fe0c2' },
        { label: 'Listas activas', value: '0', icon: '📋', color: '#ffb74d' },
        { label: 'Campañas enviadas', value: '0', icon: '📧', color: '#64b5f6' },
        { label: 'Correos entregados', value: '0', icon: '✅', color: '#81c784' },
        { label: 'Tasa de apertura', value: '0%', icon: '📊', color: '#ba68c8' },
        { label: 'Correos rebotados', value: '0', icon: '❌', color: '#ff6464' }
      ])
    } finally {
      setCargando(false)
    }
  }

  const handleCrearCampaña = () => {
    navigate('/enviar')
  }

  const handleVerEnvios = () => {
    // navegar a /enviar y añadir hash para que Enviar.tsx haga scroll automaticamente
    navigate('/historial')
  }

  const handleVerListas = () => {
    navigate('/listas')
  }

  const calcularTasaApertura = (enviados: number, abiertos: number) => {
    if (enviados === 0) return 0
    return Math.round((abiertos / enviados) * 100)
  }

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (cargando) {
    return (
      <div className="page">
        <header className="page-header">
          <h2>Dashboard</h2>
          <p className="muted">Cargando estadísticas...</p>
        </header>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="loader" style={{
            width: 64,
            height: 64,
            border: '8px solid #eee',
            borderTop: '8px solid #4fe0c2',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        </div>
        <style>
          {`@keyframes spin { 0% { transform: rotate(0deg);} 100% {transform: rotate(360deg);} }`}
        </style>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2>Dashboard</h2>
            <p className="muted">Resumen de tu envío masivo de correos</p>
          </div>
          <button 
            className="btn-primary"
            onClick={cargarDatosDashboard}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <span>🔄</span>
            Actualizar
          </button>
        </div>
      </header>

      {error && (
        <div className="alert" style={{ marginBottom: '24px' }}>
          {error}
        </div>
      )}

      {/* Estadísticas principales */}
      <section className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {stats.map((stat) => (
          <article 
            key={stat.label} 
            className="card"
            style={{ 
              borderLeft: `4px solid ${stat.color}`,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{ 
              position: 'absolute', 
              top: '16px', 
              right: '16px', 
              fontSize: '24px',
              opacity: 0.7
            }}>
              {stat.icon}
            </div>
            <div className="card-label" style={{ fontSize: '14px', color: '#888' }}>
              {stat.label}
            </div>
            <div 
              className="card-value" 
              style={{ 
                fontSize: '32px', 
                fontWeight: 'bold',
                margin: '8px 0',
                color: stat.color
              }}
            >
              {stat.value}
            </div>
            {stat.hint && (
              <div className="card-hint" style={{ fontSize: '12px', color: '#666' }}>
                {stat.hint}
              </div>
            )}
          </article>
        ))}
      </section>

      {/* Contenido en dos columnas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '32px' }}>
        {/* Columna izquierda - Acciones rápidas */}
        <section className="panel">
          <div className="panel-head">
            <h3>Acciones rápidas</h3>
            <span className="badge">Directo</span>
          </div>
          <div className="panel-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button 
                className="btn-primary" 
                onClick={handleCrearCampaña}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  padding: '16px',
                  fontSize: '16px'
                }}
              >
                <span style={{ fontSize: '20px' }}>🚀</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 'bold' }}>Crear nueva campaña</div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>Enviar correo masivo</div>
                </div>
              </button>

              <button 
                className="btn-ghost" 
                onClick={handleVerListas}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  padding: '16px',
                  fontSize: '16px'
                }}
              >
                <span style={{ fontSize: '20px' }}>📋</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 'bold' }}>Gestionar listas</div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>Ver y editar listas de contactos</div>
                </div>
              </button>

              <button 
                className="btn-ghost" 
                onClick={handleVerEnvios}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  padding: '16px',
                  fontSize: '16px'
                }}
              >
                <span style={{ fontSize: '20px' }}>📊</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 'bold' }}>Ver historial completo</div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>Todos los envíos y métricas</div>
                </div>
              </button>
            </div>
          </div>
        </section>

        {/* Columna derecha - Envíos recientes */}
        <section className="panel">
          <div className="panel-head">
            <h3>Envíos recientes</h3>
            <span className="badge">{enviosRecientes.length} envíos</span>
          </div>
          <div className="panel-body">
            {enviosRecientes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📧</div>
                <p>No hay envíos recientes</p>
                <button className="btn-primary" onClick={handleCrearCampaña}>
                  Crear primera campaña
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {enviosRecientes.map((envio) => {
                  const tasaApertura = calcularTasaApertura(envio.correos_enviados, envio.correos_abiertos)
                  
                  return (
                    <div 
                      key={envio.id}
                      style={{
                        padding: '16px',
                        border: '1px solid #eee',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                      onClick={() => navigate('/historial')}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ 
                            fontWeight: 'bold', 
                            marginBottom: '4px',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}>
                            {envio.asunto}
                          </div>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {formatFecha(envio.fecha)} • Por {envio.usuario || 'Sistema'}
                          </div>
                        </div>
                        <div style={{ 
                          textAlign: 'right',
                          paddingLeft: '12px'
                        }}>
                          <div style={{ 
                            fontSize: '18px', 
                            fontWeight: 'bold',
                            color: tasaApertura > 30 ? '#4fe0c2' : tasaApertura > 10 ? '#ffb74d' : '#ff6464'
                          }}>
                            {tasaApertura}%
                          </div>
                          <div style={{ fontSize: '11px', color: '#666' }}>apertura</div>
                        </div>
                      </div>
                      
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1fr 1fr 1fr',
                        gap: '12px',
                        marginTop: '12px',
                        fontSize: '12px'
                      }}>
                        <div>
                          <div style={{ color: '#666' }}>Enviados</div>
                          <div style={{ fontWeight: 'bold' }}>{envio.correos_enviados}</div>
                        </div>
                        <div>
                          <div style={{ color: '#666' }}>Abiertos</div>
                          <div style={{ 
                            fontWeight: 'bold',
                            color: envio.correos_abiertos > 0 ? '#4fe0c2' : '#666'
                          }}>
                            {envio.correos_abiertos}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: '#666' }}>Éxito</div>
                          <div style={{ 
                            fontWeight: 'bold',
                            color: tasaApertura > 30 ? '#4fe0c2' : tasaApertura > 10 ? '#ffb74d' : '#ff6464'
                          }}>
                            {tasaApertura}%
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                
                {enviosRecientes.length > 0 && (
                  <button 
                    className="btn-ghost" 
                    onClick={handleVerEnvios}
                    style={{ 
                      width: '100%', 
                      marginTop: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    Ver historial completo
                    <span>→</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Métricas adicionales */}
      <section className="panel" style={{ marginTop: '32px' }}>
        <div className="panel-head">
          <h3>Rendimiento del sistema</h3>
          <span className="badge">Tiempo real</span>
        </div>
        <div className="panel-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Estado del servidor</div>
              <div style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '20px',
                background: 'rgba(75, 224, 194, 0.1)',
                color: '#4fe0c2',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#4fe0c2',
                  animation: 'pulse 2s infinite'
                }} />
                En línea
              </div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Última actualización</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                {new Date().toLocaleTimeString('es-ES', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Próxima campaña</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#666' }}>
                No programada
              </div>
            </div>
          </div>
        </div>
      </section>

      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
        `}
      </style>
    </div>
  )
}