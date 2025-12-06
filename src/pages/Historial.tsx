import { useEffect, useState } from 'react'
import { API_BASE_URL } from '../api'

type Envio = { 
  id?: number; 
  fecha: string; 
  asunto: string; 
  cuerpo: string;
  usuario_id?: number;
  lista_id?: number;
  total_correos?: number;
  correos_enviados?: number;
  correos_rebotados?: number;
  correos_abiertos?: number;
  estado?: string;
  username?: string;
  lista_nombre?: string;
}

type Props = { refreshKey?: number }

const MAIL_API = `${API_BASE_URL}/correos`

export default function Historial({ refreshKey }: Props) {
  const [historial, setHistorial] = useState<Envio[]>([])
  const [loadingHist, setLoadingHist] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [envioSeleccionado, setEnvioSeleccionado] = useState<Envio | null>(null)
  const [detallesEnvio, setDetallesEnvio] = useState<any>(null)
  const [mostrarDetalles, setMostrarDetalles] = useState(false)

  // paginación de detalles
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 100
  function gotoPage(p: number) {
    setCurrentPage(Math.max(1, Math.min(p, 999999)))
  }
 
  useEffect(() => {
    cargarHistorial()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey])

  async function cargarHistorial() {
    setLoadingHist(true)
    try {
      const res = await fetch(`${MAIL_API}/envios`)
      if (!res.ok) throw new Error(await res.text())
      const data: Envio[] = await res.json()
      setHistorial(data)
      setError(null)
    } catch (e: any) {
      console.error(e)
      setError('No se pudo obtener el historial de envíos.')
    } finally {
      setLoadingHist(false)
    }
  }

  async function cargarDetallesEnvio(envioId: number) {
    try {
      const res = await fetch(`${MAIL_API}/envios/${envioId}`)
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setDetallesEnvio(data)
      setCurrentPage(1) // resetear paginación al cargar un envío nuevo
      setMostrarDetalles(true)
    } catch (e) {
      console.error(e)
      setError('No se pudieron cargar los detalles del envío.')
    }
  }

  return (
    <>
      <section className="panel">
        <div className="panel-head">
          <h3>Historial de envíos</h3>
          <button className="btn-ghost" onClick={cargarHistorial} style={{ cursor: 'pointer' }}>
            {loadingHist ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>
        <div className="panel-body">
          {error && <div className="alert">{error}</div>}

          {loadingHist ? (
            <p className="muted">Cargando…</p>
          ) : historial.length === 0 ? (
            <p className="muted">Sin envíos registrados.</p>
          ) : (
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px,1fr))', gap: '16px' }}>
              {historial.map((h, i) => (
                <article
                  key={h.id ?? i}
                  className="card"
                  style={{ 
                    display: 'grid', 
                    gap: 8, 
                    cursor: 'pointer',
                    background: h.estado === 'error' ? 'rgba(255,100,100,0.1)' : 
                              h.estado === 'enviando' ? 'rgba(255,183,77,0.1)' : 
                              'rgba(75,224,194,0.05)'
                  }}
                  onClick={() => cargarDetallesEnvio(h.id!)}
                  title="Ver detalles del envío"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="card-label">Fecha</div>
                    <span style={{ 
                      fontSize: '11px', 
                      padding: '2px 6px', 
                      borderRadius: '4px',
                      background: h.estado === 'completado' ? 'rgba(75,224,194,0.2)' : 
                                h.estado === 'error' ? 'rgba(255,100,100,0.2)' : 
                                'rgba(255,183,77,0.2)',
                      color: h.estado === 'completado' ? '#4fe0c2' : 
                            h.estado === 'error' ? '#ff6464' : '#ffb74d'
                    }}>
                      {h.estado || 'desconocido'}
                    </span>
                  </div>
                  <div className="card-value" style={{ fontSize: 16 }}>
                    {new Date(h.fecha).toLocaleString()}
                  </div>
                  
                  <div className="card-label" style={{ marginTop: 6 }}>Asunto</div>
                  <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {h.asunto}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#888' }}>Total</div>
                      <div>{h.total_correos || 0}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#888' }}>Enviados</div>
                      <div>{h.correos_enviados || 0}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#888' }}>Rebotados</div>
                      <div style={{ color: h.correos_rebotados ? '#ff6464' : 'inherit' }}>
                        {h.correos_rebotados || 0}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#888' }}>Abiertos</div>
                      <div style={{ color: h.correos_abiertos ? '#4fe0c2' : 'inherit' }}>
                        {h.correos_abiertos || 0}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
                    Por: {h.username || 'N/A'} • Lista: {h.lista_nombre || 'N/A'}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Modal de vista previa */}
      {envioSeleccionado && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.35)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => setEnvioSeleccionado(null)}
        >
          <div
            style={{
              background: '#222',
              color: '#fff',
              borderRadius: 8,
              maxWidth: 600,
              width: '90%',
              padding: 32,
              boxShadow: '0 8px 32px #0008',
              position: 'relative'
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setEnvioSeleccionado(null)}
              style={{
                position: 'absolute',
                top: 12,
                right: 16,
                background: 'none',
                border: 'none',
                color: '#fff',
                fontSize: 22,
                cursor: 'pointer'
              }}
              title="Cerrar"
            >×</button>
            <h3 style={{ marginTop: 0 }}>{envioSeleccionado.asunto}</h3>
            <div style={{ fontSize: 13, color: '#aaa', marginBottom: 8 }}>
              {new Date(envioSeleccionado.fecha).toLocaleString()}
            </div>
            <div
              style={{
                background: '#181818',
                borderRadius: 6,
                padding: 16,
                marginBottom: 8,
                minHeight: 80,
                maxHeight: 320,
                overflow: 'auto'
              }}
              dangerouslySetInnerHTML={{ __html: envioSeleccionado.cuerpo }}
            />
          </div>
        </div>
      )}

      {/* Modal de detalles del envío */}
      {mostrarDetalles && detallesEnvio && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.35)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => {
            setMostrarDetalles(false)
            setDetallesEnvio(null)
          }}
        >
          <div
            style={{
              background: '#222',
              color: '#fff',
              borderRadius: 8,
              maxWidth: 800,
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              padding: 24,
              boxShadow: '0 8px 32px #0008',
              position: 'relative'
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setMostrarDetalles(false)
                setDetallesEnvio(null)
              }}
              style={{
                position: 'absolute',
                top: 12,
                right: 16,
                background: 'none',
                border: 'none',
                color: '#fff',
                fontSize: 22,
                cursor: 'pointer'
              }}
              title="Cerrar"
            >×</button>
            
            <h3 style={{ marginTop: 0 }}>Detalles del envío</h3>
            
            {/* Información general */}
            <div style={{ marginBottom: '24px' }}>
              <h4>Información general</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#aaa' }}>Asunto</div>
                  <div>{detallesEnvio.envio.asunto}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#aaa' }}>Fecha</div>
                  <div>{new Date(detallesEnvio.envio.fecha).toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#aaa' }}>Usuario</div>
                  <div>{detallesEnvio.envio.username || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#aaa' }}>Lista</div>
                  <div>{detallesEnvio.envio.lista_nombre || 'N/A'}</div>
                </div>
              </div>
            </div>

            {/* Métricas */}
            <div style={{ marginBottom: '24px' }}>
              <h4>Métricas</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4fe0c2' }}>{detallesEnvio.envio.total_correos || 0}</div>
                  <div style={{ fontSize: '12px', color: '#aaa' }}>Total</div>
                </div>
                <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4fe0c2' }}>{detallesEnvio.envio.correos_enviados || 0}</div>
                  <div style={{ fontSize: '12px', color: '#aaa' }}>Enviados</div>
                </div>
                <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff6464' }}>{detallesEnvio.envio.correos_rebotados || 0}</div>
                  <div style={{ fontSize: '12px', color: '#aaa' }}>Rebotados</div>
                </div>
                <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4fe0c2' }}>{detallesEnvio.metricas?.total_aperturas || 0}</div>
                  <div style={{ fontSize: '12px', color: '#aaa' }}>Abiertos</div>
                </div>
              </div>
            </div>

            {/* Lista de destinatarios (opcional, si hay muchos podría ser pesado) */}
            {detallesEnvio.detalles && detallesEnvio.detalles.length > 0 && (
              <div>
                <h4>Destinatarios ({detallesEnvio.detalles.length})</h4>
                <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #444' }}>
                        <th style={{ textAlign: 'left', padding: '8px' }}>Email</th>
                        <th style={{ textAlign: 'left', padding: '8px' }}>Estado</th>
                        <th style={{ textAlign: 'left', padding: '8px' }}>Abierto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detallesEnvio.detalles
                        .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
                        .map((detalle: any, index: number) => (
                        <tr key={index} style={{ borderBottom: '1px solid #333' }}>
                          <td style={{ padding: '8px' }}>{detalle.email}</td>
                          <td style={{ padding: '8px', color: detalle.estado === 'enviado' ? '#4fe0c2' : '#ff6464' }}>
                            {detalle.estado}
                          </td>
                          <td style={{ padding: '8px', color: detalle.abierto ? '#4fe0c2' : '#888' }}>
                            {detalle.abierto ? 'Sí' : 'No'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* paginación */}
                  {detallesEnvio.detalles.length > PAGE_SIZE && (() => {
                    const total = detallesEnvio.detalles.length
                    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
                    const showing = Math.min(PAGE_SIZE, total - (currentPage - 1) * PAGE_SIZE)
                    return (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', color: '#aaa', fontSize: '12px' }}>
                        <div>Mostrando {showing} de {total} destinatarios — página {currentPage} / {totalPages}</div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <button className="btn-ghost" onClick={() => gotoPage(1)} disabled={currentPage === 1}>&laquo; Primero</button>
                          <button className="btn-ghost" onClick={() => gotoPage(currentPage - 1)} disabled={currentPage === 1}>Anterior</button>
                          <button className="btn-ghost" onClick={() => gotoPage(currentPage + 1)} disabled={currentPage === totalPages}>Siguiente</button>
                          <button className="btn-ghost" onClick={() => gotoPage(totalPages)} disabled={currentPage === totalPages}>Último &raquo;</button>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
