import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getProfilePreferences, updateProfilePreferences, changePassword, deleteAccount } from '../services/authService'

export default function SettingsPage() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('general')
  const [msg, setMsg] = useState({ type: '', text: '' })

  // ─── Password ──────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({ old_password: '', new_password1: '', new_password2: '' })
  const [pwErrors, setPwErrors] = useState({})
  const [pwSaving, setPwSaving] = useState(false)

  // ─── Delete ────────────────────────────────────────────────────
  const [deleting, setDeleting] = useState(false)

  const displayName = user?.full_name || user?.username || 'Usuario'

  const clearMsg = () => setMsg({ type: '', text: '' })

  // ─── Password Change ───────────────────────────────────────────
  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    clearMsg()
    const errors = {}
    if (!pwForm.old_password) errors.old_password = 'La contraseña actual es obligatoria'
    if (!pwForm.new_password1) errors.new_password1 = 'La nueva contraseña es obligatoria'
    else if (pwForm.new_password1.length < 8) errors.new_password1 = 'Mínimo 8 caracteres'
    if (!pwForm.new_password2) errors.new_password2 = 'Debes confirmar la contraseña'
    else if (pwForm.new_password1 !== pwForm.new_password2) errors.new_password2 = 'Las contraseñas no coinciden'
    if (Object.keys(errors).length) { setPwErrors(errors); return }
    setPwErrors({})

    setPwSaving(true)
    try {
      await changePassword(pwForm)
      setMsg({ type: 'success', text: 'Contraseña actualizada correctamente.' })
      setPwForm({ old_password: '', new_password1: '', new_password2: '' })
    } catch (err) {
      const data = err.response?.data
      const be = {}
      ;['old_password', 'new_password1', 'new_password2'].forEach(k => {
        if (data?.[k]) be[k] = Array.isArray(data[k]) ? data[k][0] : data[k]
      })
      if (Object.keys(be).length) { setPwErrors(be); return }
      setPwErrors({ old_password: data?.non_field_errors?.[0] || 'Error al cambiar la contraseña' })
    } finally {
      setPwSaving(false)
    }
  }

  // ─── Delete Account ────────────────────────────────────────────
  const handleDelete = async () => {
    clearMsg()
    setDeleting(true)
    try {
      await deleteAccount()
      await logout()
    } catch {
      setMsg({ type: 'error', text: 'Error al eliminar la cuenta' })
      setDeleting(false)
    }
  }

  const isAdmin = user?.is_admin
  const userEmail = user?.email || ''

  return (
    <section id="settings" className="mb-10 fade-in space-y-6">
      <header className="flex items-start justify-between flex-wrap gap-4">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-600 mb-2">Administración del sistema</p>
          <h2 className="panel-title text-3xl md:text-4xl font-semibold text-slate-900 leading-tight">Configuraciones</h2>
          <p className="mt-3 text-sm md:text-base text-slate-500 leading-7">Administra la apariencia, accesibilidad y seguridad de tu cuenta en la plataforma.</p>
        </div>
        <div className="dashboard-panel px-4 py-3 min-w-[240px]">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-slate-400">Sesión activa</p>
          <p className="mt-1 text-base font-semibold text-slate-900">{displayName.split(' ')[0]}</p>
          <p className="mt-1 text-sm dashboard-muted">{userEmail}</p>
        </div>
      </header>

      {msg.text && (
        <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${msg.type === 'success' ? 'bg-brand-50 border border-brand-100 text-brand-700' : 'bg-red-50 border border-red-100 text-red-600'}`}>
          <i className={`fas ${msg.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
          {msg.text}
        </div>
      )}

      <section className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">
        {/* ─── LEFT ──────────────────────────────────────────────── */}
        <article className="dashboard-panel overflow-hidden">
          <header className="dashboard-panel-header px-5 py-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-brand-600 font-semibold">Ajustes</p>
              <h3 className="mt-1 panel-title text-2xl font-semibold text-slate-900">Personalización y seguridad</h3>
            </div>
            <span className="text-xs text-slate-500">Preferencias</span>
          </header>
          <div className="px-5 py-5">
            {/* ── Tabs ── */}
            <nav className="flex flex-wrap gap-2 mb-6">
              {[
                { key: 'general', label: 'General', icon: 'fa-moon' },
                { key: 'accessibility', label: 'Accesibilidad', icon: 'fa-text-height' },
                { key: 'account', label: 'Cuenta', icon: 'fa-shield-halved' },
              ].map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`tab-btn rounded-full border px-4 py-2 text-sm font-semibold cursor-pointer ${activeTab === tab.key ? 'active' : 'border-slate-200 bg-white text-slate-600'}`}
                >
                  <i className={`fas ${tab.icon} mr-1.5`}></i>
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="space-y-5">
              {/* ═══ GENERAL ═══ */}
              <section id="settings-general-section" className={activeTab === 'general' ? '' : 'hidden'}>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <i className="fas fa-palette text-slate-300"></i>
                    <span>Apariencia</span>
                    <div className="h-px flex-1 bg-slate-200"></div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="font-semibold text-slate-900">Tamaño de fuente</p>
                    <p className="mb-4 text-sm text-slate-500">Selecciona un tamaño para tu sesión.</p>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {['Pequeño', 'Mediano', 'Grande', 'Muy grande'].map((size, i) => (
                        <div key={size}
                          className={`rounded-xl p-4 cursor-pointer transition hover:shadow-sm ${i === 1 ? 'border border-brand-200 bg-brand-50' : 'border border-slate-200 bg-white hover:border-brand-200'}`}
                        >
                          <b className="text-sm text-slate-900">{size}</b>
                          <p className="mt-1 text-xs text-slate-500">
                            {i === 0 && 'Ideal para ver más contenido.'}
                            {i === 1 && 'Recomendado.'}
                            {i === 2 && 'Lectura cómoda.'}
                            {i === 3 && 'Máxima legibilidad.'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* ═══ ACCESSIBILITY ═══ */}
              <section id="settings-accessibility-section" className={activeTab === 'accessibility' ? '' : 'hidden'}>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <i className="fas fa-font text-slate-300"></i>
                    <span>Tipos de fuente</span>
                    <div className="h-px flex-1 bg-slate-200"></div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="font-semibold text-slate-900">Selecciona una fuente accesible</p>
                    <p className="mb-4 text-sm text-slate-500">Elige la tipografía que mejor se adapte a tu lectura.</p>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {[
                        { name: 'Lexend', desc: 'Legibilidad visual.' },
                        { name: 'Sistema', desc: 'Fuente estándar.' },
                        { name: 'OpenDyslexic', desc: 'Para dislexia.' },
                        { name: 'Roboto', desc: 'Versátil.' },
                        { name: 'Comic Neue', desc: 'Amigable.' },
                        { name: 'Courier Prime', desc: 'Monoespaciada.' },
                        { name: 'Atkinson', desc: 'Accesibilidad.' },
                        { name: 'Times New Roman', desc: 'Clásica.' },
                      ].map((font, i) => (
                        <div key={font.name}
                          className={`rounded-xl p-4 cursor-pointer transition hover:shadow-sm ${i === 0 ? 'border border-brand-200 bg-brand-50' : 'border border-slate-200 bg-white hover:border-brand-200'}`}
                        >
                          <b className="text-sm text-slate-900">{font.name}</b>
                          <p className="mt-1 text-xs text-slate-500">{font.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* ═══ ACCOUNT ═══ */}
              <section id="settings-account-section" className={activeTab === 'account' ? '' : 'hidden'}>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <i className="fas fa-lock text-slate-300"></i>
                    <span>Seguridad</span>
                    <div className="h-px flex-1 bg-slate-200"></div>
                  </div>

                  {/* ── Change Password ── */}
                  <form onSubmit={handlePasswordSubmit} className="rounded-xl border border-slate-200 bg-white p-5 mb-4">
                    <p className="font-semibold text-slate-900">Cambiar contraseña</p>
                    <p className="mb-4 text-sm text-slate-500">Actualiza tu contraseña periódicamente.</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-slate-600">Actual</label>
                        <input type="password" value={pwForm.old_password} placeholder="Contraseña actual"
                          onChange={e => { setPwForm(p => ({ ...p, old_password: e.target.value })); setPwErrors(p => ({ ...p, old_password: '' })) }}
                          className={`w-full rounded-lg border ${pwErrors.old_password ? 'border-red-400' : 'border-slate-200'} bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100`}
                        />
                        {pwErrors.old_password && <p className="text-xs text-red-500 mt-1">{pwErrors.old_password}</p>}
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-slate-600">Nueva</label>
                        <input type="password" value={pwForm.new_password1} placeholder="Nueva contraseña"
                          onChange={e => { setPwForm(p => ({ ...p, new_password1: e.target.value })); setPwErrors(p => ({ ...p, new_password1: '' })) }}
                          className={`w-full rounded-lg border ${pwErrors.new_password1 ? 'border-red-400' : 'border-slate-200'} bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100`}
                        />
                        {pwErrors.new_password1 && <p className="text-xs text-red-500 mt-1">{pwErrors.new_password1}</p>}
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-slate-600">Confirmar</label>
                        <input type="password" value={pwForm.new_password2} placeholder="Confirmar contraseña"
                          onChange={e => { setPwForm(p => ({ ...p, new_password2: e.target.value })); setPwErrors(p => ({ ...p, new_password2: '' })) }}
                          className={`w-full rounded-lg border ${pwErrors.new_password2 ? 'border-red-400' : 'border-slate-200'} bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100`}
                        />
                        {pwErrors.new_password2 && <p className="text-xs text-red-500 mt-1">{pwErrors.new_password2}</p>}
                      </div>
                    </div>
                    <button type="submit" disabled={pwSaving}
                      className="mt-4 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                      style={{ boxShadow: '0 4px 14px rgba(22,163,74,.2)' }}
                    >
                      <i className="fas fa-floppy-disk mr-1.5"></i>
                      {pwSaving ? 'Actualizando...' : 'Actualizar contraseña'}
                    </button>
                  </form>

                  {/* ── Delete Account ── */}
                  <div className="rounded-xl border border-red-100 bg-red-50 p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-red-500 shadow-sm flex-shrink-0">
                        <i className="fas fa-trash-can text-sm"></i>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-red-700">Eliminar cuenta</p>
                        <p className="mt-1 text-sm text-red-600/80">Esta acción es irreversible. Todos tus datos serán eliminados.</p>
                        <div className="mt-4 flex flex-wrap gap-3">
                          <button type="button" disabled={deleting}
                            onClick={handleDelete}
                            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                            style={{ boxShadow: '0 4px 14px rgba(220,38,38,.2)' }}
                          >
                            <i className="fas fa-trash-can mr-1.5"></i>
                            {deleting ? 'Eliminando...' : 'Eliminar cuenta'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* ── BACKUP ── */}
              <section className="mt-4">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <i className="fas fa-database text-slate-300"></i>
                    <span>Respaldo de datos</span>
                    <div className="h-px flex-1 bg-slate-200"></div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="font-semibold text-slate-900">Exportar o importar información</p>
                    <p className="mb-4 text-sm text-slate-500">Sesiones, análisis, parcelas y configuraciones.</p>
                    <div className="flex flex-wrap gap-3">
                      <button onClick={() => alert('Función de exportación próximamente.')}
                        className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700 cursor-pointer"
                      >
                        <i className="fas fa-download mr-1.5"></i> Exportar
                      </button>
                      <label className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700 cursor-pointer">
                        <i className="fas fa-upload mr-1.5"></i> Importar
                        <input type="file" accept=".json" className="hidden" onChange={() => alert('Función de importación próximamente.')} />
                      </label>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </article>

        {/* ─── RIGHT ─────────────────────────────────────────────── */}
        <div className="space-y-6">
          <article className="dashboard-panel overflow-hidden">
            <header className="dashboard-panel-header px-5 py-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-brand-600 font-semibold">Usuario</p>
                <h3 className="mt-1 panel-title text-2xl font-semibold text-slate-900">Cuenta activa</h3>
              </div>
              <span className="text-xs text-slate-500">Sesión</span>
            </header>
            <div className="px-5 py-5">
              <div className="space-y-3">
                <div className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-brand-600 shadow-sm">
                    <i className="fas fa-user text-sm"></i>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Usuario</p>
                    <p className="text-sm font-semibold text-slate-800">{user?.username || '—'}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
                    <i className="fas fa-envelope text-sm"></i>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Correo</p>
                    <p className="text-sm font-semibold text-slate-800 break-all">{userEmail || '—'}</p>
                  </div>
                </div>
              </div>
            </div>
          </article>

          <article className="dashboard-panel overflow-hidden">
            <header className="dashboard-panel-header px-5 py-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-brand-600 font-semibold">Atajo</p>
                <h3 className="mt-1 panel-title text-2xl font-semibold text-slate-900">Navegación rápida</h3>
              </div>
              <span className="text-xs text-slate-500">Accesos</span>
            </header>
            <div className="px-5 py-5">
              <div className="space-y-3">
                <div className="w-full flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                  style={{ cursor: 'default', opacity: 0.7 }}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <i className="fas fa-table-columns text-sm"></i>
                  </div>
                  Ir al Dashboard
                </div>
                <div className="w-full flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                  style={{ cursor: 'default', opacity: 0.7 }}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                    <i className="fas fa-user text-sm"></i>
                  </div>
                  Editar perfil
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>
    </section>
  )
}
