import { useState } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset } from '../../services/authService'
import AppLogo from '../../components/AppLogo'
import './auth.css'

const Icon = ({ d, size = 14, className, style }) => (
  <svg className={className} style={{ width: size, height: size, ...style }} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
  </svg>
)

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [message, setMessage] = useState('')

  const validate = (v) => {
    if (!v.trim()) return 'El correo electrónico es obligatorio'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return 'Ingresa un correo electrónico válido'
    return ''
  }

  const handleChange = (e) => {
    setEmail(e.target.value)
    if (fieldError) setFieldError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validate(email)
    if (err) { setFieldError(err); return }

    setStatus('loading')
    setMessage('')
    try {
      await requestPasswordReset(email.trim())
      setStatus('success')
      setMessage('Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.')
    } catch (err) {
      setStatus('error')
      const data = err.response?.data
      setMessage(data?.email?.[0] || data?.non_field_errors?.[0] || data?.detail || 'Error al enviar el correo. Inténtalo de nuevo.')
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
          <h1 className="auth-heading">Recupera tu <em>contraseña</em></h1>
          <p className="auth-subtitle">Ingresa el correo asociado a tu cuenta y te enviaremos un enlace para restablecer tu contraseña.</p>

          {status === 'success' && <p className="auth-banner auth-banner--ok">{message}</p>}
          {status === 'error' && <p className="auth-banner auth-banner--err">{message}</p>}

          {status !== 'success' && (
            <form onSubmit={handleSubmit} className="auth-form">

              <fieldset className="auth-fieldset">
                <legend className="auth-legend">
                  <span>Datos de cuenta</span>
                  <div className="auth-legend-divider" />
                </legend>

                <div>
                  <label htmlFor="email" className="auth-label">Correo electrónico</label>
                  <div className="auth-field-wrap">
                    <Icon d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" className="auth-field-icon" />
                    <input id="email" type="email" name="email" value={email} placeholder="nombre@correo.com"
                      autoComplete="email" required
                      className={`auth-input${fieldError ? ' auth-input--error' : ''}`}
                      onChange={handleChange} />
                  </div>
                  {fieldError && <span className="auth-error-msg">{fieldError}</span>}
                </div>

              </fieldset>

              <button type="submit" disabled={status === 'loading'} className="auth-submit-btn auth-submit-btn--green-shadow">
                {status === 'loading' ? 'Enviando…' : 'Enviar enlace'}
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
