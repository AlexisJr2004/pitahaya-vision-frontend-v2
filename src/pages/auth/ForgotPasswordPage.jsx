import { useState } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset } from '../../services/authService'
import '../../styles/auth.css'

const G = { 800: '#15803d', 600: '#16a34a', 500: '#22c55e', 400: '#4ade80' }
const GRAY = { 900: '#111827', 700: '#374151', 500: '#6b7280', 400: '#9ca3af', 200: '#e5e7eb', 100: '#F2F4FB' }
const LOGO_PATH = 'M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-8 2 4-4 8.5-4 8.5-4-8 3.5-9 6-9 6A8 8 0 0 1 17 8z'

const s = {
  label:    { display:'block', fontSize:'.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', color:GRAY[700], marginBottom:'.375rem' },
  input:    { background:GRAY[100], width:'100%', borderRadius:8, padding:'.625rem 1rem .625rem 2.5rem', fontSize:'.875rem', color:GRAY[900], outline:'none', transition:'all .2s', boxSizing:'border-box', border:`1px solid ${GRAY[200]}` },
  iconPin:  { position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', width:14, height:14, color:GRAY[400], pointerEvents:'none' },
  fieldset: { border:'none', padding:0, margin:0 },
}

const Icon = ({ d, size = 14, style = {} }) => (
  <svg style={{ width:size, height:size, ...style }} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
    <>


      <main style={{ minHeight:'100vh', width:'100%', position:'relative', background:'#fff', color:GRAY[900], fontFamily:'system-ui,-apple-system,sans-serif', overflowX:'hidden' }}>

        <section style={{ position:'relative', zIndex:20, display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', padding:'1.5rem 2rem', background:'#fff', overflow:'hidden' }}>

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

          <article className="fade-up" style={{ position:'relative', zIndex:30, width:'100%', maxWidth:448, paddingTop:'.5rem', paddingBottom:'.5rem' }}>

            {/* Brand */}
            <header style={{ display:'flex', alignItems:'center', gap:'.75rem', marginBottom:'2rem' }}>
              <figure style={{ width:40, height:40, borderRadius:8, background:G[600], display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 6px -1px rgba(22,163,74,0.2)', flexShrink:0 }}>
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
            <h1 style={{ fontFamily:'"Cormorant Garamond",serif', fontSize:'1.875rem', fontWeight:500, lineHeight:1.25, color:GRAY[900], marginBottom:'.5rem' }}>
              Recupera tu <em style={{ fontStyle:'italic', color:G[600] }}>contraseña</em>
            </h1>
            <p style={{ fontSize:'.875rem', fontWeight:300, color:GRAY[500], marginBottom:'1.25rem', lineHeight:1.625 }}>
              Ingresa el correo asociado a tu cuenta y te enviaremos un enlace para restablecer tu contraseña.
            </p>

            {/* Messages */}
            {status === 'success' && (
              <p style={{ background:'#f0fdf4', color:G[600], padding:'.75rem', borderRadius:8, marginBottom:'1rem', fontSize:'.875rem', textAlign:'center', border:'1px solid #bbf7d0' }}>
                {message}
              </p>
            )}
            {status === 'error' && (
              <p style={{ background:'#fef2f2', color:'#dc2626', padding:'.75rem', borderRadius:8, marginBottom:'1rem', fontSize:'.875rem', textAlign:'center' }}>
                {message}
              </p>
            )}

            {/* ═══ FORM ═══ */}
            {status !== 'success' && (
              <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>

                <fieldset style={s.fieldset}>

                  <legend style={{ display:'flex', alignItems:'center', gap:'.5rem', marginBottom:'0.75rem', fontSize:'0.68rem', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.12em', color:GRAY[400], width: '100%', padding: 0 }}>
                    <span>Datos de cuenta</span>
                    <div style={{ height:1, flex:1, background:GRAY[200] }} />
                  </legend>

                  <div>
                    <label htmlFor="email" style={s.label}>Correo electrónico</label>
                    <div style={{ position:'relative' }}>
                      <Icon d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" style={s.iconPin} />
                      <input id="email" type="email" name="email" value={email} placeholder="nombre@correo.com"
                        autoComplete="email" required
                        style={{ ...s.input, border:`1px solid ${fieldError ? '#dc2626' : GRAY[200]}` }}
                        onChange={handleChange}
                        onFocus={e => { e.target.style.borderColor = G[600]; e.target.style.boxShadow = '0 0 0 2px rgba(22,163,74,0.15)'; e.target.style.background = '#fff' }}
                        onBlur={e => { e.target.style.borderColor = fieldError ? '#dc2626' : GRAY[200]; e.target.style.boxShadow = 'none'; e.target.style.background = GRAY[100] }} />
                    </div>
                    {fieldError && <span style={{ fontSize:'.75rem', color:'#dc2626', marginTop:'.25rem', display:'block' }}>{fieldError}</span>}
                  </div>

                </fieldset>

                <button type="submit" disabled={status === 'loading'} style={{
                  marginTop:'.5rem', width:'100%', padding:'.75rem', borderRadius:8, fontSize:'.875rem',
                  fontWeight:700, letterSpacing:'.05em', background:G[600], color:'#fff',
                  border:'none', cursor:status === 'loading'?'not-allowed':'pointer', opacity:status === 'loading'?.7:1,
                  boxShadow:'0 4px 6px -1px rgba(22,163,74,0.2)', transition:'all .15s',
                }}
                  onMouseEnter={e => { if (status !== 'loading') { e.target.style.background = G[800]; e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 10px 15px -3px rgba(22,163,74,0.3)' } }}
                  onMouseLeave={e => { e.target.style.background = G[600]; e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 6px -1px rgba(22,163,74,0.2)' }}
                >
                  {status === 'loading' ? 'Enviando…' : 'Enviar enlace'}
                </button>

              </form>
            )}

            {/* Back to login */}
            <footer style={{ marginTop:'1.5rem', textAlign:'center', fontSize:'.875rem', color:GRAY[500] }}>
              <Link to="/login" style={{ fontWeight:600, color:G[600], textDecoration:'none' }}
                onMouseEnter={e => { e.target.style.color = G[800]; e.target.style.textDecoration = 'underline' }}
                onMouseLeave={e => { e.target.style.color = G[600]; e.target.style.textDecoration = 'none' }}>
                Volver al inicio de sesión
              </Link>
            </footer>

          </article>
        </section>
      </main>
    </>
  )
}
