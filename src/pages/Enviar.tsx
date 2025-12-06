import { useEffect, useMemo, useRef, useState } from 'react'
import { Editor } from '@tinymce/tinymce-react'
import Select from 'react-select'
import { API_BASE_URL } from '../api'

type Lista = { id: number; nombre: string }
type Usuario = { id: number; username: string; gmail_email?: string }
// Envio type lives in Historial.tsx

const MAIL_API = `${API_BASE_URL}/correos`
const LISTAS_API = `${API_BASE_URL}/listas`
const USUARIOS_API = `${API_BASE_URL}/usuarios`

export default function Enviar() {
  const [listas, setListas] = useState<Lista[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [listaId, setListaId] = useState<number | ''>('')
  // ahora permitimos seleccionar varios remitentes
  const [usuarioIds, setUsuarioIds] = useState<number[]>([])
  const [listaCount, setListaCount] = useState<number | null>(null)
 const requiredPerSender = 400
  const requiredSenders = listaCount ? Math.ceil(listaCount / requiredPerSender) : 1
  const [asunto, setAsunto] = useState('')
  const [cuerpo, setCuerpo] = useState('<p></p>')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  const [envioStats, setEnvioStats] = useState<any>(null)
  // refreshKey eliminado: ahora el historial es un módulo independiente

  const [adjuntos, setAdjuntos] = useState<{ url: string, name: string }[]>([]);
  const [subiendo, setSubiendo] = useState(false);

  const editorRef = useRef<any>(null)

  // Mostrar mensaje amigable si el envío tarda más de 5s
  const [showPendingMessage, setShowPendingMessage] = useState(false)
  const pendingTimer = useRef<number | null>(null)

  const puedeEnviar = useMemo(() => {
    const contenido = editorRef.current?.getContent?.({ format: 'text' })?.trim() || ''
    // validar que se haya elegido al menos un remitente y, si la lista es grande, suficientes remitentes
    const remitentesOk = usuarioIds.length > 0 && (listaCount ? usuarioIds.length >= requiredSenders : true)
    return !!listaId && remitentesOk && asunto.trim().length > 0 && contenido.length > 0 && !enviando
  }, [listaId, usuarioIds, asunto, cuerpo, enviando, listaCount])

  const usuariosSeleccionados = usuarios.filter(u => usuarioIds.includes(u.id))

  // opciones para react-select (se construyen a partir de usuarios)
  const usuarioOptions = usuarios.map(u => ({
    value: u.id,
    label: `${u.username} ${u.gmail_email ? `(${u.gmail_email})` : '(Sin Gmail configurado)'}`
  }))
  const selectedUsuarioOptions = usuarioOptions.filter(o => usuarioIds.includes(o.value))

  const selectStyles = {
    control: (provided: any) => ({
      ...provided,
      minHeight: 40,
      backgroundColor: '#fff',      // fondo claro como el select nativo
      color: '#222',               // texto oscuro
      border: '1px solid #cfcfcf',
      boxShadow: 'none'
    }),
    menu: (provided: any) => ({
      ...provided,
      zIndex: 9999,
      backgroundColor: '#fff',
      color: '#222'
    }),
    menuList: (provided: any) => ({
      ...provided,
      backgroundColor: '#fff',
      color: '#222'
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isFocused ? '#f5f5f5' : '#fff',
      color: '#222'
    }),
    singleValue: (provided: any) => ({ ...provided, color: '#222' }),
    placeholder: (provided: any) => ({ ...provided, color: '#666' }),
    input: (provided: any) => ({ ...provided, color: '#222' }),
    multiValue: (provided: any) => ({ ...provided, backgroundColor: '#f1f1f1' }),
    multiValueLabel: (provided: any) => ({ ...provided, color: '#222' })
  }

  useEffect(() => {
    cargarListas()
    cargarUsuarios()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // cuando cambia la lista seleccionada, obtener cantidad de contactos
  useEffect(() => {
    if (!listaId) {
      setListaCount(null)
      return
    }
    async function fetchCount() {
      try {
        const res = await fetch(`${MAIL_API}/lista/${listaId}/count`)
        if (!res.ok) throw new Error(await res.text())
        const data = await res.json()
        setListaCount(data.count || 0)
      } catch (err) {
        console.error(err)
        setListaCount(null)
      }
    }
    fetchCount()
  }, [listaId])

  async function cargarListas() {
    try {
      const res = await fetch(LISTAS_API)
      if (!res.ok) throw new Error(await res.text())
      const data: Lista[] = await res.json()
      setListas(data)
    } catch (e) {
      console.error(e)
      setError('No se pudieron cargar las listas.')
    }
  }

  async function cargarUsuarios() {
    try {
      const res = await fetch(USUARIOS_API)
      if (!res.ok) throw new Error(await res.text())
      const data: Usuario[] = await res.json()
      setUsuarios(data)
    } catch (e) {
      console.error(e)
      setError('No se pudieron cargar los usuarios.')
    }
  }

  // Historial is handled in its own component (Historial.tsx)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setOkMsg(null)
    setEnvioStats(null)

    // Resetear mensaje y arrancar temporizador de 5s
    setShowPendingMessage(false)
    if (pendingTimer.current) {
      clearTimeout(pendingTimer.current)
      pendingTimer.current = null
    }
    pendingTimer.current = window.setTimeout(() => {
      setShowPendingMessage(true)
    }, 5000)

    if (!listaId) {
      setError('Debés seleccionar una lista.')
      return
    }
    if (usuarioIds.length === 0) {
      setError('Debés seleccionar al menos un usuario remitente.')
      return
    }
    if (listaCount && usuarioIds.length < requiredSenders) {
      setError(`La lista tiene ${listaCount} contactos, necesitás al menos ${requiredSenders} remitentes (máx ${requiredPerSender} correos por remitente).`)
      return
    }

    if (!asunto.trim()) {
      setError('Ingresá un asunto.')
      return
    }
    const html = editorRef.current?.getContent?.() || cuerpo
    const textoPlano = editorRef.current?.getContent?.({ format: 'text' })?.trim() || ''
    if (!textoPlano) {
      setError('El cuerpo no puede estar vacío.')
      return
    }

    // Verificar que el usuario seleccionado tenga Gmail configurado
    const bad = usuariosSeleccionados.find(u => !u.gmail_email)
    if (bad) {
      setError(`El remitente ${bad.username} no tiene Gmail configurado.`)
      return
    }

    setEnviando(true)
    try {
      const res = await fetch(`${MAIL_API}/enviar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asunto: asunto.trim(),
          cuerpo: html,
          listaId: Number(listaId),
          usuarioIds: usuarioIds,
          adjuntos,
        }),
      })

      const stats = await res.json()
      if (!res.ok) throw new Error(stats?.error || stats?.mensaje || 'Error al enviar.')

      // Si llegó la respuesta, ocultar el mensaje pendiente y limpiar timer
      setShowPendingMessage(false)
      if (pendingTimer.current) {
        clearTimeout(pendingTimer.current)
        pendingTimer.current = null
      }

      setEnvioStats(stats)
      setOkMsg(stats.mensaje || 'Envío realizado.')
      setAsunto('')
      setCuerpo('<p></p>')
      editorRef.current?.setContent?.('<p></p>')
      setAdjuntos([])
      // Si necesita notificar al historial, mover la señal a un padre común
    } catch (e: any) {
      console.error(e)
      setError(e?.message || 'Error al enviar.')
    } finally {
      // limpiar temporizador y ocultar el mensaje pendiente si corresponde
      if (pendingTimer.current) {
        clearTimeout(pendingTimer.current)
        pendingTimer.current = null
      }
      setShowPendingMessage(false)
      setEnviando(false)
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setError('Solo se permiten imágenes o archivos PDF.');
      return;
    }
    setSubiendo(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error al subir archivo');
      setAdjuntos(prev => [...prev, { url: data.location, name: file.name }]);
    } catch (err: any) {
      setError(err.message || 'Error al subir archivo');
    } finally {
      setSubiendo(false);
    }
  }

  function quitarAdjunto(index: number) {
    setAdjuntos(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="page">
      <header className="page-header">
        <h2>Enviar campaña</h2>
        <p className="muted">Elige la lista, el remitente y redactá el correo.</p>
      </header>

      {error && <div className="alert">{error}</div>}
      {listaCount !== null && (
        <div style={{ marginBottom: 8 }} className="muted">
          Esta lista tiene <b>{listaCount}</b> contactos. Por favor selecciona <b>{requiredSenders}</b> remitente(s).
        </div>
      )}
      {okMsg && (
        <div className="alert" style={{ borderColor: 'rgba(75,224,194,.4)', color: '#b9ffef', background: 'rgba(75,224,194,.08)' }}>
          {okMsg}
        </div>
      )}

      {/* Formulario */}
      <section className="panel">
        <div className="panel-head">
          <h3>Nueva campaña</h3>
        </div>
        <div className="panel-body">
          {enviando && (
            <div style={{ textAlign: 'center', margin: '32px 0' }}>
              <div className="loader" style={{
                margin: 'auto',
                width: 64,
                height: 64,
                border: '8px solid #eee',
                borderTop: '8px solid #4fe0c2',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <p className="muted" style={{ marginTop: 16 }}>Enviando correos…</p>

              {/* Enlace inmediato y siempre visible para seguir el progreso en Historial */}
              <div style={{ marginTop: 12 }}>
                <a
                  href="/historial"
                  style={{
                    display: 'inline-block',
                    padding: '8px 12px',
                    background: '#fff',
                    color: '#222',
                    border: '1px solid #cfcfcf',
                    borderRadius: 6,
                    textDecoration: 'none'
                  }}
                >
                  Seguir el progreso en Historial
                </a>
              </div>

              {showPendingMessage && (
                <div style={{ marginTop: 12, color: '#fff', background: 'rgba(0,0,0,0.25)', padding: 12, borderRadius: 6 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Este envío está tomando más tiempo de lo habitual.</div>
                  <div className="muted" style={{ marginBottom: 8 }}>
                    Podés seguir el progreso y ver los resultados en el historial.
                  </div>
                  <a href="/historial" style={{ color: '#4fe0c2', textDecoration: 'underline' }}>Ir al historial</a>
                </div>
              )}
              <style>
                {`@keyframes spin { 0% { transform: rotate(0deg);} 100% {transform: rotate(360deg);} }`}
              </style>
            </div>
          )}

          {!enviando && envioStats && (
            <div style={{
              background: 'rgba(75,224,194,.08)',
              border: '1px solid rgba(75,224,194,.4)',
              borderRadius: 8,
              padding: 20,
              marginBottom: 16,
              color: '#b9ffef'
            }}>
              <h4 style={{ marginTop: 0, color: '#4fe0c2' }}>¡Envío realizado!</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                <li><b>Asunto:</b> {envioStats.asunto}</li>
                <li><b>Lista ID:</b> {envioStats.listaId}</li>
                <li><b>Usuario ID:</b> {envioStats.usuarioId}</li>
                <li><b>Total destinatarios:</b> {envioStats.totalDestinatarios}</li>
                <li><b>Correos enviados:</b> {envioStats.correosEnviados}</li>
                <li><b>Correos rebotados:</b> {envioStats.correosRebotados}</li>
                <li><b>Lotes procesados:</b> {envioStats.lotes}</li>
                <li><b>ID del envío:</b> {envioStats.envioId}</li>
                <li><b>Duración:</b> {envioStats.duracionSegundos} segundos</li>
                <li><b>Fecha:</b> {new Date(envioStats.fecha).toLocaleString()}</li>
              </ul>
              <div style={{ marginTop: 8, color: '#4fe0c2' }}>{envioStats.mensaje}</div>
              <div style={{ marginTop: 12 }}>
                <a
                  href="/historial"
                  style={{ color: '#fff', background: '#4fe0c2', padding: '8px 12px', borderRadius: 6, textDecoration: 'none' }}
                >
                  Ver en Historial
                </a>
              </div>
            </div>
          )}
          
          {/* Si NO hay estadísticas (envioStats == null) pero ya se intentó enviar / hay mensaje ok, mostrar enlace al historial */}
          {!enviando && !envioStats && okMsg && (
            <div style={{ margin: '12px 0', textAlign: 'center' }}>
              <a
                href="/historial"
                style={{ color: '#4fe0c2', textDecoration: 'underline' }}
              >
                Seguir el progreso y ver resultados en Historial
              </a>
            </div>
          )}

          <form onSubmit={onSubmit} style={{ display: enviando ? 'none' : 'grid', gap: 14 }}>
            <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 2fr', alignItems: 'center' }}>
              <label className="muted">Lista destino</label>
              <select
                className="input"
                value={listaId}
                onChange={e => setListaId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Seleccionar lista…</option>
                {listas.map(l => (
                  <option key={l.id} value={l.id}>{l.nombre}</option>
                ))}
              </select>

              <label className="muted">Remitente</label>
              <div>
                <Select
                  isMulti
                  options={usuarioOptions}
                  value={selectedUsuarioOptions}
                  onChange={(val: any) => setUsuarioIds(Array.isArray(val) ? val.map((v: any) => v.value) : [])}
                  styles={selectStyles}
                  placeholder="Seleccioná uno o varios remitentes..."
                />
                <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>Seleccioná varios remitentes.</div>
              </div>

              <label className="muted">Asunto</label>
              <input
                className="input"
                type="text"
                placeholder="Asunto del correo"
                value={asunto}
                onChange={e => setAsunto(e.target.value)}
              />
            </div>

            <div>
              <label className="muted" style={{ display: 'block', marginBottom: 8 }}>Contenido</label>
              <Editor
                apiKey="4k3ggfnprvdgulvljswov2no4x5bm47hktuhinrb60sriggz"
                onInit={(_, editor) => (editorRef.current = editor)}
                value={cuerpo}
                onEditorChange={(content) => setCuerpo(content)}
                init={{
                  height: 420,
                  menubar: false,
                  branding: false,
                  plugins: [
                    'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
                    'preview', 'anchor', 'searchreplace', 'visualblocks',
                    'code', 'fullscreen', 'insertdatetime', 'media', 'table',
                    'help', 'wordcount'
                  ],
                  toolbar:
                    'undo redo | blocks | bold italic underline forecolor | ' +
                    'alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | ' +
                    'link image table | removeformat | preview fullscreen',
                  content_style:
                    'body { font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial; font-size:14px }',
                }}
              />
            </div>

            <div>
              <label className="muted" style={{ display: 'block', marginBottom: 8 }}>Adjuntar archivo (imagen o PDF)</label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                disabled={subiendo}
              />
              {subiendo && <span style={{ marginLeft: 8 }}>Subiendo…</span>}
              <div style={{ marginTop: 8 }}>
                {adjuntos.map((adj, i) => (
                  <div key={i} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    marginBottom: '4px',
                    padding: '4px 8px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '4px'
                  }}>
                    <a href={adj.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1 }}>
                      {adj.name}
                    </a>
                    <button
                      type="button"
                      onClick={() => quitarAdjunto(i)}
                      style={{
                        background: 'rgba(255,100,100,0.2)',
                        border: '1px solid rgba(255,100,100,0.3)',
                        color: '#ff6464',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="actions" style={{ justifyContent: 'flex-end' }}>
              <button type="submit" className="btn-primary" disabled={!puedeEnviar}>
                {enviando ? 'Enviando…' : 'Enviar a la lista'}
              </button>
            </div>
          </form>
        </div>
      </section>

    </div>
  )
}