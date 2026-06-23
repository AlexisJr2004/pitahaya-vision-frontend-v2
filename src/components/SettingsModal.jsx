import { useState, useRef, useEffect } from 'react'
import { getProfilePreferences, updateProfilePreferences } from '../services/authService'

function animateCloseModal(modalRef, callback) {
  if (window.innerWidth >= 640 || !modalRef.current) { callback(); return }
  const m = modalRef.current
  m.style.transition = 'transform 0.32s cubic-bezier(0.32,0.72,0,1)'
  m.style.transform = 'translateY(110%)'
  setTimeout(() => { m.style.transform = ''; m.style.transition = ''; callback() }, 340)
}

export default function SettingsModal({ isOpen, onClose }) {
  const modalRef = useRef(null)
  const [sTheme, setSTheme] = useState('light')

  useEffect(() => {
    if (isOpen) loadSettings()
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !modalRef.current || window.innerWidth >= 640) return
    const modal = modalRef.current
    const handle = modal.querySelector('.smod-drag-handle')
    if (!handle) return

    modal.style.transition = 'none'
    modal.style.transform = 'translateY(100%)'
    requestAnimationFrame(() => requestAnimationFrame(() => {
      modal.style.transition = 'transform 0.38s cubic-bezier(0.32,0.72,0,1)'
      modal.style.transform = 'translateY(0)'
    }))

    let sy = 0, dy = 0
    const onStart = e => { sy = e.touches[0].clientY; dy = 0; modal.style.transition = 'none' }
    const onMove  = e => { dy = Math.max(0, e.touches[0].clientY - sy); modal.style.transform = `translateY(${dy}px)` }
    const onEnd   = () => {
      if (dy > 80) {
        modal.style.transition = 'transform 0.32s cubic-bezier(0.32,0.72,0,1)'
        modal.style.transform = 'translateY(110%)'
        setTimeout(() => { modal.style.transform = ''; modal.style.transition = ''; onClose() }, 340)
      } else {
        modal.style.transition = 'transform 0.3s cubic-bezier(0.32,0.72,0,1)'
        modal.style.transform = 'translateY(0)'
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
      const s = prefs.preferences || {}
      setSTheme(s.theme || 'light')
    } catch {}
  }

  const handleClose = () => animateCloseModal(modalRef, onClose)

  const handleSaveSettings = async () => {
    try {
      await updateProfilePreferences({ preferences: { theme: sTheme } })
      handleClose()
    } catch { alert('Error al guardar configuraciones') }
  }

  const resetSettings = () => setSTheme('light')

  const exportBackup = () => {
    const data = {}
    const keys = ['auth_token', 'pitahayaVision.sessions.v2', 'pitahayaVision.plantHistory.v1', 'pitahayaVision.contextOptions.v1', 'pitahayaVision.settings.v1']
    keys.forEach(key => { try { const raw = localStorage.getItem(key); if (raw) data[key] = JSON.parse(raw) } catch {} })
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), data }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `pitahaya_backup_${new Date().toISOString().slice(0, 10)}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  const importBackup = (e) => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result)
        if (!parsed.data || typeof parsed.data !== 'object') throw new Error()
        Object.entries(parsed.data).forEach(([key, value]) => { if (key !== 'auth_token') localStorage.setItem(key, JSON.stringify(value)) })
        alert('Respaldo importado correctamente. Recarga la página.')
      } catch { alert('Archivo inválido') }
    }
    reader.readAsText(file); e.target.value = ''
  }

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
        .smod-save-btn:hover{transform:translateY(-1px)}
        .smod-secondary-btn{min-width:90px;padding:.82rem 1.1rem;border-radius:16px;border:1px solid #dbe4ee;background:#fff;color:#334155;font-size:.9rem;font-weight:600;cursor:pointer;transition:background .14s}
        .smod-secondary-btn:hover{background:#f8fafc}
        .smod-set-opt{border-radius:12px;padding:.85rem 1rem;cursor:pointer;transition:all .14s;border:1px solid #e2e8f0;background:#fff;text-align:left;width:100%;display:block}
        .smod-set-opt:hover{border-color:#86efac;box-shadow:0 2px 6px rgba(0,0,0,.05)}
        .smod-set-opt.active{border-color:#bbf7d0!important;background:#f0fdf4!important}
      `}</style>
      <div className={`smod-overlay ${isOpen ? 'open' : ''}`} onClick={handleClose}>
        <div className="smod-modal" ref={modalRef} onClick={e => e.stopPropagation()}>
          <div className="smod-drag-handle" />
          <div className="smod-modal-header px-5 py-5 sm:px-7 sm:py-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ background: 'linear-gradient(135deg,#16a34a 0%,#15803d 100%)' }}>
                  <svg className="w-5 h-5" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                </div>
                <div>
                  <span className="smod-badge">Preferencias</span>
                  <h3 className="font-cormorant text-2xl sm:text-3xl font-semibold text-gray-900 mt-1 leading-tight">Configuraciones</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Personaliza la apariencia, accesibilidad y realiza respaldos.</p>
                </div>
              </div>
              <button onClick={handleClose} className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 transition flex items-center justify-center text-gray-500 flex-shrink-0" style={{ border: 'none', cursor: 'pointer' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>
          <div className="smod-modal-body px-4 sm:px-6 py-5 space-y-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <svg className="w-3.5 h-3.5 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                <span>Apariencia</span>
                <div className="h-px flex-1 bg-slate-200"/>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="font-cormorant text-xl font-semibold text-slate-900">Tema de la interfaz</p>
                <p className="mb-4 text-sm text-slate-500 mt-0.5">Selecciona la apariencia visual de la plataforma.</p>
                <div className="grid gap-3 grid-cols-3">
                  {[
                    { id: 'light', label: 'Claro', desc: 'Fondo blanco, modo día.', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> },
                    { id: 'dark', label: 'Oscuro', desc: 'Modo noche elegante.', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg> },
                    { id: 'system', label: 'Automático', desc: 'Sigue al sistema.', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> },
                  ].map(({ id, label, desc, icon }) => (
                    <button key={id} onClick={() => setSTheme(id)} className={`smod-set-opt ${sTheme === id ? 'active' : ''}`}>
                      <span className={`block mb-2 ${sTheme === id ? 'text-brand-600' : 'text-slate-400'}`}>{icon}</span>
                      <b className="block text-sm text-slate-900">{label}</b>
                      <p className="mt-0.5 text-xs text-slate-500">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <svg className="w-3.5 h-3.5 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
                <span>Datos</span>
                <div className="h-px flex-1 bg-slate-200"/>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="font-cormorant text-xl font-semibold text-slate-900">Respaldo de datos</p>
                <p className="mb-4 text-sm text-slate-500 mt-0.5">Exporta o importa toda tu información: sesiones, análisis y parcelas.</p>
                <div className="flex flex-wrap gap-3">
                  <button onClick={exportBackup} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700 cursor-pointer inline-flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Exportar respaldo
                  </button>
                  <label className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700 cursor-pointer inline-flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    Importar respaldo<input type="file" accept=".json" className="hidden" onChange={importBackup} />
                  </label>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
              <button onClick={resetSettings} className="smod-secondary-btn">Restaurar configuraciones</button>
              <button onClick={handleClose} className="smod-secondary-btn">Cerrar</button>
              <button onClick={handleSaveSettings} className="smod-save-btn">Guardar configuraciones</button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
