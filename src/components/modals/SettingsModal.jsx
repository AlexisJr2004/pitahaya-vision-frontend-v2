import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { getProfilePreferences, updateProfilePreferences } from '../../services/authService'
import { useAuth } from '../../contexts/AuthContext'
import SuccessModal from './SuccessModal'
import HistoryFilterBar from '../HistoryFilterBar'
import { animateClose, setupDragToDismiss } from '../../utils/modalUtils'
import './modals.css'

const SEVERITY_OPTIONS = [
  { id: 'ninguna',  label: 'Ninguna',  hint: 'No enviar avisos',      color: '#94a3b8' },
  { id: 'baja',     label: 'Baja',     hint: 'Desde riesgo leve',     color: '#84cc16' },
  { id: 'moderada', label: 'Moderada', hint: 'Desde riesgo moderado', color: '#d97706' },
  { id: 'alta',     label: 'Alta',     hint: 'Desde riesgo alto',     color: '#ea580c' },
  { id: 'critica',  label: 'Crítica',  hint: 'Solo casos críticos',   color: '#dc2626' },
  { id: 'todas',    label: 'Todas',    hint: 'Avisar siempre',        color: '#16a34a' },
]

const QUICK_RANGES = [
  { key: 'all', label: 'Todo el historial' },
  { key: '7',   label: 'Últimos 7 días' },
  { key: '30',  label: 'Últimos 30 días' },
]

export default function SettingsModal({ isOpen, onClose }) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const modalRef = useRef(null)
  const animatedRef = useRef(new Set())

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
    if (isOpen) { loadSettings(); setSaveError('') }
  }, [isOpen])

  // drag-to-dismiss on mobile
  useEffect(() => setupDragToDismiss({
    modalRef, isOpen, onClose, handleClass: '.drag-handle', animatedRefs: animatedRef,
  }), [isOpen, onClose])

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

  const handleClose = () => animateClose(modalRef, onClose, animatedRef)

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
    if (key === 'all') { setBackupDateFrom(''); setBackupDateTo(''); return }
    const days = Number(key)
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - (days - 1))
    const fmt = d => d.toISOString().slice(0, 10)
    setBackupDateFrom(fmt(from))
    setBackupDateTo(fmt(to))
  }

  const rangeSummary = (backupDateFrom || backupDateTo)
    ? `Rango seleccionado: ${backupDateFrom || '…'} → ${backupDateTo || '…'}`
    : quickRange === 'all'
      ? 'Se exportará todo el historial disponible.'
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
      <div className={`context-overlay ${isOpen ? 'open' : ''}`} onClick={handleClose}>
        <div className="context-modal modal-compact" ref={modalRef} onClick={e => e.stopPropagation()}>
          <div className="drag-handle" />

          {/* Header */}
          <header className="context-modal-header px-5 py-5 sm:px-8 sm:py-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="context-badge">Preferencias</span>
                <h3 className="font-cormorant text-2xl sm:text-3xl font-semibold text-gray-900 mt-3 leading-tight">Configuraciones</h3>
                <p className="text-sm text-gray-500 mt-2 max-w-2xl leading-relaxed">Notificaciones por correo y respaldo de tu información.</p>
              </div>
              <button onClick={handleClose}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 transition flex items-center justify-center text-gray-500 flex-shrink-0"
                style={{ border: 'none', cursor: 'pointer' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="context-summary mt-5 grid gap-2 sm:grid-cols-2">
              <div><p className="text-[0.65rem] uppercase tracking-[0.18em] text-gray-400">Correo</p><p className="text-sm text-gray-700 mt-1">{sNotifications ? 'Notificaciones activas' : 'Notificaciones desactivadas'}</p></div>
              <div><p className="text-[0.65rem] uppercase tracking-[0.18em] text-gray-400">Respaldo</p><p className="text-sm text-gray-700 mt-1">Exporta o restaura tus datos en formato JSON.</p></div>
            </div>
          </header>

          <div className="context-modal-body px-4 sm:px-6 py-5">
            <div className="space-y-4">

              <div className="context-section">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="context-section-title">Notificaciones por correo</p>
                    <p className="text-sm text-slate-500 mt-1 max-w-md">
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

                {saveError && (
                  <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{saveError}</p>
                )}
              </div>

              {sNotifications && (
                <div className="context-section">
                  <p className="context-section-title">Severidad mínima para notificar</p>
                  <p className="mb-3 text-sm text-slate-500 mt-1 max-w-md">
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

              <div className="context-section">
                <p className="context-section-title">Exportar respaldo</p>
                <p className="text-sm text-slate-500 mt-1 mb-3 max-w-md">Descarga tus sesiones, análisis y parcelas en un archivo JSON.</p>

                <HistoryFilterBar
                  rangeOptions={QUICK_RANGES}
                  range={quickRange}
                  onRangeChange={applyQuickRange}
                  dateFrom={backupDateFrom}
                  onDateFromChange={setBackupDateFrom}
                  dateTo={backupDateTo}
                  onDateToChange={setBackupDateTo}
                  onClear={() => applyQuickRange('all')}
                />

                <p className="text-xs text-slate-400 mt-3 mb-4">{rangeSummary}</p>

                <button onClick={exportBackup} disabled={exporting}
                  className={`rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition inline-flex items-center gap-2 ${exporting ? 'cursor-wait opacity-70' : 'hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700 cursor-pointer'}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  {exporting ? 'Generando…' : 'Exportar respaldo'}
                </button>
              </div>

              <div className="context-section">
                <p className="context-section-title">Importar respaldo</p>
                <p className="text-sm text-slate-500 mt-1 mb-3 max-w-md">Restaura datos desde un archivo JSON generado previamente por Pitahaya Visión.</p>

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

            </div>
          </div>

          {/* Footer */}
          <footer className="flex flex-wrap items-center justify-end gap-3 px-4 sm:px-6 py-4 border-t border-slate-100 bg-white flex-shrink-0">
            {isDirty && <span className="text-xs font-medium text-amber-600 mr-auto">Tienes cambios sin guardar</span>}
            <button onClick={resetSettings} className="modal-secondary-btn">Restaurar predeterminados</button>
            <button onClick={handleClose}   className="modal-secondary-btn">Cancelar</button>
            <button onClick={handleSaveSettings} disabled={saving || !isDirty} className="modal-save-btn">
              {saving ? 'Guardando…' : 'Guardar configuraciones'}
            </button>
          </footer>

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
