import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { validateRegistration } from '../../utils/validators'
import { register as apiRegister, checkAvailability } from '../../services/authService'
import AppLogo from '../../components/AppLogo'
import './auth.css'

const UNIQUE_FIELDS = ['username', 'email', 'dni', 'phone']
const DUPLICATE_MESSAGES = {
  username: 'Este usuario ya está registrado',
  email: 'Este correo ya está registrado',
  dni: 'Esta cédula ya está registrada',
  phone: 'Este teléfono ya está registrado',
}

// ─── SVG icon paths ───────────────────────────────────────────────
const icons = {
  user:   'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  mail:   'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  idCard: 'M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2',
  phone:  'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
  lock:   'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  eye:    'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  eyeOff: 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21',
  camera: 'M3 9a2 2 0 012-2h.93a1 1 0 00.627-.253l1.146-1.146A1 1 0 018.586 5h2.828a1 1 0 01.707.293l1.146 1.146A1 1 0 0013.707 7H15a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2V9z',
  plus:   'M12 4v16m8-8H4',
}

// ─── Icon helper ─────────────────────────────────────────────────
const Icon = ({ d, size = 14, className, style }) => (
  <svg className={className} style={{ width: size, height: size, ...style }} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
  </svg>
)

// ─── Field components ─────────────────────────────────────────────
// Definidos fuera de RegisterPage (no dentro del body) para que React los
// trate como el mismo tipo de componente entre renders. Si se definen
// dentro y se usan como <InputField/>, React les asigna una identidad
// nueva en cada render y remonta el <input>, perdiendo el foco en cada
// tecla que se escribe.
function InputField({ name, type, placeholder, icon, autoComplete, maxLength, children, value, error, checking, onChange, onBlur }) {
  return (
    <div>
      <label htmlFor={name} className="auth-label">{children}</label>
      <div className="auth-field-wrap">
        <Icon d={icon} className="auth-field-icon" />
        <input id={name} name={name} type={type} value={value ?? ''} placeholder={placeholder}
          autoComplete={autoComplete} maxLength={maxLength}
          inputMode={(name === 'dni' || name === 'phone') ? 'numeric' : undefined}
          className={`auth-input${error ? ' auth-input--error' : ''}`}
          onChange={onChange}
          onBlur={onBlur} />
      </div>
      {error
        ? <span className="auth-error-msg">{error}</span>
        : checking && <span className="auth-checking-msg">Verificando disponibilidad…</span>}
    </div>
  )
}

function PwdField({ name, placeholder, children, value, error, show, onToggleShow, onChange, onBlur }) {
  return (
    <div>
      <label htmlFor={name} className="auth-label">{children}</label>
      <div className="auth-field-wrap">
        <Icon d={icons.lock} className="auth-field-icon" />
        <input id={name} name={name} type={show ? 'text' : 'password'} value={value ?? ''}
          placeholder={placeholder} autoComplete="new-password"
          className={`auth-input auth-input--pwd${error ? ' auth-input--error' : ''}`}
          onChange={onChange}
          onBlur={onBlur} />
        <span onClick={onToggleShow} className="auth-field-toggle">
          <Icon d={show ? icons.eyeOff : icons.eye} size={16} />
        </span>
      </div>
      {error && <span className="auth-error-msg">{error}</span>}
    </div>
  )
}

function SectionLabel({ children, mt }) {
  return (
    <legend className={`auth-legend${mt ? ' auth-legend--mt2' : ' auth-legend--mt1'}`}>
      <span>{children}</span>
      <div className="auth-legend-divider" />
    </legend>
  )
}

function TwoCol({ children }) {
  return <div className="auth-two-col">{children}</div>
}

const FIELD_NAMES = ['first_name','last_name','email','username','password1','password2','dni','phone','profile_photo']

const EMPTY_FORM = { first_name:'', last_name:'', email:'', username:'', dni:'', phone:'', password1:'', password2:'', profile_photo: null }

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm]             = useState(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [touched, setTouched]       = useState({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading]       = useState(false)
  const [showPwd, setShowPwd]       = useState({ password1: false, password2: false })
  const [photoPreview, setPhotoPreview] = useState(null)
  const [checkingFields, setCheckingFields] = useState({})

  const formRef = useRef(form)
  useEffect(() => { formRef.current = form }, [form])

  // Verifica en el backend si username/email/dni/phone ya existen, con debounce
  // por campo. Solo se dispara si el campo fue tocado y ya pasó la validación
  // de formato (no tiene sentido consultar la BD con un dato inválido).
  const useAvailabilityCheck = (name) => {
    const value = (form[name] || '').trim()
    useEffect(() => {
      if (!touched[name] || !value) return undefined
      const syncErrors = validateRegistration(formRef.current)
      if (syncErrors[name]) return undefined

      setCheckingFields(prev => ({ ...prev, [name]: true }))
      const timer = setTimeout(async () => {
        try {
          const { available } = await checkAvailability(name, value)
          if (!available && formRef.current[name]?.trim() === value) {
            setFieldErrors(prev => ({ ...prev, [name]: DUPLICATE_MESSAGES[name] }))
          }
        } catch {
          // si la verificación remota falla (red/servidor), no bloquea el flujo normal
        } finally {
          setCheckingFields(prev => ({ ...prev, [name]: false }))
        }
      }, 500)

      return () => { clearTimeout(timer); setCheckingFields(prev => ({ ...prev, [name]: false })) }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, touched[name]])
  }

  UNIQUE_FIELDS.forEach(useAvailabilityCheck)

  // Aplica la validación de formato solo a los campos indicados en `keys`,
  // sin tocar el resto (así no se pisa, por ejemplo, un error de "ya
  // registrado" devuelto por la verificación en tiempo real contra la BD
  // mientras el usuario edita otro campo).
  const applyValidation = (nextForm, keys) => {
    if (!keys.length) return
    const errors = validateRegistration(nextForm)
    setFieldErrors(prev => {
      const next = { ...prev }
      keys.forEach(key => { next[key] = errors[key] || '' })
      return next
    })
  }

  const handleChange = ({ target: { name, value } }) => {
    const cleanValue = (name === 'dni' || name === 'phone') ? value.replace(/\D/g, '') : value
    const nextForm = { ...form, [name]: cleanValue }
    setForm(nextForm)
    const keys = []
    if (touched[name]) keys.push(name)
    // password1 y password2 se validan cruzados: si ya se tocó la confirmación,
    // re-chequearla también al editar la contraseña principal.
    if (name === 'password1' && touched.password2) keys.push('password2')
    applyValidation(nextForm, keys)
  }

  const handlePhotoChange = ({ target: { files } }) => {
    const file = files[0]
    if (!file) return
    setForm(prev => ({ ...prev, profile_photo: file }))
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError('')
    setTouched(FIELD_NAMES.reduce((acc, k) => ({ ...acc, [k]: true }), {}))
    const errors = validateRegistration(form)
    if (Object.keys(errors).length) { setFieldErrors(errors); return }
    setFieldErrors({})
    setLoading(true)
    try {
      const { profile_photo, ...payload } = form
      if (profile_photo instanceof File) {
        const fd = new FormData()
        Object.entries(payload).forEach(([k, v]) => fd.append(k, v))
        fd.append('profile_photo', profile_photo)
        await apiRegister(fd)
      } else {
        await apiRegister(payload)
      }
      navigate('/login', { state: { registered: true }, replace: true })
    } catch (err) {
      const data = err.response?.data
      console.log('Error registro:', err.response?.status, data)
      if (data) {
        const backendErrors = {}
        FIELD_NAMES.forEach(k => { if (data[k]) backendErrors[k] = Array.isArray(data[k]) ? data[k][0] : data[k] })
        if (Object.keys(backendErrors).length) { setFieldErrors(backendErrors); return }
        setServerError(data.non_field_errors?.[0] || data.detail || JSON.stringify(data) || 'Error al registrarse')
      } else {
        setServerError('Error al conectar con el servidor')
      }
    } finally { setLoading(false) }
  }

  const handleFieldBlur = (name) => {
    if (!touched[name]) {
      setTouched(prev => ({ ...prev, [name]: true }))
      applyValidation(form, [name])
    }
  }

  return (
    <main className="auth-page auth-page--register">

      {/* ─── LEFT ─── */}
      <section className="auth-left--register">
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

        <article className="auth-fade-up auth-sm-py-3 auth-lg-py-0 auth-card auth-card--padded">

          <header className="auth-brand-row auth-brand-row--outer">
            <div className="auth-brand-left">
              <figure className="auth-brand-logo">
                <AppLogo size={20} style={{ fill:'#fff' }} />
              </figure>
              <span className="auth-brand-name">Pitahaya Vision</span>
            </div>

            <label htmlFor="profile_photo" className="auth-avatar-group" title="Subir foto de perfil">
              <img src={photoPreview || 'https://img.freepik.com/vector-premium/icono-perfil-avatar-predeterminado-imagen-usuario-redes-sociales-icono-avatar-gris-silueta-perfil-blanco-ilustracion-vectorial_561158-3467.jpg'}
                alt="Foto de perfil" className="auth-avatar-img auth-sm-avatar auth-lg-avatar" />
              <div className="auth-avatar-overlay">
                <svg className="auth-avatar-icon" fill="currentColor" viewBox="0 0 24 24"><path d={icons.camera} /></svg>
              </div>
              <div className="auth-avatar-badge auth-sm-badge">
                <svg style={{ width:12, height:12, color:'#fff' }} fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" clipRule="evenodd" d={icons.plus} /></svg>
              </div>
            </label>
            {fieldErrors.profile_photo && <span className="auth-error-msg" style={{ textAlign:'center', marginTop:'0.3rem' }}>{fieldErrors.profile_photo}</span>}
          </header>

          <p className="auth-eyebrow">Sistema de diagnóstico inteligente</p>
          <h1 className="auth-heading auth-sm-text-4xl">Crea tu <em>cuenta</em></h1>
          <p className="auth-subtitle auth-sm-mb-6">
            Registra tus datos para acceder al sistema.{' '}
            ¿Ya tienes una cuenta?{' '}
            <Link to="/login" className="auth-link" style={{ textDecoration: 'none' }}>Inicia sesión aquí</Link>.
          </p>

          {serverError && <p className="auth-banner auth-banner--err">{serverError}</p>}

          {/* ═══ FORM ═══ */}
          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>

            <fieldset className="auth-fieldset">
              <SectionLabel>Datos de cuenta</SectionLabel>
              <TwoCol>
                <InputField name="username"  type="text"  placeholder="usuario123"       icon={icons.user}  autoComplete="username"
                  value={form.username} error={fieldErrors.username} checking={checkingFields.username}
                  onChange={handleChange} onBlur={() => handleFieldBlur('username')}>Usuario</InputField>
                <InputField name="email"     type="email" placeholder="nombre@correo.com" icon={icons.mail}  autoComplete="email"
                  value={form.email} error={fieldErrors.email} checking={checkingFields.email}
                  onChange={handleChange} onBlur={() => handleFieldBlur('email')}>Correo electrónico</InputField>
              </TwoCol>
            </fieldset>

            <fieldset className="auth-fieldset">
              <SectionLabel mt>Datos personales</SectionLabel>
              <TwoCol>
                <InputField name="first_name" type="text" placeholder="Juan"       icon={icons.user}   autoComplete="given-name"
                  value={form.first_name} error={fieldErrors.first_name}
                  onChange={handleChange} onBlur={() => handleFieldBlur('first_name')}>Nombre</InputField>
                <InputField name="last_name"  type="text" placeholder="Pérez"      icon={icons.user}   autoComplete="family-name"
                  value={form.last_name} error={fieldErrors.last_name}
                  onChange={handleChange} onBlur={() => handleFieldBlur('last_name')}>Apellido</InputField>
                <InputField name="dni"        type="text" placeholder="0701234567" icon={icons.idCard} autoComplete="off" maxLength={10}
                  value={form.dni} error={fieldErrors.dni} checking={checkingFields.dni}
                  onChange={handleChange} onBlur={() => handleFieldBlur('dni')}>Cédula</InputField>
                <InputField name="phone"      type="tel"  placeholder="0991234567" icon={icons.phone}  autoComplete="tel" maxLength={10}
                  value={form.phone} error={fieldErrors.phone} checking={checkingFields.phone}
                  onChange={handleChange} onBlur={() => handleFieldBlur('phone')}>Teléfono</InputField>
              </TwoCol>
            </fieldset>

            <input id="profile_photo" type="file" name="profile_photo" accept="image/*" className="auth-photo-input" onChange={handlePhotoChange} />

            <fieldset className="auth-fieldset">
              <SectionLabel mt>Seguridad</SectionLabel>
              <TwoCol>
                <PwdField name="password1" placeholder="••••••••"
                  value={form.password1} error={fieldErrors.password1} show={showPwd.password1}
                  onToggleShow={() => setShowPwd(p => ({ ...p, password1: !p.password1 }))}
                  onChange={handleChange} onBlur={() => handleFieldBlur('password1')}>Contraseña</PwdField>
                <PwdField name="password2" placeholder="••••••••"
                  value={form.password2} error={fieldErrors.password2} show={showPwd.password2}
                  onToggleShow={() => setShowPwd(p => ({ ...p, password2: !p.password2 }))}
                  onChange={handleChange} onBlur={() => handleFieldBlur('password2')}>Confirmar contraseña</PwdField>
              </TwoCol>
            </fieldset>

            <button type="submit" disabled={loading} className="auth-submit-btn auth-submit-btn--green-shadow auth-submit-btn--medium">
              {loading ? 'Registrando…' : 'Crear cuenta'}
            </button>
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

      <svg className="auth-wave-line" aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d="M 54.5,0 C 51,12 57,26 52.5,42 C 48.5,58 56.5,74 52,88 C 51.5,94 53.5,100 53.5,100"
          stroke="#16a34a" strokeWidth="1.5" fill="none" opacity=".35" vectorEffect="non-scaling-stroke" />
      </svg>
    </main>
  )
}
