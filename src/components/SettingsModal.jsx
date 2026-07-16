import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { getProfilePreferences, updateProfilePreferences } from '../services/authService'
import SuccessModal from './SuccessModal'
import { animateClose } from '../utils/modalUtils'

export default function SettingsModal({ isOpen, onClose }) {
  const modalRef = useRef(null)
  const [sNotifications, setSNotifications] = useState(true)
  const [sSeverityLevel, setSSeverityLevel] = useState('todas')
  const [saving,     setSaving]     = useState(false)
  const [saveError,  setSaveError]  = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    if (isOpen) { loadSettings(); setSaveError('') }
  }, [isOpen])

  // drag-to-dismiss on mobile
  useEffect(() => {
    if (!isOpen || !modalRef.current || window.innerWidth >= 640) return
    const modal  = modalRef.current
    const handle = modal.querySelector('.smod-drag-handle')
    if (!handle) return
    modal.style.transition = 'none'
    modal.style.transform  = 'translateY(100%)'
    requestAnimationFrame(() => requestAnimationFrame(() => {
      modal.style.transition = 'transform 0.38s cubic-bezier(0.32,0.72,0,1)'
      modal.style.transform  = 'translateY(0)'
    }))
    let sy = 0, dy = 0
    const onStart = e => { sy = e.touches[0].clientY; dy = 0; modal.style.transition = 'none' }
    const onMove  = e => { dy = Math.max(0, e.touches[0].clientY - sy); modal.style.transform = `translateY(${dy}px)` }
    const onEnd   = () => {
      if (dy > 80) {
        modal.style.transition = 'transform 0.32s cubic-bezier(0.32,0.72,0,1)'
        modal.style.transform  = 'translateY(110%)'
        setTimeout(() => { modal.style.transform = ''; modal.style.transition = ''; onClose() }, 340)
      } else {
        modal.style.transition = 'transform 0.3s cubic-bezier(0.32,0.72,0,1)'
        modal.style.transform  = 'translateY(0)'
        setTimeout(() => { modal.style.transition = '' }, 320)
      }
    }
    handle.addEventListener('touchstart', onStart, { passive: true })
    handle.addEventListener('touchmove',  onMove,  { passive: true })
    handle.addEventListener('touchend',   onEnd,   { passive: true })
    return () => {
      handle.removeEventListener('touchstart', onStart)
      handle.removeEventListener('touchmove',  onMove)
      handle.removeEventListener('touchend',   onEnd)
      modal.style.transform = ''
      modal.style.transition = ''
    }
  }, [isOpen, onClose])

  const loadSettings = async () => {
    try {
      const prefs = await getProfilePreferences()
      setSNotifications(prefs.notifications_enabled !== undefined ? prefs.notifications_enabled : true)
      setSSeverityLevel(prefs.notify_severity_threshold || 'todas')
    } catch {}
  }

  const handleClose = () => animateClose(modalRef, onClose)

  const handleSaveSettings = async () => {
    setSaving(true)
    setSaveError('')
    try {
      await updateProfilePreferences({
        notifications_enabled:     sNotifications,
        notify_severity_threshold: sSeverityLevel,
      })
      handleClose()
    } catch (err) {
      const detail = err?.response?.data
      if (detail && typeof detail === 'object') {
        setSaveError(Object.values(detail).flat().join(' ') || 'Error al guardar configuraciones.')
      } else {
        setSaveError('Error al guardar configuraciones.')
      }
    } finally {
      setSaving(false)
    }
  }

  const exportBackup = () => {
    const data = {}
    const jsonKeys = ['pitahayaVision.sessions.v2', 'pitahayaVision.plantHistory.v1', 'pitahayaVision.contextOptions.v1', 'pitahayaVision.settings.v1']
    jsonKeys.forEach(key => { try { const raw = localStorage.getItem(key); if (raw) data[key] = JSON.parse(raw) } catch {} })
    const token = localStorage.getItem('auth_token')
    if (token) data.auth_token = token
    const cooldownEnd = localStorage.getItem('login_cooldown_end')
    if (cooldownEnd) data.login_cooldown_end = parseInt(cooldownEnd, 10)
    const cooldownType = localStorage.getItem('login_cooldown_type')
    if (cooldownType) data.login_cooldown_type = cooldownType
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), data }, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `pitahaya_backup_${new Date().toISOString().slice(0, 10)}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  const importBackup = async (e) => {
    const file = e.target.files[0]; if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      if (!parsed.data || typeof parsed.data !== 'object') throw new Error()
      const token = localStorage.getItem('auth_token')
      const res = await axios.post('/api/v2/chatbot/import-backup/', parsed, {
        headers: token ? { Authorization: `Token ${token}` } : {},
        timeout: 120000,
      })
      if (res.data.errores?.length) {
        alert('Errores durante la importación:\n' + res.data.errores.join('\n'))
      }
      setShowSuccess(true)
    } catch (err) {
      const msg = err?.response?.data?.error
        || err?.response?.data?.detail
        || (err.code === 'ECONNABORTED' ? 'La importación tardó demasiado. Reintenta con menos datos.' : null)
        || err.message
        || 'Archivo inválido'
      alert('Error: ' + msg)
    } finally {
      setImporting(false)
    }
    e.target.value = ''
  }

  const resetSettings = () => { setSNotifications(true); setSSeverityLevel('todas') }

  return (
    <>
      <style>{`
        .smod-overlay{position:fixed;inset:0;z-index:230;display:none;align-items:flex-end;justify-content:center;padding:0;background:rgba(15,23,42,.45);backdrop-filter:blur(4px)}
        .smod-overlay.open{display:flex}
        .smod-modal{width:100%;max-height:92dvh;border-radius:28px 28px 0 0;background:#fff;border:1px solid #eef2f7;box-shadow:0 -8px 48px rgba(15,23,42,.18);overflow:hidden;display:flex;flex-direction:column}
        @media(min-width:640px){.smod-overlay{align-items:center;padding:1rem}.smod-modal{width:min(100%,980px);max-height:min(92dvh,960px);border-radius:28px;box-shadow:0 24px 48px rgba(15,23,42,.18)}}
        .smod-modal-header{background:#fff;color:#0f172a;border-bottom:1px solid #eef2f7;flex-shrink:0}
        .smod-modal-body{overflow-y:auto;background:linear-gradient(180deg,#fff 0%,#f8fafc 100%);flex:1}
        .smod-drag-handle{display:none}
        @media(max-width:639px){.smod-drag-handle{display:block;width:36px;height:4px;background:#cbd5e1;border-radius:999px;margin:10px auto 4px;flex-shrink:0}}
        .smod-badge{display:inline-flex;align-items:center;gap:.35rem;border-radius:9999px;border:1px solid #dcfce7;background:#f0fdf4;color:#15803d;padding:.3rem .7rem;font-size:.68rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
        .smod-save-btn{min-width:130px;padding:.82rem 1.15rem;border-radius:16px;background:linear-gradient(135deg,#16a34a,#22c55e);color:#fff;font-size:.9rem;font-weight:700;transition:transform .14s ease,box-shadow .14s ease;box-shadow:0 14px 26px rgba(22,163,74,.18);border:none;cursor:pointer}
        .smod-save-btn:hover:not(:disabled){transform:translateY(-1px)}
        .smod-save-btn:disabled{opacity:.6;cursor:not-allowed}
        .smod-secondary-btn{min-width:90px;padding:.82rem 1.1rem;border-radius:16px;border:1px solid #dbe4ee;background:#fff;color:#334155;font-size:.9rem;font-weight:600;cursor:pointer;transition:background .14s}
        .smod-secondary-btn:hover{background:#f8fafc}
        .smod-set-opt{border-radius:12px;padding:.85rem 1rem;cursor:pointer;transition:all .14s;border:1px solid #e2e8f0;background:#fff;text-align:left;width:100%;display:block}
        .smod-set-opt:hover{border-color:#86efac;box-shadow:0 2px 6px rgba(0,0,0,.05)}
        .smod-set-opt.active{border-color:#bbf7d0!important;background:#f0fdf4!important}
        .smod-toggle{position:relative;display:inline-flex;align-items:center;cursor:pointer;gap:.75rem}
        .smod-toggle input{position:absolute;opacity:0;width:0;height:0}
        .smod-toggle-track{width:44px;height:24px;border-radius:999px;transition:background .2s;flex-shrink:0}
        .smod-toggle-track.on{background:#16a34a}
        .smod-toggle-track.off{background:#cbd5e1}
        .smod-toggle-thumb{position:absolute;top:3px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.2);transition:left .2s}
        .smod-toggle-thumb.on{left:23px}
        .smod-toggle-thumb.off{left:3px}
      `}</style>

      <div className={`smod-overlay ${isOpen ? 'open' : ''}`} onClick={handleClose}>
        <div className="smod-modal" ref={modalRef} onClick={e => e.stopPropagation()}>
          <div className="smod-drag-handle" />

          {/* Header */}
          <header className="smod-modal-header px-5 py-5 sm:px-7 sm:py-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm"
                  style={{ background: 'linear-gradient(135deg,#16a34a 0%,#15803d 100%)' }}>
                  <svg className="w-5 h-5" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                </div>
                <div>
                  <span className="smod-badge">Preferencias</span>
                  <h3 className="font-cormorant text-2xl sm:text-3xl font-semibold text-gray-900 mt-1 leading-tight">Configuraciones</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Personaliza las notificaciones y administra tus respaldos de datos.</p>
                </div>
              </div>
              <button onClick={handleClose}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 transition flex items-center justify-center text-gray-500 flex-shrink-0"
                style={{ border: 'none', cursor: 'pointer' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </header>

          {/* Body */}
          <div className="smod-modal-body px-4 sm:px-6 py-5 space-y-4">

            {/* Notificaciones */}
            <section className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <svg className="w-3.5 h-3.5 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                <span>Notificaciones</span>
                <div className="h-px flex-1 bg-slate-200"/>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-cormorant text-xl font-semibold text-slate-900">Notificaciones por correo</p>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {sNotifications
                        ? 'Recibirás un correo electrónico sobre análisis, diagnósticos y cambios en tu cuenta.'
                        : 'Las notificaciones por correo están desactivadas. Solo recibirás lo estrictamente necesario (ej. verificación de cuenta).'}
                    </p>
                  </div>
                  <label className="smod-toggle flex-shrink-0" style={{ position: 'relative', display: 'inline-block', width: 44, height: 24 }}>
                    <input type="checkbox" checked={sNotifications} onChange={e => setSNotifications(e.target.checked)} />
                    <span className={`smod-toggle-track ${sNotifications ? 'on' : 'off'}`} style={{ display: 'block', width: 44, height: 24, borderRadius: 999, transition: 'background .2s', background: sNotifications ? '#16a34a' : '#cbd5e1', cursor: 'pointer' }}></span>
                    <span style={{ position: 'absolute', top: 3, left: sNotifications ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,.2)', transition: 'left .2s', display: 'block' }}></span>
                  </label>
                </div>
                <div className={`mt-3 text-xs font-semibold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 ${sNotifications ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${sNotifications ? 'bg-green-500' : 'bg-slate-400'}`}></span>
                  {sNotifications ? 'Notificaciones activadas' : 'Notificaciones desactivadas'}
                </div>

                {sNotifications && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="font-cormorant text-lg font-semibold text-slate-900">Severidad de análisis a notificar</p>
                    <p className="mb-3 text-sm text-slate-500 mt-0.5">
                      Elige a partir de qué nivel de severidad quieres que te avisemos por correo cuando termine un análisis. "Todas" te notifica siempre, incluso en resultados sin severidad.
                    </p>
                    <div className="grid gap-2 grid-cols-3">
                      {[
                        { id: 'ninguna',  label: 'Ninguna' },
                        { id: 'baja',     label: 'Baja' },
                        { id: 'moderada', label: 'Moderada' },
                        { id: 'alta',     label: 'Alta' },
                        { id: 'critica',  label: 'Crítica' },
                        { id: 'todas',    label: 'Todas' },
                      ].map(({ id, label }) => (
                        <button key={id} onClick={() => setSSeverityLevel(id)}
                          className={`smod-set-opt ${sSeverityLevel === id ? 'active' : ''}`}
                          style={{ padding: '.6rem .5rem', textAlign: 'center' }}>
                          <b className="block text-sm text-slate-900">{label}</b>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Datos / Respaldo */}
            <section className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <svg className="w-3.5 h-3.5 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
                  <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                </svg>
                <span>Datos</span>
                <div className="h-px flex-1 bg-slate-200"/>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="font-cormorant text-xl font-semibold text-slate-900">Respaldo de datos</p>
                <p className="mb-4 text-sm text-slate-500 mt-0.5">Exporta o importa tu información: sesiones, análisis y parcelas.</p>
                <div className="flex flex-wrap gap-3">
                  <button onClick={exportBackup}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700 cursor-pointer inline-flex items-center gap-2"
                    style={{ border: '1px solid #e2e8f0' }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Exportar respaldo
                  </button>
                  <label className={`rounded-lg border ${importing ? 'border-green-300 bg-green-50 text-green-600 cursor-wait' : 'border-slate-200 bg-white text-slate-700 hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700 cursor-pointer'} px-4 py-2.5 text-sm font-semibold transition inline-flex items-center gap-2`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    {importing ? 'Importando…' : 'Importar respaldo'}
                    {importing && <span className="inline-block w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />}
                    <input type="file" accept=".json" className="hidden" onChange={importBackup} disabled={importing} />
                  </label>
                </div>
              </div>
            </section>

            {saveError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{saveError}</p>
            )}

            <footer className="flex flex-wrap items-center justify-end gap-3 pt-1">
              <button onClick={resetSettings}  className="smod-secondary-btn">Restaurar valores</button>
              <button onClick={handleClose}    className="smod-secondary-btn">Cancelar</button>
              <button onClick={handleSaveSettings} disabled={saving} className="smod-save-btn">
                {saving ? 'Guardando…' : 'Guardar configuraciones'}
              </button>
            </footer>

          </div>
        </div>
      </div>

      {showSuccess && (
        <SuccessModal
          message="Respaldo importado correctamente. Presiona el botón para recargar la página."
          onReload={() => window.location.reload()}
        />
      )}
    </>
  )
}
