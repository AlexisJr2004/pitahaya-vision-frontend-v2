import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { updateProfile } from '../services/authService'

function animateCloseModal(modalRef, callback) {
  if (window.innerWidth >= 640 || !modalRef.current) { callback(); return }
  const m = modalRef.current
  m.style.transition = 'transform 0.32s cubic-bezier(0.32,0.72,0,1)'
  m.style.transform = 'translateY(110%)'
  setTimeout(() => { m.style.transform = ''; m.style.transition = ''; callback() }, 340)
}

export default function ProfileModal({ isOpen, onClose }) {
  const { user } = useAuth()
  const modalRef = useRef(null)
  const [profileForm, setProfileForm] = useState({ email: '', phone: '', first_name: '', last_name: '', dni: '' })
  const [profilePhotoFile, setProfilePhotoFile] = useState(null)
  const [profilePhotoPreview, setProfilePhotoPreview] = useState(null)

  const displayName = user?.full_name || user?.username || 'Usuario'
  const roleLabel = user?.role_label || (user?.is_admin ? 'Administrador' : 'Usuario')
  const initials = (() => {
    const parts = displayName.split(' ')
    return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : displayName.substring(0, 2).toUpperCase()
  })()
  const profilePhotoUrl = user?.profile_photo_url

  useEffect(() => {
    if (isOpen) {
      setProfileForm({ email: user?.email || '', phone: user?.phone || '', first_name: user?.first_name || '', last_name: user?.last_name || '', dni: user?.dni || '' })
      setProfilePhotoFile(null)
      setProfilePhotoPreview(null)
    }
  }, [isOpen, user])

  useEffect(() => {
    if (!isOpen || !modalRef.current || window.innerWidth >= 640) return
    const modal = modalRef.current
    const handle = modal.querySelector('.pm-drag-handle')
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

  const handleClose = () => animateCloseModal(modalRef, onClose)

  const handleProfilePhotoSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setProfilePhotoFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setProfilePhotoPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    try {
      const fd = new FormData()
      fd.append('email', profileForm.email)
      fd.append('phone', profileForm.phone)
      fd.append('first_name', profileForm.first_name)
      fd.append('last_name', profileForm.last_name)
      fd.append('dni', profileForm.dni)
      if (profilePhotoFile) fd.append('profile_photo', profilePhotoFile)
      await updateProfile(fd)
      alert('Perfil actualizado correctamente.')
      onClose()
      window.location.reload()
    } catch { alert('Error al actualizar el perfil') }
  }

  return (
    <>
      <style>{`
        .pm-overlay{position:fixed;inset:0;z-index:230;display:none;align-items:flex-end;justify-content:center;padding:0;background:rgba(15,23,42,.45);backdrop-filter:blur(4px)}
        .pm-overlay.open{display:flex}
        .pm-modal{width:100%;max-height:92dvh;border-radius:28px 28px 0 0;background:#fff;border:1px solid #eef2f7;box-shadow:0 -8px 48px rgba(15,23,42,.18);overflow:hidden;display:flex;flex-direction:column}
        @media(min-width:640px){.pm-overlay{align-items:center;padding:1rem}.pm-modal{width:min(100%,980px);max-height:min(92dvh,960px);border-radius:28px;box-shadow:0 24px 48px rgba(15,23,42,.18)}}
        .pm-modal-header{background:#fff;color:#0f172a;border-bottom:1px solid #eef2f7;flex-shrink:0}
        .pm-modal-body{overflow-y:auto;background:linear-gradient(180deg,#fff 0%,#f8fafc 100%);flex:1}
        .pm-drag-handle{display:none}
        @media(max-width:639px){.pm-drag-handle{display:block;width:36px;height:4px;background:#cbd5e1;border-radius:999px;margin:10px auto 4px;flex-shrink:0}}
        .pm-badge{display:inline-flex;align-items:center;gap:.35rem;border-radius:9999px;border:1px solid #dcfce7;background:#f0fdf4;color:#15803d;padding:.3rem .7rem;font-size:.68rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
        .pm-section{border:1px solid #e5e7eb;background:#fff;border-radius:22px;padding:1rem}
        .pm-brand-avatar{background:linear-gradient(135deg,#16a34a,#22c55e,#4ade80)}
        .pm-save-btn{min-width:130px;padding:.82rem 1.15rem;border-radius:16px;background:linear-gradient(135deg,#16a34a,#22c55e);color:#fff;font-size:.9rem;font-weight:700;transition:transform .14s ease,box-shadow .14s ease;box-shadow:0 14px 26px rgba(22,163,74,.18);border:none;cursor:pointer}
        .pm-save-btn:hover{transform:translateY(-1px)}
        .pm-cancel-btn{min-width:90px;padding:.82rem 1.1rem;border-radius:16px;border:1px solid #dbe4ee;background:#fff;color:#334155;font-size:.9rem;font-weight:600;cursor:pointer;transition:background .14s}
        .pm-cancel-btn:hover{background:#f8fafc}
      `}</style>
      <div className={`pm-overlay ${isOpen ? 'open' : ''}`} onClick={handleClose}>
        <div className="pm-modal" ref={modalRef} onClick={e => e.stopPropagation()}>
          <div className="pm-drag-handle" />
          <div className="pm-modal-header px-5 py-5 sm:px-7 sm:py-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ background: 'linear-gradient(135deg,#16a34a 0%,#15803d 100%)' }}>
                  <svg className="w-5 h-5" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <div>
                  <span className="pm-badge">Perfil de usuario</span>
                  <h3 className="font-cormorant text-2xl sm:text-3xl font-semibold text-gray-900 mt-1 leading-tight">Información personal</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Mantén tus datos actualizados y gestiona tu cuenta.</p>
                </div>
              </div>
              <button onClick={handleClose} className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 transition flex items-center justify-center text-gray-500 flex-shrink-0" style={{ border: 'none', cursor: 'pointer' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>
          <div className="pm-modal-body px-4 sm:px-6 py-5">
            <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
              <aside className="flex flex-col items-center text-center h-fit">
                <div className="pm-section w-full flex flex-col items-center text-center">
                  <div className="relative inline-flex mb-3">
                    <div style={{ padding: 3, background: 'linear-gradient(135deg,#16a34a,#4ade80)', borderRadius: '9999px', boxShadow: '0 4px 18px rgba(22,163,74,.25)' }}>
                      <div className="w-28 h-28 rounded-full overflow-hidden bg-white p-0.5">
                        {(profilePhotoPreview || profilePhotoUrl)
                          ? <img src={profilePhotoPreview || profilePhotoUrl} alt="Avatar" className="w-full h-full rounded-full object-cover border-[3px] border-brand-500" />
                          : <div className="w-full h-full pm-brand-avatar rounded-full flex items-center justify-center text-3xl font-bold text-white">{initials}</div>}
                      </div>
                    </div>
                    <span className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-brand-500 text-white shadow-sm">
                      <svg className="w-3 h-3" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900">{displayName}</h2>
                  <p className="text-sm text-slate-500">@{user?.username}</p>
                  <div className="mt-5 w-full">
                    <input id="pmProfilePhotoInput" type="file" accept="image/*" className="hidden" onChange={handleProfilePhotoSelect} />
                    <label htmlFor="pmProfilePhotoInput" className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500 transition-colors hover:border-brand-600 hover:bg-brand-50 hover:text-brand-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
                      <span>Cambiar foto</span>
                    </label>
                  </div>
                  <div className="mt-5 w-full space-y-2">
                    <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Usuario</span>
                      <span className="text-sm font-semibold text-slate-800">{user?.username}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Rol</span>
                      <span className="text-sm font-semibold text-brand-600">{roleLabel}</span>
                    </div>
                  </div>
                </div>
              </aside>
              <form className="space-y-5" onSubmit={handleUpdateProfile}>
                <div className="pm-section">
                  <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <svg className="w-3.5 h-3.5 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    <span>Datos de cuenta</span>
                    <div className="h-px flex-1 bg-slate-200"/>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">Correo electrónico</label>
                      <div className="relative rounded-xl border border-slate-200 bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"><svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></span>
                        <input type="email" value={profileForm.email} onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))} className="w-full rounded-xl border-0 bg-transparent py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">Teléfono</label>
                      <div className="relative rounded-xl border border-slate-200 bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"><svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg></span>
                        <input type="tel" maxLength={10} value={profileForm.phone} onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} className="w-full rounded-xl border-0 bg-transparent py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="pm-section">
                  <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <svg className="w-3.5 h-3.5 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    <span>Datos personales</span>
                    <div className="h-px flex-1 bg-slate-200"/>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">Nombre</label>
                      <div className="relative rounded-xl border border-slate-200 bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"><svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
                        <input type="text" value={profileForm.first_name} onChange={e => setProfileForm(p => ({ ...p, first_name: e.target.value }))} className="w-full rounded-xl border-0 bg-transparent py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">Apellido</label>
                      <div className="relative rounded-xl border border-slate-200 bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"><svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
                        <input type="text" value={profileForm.last_name} onChange={e => setProfileForm(p => ({ ...p, last_name: e.target.value }))} className="w-full rounded-xl border-0 bg-transparent py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">Cédula</label>
                      <div className="relative rounded-xl border border-slate-200 bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"><svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="9" cy="12" r="2.5"/><path d="M14 9.5h4M14 12.5h3"/></svg></span>
                        <input type="text" maxLength={10} value={profileForm.dni} onChange={e => setProfileForm(p => ({ ...p, dni: e.target.value }))} className="w-full rounded-xl border-0 bg-transparent py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">Dirección</label>
                      <div className="relative rounded-xl border border-slate-200 bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"><svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg></span>
                        <input type="text" placeholder="Av. principal..." className="w-full rounded-xl border-0 bg-transparent py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
                  <button type="button" onClick={handleClose} className="pm-cancel-btn">Cancelar</button>
                  <button type="submit" className="pm-save-btn inline-flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                    Guardar cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
