import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { getProfilePreferences, updateProfilePreferences } from '../services/authService'
import { useAuth } from '../contexts/AuthContext'
import SuccessModal from './SuccessModal'
import { animateClose } from '../utils/modalUtils'

const SEVERITY_OPTIONS = [
  { id: 'ninguna',  label: 'Ninguna',  hint: 'No enviar avisos',      color: '#94a3b8' },
  { id: 'baja',     label: 'Baja',     hint: 'Desde riesgo leve',     color: '#84cc16' },
  { id: 'moderada', label: 'Moderada', hint: 'Desde riesgo moderado', color: '#d97706' },
  { id: 'alta',     label: 'Alta',     hint: 'Desde riesgo alto',     color: '#ea580c' },
  { id: 'critica',  label: 'Crítica',  hint: 'Solo casos críticos',   color: '#dc2626' },
  { id: 'todas',    label: 'Todas',    hint: 'Avisar siempre',        color: '#16a34a' },
]

const QUICK_RANGES = [
  { id: 'all',    label: 'Todo el historial' },
  { id: '7',      label: 'Últimos 7 días' },
  { id: '30',     label: 'Últimos 30 días' },
  { id: 'custom', label: 'Rango personalizado' },
]

export default function SettingsModal({ isOpen, onClose }) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const modalRef = useRef(null)

  const [activeTab, setActiveTab] = useState('notifications')

  const [sNotifications, setSNotifications] = useState(true)
  const [sSeverityLevel, setSSeverityLevel] = useState('todas')
  const [initialPrefs, setInitialPrefs] = useState({ notifications_enabled: true, notify_severity_threshold: 'todas' })
  const [saving,     setSaving]     = useState(false)
  const [saveError,  setSaveError]  = useState('')
  const [showSuccess, setShowSuccess] = useState(false)

  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [quickRange, setQuickRange] = useState('all')
  const [backupDateFrom, setBackupDateFrom] = useState('')
  const [backupDateTo, setBackupDateTo] = useState('')

  const isDirty = sNotifications !== initialPrefs.notifications_enabled
    || sSeverityLevel !== initialPrefs.notify_severity_threshold

  useEffect(() => {
    if (isOpen) { loadSettings(); setSaveError(''); setActiveTab('notifications') }
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
      const notif = prefs.notifications_enabled !== undefined ? prefs.notifications_enabled : true
      const sev = prefs.notify_severity_threshold || 'todas'
      setSNotifications(notif)
      setSSeverityLevel(sev)
      setInitialPrefs({ notifications_enabled: notif, notify_severity_threshold: sev })
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
      setInitialPrefs({ notifications_enabled: sNotifications, notify_severity_threshold: sSeverityLevel })
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

  const resetSettings = () => { setSNotifications(true); setSSeverityLevel('todas') }

  const applyQuickRange = (key) => {
    setQuickRange(key)
    if (key === 'all')    { setBackupDateFrom(''); setBackupDateTo(''); return }
    if (key === 'custom') return
    const days = Number(key)
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - (days - 1))
    const fmt = d => d.toISOString().slice(0, 10)
    setBackupDateFrom(fmt(from))
    setBackupDateTo(fmt(to))
  }

  const rangeSummary = quickRange === 'all'
    ? 'Se exportará todo el historial disponible.'
    : quickRange === 'custom'
      ? (backupDateFrom || backupDateTo ? `Rango seleccionado: ${backupDateFrom || '…'} → ${backupDateTo || '…'}` : 'Selecciona un rango de fechas.')
      : `Se exportará ${quickRange === '7' ? 'lo registrado en los últimos 7 días' : 'lo registrado en los últimos 30 días'}.`

  const exportBackup = async () => {
    setExporting(true)
    try {
      const token = localStorage.getItem('auth_token')
      const params = {}
      if (backupDateFrom) params.date_from = backupDateFrom
      if (backupDateTo)   params.date_to   = backupDateTo
      const res = await axios.get('/api/v2/chatbot/export-backup/', {
        params,
        headers: token ? { Authorization: `Token ${token}` } : {},
        timeout: 60000,
      })
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      const suffix = [res.data.role, backupDateFrom || null, backupDateTo || null].filter(Boolean).join('_')
      a.href = url; a.download = `pitahaya_backup_${suffix ? suffix + '_' : ''}${new Date().toISOString().slice(0, 10)}.json`; a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.detail || 'No se pudo generar el respaldo.'
      alert('Error: ' + msg)
    } finally {
      setExporting(false)
    }
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

  return (
    <>
      <style>{`
        .smod-overlay{position:fixed;inset:0;z-index:230;display:none;align-items:flex-end;justify-content:center;padding:0;background:rgba(15,23,42,.45);backdrop-filter:blur(4px)}
        .smod-overlay.open{display:flex}
        .smod-modal{width:100%;max-height:92dvh;border-radius:28px 28px 0 0;background:#fff;border:1px solid #eef2f7;box-shadow:0 -8px 48px rgba(15,23,42,.18);overflow:hidden;display:flex;flex-direction:column}
        @media(min-width:640px){.smod-overlay{align-items:center;padding:1rem}.smod-modal{width:min(100%,940px);max-height:min(94dvh,820px);border-radius:28px;box-shadow:0 24px 48px rgba(15,23,42,.18)}}
        .smod-modal-header{background:#fff;color:#0f172a;flex-shrink:0}
        .smod-drag-handle{display:none}
        @media(max-width:639px){.smod-drag-handle{display:block;width:36px;height:4px;background:#cbd5e1;border-radius:999px;margin:10px auto 4px;flex-shrink:0}}
        .smod-badge{display:inline-flex;align-items:center;gap:.35rem;border-radius:9999px;border:1px solid #dcfce7;background:#f0fdf4;color:#15803d;padding:.3rem .7rem;font-size:.68rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase}

        /* Shell: nav + content. Row (sidebar) on desktop, column (top nav) on mobile. */
        .smod-shell{display:flex;flex-direction:column;flex:1;min-height:0}
        @media(min-width:640px){.smod-shell{flex-direction:row}}

        .smod-nav{display:flex;flex-direction:row;gap:.35rem;padding:.6rem 1rem;border-top:1px solid #eef2f7;border-bottom:1px solid #eef2f7;flex-shrink:0;background:#fff;overflow-x:auto}
        @media(min-width:640px){
          .smod-nav{flex-direction:column;width:208px;border-top:none;border-bottom:none;border-right:1px solid #eef2f7;background:#f8fafc;padding:1.1rem .75rem;gap:.25rem;overflow-x:visible;flex-shrink:0}
        }
        .smod-nav-item{position:relative;display:flex;align-items:center;gap:.6rem;padding:.6rem .85rem;border-radius:999px;border:none;background:none;font-size:.85rem;font-weight:600;color:#94a3b8;cursor:pointer;transition:all .14s;white-space:nowrap;flex-shrink:0}
        .smod-nav-item:hover{color:#475569;background:#f1f5f9}
        .smod-nav-item.active{background:#16a34a;color:#fff}
        @media(min-width:640px){
          .smod-nav-item{width:100%;text-align:left;border-radius:12px}
          .smod-nav-item:hover{background:#eef2f7}
          .smod-nav-item.active{background:#dcfce7;color:#15803d;box-shadow:inset 3px 0 0 #16a34a}
        }
        .smod-nav-dot{width:6px;height:6px;border-radius:50%;background:#f59e0b;flex-shrink:0;margin-left:auto}

        .smod-content{flex:1;min-width:0;overflow-y:auto;background:#f8fafc;padding:1.1rem 1rem}
        @media(min-width:640px){.smod-content{padding:1.5rem 1.75rem}}

        .smod-save-btn{min-width:130px;padding:.82rem 1.15rem;border-radius:16px;background:linear-gradient(135deg,#16a34a,#22c55e);color:#fff;font-size:.9rem;font-weight:700;transition:transform .14s ease,box-shadow .14s ease,opacity .14s ease;box-shadow:0 14px 26px rgba(22,163,74,.18);border:none;cursor:pointer}
        .smod-save-btn:hover:not(:disabled){transform:translateY(-1px)}
        .smod-save-btn:disabled{opacity:.5;cursor:not-allowed;box-shadow:none}
        .smod-secondary-btn{min-width:90px;padding:.82rem 1.1rem;border-radius:16px;border:1px solid #dbe4ee;background:#fff;color:#334155;font-size:.9rem;font-weight:600;cursor:pointer;transition:background .14s}
        .smod-secondary-btn:hover{background:#f8fafc}
        .smod-secondary-btn:disabled{opacity:.5;cursor:not-allowed}

        .smod-sev-opt{position:relative;display:flex;align-items:center;gap:.55rem;border-radius:12px;padding:.65rem .7rem;cursor:pointer;transition:all .14s;border:1.5px solid #e2e8f0;background:#fff;text-align:left;width:100%}
        .smod-sev-opt:hover{border-color:#cbd5e1;box-shadow:0 2px 6px rgba(0,0,0,.05)}
        .smod-sev-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0}

        .smod-date-input{width:100%;font-size:.85rem;border:1px solid #e2e8f0;border-radius:.65rem;background:#fff;padding:.55rem .7rem;outline:none;color:#0f172a;transition:border-color .15s,box-shadow .15s}
        .smod-date-input:focus{border-color:#22c55e;box-shadow:0 0 0 2px rgba(34,197,94,.2)}

        .smod-chip{padding:.42rem .85rem;border-radius:999px;border:1px solid #e2e8f0;background:#fff;font-size:.78rem;font-weight:600;color:#475569;cursor:pointer;transition:all .14s;white-space:nowrap}
        .smod-chip:hover{border-color:#86efac;color:#15803d}
        .smod-chip.active{background:#16a34a;border-color:#16a34a;color:#fff}

        .smod-toggle{position:relative;display:inline-flex;align-items:center;cursor:pointer}
        .smod-toggle input{position:absolute;opacity:0;width:0;height:0}
        .smod-toggle-track{position:relative;display:block;width:44px;height:24px;border-radius:999px;transition:background .2s;flex-shrink:0}
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
          <header className="smod-modal-header px-5 pt-5 sm:px-7 sm:pt-6">
            <div className="flex items-start justify-between gap-4 pb-5">
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
                  <p className="text-xs text-gray-400 mt-0.5">Notificaciones y respaldo de tu información.</p>
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

          <div className="smod-shell">

            {/* Left nav (sidebar on desktop, top bar on mobile) */}
            <nav className="smod-nav">
              <button type="button" onClick={() => setActiveTab('notifications')} className={`smod-nav-item ${activeTab === 'notifications' ? 'active' : ''}`}>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                Notificaciones
                {isDirty && <span className="smod-nav-dot" title="Cambios sin guardar" />}
              </button>
              <button type="button" onClick={() => setActiveTab('backup')} className={`smod-nav-item ${activeTab === 'backup' ? 'active' : ''}`}>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
                  <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                </svg>
                Respaldo de datos
              </button>
            </nav>

            {/* Right content */}
            <div className="smod-content">

            {activeTab === 'notifications' && (
              <div className="rounded-2xl border border-slate-100 bg-white p-5 sm:p-6">
                <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="min-w-0">
                    <p className="font-cormorant text-xl font-semibold text-slate-900">Notificaciones por correo</p>
                    <p className="text-sm text-slate-500 mt-0.5 max-w-md">
                      {sNotifications
                        ? 'Recibirás un correo electrónico sobre análisis, diagnósticos y cambios en tu cuenta.'
                        : 'Desactivadas: solo recibirás lo estrictamente necesario (ej. verificación de cuenta).'}
                    </p>
                  </div>
                  <label className="smod-toggle flex-shrink-0">
                    <input type="checkbox" checked={sNotifications} onChange={e => setSNotifications(e.target.checked)} />
                    <span className={`smod-toggle-track ${sNotifications ? 'on' : 'off'}`}>
                      <span className={`smod-toggle-thumb ${sNotifications ? 'on' : 'off'}`} />
                    </span>
                  </label>
                </div>

                <div className={`mt-4 text-xs font-semibold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 ${sNotifications ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${sNotifications ? 'bg-green-500' : 'bg-slate-400'}`}></span>
                  {sNotifications ? 'Notificaciones activadas' : 'Notificaciones desactivadas'}
                </div>

                {sNotifications && (
                  <div className="mt-5 pt-5 border-t border-slate-100">
                    <p className="font-cormorant text-lg font-semibold text-slate-900">Severidad mínima para notificar</p>
                    <p className="mb-3 text-sm text-slate-500 mt-0.5 max-w-md">
                      Elige a partir de qué nivel de severidad quieres que te avisemos por correo cuando termine un análisis.
                    </p>
                    <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
                      {SEVERITY_OPTIONS.map(opt => {
                        const active = sSeverityLevel === opt.id
                        return (
                          <button key={opt.id} type="button" onClick={() => setSSeverityLevel(opt.id)}
                            className="smod-sev-opt"
                            style={{ borderColor: active ? opt.color : undefined, background: active ? `${opt.color}14` : undefined }}>
                            <span className="smod-sev-dot" style={{ background: opt.color }} />
                            <span className="flex-1 min-w-0">
                              <b className="block text-sm text-slate-900 leading-tight">{opt.label}</b>
                              <span className="block text-[11px] text-slate-400 leading-tight mt-0.5">{opt.hint}</span>
                            </span>
                            {active && (
                              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke={opt.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {saveError && (
                  <p className="mt-5 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{saveError}</p>
                )}
              </div>
            )}

            {activeTab === 'backup' && (
              <div className="rounded-2xl border border-slate-100 bg-white p-5 sm:p-6">

                <p className="font-cormorant text-xl font-semibold text-slate-900">Exportar respaldo</p>
                <p className="text-sm text-slate-500 mt-0.5 mb-3 max-w-md">Descarga tus sesiones, análisis y parcelas en un archivo JSON.</p>

                <div className="flex flex-wrap gap-2 mb-3">
                  {QUICK_RANGES.map(r => (
                    <button key={r.id} type="button" onClick={() => applyQuickRange(r.id)}
                      className={`smod-chip ${quickRange === r.id ? 'active' : ''}`}>
                      {r.label}
                    </button>
                  ))}
                </div>

                {quickRange === 'custom' && (
                  <div className="mb-3 grid grid-cols-2 gap-3 max-w-md">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Desde</label>
                      <input type="date" value={backupDateFrom} onChange={e => setBackupDateFrom(e.target.value)} className="smod-date-input" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Hasta</label>
                      <input type="date" value={backupDateTo} onChange={e => setBackupDateTo(e.target.value)} className="smod-date-input" />
                    </div>
                  </div>
                )}

                <p className="text-xs text-slate-400 mb-4">{rangeSummary}</p>

                <button onClick={exportBackup} disabled={exporting}
                  className={`rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition inline-flex items-center gap-2 ${exporting ? 'cursor-wait opacity-70' : 'hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700 cursor-pointer'}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  {exporting ? 'Generando…' : 'Exportar respaldo'}
                </button>

                <div className="my-5 h-px bg-slate-100" />

                <p className="font-cormorant text-xl font-semibold text-slate-900">Importar respaldo</p>
                <p className="text-sm text-slate-500 mt-0.5 mb-3 max-w-md">Restaura datos desde un archivo JSON generado previamente por Pitahaya Visión.</p>

                <label className={`rounded-lg border ${importing ? 'border-green-300 bg-green-50 text-green-600 cursor-wait' : 'border-slate-200 bg-white text-slate-700 hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700 cursor-pointer'} px-4 py-2.5 text-sm font-semibold transition inline-flex items-center gap-2`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  {importing ? 'Importando…' : 'Importar respaldo'}
                  {importing && <span className="inline-block w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />}
                  <input type="file" accept=".json" className="hidden" onChange={importBackup} disabled={importing} />
                </label>

                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 flex gap-3 items-start">
                  <svg className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    El respaldo incluye sesiones de chat, análisis foliares y la estructura de fincas/parcelas en formato JSON.
                    {' '}{isAdmin
                      ? 'Como administrador, el respaldo incluye los análisis de todos los usuarios.'
                      : 'El respaldo incluye únicamente tus propios datos.'}
                  </p>
                </div>
              </div>
            )}

            </div>
          </div>

          {/* Footer */}
          {activeTab === 'notifications' ? (
            <footer className="flex flex-wrap items-center justify-end gap-3 px-4 sm:px-6 py-4 border-t border-slate-100 bg-white flex-shrink-0">
              {isDirty && <span className="text-xs font-medium text-amber-600 mr-auto">Tienes cambios sin guardar</span>}
              <button onClick={resetSettings} className="smod-secondary-btn">Restaurar predeterminados</button>
              <button onClick={handleClose}   className="smod-secondary-btn">Cancelar</button>
              <button onClick={handleSaveSettings} disabled={saving || !isDirty} className="smod-save-btn">
                {saving ? 'Guardando…' : 'Guardar configuraciones'}
              </button>
            </footer>
          ) : (
            <footer className="flex items-center justify-end gap-3 px-4 sm:px-6 py-4 border-t border-slate-100 bg-white flex-shrink-0">
              <button onClick={handleClose} className="smod-secondary-btn">Cerrar</button>
            </footer>
          )}

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
