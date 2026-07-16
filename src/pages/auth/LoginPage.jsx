import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { validateLogin } from '../../utils/validators'
import { getRemainingSeconds, setCooldownFromWait, getCooldownType } from '../../utils/cooldown'
import CooldownModal from '../../components/CooldownModal'

// ─── Design tokens ────────────────────────────────────────────────
const G = { 800: '#15803d', 600: '#16a34a', 500: '#22c55e', 400: '#4ade80' }
const GRAY = { 900: '#111827', 700: '#374151', 500: '#6b7280', 400: '#9ca3af', 200: '#e5e7eb', 100: '#F2F4FB' }
const SHADOW = { sm: '0 4px 6px -1px rgba(0,0,0,0.1)', lg: '0 10px 15px -3px rgba(0,0,0,0.1)' }
const LOGO_PATH = 'M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-8 2 4-4 8.5-4 8.5-4-8 3.5-9 6-9 6A8 8 0 0 1 17 8z'

// ─── Shared styles ────────────────────────────────────────────────
const s = {
  label:     { display:'block', fontSize:'.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', color:GRAY[700], marginBottom:'.375rem' },
  inputBase: { background:GRAY[100], width:'100%', borderRadius:8, padding:'.625rem 1rem .625rem 2.5rem', fontSize:'.875rem', color:GRAY[900], outline:'none', transition:'all .2s', boxSizing:'border-box' },
  errorMsg:  { fontSize:'.75rem', color:'#dc2626', marginTop:'.25rem', display:'block' },
  iconPin:   { position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', width:14, height:14, color:GRAY[400], pointerEvents:'none' },
  glassCard: { display:'flex', alignItems:'center', gap:'.5rem', background:'rgba(255,255,255,0.1)', backdropFilter:'blur(24px)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:16, padding:'.75rem 1rem' },
  dot:       { width:8, height:8, borderRadius:'50%', background: G[400], animation:'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' },
}

// ─── SVG icon paths ───────────────────────────────────────────────
const icons = {
  user:   'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  lock:   'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  eye:    'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  eyeOff: 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21',
}

const Icon = ({ d, size = 14, style = {} }) => (
  <svg style={{ width:size, height:size, ...style }} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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

  // ─── Shared input events ─────────────────────────────────────────
  const onFocus = (e) => { e.target.style.borderColor = G[600]; e.target.style.boxShadow = '0 0 0 2px rgba(22,163,74,0.15)'; e.target.style.background = '#fff' }
  const onBlur  = (e, name) => { e.target.style.borderColor = fieldErrors[name] ? '#dc2626' : GRAY[200]; e.target.style.boxShadow = 'none'; e.target.style.background = GRAY[100] }
  const inputStyle = (name, extra = {}) => ({ ...s.inputBase, border:`1px solid ${fieldErrors[name] ? '#dc2626' : GRAY[200]}`, ...extra })

  // ─── Field component ─────────────────────────────────────────────
  const Field = ({ name, type, placeholder, icon, autoComplete, children, rightSlot }) => (
    <div>
      <label htmlFor={name} style={s.label}>{children}</label>
      <div style={{ position:'relative' }}>
        <Icon d={icon} style={s.iconPin} />
        <input id={name} name={name} type={type} value={form[name] ?? ''} placeholder={placeholder}
          autoComplete={autoComplete} required
          style={inputStyle(name, rightSlot ? { paddingRight:'2.5rem' } : {})}
          onChange={handleChange}
          onFocus={onFocus}
          onBlur={e => onBlur(e, name)} />
        {rightSlot}
      </div>
      {fieldErrors[name] && <span style={s.errorMsg}>{fieldErrors[name]}</span>}
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}

        @keyframes fadeUp { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.5} }

        .fade-up    { animation:fadeUp .65s cubic-bezier(.22,1,.36,1) both }
        .fade-up-d1 { animation:fadeUp .7s  cubic-bezier(.22,1,.36,1) both }
        .fade-up-d2 { animation:fadeUp .7s  .12s cubic-bezier(.22,1,.36,1) both }
        .fade-up-d3 { animation:fadeUp .85s .25s cubic-bezier(.22,1,.36,1) both }

        .main-grid { grid-template-columns:1fr }
        .right-panel,.wave-line,.glow-desk { display:none }

        @media(min-width:1024px) {
          .main-grid { grid-template-columns:1fr 1fr }
          .right-panel,.wave-line,.glow-desk { display:block }
        }
      `}</style>

      <main className="main-grid" style={{
        display:'grid', height:'100vh', width:'100vw', position:'relative',
        background:'#fff', color:GRAY[900], overflow:'hidden',
        fontFamily:'system-ui,-apple-system,sans-serif',
      }}>

        {/* ─── LEFT ─── */}
        <section style={{ position:'relative', zIndex:20, display:'flex', alignItems:'center', justifyContent:'center', padding:'1.5rem 2rem', background:'#fff', overflow:'hidden', height:'100vh' }}>

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

          <article className="fade-up" style={{ position:'relative', zIndex:30, width:'100%', maxWidth:448 }}>

            {/* Brand */}
            <header style={{ display:'flex', alignItems:'center', gap:'.75rem', marginBottom:'2rem' }}>
              <figure style={{ width:40, height:40, borderRadius:8, background:G[600], display:'flex', alignItems:'center', justifyContent:'center', boxShadow:SHADOW.sm, flexShrink:0 }}>
                <svg style={{ width:20, height:20, fill:'#fff' }} viewBox="0 0 24 24"><path d={LOGO_PATH} /></svg>
              </figure>
              <span style={{ fontFamily:'"Cormorant Garamond",serif', fontSize:'1.5rem', fontWeight:600, color:GRAY[900] }}>
                Pitahaya Vision
              </span>
            </header>

            {/* Heading */}
            <p style={{ fontSize:'.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:G[600], marginBottom:'.5rem' }}>
              Sistema de diagnóstico inteligente
            </p>
            <h1 style={{ fontFamily:'"Cormorant Garamond",serif', fontSize:'2.25rem', fontWeight:500, lineHeight:1.2, color:GRAY[900], marginBottom:'.5rem' }}>
              Bienvenido <em style={{ fontStyle:'italic', color:G[600] }}>de vuelta</em>
            </h1>
            <p style={{ fontSize:'.875rem', fontWeight:300, color:GRAY[500], marginBottom:'1.25rem', lineHeight:1.625 }}>
              Ingresa tus credenciales para acceder a tu espacio de trabajo.
            </p>

            {/* Banners */}
            {successMsg && (
              <p style={{ background:'#f0fdf4', color:G[600], padding:'.75rem', borderRadius:8, marginBottom:'1rem', fontSize:'.875rem', textAlign:'center', border:'1px solid #bbf7d0' }}>
                {successMsg}
              </p>
            )}
            {error && (
              <p style={{ background:'#fef2f2', color:'#dc2626', padding:'.75rem', borderRadius:8, marginBottom:'1rem', fontSize:'.875rem', textAlign:'center' }}>
                {error}
              </p>
            )}

            {/* ═══ FORM ═══ */}
            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'.875rem' }}>

              {Field({ name:'username', type:'text', placeholder:'Tu usuario', icon:icons.user, autoComplete:'username', children:'Usuario' })}

              {Field({ name:'password', type:showPassword ? 'text' : 'password', placeholder:'••••••••', icon:icons.lock, autoComplete:'current-password',
                rightSlot: (
                  <span onClick={() => setShowPassword(p => !p)}
                    style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color:GRAY[400], cursor:'pointer', userSelect:'none', padding:4 }}>
                    <Icon d={showPassword ? icons.eyeOff : icons.eye} size={16} />
                  </span>
                ),
                children:'Contraseña'
              })}

              {/* Forgot */}
              <div style={{ display:'flex', justifyContent:'flex-end', marginTop:'-.25rem' }}>
                <Link to="/recuperar-cuenta" style={{ fontSize:'.75rem', fontWeight:600, color:G[600], textDecoration:'none', transition:'color .15s' }}
                  onMouseEnter={e => { e.target.style.color = G[800]; e.target.style.textDecoration = 'underline' }}
                  onMouseLeave={e => { e.target.style.color = G[600]; e.target.style.textDecoration = 'none' }}>
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              {/* Submit */}
              <button type="submit" disabled={loading} style={{
                width:'100%', padding:'.625rem', borderRadius:8, fontSize:'.875rem',
                fontWeight:700, letterSpacing:'.05em', background:G[600], color:'#fff',
                border:'none', cursor:loading?'not-allowed':'pointer', opacity:loading?.7:1,
                boxShadow:SHADOW.sm, transition:'all .15s',
              }}
                onMouseEnter={e => { if (!loading) { e.target.style.background=G[800]; e.target.style.transform='translateY(-2px)'; e.target.style.boxShadow=SHADOW.lg } }}
                onMouseLeave={e => { e.target.style.background=G[600]; e.target.style.transform='translateY(0)'; e.target.style.boxShadow=SHADOW.sm }}
              >
                {loading ? 'Ingresando…' : 'Iniciar sesión'}
              </button>

              {/* Divider */}
              <div style={{ display:'flex', alignItems:'center', gap:'.5rem', margin:'1rem 0' }}>
                <div style={{ flex:1, height:1, background:GRAY[200] }} />
                <span style={{ fontSize:'.75rem', color:GRAY[400], padding:'0 .25rem', letterSpacing:'.05em' }}>o</span>
                <div style={{ flex:1, height:1, background:GRAY[200] }} />
              </div>

              {/* Register link */}
              <p style={{ textAlign:'center', fontSize:'.875rem', color:GRAY[500] }}>
                ¿No tienes una cuenta?&nbsp;
                <Link to="/registro" style={{ fontWeight:700, color:G[600], textDecoration:'none', transition:'color .15s' }}
                  onMouseEnter={e => { e.target.style.color = G[800] }}
                  onMouseLeave={e => { e.target.style.color = G[600] }}>
                  Regístrate gratis
                </Link>
              </p>
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

          {/* Stats pills */}
          <div style={{ position:'absolute', top:'1.5rem', right:'1.5rem', zIndex:30, display:'flex', flexDirection:'column', gap:'.75rem', alignItems:'flex-end' }}>
            {[
              { cls:'fade-up-d1', label:<><strong style={{ fontWeight:600 }}>1,240</strong> cultivos monitoreados</> },
              { cls:'fade-up-d2', label:<><strong style={{ fontWeight:600 }}>98.4%</strong> disponibilidad del sistema</> },
            ].map(({ cls, label }, i) => (
              <div key={i} className={cls} style={s.glassCard}>
                <div style={s.dot} />
                <span style={{ fontSize:'.75rem', color:'#fff', whiteSpace:'nowrap' }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Quote card */}
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

        {/* Wave accent line */}
        <svg className="wave-line" aria-hidden="true" style={{ position:'absolute', right:0, top:0, width:'4rem', height:'100vh', zIndex:20 }}
          viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M 54.5,0 C 51,12 57,26 52.5,42 C 48.5,58 56.5,74 52,88 C 51.5,94 53.5,100 53.5,100"
            stroke={G[600]} strokeWidth="1.5" fill="none" opacity=".35" vectorEffect="non-scaling-stroke" />
        </svg>
      </main>

      {cooldownActive && (
        <CooldownModal type={cooldownType} onComplete={() => { setCooldownActive(false); setError('') }} />
      )}
    </>
  )
}