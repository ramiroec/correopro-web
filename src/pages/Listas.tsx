import { useEffect, useMemo, useRef, useState } from 'react'
import { API_BASE_URL } from '../api'

type Lista = { id: number; nombre: string }
type Correo = { id: number; email: string }

const API = API_BASE_URL + '/listas'

export default function Listas() {
  const [listas, setListas] = useState<Lista[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  // UI: crear lista
  const [nuevoNombre, setNuevoNombre] = useState('')

  // UI: panel de correos de una lista
  const [listaActiva, setListaActiva] = useState<Lista | null>(null)
  const [correos, setCorreos] = useState<Correo[]>([])
  const [loadingCorreos, setLoadingCorreos] = useState(false)
  const [emailNuevo, setEmailNuevo] = useState('')
  const [agregandoEmail, setAgregandoEmail] = useState(false)

  // UI: importar contactos
  const [importando, setImportando] = useState(false)
  const [textoImportar, setTextoImportar] = useState('')
  const [importandoCorreos, setImportandoCorreos] = useState(false)
  const [importSummary, setImportSummary] = useState<null | {
    total: number
    importados: number
    duplicados: number
    malformados: number
    yaEnLista: number
  }>(null)

  // UI: validación rápida de dominios (MX)
  const [validating, setValidating] = useState(false)
  const [validation, setValidation] = useState<null | {
    total: number
    valid: number
    invalid: number
    details: { email: string; domain: string; hasMx: boolean }[]
  }>(null)

  const abortRef = useRef<AbortController | null>(null)

  const ordenarListas = useMemo(
    () => (arr: Lista[]) => [...arr].sort((a, b) => a.nombre.localeCompare(b.nombre)),
    []
  )

  useEffect(() => {
    cargarListas()
    return () => abortRef.current?.abort()
  }, [])

  async function validarListaCorreos() {
    if (!listaActiva) return
    setValidating(true)
    setError(null)
    setValidation(null)
    try {
      const res = await fetch(`${API}/${listaActiva.id}/validar`)
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setValidation(data)
    } catch (e) {
      console.error(e)
      setError('Error al validar los correos.')
    } finally {
      setValidating(false)
    }
  }

  async function cargarListas() {
    setLoading(true)
    setError(null)
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const res = await fetch(API, { signal: controller.signal })
      if (!res.ok) throw new Error(await res.text())
      const data: Lista[] = await res.json()
      setListas(ordenarListas(data))
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setError('No se pudieron cargar las listas.')
        console.error(e)
      }
    } finally {
      setLoading(false)
    }
  }

  async function crearLista(e: React.FormEvent) {
    e.preventDefault()
    if (!nuevoNombre.trim()) {
      setError('Ingresá un nombre para la lista.')
      return
    }
    setError(null)
    setCreating(true)
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nuevoNombre.trim() }),
      })
      if (!res.ok) throw new Error(await res.text())
      setOkMsg('Lista creada.')
      setNuevoNombre('')
      await cargarListas()
    } catch (e: any) {
      console.error(e)
      setError(
        /conflict|existe|duplicate|unique/i.test(e.message)
          ? 'La lista ya existe.'
          : 'Error al crear la lista.'
      )
    } finally {
      setCreating(false)
    }
  }

  async function eliminarLista(id: number) {
    if (!confirm('¿Eliminar esta lista y sus asociaciones?')) return
    setDeleting(id)
    setError(null)
    try {
      const res = await fetch(`${API}/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      setOkMsg('Lista eliminada.')
      setListas(prev => prev.filter(l => l.id !== id))
      if (listaActiva?.id === id) {
        setListaActiva(null)
        setCorreos([])
        setValidation(null) // limpiar validación si se eliminó la lista activa
      }
    } catch (e) {
      console.error(e)
      setError('Error al eliminar la lista.')
    } finally {
      setDeleting(null)
    }
  }

  async function abrirCorreos(lista: Lista) {
    // al abrir otra lista, limpiamos cualquier validación previa
    setValidation(null)
    setListaActiva(lista)
    setCorreos([])
    setLoadingCorreos(true)
    setError(null)
    try {
      const res = await fetch(`${API}/${lista.id}/correos`)
      if (!res.ok) throw new Error(await res.text())
      const data: Correo[] = await res.json()
      setCorreos(data)
    } catch (e) {
      console.error(e)
      setError('No se pudieron obtener los correos de la lista.')
    } finally {
      setLoadingCorreos(false)
    }
  }

  function validarEmail(email: string) {
    // validación simple
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  async function agregarCorreo(e: React.FormEvent) {
    e.preventDefault()
    if (!listaActiva) return
    const email = emailNuevo.trim().toLowerCase()
    if (!validarEmail(email)) {
      setError('Ingresá un correo válido.')
      return
    }
    setAgregandoEmail(true)
    setError(null)
    try {
      const res = await fetch(`${API}/${listaActiva.id}/correos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) throw new Error(await res.text())

      // actualizar UI (evita duplicados locales)
      setCorreos(prev =>
        prev.some(c => c.email.toLowerCase() === email)
          ? prev
          : [{ id: Date.now(), email }, ...prev]
      )
      setEmailNuevo('')
      setOkMsg('Correo agregado a la lista.')
    } catch (e) {
      console.error(e)
      setError('Error al agregar el correo a la lista.')
    } finally {
      setAgregandoEmail(false)
    }
  }

  async function importarCorreos() {
    if (!listaActiva) return
    const emails = Array.from(
      textoImportar.matchAll(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g)
    ).map(m => m[0].toLowerCase())
    if (emails.length === 0) {
      setError('No se encontraron correos válidos en el texto.')
      return
    }
    setImportandoCorreos(true)
    setError(null)
    setImportSummary(null)
    try {
      const res = await fetch(`${API}/${listaActiva.id}/importar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails }),
      })
      if (!res.ok) throw new Error(await res.text())
      const summary = await res.json()
      setImportSummary(summary)
      setOkMsg(`Se importaron ${summary.importados} correos.`)
      setTextoImportar('')
      await abrirCorreos(listaActiva)
    } catch (e) {
      console.error(e)
      setError('Error al importar los correos.')
    } finally {
      setImportandoCorreos(false)
    }
  }

  async function borrarCorreoDeLista(correoId: number) {
    if (!listaActiva) return;
    if (!confirm('¿Eliminar este correo de la lista?')) return;
    setError(null);
    try {
      const res = await fetch(`${API}/${listaActiva.id}/correos/${correoId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      setCorreos(prev => prev.filter(c => c.id !== correoId));
      setOkMsg('Correo eliminado de la lista.');
    } catch (e) {
      console.error(e);
      setError('Error al eliminar el correo de la lista.');
    }
  }

  // nueva función: elimina un correo inválido (por email) y actualiza la UI de validación
  async function eliminarInvalid(email: string) {
    if (!listaActiva || !validation) return;
    // buscar el correo en la lista para obtener su id
    const correo = correos.find(c => c.email.toLowerCase() === email.toLowerCase());
    if (!correo) {
      // si no está (ya eliminado), removemos del resumen de validación para limpiar la UI
      setValidation(prev => {
        if (!prev) return prev;
        const details = prev.details.filter(d => d.email.toLowerCase() !== email.toLowerCase());
        return {
          ...prev,
          details,
          total: Math.max(0, prev.total - 1),
          invalid: Math.max(0, prev.invalid - 1),
        };
      });
      setOkMsg('Correo removido del resumen de validación.');
      return;
    }

    // si está, usamos la función existente que ya hace el DELETE y actualiza correos
    await borrarCorreoDeLista(correo.id);

    // también removemos del resumen de validación
    setValidation(prev => {
      if (!prev) return prev;
      const details = prev.details.filter(d => d.email.toLowerCase() !== email.toLowerCase());
      return {
        ...prev,
        details,
        total: Math.max(0, prev.total - 1),
        invalid: Math.max(0, prev.invalid - 1),
      };
    });
  }

  return (
    <div className="page">
      <header className="page-header">
        <h2>Listas</h2>
        <p className="muted">Gestioná tus listas de destinatarios</p>
      </header>

      {/* mensajes */}
      {error && <div className="alert">{error}</div>}
      {okMsg && (
        <div className="alert" style={{ borderColor: 'rgba(75,224,194,.4)', color: '#b9ffef', background: 'rgba(75,224,194,.08)' }}>
          {okMsg}
        </div>
      )}

      {/* crear lista */}
      <section className="panel">
        <div className="panel-head">
          <h3>Nueva lista</h3>
        </div>
        <div className="panel-body">
          <form onSubmit={crearLista} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Nombre de la lista (ej: Clientes 2025)"
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              className="input"
              style={{ flex: '1 1 280px' }}
            />
            <button className="btn-primary" disabled={creating}>
              {creating ? 'Creando…' : 'Crear lista'}
            </button>
          </form>
        </div>
      </section>

      {/* listado de listas */}
      <section className="panel">
        <div className="panel-head">
          <h3>Todas las listas</h3>
        </div>
        <div className="panel-body">
          {loading ? (
            <p className="muted">Cargando…</p>
          ) : listas.length === 0 ? (
            <p className="muted">Aún no hay listas. Creá la primera arriba.</p>
          ) : (
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px,1fr))' }}>
              {listas.map((l) => (
                <article key={l.id} className="card" style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div>
                      <div className="card-label">Lista</div>
                      <div className="card-value" style={{ fontSize: 20 }}>{l.nombre}</div>
                    </div>
                    <button
                      className="btn-ghost"
                      onClick={() => abrirCorreos(l)}
                      style={{ cursor: 'pointer' }}
                    >
                      Ver correos
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn-primary"
                      onClick={() => abrirCorreos(l)}
                    >
                      Gestionar
                    </button>
                    <button
                      className="btn-ghost"
                      onClick={() => eliminarLista(l.id)}
                      disabled={deleting === l.id}
                      style={{ cursor: deleting === l.id ? 'not-allowed' : 'pointer' }}
                    >
                      {deleting === l.id ? 'Eliminando…' : 'Eliminar'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* drawer / modal simple para correos */}
      {listaActiva && (
        <div
          role="dialog"
          aria-modal="true"
          className="login-wrap"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(2px)', zIndex: 100 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setListaActiva(null)
              setValidation(null)
            }
          }}
        >
          <div className="login-card" style={{ maxWidth: 720, width: 'min(96vw, 720px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <h3 style={{ margin: 0 }}>Correos en “{listaActiva.nombre}”</h3>
                <p className="muted" style={{ marginTop: 4 }}>
                  Agregá correos; los duplicados se evitan automáticamente.
                </p>
              </div>
              <button
                className="btn-ghost"
                onClick={() => { setListaActiva(null); setValidation(null); }}
                style={{ cursor: 'pointer' }}
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={agregarCorreo} style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
              <input
                type="email"
                placeholder="correo@dominio.com"
                value={emailNuevo}
                onChange={(e) => setEmailNuevo(e.target.value)}
                className="input"
                style={{ flex: '1 1 220px' }}
              />
              <button className="btn-primary" disabled={agregandoEmail}>
                {agregandoEmail ? 'Agregando…' : 'Agregar correo'}
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setImportando(true)}
                style={{
                  marginLeft: 8,
                  border: '1px solid #4be0c2',
                  color: '#4be0c2',
                  background: 'rgba(75,224,194,0.08)',
                  fontWeight: 500,
                  cursor: 'pointer',
                  boxShadow: '0 1px 4px rgba(75,224,194,0.12)'
                }}
              >
                Importar contactos
              </button>

              <button
                type="button"
                className="btn-ghost"
                onClick={validarListaCorreos}
                disabled={validating || loadingCorreos}
                style={{
                  marginLeft: 8,
                  border: '1px solid #8ea6ff',
                  color: '#8ea6ff',
                  background: 'rgba(142,166,255,0.04)',
                  fontWeight: 500,
                  cursor: validating || loadingCorreos ? 'not-allowed' : 'pointer',
                  boxShadow: '0 1px 4px rgba(142,166,255,0.06)'
                }}
              >
                {validating ? 'Validando…' : 'Validar correos'}
              </button>
            </form>

            {importando && (
              <div style={{ marginTop: 16, background: '#222', padding: 16, borderRadius: 8 }}>
                <h4>Importar contactos</h4>
                <p className="muted">Pegá cualquier texto, se extraerán los correos válidos.</p>
                <textarea
                  rows={5}
                  style={{ width: '100%', marginBottom: 8 }}
                  value={textoImportar}
                  onChange={e => setTextoImportar(e.target.value)}
                  placeholder="Pegá aquí los correos o texto…"
                  disabled={importandoCorreos}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn-primary"
                    onClick={importarCorreos}
                    disabled={importandoCorreos}
                  >
                    {importandoCorreos ? 'Importando…' : 'Importar'}
                  </button>
                  <button
                    className="btn-ghost"
                    onClick={() => { setImportando(false); setImportSummary(null); }}
                    disabled={importandoCorreos}
                    style={{
                      border: '1px solid #4be0c2',
                      color: '#4be0c2',
                      background: 'rgba(75,224,194,0.08)',
                      fontWeight: 500,
                      cursor: importandoCorreos ? 'not-allowed' : 'pointer',
                      boxShadow: '0 1px 4px rgba(75,224,194,0.12)'
                    }}
                  >
                    Cancelar
                  </button>
                </div>
                {importSummary && (
                  <div style={{ marginTop: 16, background: '#181818', padding: 12, borderRadius: 6 }}>
                    <strong>Resumen de importación:</strong>
                    <ul style={{ margin: '8px 0 0 0', padding: 0, listStyle: 'none', color: '#b9ffef' }}>
                      <li>Total detectados: <b>{importSummary.total}</b></li>
                      <li>Importados: <b>{importSummary.importados}</b></li>
                      <li>Duplicados en texto: <b>{importSummary.duplicados}</b></li>
                      <li>Ya estaban en la lista: <b>{importSummary.yaEnLista}</b></li>
                      <li>Malformados: <b>{importSummary.malformados}</b></li>
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Resultados de validación */}
            {validation && (
              // sólo mostrar los inválidos
              (() => {
                const invalids = validation.details.filter(d => !d.hasMx);
                return (
                  <div style={{ marginTop: 12, background: '#0f0f0f', padding: 12, borderRadius: 6 }}>
                    <strong>Correos inválidos:</strong>
                    <div style={{ marginTop: 8 }}>
                      Total validados: <b>{validation.total}</b> — Inválidos: <b>{invalids.length}</b>
                    </div>

                    {invalids.length === 0 ? (
                      <p className="muted" style={{ marginTop: 8 }}>No se encontraron correos inválidos.</p>
                    ) : (
                      <div style={{ marginTop: 8, maxHeight: '18vh', overflow: 'auto' }}>
                        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                          {invalids.map(d => (
                            <li key={d.email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,.02)' }}>
                              <span style={{ color: '#ffb3b3' }}>{d.email}</span>
                              <button
                                onClick={() => eliminarInvalid(d.email)}
                                title={`Eliminar ${d.email}`}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#e74c3c',
                                  fontSize: 18,
                                  cursor: 'pointer',
                                  marginLeft: 8,
                                  padding: 0,
                                  lineHeight: 1
                                }}
                              >
                                &#10005;
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })()
            )}

            <div style={{ marginTop: 16, borderTop: '1px solid var(--stroke)', paddingTop: 12, maxHeight: '45vh', overflow: 'auto' }}>
              {loadingCorreos ? (
                <p className="muted">Cargando correos…</p>
              ) : correos.length === 0 ? (
                <p className="muted">Esta lista aún no tiene correos.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
                  {correos.map(c => (
                    <li key={`${c.id}-${c.email}`} className="card" style={{ padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>{c.email}</span>
                      <button
                        onClick={() => borrarCorreoDeLista(c.id)}
                        title="Eliminar"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#e74c3c',
                          fontSize: 18,
                          cursor: 'pointer',
                          marginLeft: 8,
                          padding: 0,
                          lineHeight: 1
                        }}
                        aria-label="Eliminar correo"
                      >
                        &#10005;
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
