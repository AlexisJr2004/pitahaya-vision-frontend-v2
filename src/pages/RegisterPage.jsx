import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { validateRegistration } from '../utils/validators'
import { register as apiRegister, checkAvailability } from '../services/authService'

const UNIQUE_FIELDS = ['username', 'email', 'dni', 'phone']
const DUPLICATE_MESSAGES = {
  username: 'Este usuario ya está registrado',
  email: 'Este correo ya está registrado',
  dni: 'Esta cédula ya está registrada',
  phone: 'Este teléfono ya está registrado',
}

// ─── Design tokens ───────────────────────────────────────────────
const G = { 600: '#16a34a', 500: '#22c55e', 400: '#4ade80' }
const GRAY = { 900: '#111827', 700: '#374151', 500: '#6b7280', 400: '#9ca3af', 200: '#e5e7eb', 100: '#F2F4FB' }

const s = {
  card:       { position: 'relative', zIndex: 10, width: '100%', maxWidth: 448 },
  brandRow:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '2rem' },
  brandLeft:  { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  brandLogo:  { width: 40, height: 40, borderRadius: 8, background: G[600], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 6px -1px rgba(22,163,74,0.2)' },
  brandName:  { fontFamily: '"Cormorant Garamond", serif', fontSize: '1.5rem', fontWeight: 600, color: GRAY[900] },
  label:      { display: 'block', marginBottom: '0.375rem', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: GRAY[700] },
  fieldLabel: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: GRAY[400] },
  divider:    { height: 1, flex: 1, background: GRAY[200] },
  errorMsg:   { fontSize: '0.7rem', color: '#dc2626', marginTop: '0.2rem' },
  inputBase:  { background: GRAY[100], width: '100%', borderRadius: 8, fontSize: '0.875rem', color: GRAY[900], outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box', padding: '0.625rem 1rem 0.625rem 2.5rem', border: `1px solid ${GRAY[200]}` },
  inputFocus: { borderColor: G[600], boxShadow: '0 0 0 2px #dcfce7', background: '#fff' },
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

const LOGO_PATH = 'M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-8 2 4-4 8.5-4 8.5-4-8 3.5-9 6-9 6A8 8 0 0 1 17 8z'

// ─── Icon helper ─────────────────────────────────────────────────
const Icon = ({ d, size = 14, style = {} }) => (
  <svg style={{ width: size, height: size, ...style }} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
  </svg>
)

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

  // ─── Shared input event handlers ─────────────────────────────────
  const onFocus = (e) => Object.assign(e.target.style, s.inputFocus)
  const onBlur  = (e, name) => {
    e.target.style.borderColor = fieldErrors[name] ? '#dc2626' : GRAY[200]
    e.target.style.boxShadow   = 'none'
    e.target.style.background  = GRAY[100]
    if (!touched[name]) {
      setTouched(prev => ({ ...prev, [name]: true }))
      applyValidation(form, [name])
    }
  }
  const onMouseEnter = (e) => { if (!fieldErrors[e.target.name]) e.target.style.borderColor = '#d1d5db' }
  const onMouseLeave = (e, name) => { if (!fieldErrors[name]) e.target.style.borderColor = GRAY[200] }

  const inputStyle = (name) => ({ ...s.inputBase, border: `1px solid ${fieldErrors[name] ? '#dc2626' : GRAY[200]}` })
  const inputEvents = (name) => ({ onFocus, onBlur: e => onBlur(e, name), onMouseEnter, onMouseLeave: e => onMouseLeave(e, name) })

  // ─── Field components ─────────────────────────────────────────────
  const InputField = ({ name, type, placeholder, icon, autoComplete, maxLength, children }) => (
    <div>
      <label htmlFor={name} style={s.label}>{children}</label>
      <div style={{ position: 'relative' }}>
        <Icon d={icon} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: GRAY[400], pointerEvents: 'none' }} />
        <input id={name} name={name} type={type} value={form[name] ?? ''} placeholder={placeholder}
          autoComplete={autoComplete} maxLength={maxLength}
          inputMode={(name === 'dni' || name === 'phone') ? 'numeric' : undefined}
          style={inputStyle(name)} onChange={handleChange} {...inputEvents(name)} />
      </div>
      {fieldErrors[name]
        ? <span style={s.errorMsg}>{fieldErrors[name]}</span>
        : checkingFields[name] && <span style={{ fontSize: '0.7rem', color: GRAY[500], marginTop: '0.2rem', display: 'block' }}>Verificando disponibilidad…</span>}
    </div>
  )

  const PwdField = ({ name, placeholder, children }) => (
    <div>
      <label htmlFor={name} style={s.label}>{children}</label>
      <div style={{ position: 'relative' }}>
        <Icon d={icons.lock} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: GRAY[400], pointerEvents: 'none' }} />
        <input id={name} name={name} type={showPwd[name] ? 'text' : 'password'} value={form[name] ?? ''}
          placeholder={placeholder} autoComplete="new-password"
          style={{ ...inputStyle(name), paddingRight: '2.5rem' }}
          onChange={handleChange} {...inputEvents(name)} />
        <span onClick={() => setShowPwd(p => ({ ...p, [name]: !p[name] }))}
          style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', userSelect: 'none', padding: 4, color: GRAY[400] }}>
          <Icon d={showPwd[name] ? icons.eyeOff : icons.eye} size={16} />
        </span>
      </div>
      {fieldErrors[name] && <span style={s.errorMsg}>{fieldErrors[name]}</span>}
    </div>
  )

  const SectionLabel = ({ children, mt = '0.25rem' }) => (
    <legend style={{ ...s.fieldLabel, marginTop: mt, width: '100%', padding: 0 }}>
      <span>{children}</span>
      <div style={s.divider} />
    </legend>
  )

  const TwoCol = ({ children }) => (
    <div style={{ display: 'grid', gap: '0.75rem' }} className="md-grid-cols-2">{children}</div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}

        @keyframes fadeUp { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.5} }

        .fade-up    { animation: fadeUp .65s cubic-bezier(.22,1,.36,1) both }
        .fade-up-d1 { animation: fadeUp .7s  cubic-bezier(.22,1,.36,1) both }
        .fade-up-d2 { animation: fadeUp .7s  .12s cubic-bezier(.22,1,.36,1) both }
        .fade-up-d3 { animation: fadeUp .85s .25s cubic-bezier(.22,1,.36,1) both }

        .right-panel,.wave-line,.glow-desk { display:none }
        .register-grid { grid-template-columns:1fr }
        .overflow-y-mobile { overflow-y:auto }
        .items-start { align-items:flex-start }

        .avatar-group { position:relative; cursor:pointer; flex-shrink:0 }
        .avatar-group .avatar-overlay { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; border-radius:50%; background:transparent; transition:background .2s }
        .avatar-group:hover .avatar-overlay { background:rgba(0,0,0,.3) }
        .avatar-group .avatar-icon { width:16px; height:16px; color:#fff; opacity:0; transition:opacity .2s }
        .avatar-group:hover .avatar-icon { opacity:1 }
        .avatar-group .avatar-img { transition:opacity .2s }
        .avatar-group:hover .avatar-img { opacity:.75 }

        @media(min-width:640px)  { .sm-py-3{padding-top:.75rem;padding-bottom:.75rem} .sm-px-8{padding-left:2rem;padding-right:2rem} .sm-text-4xl{font-size:2.25rem} .sm-mb-6{margin-bottom:1.5rem} .sm-h-24{height:6rem;width:6rem} .sm-h-6{height:1.5rem;width:1.5rem} }
        @media(min-width:768px)  { .md-grid-cols-2{grid-template-columns:1fr 1fr} }
        @media(min-width:1024px) { .register-grid{grid-template-columns:1fr 1fr} .right-panel{display:block} .wave-line{display:block} .glow-desk{display:block} .lg-items-center{align-items:center} .overflow-y-mobile{overflow-y:hidden} .lg-overflow-hidden{overflow:hidden} .lg-px-12{padding-left:3rem;padding-right:3rem} .lg-min-h-screen{min-height:100vh} .lg-py-0{padding-top:0;padding-bottom:0} .lg-h-32{height:8rem;width:8rem} }
      `}</style>

      <main className="register-grid lg-overflow-hidden" style={{
        display:'grid', minHeight:'100vh', width:'100%', position:'relative',
        background:'#fff', color:GRAY[900], fontFamily:'system-ui,-apple-system,sans-serif',
      }}>

        {/* ─── LEFT ─── */}
        <section className="items-start lg-items-center overflow-y-mobile sm-px-8 lg-px-12" style={{
          position:'relative', zIndex:20, display:'flex', justifyContent:'center',
          padding:'1.5rem 2rem', background:'#fff', minHeight:'100vh', overflowX:'hidden',
        }}>
          {/* Glows */}
          <div aria-hidden="true" className="glow-desk" style={{ position:'absolute', right:'-8rem', top:'8%', width:420, height:420, borderRadius:'50%', pointerEvents:'none', background:'radial-gradient(circle at center,rgba(187,247,208,.55) 0%,rgba(220,252,231,.35) 35%,rgba(255,255,255,0) 70%)' }} />
          <div aria-hidden="true" style={{ position:'absolute', top:'-5rem', right:'-5rem', width:'20rem', height:'20rem', borderRadius:'50%', pointerEvents:'none', opacity:.6, background:'radial-gradient(circle at center,#f0fdf4,transparent 70%)' }} />

          {/* Leaf SVG */}
          <svg aria-hidden="true" style={{ position:'absolute', bottom:'-.75rem', left:'-.75rem', width:'12rem', opacity:.3, pointerEvents:'none' }} viewBox="0 0 220 280" xmlns="http://www.w3.org/2000/svg">
            {[
              ['M40 270 C 40 190, 80 160, 65 70','2'],
              ['M65 70 C 65 70, 20 50, 8 15','1.2'],
              ['M65 70 C 65 70, 115 45, 130 8','1.2'],
              ['M52 155 C 52 155, 8 142, -8 122','1'],
              ['M52 155 C 52 155, 96 130, 120 112','1'],
              ['M58 110 C 58 110, 16 94, 0 76','.9'],
              ['M58 110 C 58 110, 98 88, 122 72','.9'],
            ].map(([d, w], i) => <path key={i} d={d} stroke={G[600]} strokeWidth={w} fill="none" strokeLinecap="round" />)}
            <ellipse cx="130" cy="8"   rx="13" ry="7.5" fill={G[600]} opacity=".55" transform="rotate(-30 130 8)" />
            <ellipse cx="-8"  cy="122" rx="11" ry="6"   fill={G[600]} opacity=".55" transform="rotate(20 -8 122)" />
            <ellipse cx="120" cy="112" rx="12" ry="6.5" fill={G[600]} opacity=".55" transform="rotate(-15 120 112)" />
            <ellipse cx="0"   cy="76"  rx="10" ry="5.5" fill={G[600]} opacity=".45" transform="rotate(25 0 76)" />
            <ellipse cx="122" cy="72"  rx="11" ry="6"   fill={G[600]} opacity=".45" transform="rotate(-20 122 72)" />
          </svg>

          <article className="fade-up sm-py-3 lg-py-0" style={{ ...s.card, paddingTop:'.5rem', paddingBottom:'.5rem' }}>

            {/* Brand + Avatar */}
            <header style={s.brandRow}>
              <div style={s.brandLeft}>
                <figure style={s.brandLogo}>
                  <svg style={{ width:20, height:20, fill:'#fff' }} viewBox="0 0 24 24"><path d={LOGO_PATH} /></svg>
                </figure>
                <span style={s.brandName}>Pitahaya Vision</span>
              </div>

              <label htmlFor="profile_photo" className="avatar-group" title="Subir foto de perfil">
                <img src={photoPreview || 'https://img.freepik.com/vector-premium/icono-perfil-avatar-predeterminado-imagen-usuario-redes-sociales-icono-avatar-gris-silueta-perfil-blanco-ilustracion-vectorial_561158-3467.jpg'}
                  alt="Foto de perfil" className="avatar-img sm-h-24 lg-h-32"
                  style={{ width:96, height:96, borderRadius:'50%', objectFit:'cover', border:`2.5px solid ${G[500]}`, boxShadow:'0 4px 6px -1px rgba(22,163,74,0.2)', display:'block' }} />
                <div className="avatar-overlay">
                  <svg className="avatar-icon" fill="currentColor" viewBox="0 0 24 24"><path d={icons.camera} /></svg>
                </div>
                <div className="sm-h-6" style={{ position:'absolute', bottom:0, right:0, width:22, height:22, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'50%', border:'2px solid #fff', background:G[500] }}>
                  <svg style={{ width:12, height:12, color:'#fff' }} fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" clipRule="evenodd" d={icons.plus} /></svg>
                </div>
              </label>
              {fieldErrors.profile_photo && <span style={{ ...s.errorMsg, textAlign:'center', display:'block', marginTop:'0.3rem' }}>{fieldErrors.profile_photo}</span>}
            </header>

            {/* Heading */}
            <p style={{ fontSize:'.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:G[600], marginBottom:'.5rem' }}>
              Sistema de diagnóstico inteligente
            </p>
            <h1 className="sm-text-4xl" style={{ fontFamily:'"Cormorant Garamond",serif', fontSize:'1.875rem', fontWeight:500, lineHeight:1.25, color:GRAY[900], marginBottom:'.5rem' }}>
              Crea tu <em style={{ fontStyle:'italic', color:G[600] }}>cuenta</em>
            </h1>
            <p className="sm-mb-6" style={{ fontSize:'.875rem', fontWeight:300, color:GRAY[500], marginBottom:'1.25rem', lineHeight:1.625 }}>
              Registra tus datos para acceder al sistema.{' '}
              ¿Ya tienes una cuenta?{' '}
              <Link to="/login" style={{ fontWeight:500, color:G[600] }}>Inicia sesión aquí</Link>.
            </p>

            {serverError && (
              <p style={{ background:'#fef2f2', color:'#dc2626', padding:'.75rem', borderRadius:8, marginBottom:'1rem', fontSize:'.875rem', textAlign:'center' }}>
                {serverError}
              </p>
            )}

            {/* ═══ FORM ═══ */}
            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>

              <fieldset style={{ border:'none', padding:0, margin:0 }}>
                {SectionLabel({ children:'Datos de cuenta' })}
                {TwoCol({ children: <>
                  {InputField({ name:'username',  type:'text',  placeholder:'usuario123',       icon:icons.user,  autoComplete:'username', children:'Usuario' })}
                  {InputField({ name:'email',     type:'email', placeholder:'nombre@correo.com', icon:icons.mail,  autoComplete:'email', children:'Correo electrónico' })}
                </> })}
              </fieldset>

              <fieldset style={{ border:'none', padding:0, margin:0 }}>
                {SectionLabel({ mt:'0.5rem', children:'Datos personales' })}
                {TwoCol({ children: <>
                  {InputField({ name:'first_name', type:'text', placeholder:'Juan',       icon:icons.user,   autoComplete:'given-name', children:'Nombre' })}
                  {InputField({ name:'last_name',  type:'text', placeholder:'Pérez',      icon:icons.user,   autoComplete:'family-name', children:'Apellido' })}
                  {InputField({ name:'dni',        type:'text', placeholder:'0701234567', icon:icons.idCard, autoComplete:'off', maxLength:10, children:'Cédula' })}
                  {InputField({ name:'phone',      type:'tel',  placeholder:'0991234567', icon:icons.phone,  autoComplete:'tel', maxLength:10, children:'Teléfono' })}
                </> })}
              </fieldset>

              <input id="profile_photo" type="file" name="profile_photo" accept="image/*" style={{ display:'none' }} onChange={handlePhotoChange} />

              <fieldset style={{ border:'none', padding:0, margin:0 }}>
                {SectionLabel({ mt:'0.5rem', children:'Seguridad' })}
                {TwoCol({ children: <>
                  {PwdField({ name:'password1', placeholder:'••••••••', children:'Contraseña' })}
                  {PwdField({ name:'password2', placeholder:'••••••••', children:'Confirmar contraseña' })}
                </> })}
              </fieldset>

              <button type="submit" disabled={loading} style={{
                marginTop:'.5rem', width:'100%', padding:'.75rem', borderRadius:8, fontSize:'.875rem',
                fontWeight:600, letterSpacing:'.05em', background:G[600], color:'#fff',
                border:'none', cursor:loading?'not-allowed':'pointer', opacity:loading?.7:1,
                boxShadow:'0 4px 6px -1px rgba(22,163,74,0.2)', transition:'all .15s',
              }}
                onMouseEnter={e => { if (!loading) { e.target.style.background='#15803d'; e.target.style.transform='translateY(-2px)'; e.target.style.boxShadow='0 10px 15px -3px rgba(22,163,74,0.3)' } }}
                onMouseLeave={e => { e.target.style.background=G[600]; e.target.style.transform='translateY(0)'; e.target.style.boxShadow='0 4px 6px -1px rgba(22,163,74,0.2)' }}
              >
                {loading ? 'Registrando…' : 'Crear cuenta'}
              </button>
            </form>
          </article>
        </section>

        {/* ─── RIGHT ─── */}
        <aside className="right-panel" style={{ position:'relative', overflow:'hidden', height:'100vh', zIndex:0, background:'#0f3d1e' }}>
          <img src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?fm=jpg&q=80&w=2400&auto=format&fit=crop"
            alt="Campo agrícola" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} />

          <svg aria-hidden="true" style={{ position:'absolute', left:0, top:0, width:'100%', height:'100%', zIndex:11, pointerEvents:'none' }}
            viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M 0,0 L 9,0 C 2,12 14,26 5,42 C -3,58 13,74 4,88 C 3,94 7,100 7,100 L 0,100 Z" fill="#fff" />
          </svg>

          <div style={{ position:'absolute', inset:0, background:'linear-gradient(to right,rgba(15,61,30,.52),rgba(15,61,30,.20),rgba(15,61,30,.48))', zIndex:10 }} />

          <div style={{ position:'absolute', top:'1.5rem', right:'1.5rem', zIndex:30, display:'flex', flexDirection:'column', gap:'.75rem', alignItems:'flex-end' }}>
            {[
              { cls:'fade-up-d1', label:<><strong style={{ fontWeight:600 }}>1,240</strong> cultivos monitoreados</> },
              { cls:'fade-up-d2', label:<><strong style={{ fontWeight:600 }}>98.4%</strong> disponibilidad del sistema</> },
            ].map(({ cls, label }, i) => (
              <div key={i} className={cls} style={{ display:'flex', alignItems:'center', gap:'.5rem', background:'rgba(255,255,255,0.1)', backdropFilter:'blur(24px)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:16, padding:'.75rem 1rem' }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:G[400], animation:'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' }} />
                <span style={{ fontSize:'.75rem', color:'#fff', whiteSpace:'nowrap' }}>{label}</span>
              </div>
            ))}
          </div>

          <div className="fade-up-d3" style={{ position:'absolute', bottom:'1.5rem', left:'12%', right:'1.5rem', zIndex:30, background:'rgba(255,255,255,0.1)', backdropFilter:'blur(24px)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:16, padding:'1.25rem' }}>
            <div style={{ position:'absolute', left:0, top:'1.25rem', bottom:'1.25rem', width:4, borderRadius:'0 4px 4px 0', background:G[500] }} />
            <p style={{ fontFamily:'"Cormorant Garamond",serif', fontSize:'1rem', fontStyle:'italic', color:'#fff', lineHeight:1.625, marginBottom:'.75rem', paddingLeft:'.5rem' }}>
              &ldquo;La tierra es el mayor patrimonio del agricultor. Pitahaya Vision la protege.&rdquo;
            </p>
            <footer style={{ display:'flex', alignItems:'center', gap:'.75rem', paddingLeft:'.5rem' }}>
              <figure style={{ width:36, height:36, borderRadius:'50%', background:G[600], display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, border:'1px solid rgba(255,255,255,0.3)' }}>
                <svg style={{ width:16, height:16, fill:'#fff' }} viewBox="0 0 24 24"><path d={LOGO_PATH} /></svg>
              </figure>
              <figcaption>
                <strong style={{ display:'block', fontSize:'.875rem', fontWeight:600, color:'#fff', lineHeight:1.2 }}>Plataforma Pitahaya Vision</strong>
                <span style={{ fontSize:'.75rem', color:'rgba(255,255,255,0.7)' }}>Gestión inteligente del diagnóstico</span>
              </figcaption>
            </footer>
          </div>
        </aside>

        <svg className="wave-line" aria-hidden="true" style={{ position:'absolute', right:0, top:0, width:'4rem', height:'100vh', zIndex:20 }}
          viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M 54.5,0 C 51,12 57,26 52.5,42 C 48.5,58 56.5,74 52,88 C 51.5,94 53.5,100 53.5,100"
            stroke={G[600]} strokeWidth="1.5" fill="none" opacity=".35" vectorEffect="non-scaling-stroke" />
        </svg>
      </main>
    </>
  )
}