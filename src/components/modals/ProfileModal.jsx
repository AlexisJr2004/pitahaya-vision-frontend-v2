import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { updateProfile, deleteAccount } from '../../services/authService'
import { animateClose, setupDragToDismiss } from '../../utils/modalUtils'
import { getInitials } from '../../utils/formatters'
import './modals.css'

export default function ProfileModal({ isOpen, onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const modalRef = useRef(null)
  const animatedRef = useRef(new Set())

  const [profileForm, setProfileForm] = useState({ email: '', phone: '', first_name: '', last_name: '', dni: '' })
  const [profilePhotoFile, setProfilePhotoFile] = useState(null)
  const [profilePhotoPreview, setProfilePhotoPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)

  const displayName = user?.full_name || user?.username || 'Usuario'
  const roleLabel = user?.role_label || (user?.is_admin ? 'Administrador' : 'Usuario')
  const initials = getInitials(displayName)
  const profilePhotoUrl = user?.profile_photo_url

  useEffect(() => {
    if (isOpen) {
      setProfileForm({ email: user?.email || '', phone: user?.phone || '', first_name: user?.first_name || '', last_name: user?.last_name || '', dni: user?.dni || '' })
      setProfilePhotoFile(null)
      setProfilePhotoPreview(null)
      setSaveError('')
      setShowDeleteConfirm(false)
      setDeleteInput('')
      setDeletePassword('')
    }
  }, [isOpen, user])

  // drag-to-dismiss on mobile
  useEffect(() => setupDragToDismiss({
    modalRef, isOpen, onClose, handleClass: '.drag-handle', animatedRefs: animatedRef,
  }), [isOpen, onClose])

  const handleClose = () => animateClose(modalRef, onClose, animatedRef)

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
    setSaving(true)
    setSaveError('')
    try {
      const fd = new FormData()
      fd.append('email',      profileForm.email)
      fd.append('phone',      profileForm.phone)
      fd.append('first_name', profileForm.first_name)
      fd.append('last_name',  profileForm.last_name)
      fd.append('dni',        profileForm.dni)
      if (profilePhotoFile) fd.append('profile_photo', profilePhotoFile)
      await updateProfile(fd)
      onClose()
      window.location.reload()
    } catch (err) {
      const detail = err?.response?.data
      if (detail && typeof detail === 'object') {
        const msgs = Object.values(detail).flat().join(' ')
        setSaveError(msgs || 'Error al actualizar el perfil.')
      } else {
        setSaveError('Error al actualizar el perfil.')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteInput.trim().toLowerCase() !== 'eliminar') return
    if (!deletePassword) return
    setDeleting(true)
    try {
      await deleteAccount(deletePassword)
      await logout()
      navigate('/login')
    } catch (err) {
      setDeleting(false)
      const detail = err?.response?.data?.detail || 'Error al eliminar la cuenta. Intenta de nuevo.'
      setSaveError(detail)
    }
  }

  return (
    <>
      <div className={`context-overlay ${isOpen ? 'open' : ''}`} onClick={handleClose}>
        <div className="context-modal" ref={modalRef} onClick={e => e.stopPropagation()}>
          <div className="drag-handle" />

          {/* Header */}
          <header className="context-modal-header px-5 py-5 sm:px-7 sm:py-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm"
                  style={{ background: 'linear-gradient(135deg,#16a34a 0%,#15803d 100%)' }}>
                  <svg className="w-5 h-5" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <div>
                  <span className="context-badge">Perfil de usuario</span>
                  <h3 className="font-cormorant text-2xl sm:text-3xl font-semibold text-gray-900 mt-1 leading-tight">Información personal</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Mantén tus datos actualizados y gestiona tu cuenta.</p>
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
          <div className="context-modal-body px-4 sm:px-6 py-5">
            <div className="grid gap-6 lg:grid-cols-[280px_1fr]">

              {/* Sidebar: avatar + info */}
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
                    <label htmlFor="pmProfilePhotoInput"
                      className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500 transition-colors hover:border-brand-600 hover:bg-brand-50 hover:text-brand-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
                        <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                      </svg>
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

              {/* Form */}
              <form className="space-y-5" onSubmit={handleUpdateProfile}>

                {/* Datos de cuenta */}
                <section className="pm-section">
                  <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <svg className="w-3.5 h-3.5 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                    <span>Datos de cuenta</span>
                    <div className="h-px flex-1 bg-slate-200"/>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">Correo electrónico</label>
                      <div className="pm-input-wrap">
                        <span className="pm-input-icon">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                            <polyline points="22,6 12,13 2,6"/>
                          </svg>
                        </span>
                        <input type="email" className="pm-input" value={profileForm.email}
                          onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">Teléfono</label>
                      <div className="pm-input-wrap">
                        <span className="pm-input-icon">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                          </svg>
                        </span>
                        <input type="tel" inputMode="numeric" maxLength={10} className="pm-input" value={profileForm.phone}
                          onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value.replace(/\D/g, '') }))} />
                      </div>
                    </div>
                  </div>
                </section>

                {/* Datos personales */}
                <section className="pm-section">
                  <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <svg className="w-3.5 h-3.5 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                    <span>Datos personales</span>
                    <div className="h-px flex-1 bg-slate-200"/>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">Nombre</label>
                      <div className="pm-input-wrap">
                        <span className="pm-input-icon">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                          </svg>
                        </span>
                        <input type="text" className="pm-input" value={profileForm.first_name}
                          onChange={e => setProfileForm(p => ({ ...p, first_name: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">Apellido</label>
                      <div className="pm-input-wrap">
                        <span className="pm-input-icon">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                          </svg>
                        </span>
                        <input type="text" className="pm-input" value={profileForm.last_name}
                          onChange={e => setProfileForm(p => ({ ...p, last_name: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">Cédula</label>
                      <div className="pm-input-wrap">
                        <span className="pm-input-icon">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="9" cy="12" r="2.5"/>
                            <path d="M14 9.5h4M14 12.5h3"/>
                          </svg>
                        </span>
                        <input type="text" inputMode="numeric" maxLength={10} className="pm-input" value={profileForm.dni}
                          onChange={e => setProfileForm(p => ({ ...p, dni: e.target.value.replace(/\D/g, '') }))} />
                      </div>
                    </div>
                  </div>
                </section>

                {saveError && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{saveError}</p>
                )}

                <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
                  <button type="button" onClick={handleClose} className="modal-secondary-btn">Cancelar</button>
                  <button type="submit" disabled={saving} className="modal-save-btn inline-flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                      <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
                    </svg>
                    {saving ? 'Guardando…' : 'Guardar cambios'}
                  </button>
                </div>

                {/* ── Zona de peligro ── */}
                <section className="pm-section-danger mt-2">
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-red-400">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <span>Zona de peligro</span>
                    <div className="h-px flex-1 bg-red-200"/>
                  </div>

                  {!showDeleteConfirm ? (
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Eliminar cuenta permanentemente</p>
                        <p className="text-xs text-slate-500 mt-0.5">Esta acción no se puede deshacer. Se borrarán todos tus datos.</p>
                      </div>
                      <button type="button" onClick={() => setShowDeleteConfirm(true)} className="pm-delete-btn flex-shrink-0">
                        Eliminar cuenta
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-slate-700">
                        Para confirmar, escribe <strong className="text-red-600">eliminar</strong> en el campo de abajo:
                      </p>
                      <div className="pm-input-wrap" style={{ borderColor: deleteInput.trim().toLowerCase() === 'eliminar' ? '#dc2626' : undefined }}>
                        <input
                          type="text"
                          className="pm-input"
                          style={{ paddingLeft: '.75rem' }}
                          placeholder="eliminar"
                          value={deleteInput}
                          onChange={e => setDeleteInput(e.target.value)}
                          autoFocus
                        />
                      </div>
                      <div className="pm-input-wrap">
                        <input
                          type="password"
                          className="pm-input"
                          style={{ paddingLeft: '.75rem' }}
                          placeholder="Tu contraseña actual"
                          value={deletePassword}
                          onChange={e => setDeletePassword(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-3">
                        <button type="button" onClick={() => { setShowDeleteConfirm(false); setDeleteInput('') }} className="modal-secondary-btn text-sm py-2 px-4" style={{ minWidth: 0, padding: '.55rem .9rem' }}>
                          Cancelar
                        </button>
                        <button
                          type="button"
                          disabled={deleteInput.trim().toLowerCase() !== 'eliminar' || !deletePassword || deleting}
                          onClick={handleDeleteAccount}
                          className="pm-confirm-delete-btn flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            <path d="M10 11v6"/><path d="M14 11v6"/>
                          </svg>
                          {deleting ? 'Eliminando…' : 'Confirmar eliminación'}
                        </button>
                      </div>
                    </div>
                  )}
                </section>

              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
