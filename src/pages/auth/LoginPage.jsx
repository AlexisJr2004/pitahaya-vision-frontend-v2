import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { validateLogin } from '../../utils/validators'
import { getRemainingSeconds, setCooldownFromWait, getCooldownType } from '../../utils/cooldown'
import CooldownModal from '../../components/modals/CooldownModal'
import AppLogo from '../../components/AppLogo'
import './auth.css'

// ─── SVG icon paths ───────────────────────────────────────────────
const icons = {
  user:   'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  lock:   'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  eye:    'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  eyeOff: 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21',
}

const Icon = ({ d, size = 14, className, style }) => (
  <svg className={className} style={{ width:size, height:size, ...style }} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
  </svg>
)

const FIELD_NAMES = ['username', 'email', 'password']

export default function LoginPage() {
  const { login, loading } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()

  const [form, setForm]               = useState({ username:'', password:'' })
  const [error, setError]             = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [cooldownActive, setCooldownActive] = useState(false)
  const [cooldownType, setCooldownType] = useState('throttle')

  useEffect(() => {
    if (getRemainingSeconds() > 0) {
      setCooldownType(getCooldownType())
      setCooldownActive(true)
    }
  }, [])

  const successMsg = location.state?.registered
    ? 'Cuenta creada con éxito. Revisa tu correo para verificar tu cuenta.'
    : ''

  const handleChange = ({ target: { name, value } }) => {
    setForm(prev => ({ ...prev, [name]: value }))
    if (fieldErrors[name]) setFieldErrors(prev => ({ ...prev, [name]:'' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const errors = validateLogin(form)
    if (Object.keys(errors).length) { setFieldErrors(errors); return }
    setFieldErrors({})
    try {
      await login(form)
      navigate('/', { replace: true })
    } catch (err) {
      const data = err.response?.data
      if (data) {
        const backendErrors = {}
        FIELD_NAMES.forEach(k => { if (data[k]) backendErrors[k] = Array.isArray(data[k]) ? data[k][0] : data[k] })
        if (Object.keys(backendErrors).length) { setFieldErrors(backendErrors); return }
      }
      const extractStr = (v) => Array.isArray(v) ? v[0] : v
      const errorMsg = extractStr(data?.non_field_errors?.[0] || data?.detail) || 'Error al iniciar sesión'
      setError(errorMsg)
      const rawWait = data?.wait
      const wait = Array.isArray(rawWait) ? Number(rawWait[0]) : rawWait
      if (wait && typeof wait === 'number' && wait > 0) {
        const isLockout = errorMsg?.toLowerCase().includes('cuenta bloqueada')
        const type = isLockout ? 'lockout' : 'throttle'
        setCooldownFromWait(wait, type)
        setCooldownType(type)
        setCooldownActive(true)
      }
    }
  }

  // ─── Field component ─────────────────────────────────────────────
  const Field = ({ name, type, placeholder, icon, autoComplete, children, rightSlot }) => (
    <div>
      <label htmlFor={name} className="auth-label">{children}</label>
      <div className="auth-field-wrap">
        <Icon d={icon} className="auth-field-icon" />
        <input id={name} name={name} type={type} value={form[name] ?? ''} placeholder={placeholder}
          autoComplete={autoComplete} required
          className={`auth-input${rightSlot ? ' auth-input--pwd' : ''}${fieldErrors[name] ? ' auth-input--error' : ''}`}
          onChange={handleChange} />
        {rightSlot}
      </div>
      {fieldErrors[name] && <span className="auth-error-msg">{fieldErrors[name]}</span>}
    </div>
  )

  return (
    <>
      <main className="auth-page auth-page--split">

        {/* ─── LEFT ─── */}
        <section className="auth-left">

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

          <article className="auth-fade-up auth-card">

            <header className="auth-brand-row">
              <figure className="auth-brand-logo">
                <AppLogo size={20} style={{ fill:'#fff' }} />
              </figure>
              <span className="auth-brand-name">Pitahaya Vision</span>
            </header>

            <p className="auth-eyebrow">Sistema de diagnóstico inteligente</p>
            <h1 className="auth-heading auth-heading--lg">Bienvenido <em>de vuelta</em></h1>
            <p className="auth-subtitle">Ingresa tus credenciales para acceder a tu espacio de trabajo.</p>

            {successMsg && <p className="auth-banner auth-banner--ok">{successMsg}</p>}
            {error && <p className="auth-banner auth-banner--err">{error}</p>}

            {/* ═══ FORM ═══ */}
            <form onSubmit={handleSubmit} className="auth-form">

              {Field({ name:'username', type:'text', placeholder:'Tu usuario', icon:icons.user, autoComplete:'username', children:'Usuario' })}

              {Field({ name:'password', type:showPassword ? 'text' : 'password', placeholder:'••••••••', icon:icons.lock, autoComplete:'current-password',
                rightSlot: (
                  <span onClick={() => setShowPassword(p => !p)} className="auth-field-toggle">
                    <Icon d={showPassword ? icons.eyeOff : icons.eye} size={16} />
                  </span>
                ),
                children:'Contraseña'
              })}

              <div className="auth-forgot-row">
                <Link to="/recuperar-cuenta" className="auth-link auth-link--sm">¿Olvidaste tu contraseña?</Link>
              </div>

              <button type="submit" disabled={loading} className="auth-submit-btn auth-submit-btn--gray-shadow">
                {loading ? 'Ingresando…' : 'Iniciar sesión'}
              </button>

              <div className="auth-divider-row">
                <div className="auth-divider-line" />
                <span className="auth-divider-label">o</span>
                <div className="auth-divider-line" />
              </div>

              <p className="auth-inline-note">
                ¿No tienes una cuenta?&nbsp;
                <Link to="/registro" className="auth-link auth-link--bold auth-link--plain">Regístrate gratis</Link>
              </p>
            </form>
          </article>
        </section>

        {/* ─── RIGHT ─── */}
        <aside className="auth-right-panel">
          <img src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?fm=jpg&q=80&w=2400&auto=format&fit=crop"
            alt="Campo agrícola" className="auth-right-img" />

          <svg aria-hidden="true" className="auth-right-wave-mask" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M 0,0 L 9,0 C 2,12 14,26 5,42 C -3,58 13,74 4,88 C 3,94 7,100 7,100 L 0,100 Z" fill="#fff" />
          </svg>

          <div className="auth-right-gradient" />

          <div className="auth-stats-col">
            {[
              { cls:'auth-fade-up-d1', label:<><strong style={{ fontWeight:600 }}>1,240</strong> cultivos monitoreados</> },
              { cls:'auth-fade-up-d2', label:<><strong style={{ fontWeight:600 }}>98.4%</strong> disponibilidad del sistema</> },
            ].map(({ cls, label }, i) => (
              <div key={i} className={`${cls} auth-stat-pill`}>
                <div className="auth-stat-dot" />
                <span className="auth-stat-label">{label}</span>
              </div>
            ))}
          </div>

          <div className="auth-fade-up-d3 auth-quote-card">
            <div className="auth-quote-bar" />
            <p className="auth-quote-text">
              &ldquo;La tierra es el mayor patrimonio del agricultor. Pitahaya Vision la protege.&rdquo;
            </p>
            <footer className="auth-quote-footer">
              <figure className="auth-quote-avatar">
                <AppLogo size={16} style={{ fill:'#fff' }} />
              </figure>
              <figcaption>
                <strong className="auth-quote-name">Plataforma Pitahaya Vision</strong>
                <span className="auth-quote-role">Gestión inteligente del diagnóstico</span>
              </figcaption>
            </footer>
          </div>
        </aside>

        {/* Wave accent line */}
        <svg className="auth-wave-line" aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M 54.5,0 C 51,12 57,26 52.5,42 C 48.5,58 56.5,74 52,88 C 51.5,94 53.5,100 53.5,100"
            stroke="#16a34a" strokeWidth="1.5" fill="none" opacity=".35" vectorEffect="non-scaling-stroke" />
        </svg>
      </main>

      {cooldownActive && (
        <CooldownModal type={cooldownType} onComplete={() => { setCooldownActive(false); setError('') }} />
      )}
    </>
  )
}
