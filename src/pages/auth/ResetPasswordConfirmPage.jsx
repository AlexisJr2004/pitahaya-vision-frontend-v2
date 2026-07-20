import { useState } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { confirmPasswordReset } from '../../services/authService'
import AppLogo from '../../components/AppLogo'
import './auth.css'

const ICON_LOCK = 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
const ICON_EYE = 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'
const ICON_EYE_OFF = 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21'

const COMMON_PASSWORDS = new Set([
  '12345678', 'password', '123456789', '1234567890', 'qwerty123',
  'abc123', '12345678910', 'password123', 'iloveyou', 'admin123',
  'welcome1', 'monkey', 'dragon', 'master', 'shadow',
  'sunshine', 'princess', 'football', 'baseball', 'trustno1',
])

const Icon = ({ d, size = 14, className, style }) => (
  <svg className={className} style={{ width: size, height: size, ...style }} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
  </svg>
)

// Definido fuera del componente (ver nota igual en RegisterPage.jsx): así
// React conserva la identidad del <input> entre renders y no pierde el
// foco en cada tecla.
function PwdField({ idx, name, children, value, error, show, onToggleShow, onChange }) {
  return (
    <div style={idx === 1 ? { marginBottom: '0.75rem' } : undefined}>
      <label htmlFor={name} className="auth-label">{children}</label>
      <div className="auth-field-wrap">
        <Icon d={ICON_LOCK} className="auth-field-icon" />
        <input id={name} name={name}
          type={show ? 'text' : 'password'} value={value}
          placeholder="••••••••" autoComplete="new-password" required
          className={`auth-input auth-input--pwd${error ? ' auth-input--error' : ''}`}
          onChange={onChange} />
        <span onClick={onToggleShow} className="auth-field-toggle">
          <Icon d={show ? ICON_EYE_OFF : ICON_EYE} size={16} />
        </span>
      </div>
      {error && <span className="auth-error-msg">{error}</span>}
    </div>
  )
}

export default function ResetPasswordConfirmPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const uid = searchParams.get('uid') || ''
  const token = searchParams.get('token') || ''

  const [form, setForm] = useState({ new_password1: '', new_password2: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')
  const [showPwd, setShowPwd] = useState({ 1: false, 2: false })

  const isInvalidLink = !uid || !token

  const handleChange = ({ target: { name, value } }) => {
    setForm(prev => ({ ...prev, [name]: value }))
    if (fieldErrors[name]) setFieldErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validate = (f) => {
    const errs = {}
    const p1 = f.new_password1
    const p2 = f.new_password2
    if (!p1) errs.new_password1 = 'La contraseña es obligatoria'
    else if (p1.length < 8) errs.new_password1 = 'La contraseña debe tener al menos 8 caracteres'
    else if (/^\d+$/.test(p1)) errs.new_password1 = 'La contraseña no puede ser solo números'
    else if (COMMON_PASSWORDS.has(p1.toLowerCase())) errs.new_password1 = 'Esta contraseña es demasiado común'
    if (!p2) errs.new_password2 = 'Debes confirmar la contraseña'
    else if (p1 !== p2) errs.new_password2 = 'Las contraseñas no coinciden'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length) { setFieldErrors(errs); return }
    setFieldErrors({})
    setStatus('loading')
    setMessage('')
    try {
      await confirmPasswordReset({ uid, token, ...form })
      setStatus('success')
      setMessage('Tu contraseña se ha restablecido correctamente.')
      setTimeout(() => navigate('/login', { replace: true }), 3000)
    } catch (err) {
      setStatus('error')
      const data = err.response?.data
      if (data) {
        const backendErrors = {}
        ;['new_password1','new_password2','uid','token'].forEach(k => {
          if (data[k]) backendErrors[k] = Array.isArray(data[k]) ? data[k][0] : data[k]
        })
        if (Object.keys(backendErrors).length) { setFieldErrors(backendErrors); return }
      }
      setMessage(data?.non_field_errors?.[0] || data?.detail || 'Error al restablecer la contraseña. El enlace puede haber expirado.')
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-left auth-left--centered">

        <div aria-hidden="true" className="auth-glow-desk" />
        <div aria-hidden="true" className="auth-glow-top" />

        <svg aria-hidden="true" className="auth-leaf" viewBox="0 0 220 280" xmlns="http://www.w3.org/2000/svg">
          {[
            ['M40 270 C 40 190, 80 160, 65 70','2'],
            ['M65 70 C 65 70, 20 50, 8 15','1.2'],
            ['M65 70 C 65 70, 115 45, 130 8','1.2'],
            ['M52 155 C 52 155, 8 142, -8 122','1'],
            ['M52 155 C 52 155, 96 130, 120 112','1'],
            ['M58 110 C 58 110, 16 94, 0 76','.9'],
            ['M58 110 C 58 110, 98 88, 122 72','.9'],
          ].map(([d, w], i) => <path key={i} d={d} stroke="#16a34a" strokeWidth={w} fill="none" strokeLinecap="round" />)}
          <ellipse cx="130" cy="8"   rx="13" ry="7.5" fill="#16a34a" opacity=".55" transform="rotate(-30 130 8)" />
          <ellipse cx="-8"  cy="122" rx="11" ry="6"   fill="#16a34a" opacity=".55" transform="rotate(20 -8 122)" />
          <ellipse cx="120" cy="112" rx="12" ry="6.5" fill="#16a34a" opacity=".55" transform="rotate(-15 120 112)" />
          <ellipse cx="0"   cy="76"  rx="10" ry="5.5" fill="#16a34a" opacity=".45" transform="rotate(25 0 76)" />
          <ellipse cx="122" cy="72"  rx="11" ry="6"   fill="#16a34a" opacity=".45" transform="rotate(-20 122 72)" />
        </svg>

        <article className="auth-fade-up auth-card auth-card--padded">

          <header className="auth-brand-row">
            <figure className="auth-brand-logo">
              <AppLogo size={20} style={{ fill:'#fff' }} />
            </figure>
            <span className="auth-brand-name">Pitahaya Vision</span>
          </header>

          <p className="auth-eyebrow">Sistema de diagnóstico inteligente</p>
          <h1 className="auth-heading">Restablece tu <em>contraseña</em></h1>
          <p className="auth-subtitle">Ingresa tu nueva contraseña para completar el proceso.</p>

          {status === 'success' && <p className="auth-banner auth-banner--ok">{message}</p>}
          {status === 'error' && !Object.keys(fieldErrors).length && <p className="auth-banner auth-banner--err">{message}</p>}
          {isInvalidLink && status !== 'success' && (
            <p className="auth-banner auth-banner--err">El enlace es inválido o ha expirado. Solicita un nuevo restablecimiento de contraseña.</p>
          )}

          {!isInvalidLink && status !== 'success' && (
            <form onSubmit={handleSubmit} className="auth-form">

              <fieldset className="auth-fieldset">
                <legend className="auth-legend">
                  <span>Seguridad</span>
                  <div className="auth-legend-divider" />
                </legend>

                <PwdField idx={1} name="new_password1" value={form.new_password1} error={fieldErrors.new_password1}
                  show={showPwd[1]} onToggleShow={() => setShowPwd(p => ({ ...p, 1: !p[1] }))} onChange={handleChange}>Nueva contraseña</PwdField>
                <PwdField idx={2} name="new_password2" value={form.new_password2} error={fieldErrors.new_password2}
                  show={showPwd[2]} onToggleShow={() => setShowPwd(p => ({ ...p, 2: !p[2] }))} onChange={handleChange}>Confirmar contraseña</PwdField>

              </fieldset>

              <button type="submit" disabled={status === 'loading'} className="auth-submit-btn auth-submit-btn--green-shadow">
                {status === 'loading' ? 'Restableciendo…' : 'Restablecer contraseña'}
              </button>

            </form>
          )}

          <footer className="auth-footer-note">
            <Link to="/login" className="auth-link">Volver al inicio de sesión</Link>
          </footer>

        </article>
      </section>
    </main>
  )
}
