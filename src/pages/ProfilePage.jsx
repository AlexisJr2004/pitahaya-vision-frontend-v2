import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getProfile, updateProfile } from '../services/authService'
import { validateEcuadorianDni, validateEcuadorianPhone } from '../utils/validators'

export default function ProfilePage({ onNavigate }) {
  const { user } = useAuth()
  const fileInputRef = useRef(null)

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })

  const [form, setForm] = useState({
    email: '', phone: '', first_name: '', last_name: '', dni: '',
  })
  const [formErrors, setFormErrors] = useState({})
  const [photoPreview, setPhotoPreview] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)

  const displayName = profile?.full_name || user?.full_name || 'Usuario'
  const username = profile?.username || user?.username || ''
  const userEmail = profile?.email || user?.email || ''
  const roleLabel = profile?.role_label || (profile?.is_admin ? 'Administrador' : 'Usuario')
  const initials = (() => {
    const parts = displayName.split(' ')
    return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : displayName.substring(0, 2).toUpperCase()
  })()
  const profilePhotoUrl = profile?.profile_photo_url || user?.profile_photo_url

  useEffect(() => {
    async function load() {
      try {
        const data = await getProfile()
        setProfile(data)
        setForm({
          email: data.email || '',
          phone: data.phone || '',
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          dni: data.dni || '',
        })
        if (data.profile_photo_url) setPhotoPreview(data.profile_photo_url)
      } catch {
        setMsg({ type: 'error', text: 'Error al cargar el perfil' })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handlePhoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setMsg({ type: 'error', text: 'Solo JPG, PNG o WEBP' }); return
    }
    if (file.size > 10 * 1024 * 1024) {
      setMsg({ type: 'error', text: 'Máximo 10 MB' }); return
    }
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setMsg({ type: '', text: '' })
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    const clean = name === 'phone' || name === 'dni' ? value.replace(/\D/g, '') : value
    setForm(p => ({ ...p, [name]: clean }))
    if (formErrors[name]) setFormErrors(p => ({ ...p, [name]: '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMsg({ type: '', text: '' })

    const errors = {}
    if (!form.first_name.trim()) errors.first_name = 'El nombre es obligatorio'
    if (!form.last_name.trim()) errors.last_name = 'El apellido es obligatorio'
    if (!form.email.trim()) errors.email = 'El correo es obligatorio'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Correo inválido'
    if (form.dni.trim()) { const e = validateEcuadorianDni(form.dni.trim()); if (e) errors.dni = e }
    if (form.phone.trim()) { const e = validateEcuadorianPhone(form.phone.trim()); if (e) errors.phone = e }
    if (Object.keys(errors).length) { setFormErrors(errors); return }
    setFormErrors({})

    setSaving(true)
    try {
      const payload = { first_name: form.first_name, last_name: form.last_name, email: form.email, dni: form.dni, phone: form.phone }
      if (photoFile) {
        const fd = new FormData()
        Object.entries(payload).forEach(([k, v]) => fd.append(k, v))
        fd.append('profile_photo', photoFile)
        await updateProfile(fd)
      } else {
        await updateProfile(payload)
      }
      setMsg({ type: 'success', text: 'Cambios guardados correctamente.' })
      const updated = await getProfile()
      setProfile(updated)
    } catch (err) {
      const data = err.response?.data
      const be = {}
      ;['first_name', 'last_name', 'dni', 'phone', 'email', 'profile_photo'].forEach(k => {
        if (data?.[k]) be[k] = Array.isArray(data[k]) ? data[k][0] : data[k]
      })
      if (Object.keys(be).length) { setFormErrors(be); return }
      setMsg({ type: 'error', text: data?.non_field_errors?.[0] || 'Error al guardar' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <section id="profile" className="mb-10 fade-in space-y-6">
        <div className="flex items-center justify-center py-20 text-brand-600">
          <i className="fas fa-spinner fa-spin text-xl mr-3"></i>
          <span className="text-sm font-medium">Cargando perfil...</span>
        </div>
      </section>
    )
  }

  return (
    <section id="profile" className="mb-10 fade-in space-y-6">
      <header className="flex items-start justify-between flex-wrap gap-4">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-600 mb-2">Configuración personal</p>
          <h2 className="panel-title text-3xl md:text-4xl font-semibold text-slate-900 leading-tight">Mi perfil</h2>
          <p className="mt-3 text-sm md:text-base text-slate-500 leading-7">Mantén tus datos actualizados y revisa la información de tu cuenta registrada en la plataforma.</p>
        </div>
        <div className="dashboard-panel px-4 py-3 min-w-[240px]">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-slate-400">Perfil activo</p>
          <p className="mt-1 text-base font-semibold text-slate-900">{roleLabel}</p>
          <p className="mt-1 text-sm dashboard-muted">{profile?.is_admin ? 'Acceso completo al panel' : 'Acceso limitado'}</p>
        </div>
      </header>

      {msg.text && (
        <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${msg.type === 'success' ? 'bg-brand-50 border border-brand-100 text-brand-700' : 'bg-red-50 border border-red-100 text-red-600'}`}>
          <i className={`fas ${msg.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
          {msg.text}
        </div>
      )}

      <section className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">
        {/* ─── LEFT: FORM ────────────────────────────────────────── */}
        <article className="dashboard-panel overflow-hidden">
          <header className="dashboard-panel-header px-5 py-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-brand-600 font-semibold">Edición</p>
              <h3 className="mt-1 panel-title text-2xl font-semibold text-slate-900">Datos de la cuenta</h3>
            </div>
            <span className="text-xs text-slate-500">Información personal</span>
          </header>
          <div className="px-5 py-5">
            <form className="space-y-5" onSubmit={handleSubmit}>
              <fieldset>
                <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <i className="fas fa-envelope text-slate-300"></i>
                  <span>Datos de cuenta</span>
                  <div className="h-px flex-1 bg-slate-200"></div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Correo electrónico</label>
                    <div className="relative rounded-xl border border-slate-200 bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
                      <i className="fas fa-envelope absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400"></i>
                      <input name="email" type="email" value={form.email} onChange={handleChange}
                        className="w-full rounded-xl border-0 bg-transparent py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none"
                      />
                    </div>
                    {formErrors.email && <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Teléfono</label>
                    <div className="relative rounded-xl border border-slate-200 bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
                      <i className="fas fa-phone absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400"></i>
                      <input name="phone" type="tel" maxLength={10} value={form.phone} onChange={handleChange}
                        className="w-full rounded-xl border-0 bg-transparent py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none"
                      />
                    </div>
                    {formErrors.phone && <p className="text-xs text-red-500 mt-1">{formErrors.phone}</p>}
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <i className="fas fa-user text-slate-300"></i>
                  <span>Datos personales</span>
                  <div className="h-px flex-1 bg-slate-200"></div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Nombre</label>
                    <div className="relative rounded-xl border border-slate-200 bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
                      <i className="fas fa-user absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400"></i>
                      <input name="first_name" type="text" value={form.first_name} onChange={handleChange}
                        className="w-full rounded-xl border-0 bg-transparent py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none"
                      />
                    </div>
                    {formErrors.first_name && <p className="text-xs text-red-500 mt-1">{formErrors.first_name}</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Apellido</label>
                    <div className="relative rounded-xl border border-slate-200 bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
                      <i className="fas fa-user absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400"></i>
                      <input name="last_name" type="text" value={form.last_name} onChange={handleChange}
                        className="w-full rounded-xl border-0 bg-transparent py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none"
                      />
                    </div>
                    {formErrors.last_name && <p className="text-xs text-red-500 mt-1">{formErrors.last_name}</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Cédula</label>
                    <div className="relative rounded-xl border border-slate-200 bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
                      <i className="fas fa-id-card absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400"></i>
                      <input name="dni" type="text" maxLength={10} value={form.dni} onChange={handleChange}
                        className="w-full rounded-xl border-0 bg-transparent py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none"
                      />
                    </div>
                    {formErrors.dni && <p className="text-xs text-red-500 mt-1">{formErrors.dni}</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Dirección</label>
                    <div className="relative rounded-xl border border-slate-200 bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
                      <i className="fas fa-location-dot absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400"></i>
                      <input type="text" placeholder="Av. principal..." readOnly
                        className="w-full rounded-xl border-0 bg-transparent py-2.5 pl-10 pr-4 text-sm text-slate-400 outline-none cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              </fieldset>

              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-5">
                <button type="button" onClick={() => onNavigate?.('dashboard')}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-lg active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  style={{ boxShadow: '0 4px 14px rgba(22,163,74,.2)' }}
                >
                  <i className="fas fa-floppy-disk mr-1.5"></i>
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </article>

        {/* ─── RIGHT: PHOTO + INFO ────────────────────────────────── */}
        <div className="space-y-6">
          <article className="dashboard-panel overflow-hidden">
            <header className="dashboard-panel-header px-5 py-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-brand-600 font-semibold">Foto</p>
                <h3 className="mt-1 panel-title text-2xl font-semibold text-slate-900">Imagen de perfil</h3>
              </div>
              <span className="text-xs text-slate-500">Avatar</span>
            </header>
            <div className="px-5 py-5 flex flex-col items-center text-center">
              <div className="relative">
                {photoPreview ? (
                  <img src={photoPreview} alt="Foto de perfil" className="h-28 w-28 rounded-full border-[3px] border-brand-500 object-cover shadow-md" style={{ boxShadow: '0 4px 14px rgba(22,163,74,.2)' }} />
                ) : (
                  <div className="h-28 w-28 rounded-full border-[3px] border-brand-500 flex items-center justify-center text-4xl font-bold text-white shadow-md" style={{ background: 'linear-gradient(135deg, #16a34a, #22c55e, #4ade80)', boxShadow: '0 4px 14px rgba(22,163,74,.2)' }}>
                    {initials}
                  </div>
                )}
                <span className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-brand-500 text-white shadow-sm">
                  <i className="fas fa-check text-[0.65rem]"></i>
                </span>
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">{displayName}</h2>
              <p className="text-sm text-slate-500">@{username}</p>

              <div className="mt-5 w-full">
                <input ref={fileInputRef} id="profile_photo" type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                <label htmlFor="profile_photo" className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500 transition-colors hover:border-brand-600 hover:bg-brand-50 hover:text-brand-600">
                  <i className="fas fa-cloud-arrow-up text-base"></i>
                  <span>Cambiar foto</span>
                </label>
              </div>
            </div>
          </article>

          <article className="dashboard-panel overflow-hidden">
            <header className="dashboard-panel-header px-5 py-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-brand-600 font-semibold">Resumen</p>
                <h3 className="mt-1 panel-title text-2xl font-semibold text-slate-900">Información de la cuenta</h3>
              </div>
              <span className="text-xs text-slate-500">Detalles</span>
            </header>
            <div className="px-5 py-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Usuario</span>
                  <span className="text-sm font-semibold text-slate-800">{username || '—'}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Rol</span>
                  <span className="text-sm font-semibold text-brand-600">{roleLabel}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Correo</span>
                  <span className="text-sm font-semibold text-slate-800 break-all">{userEmail || '—'}</span>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>
    </section>
  )
}
