import { useState } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { confirmPasswordReset } from '../../services/authService'
import AppLogo from '../../components/AppLogo'

const G = { 800: '#15803d', 600: '#16a34a', 500: '#22c55e', 400: '#4ade80' }
const GRAY = { 900: '#111827', 700: '#374151', 500: '#6b7280', 400: '#9ca3af', 200: '#e5e7eb', 100: '#F2F4FB' }
const ICON_LOCK = 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'

const COMMON_PASSWORDS = new Set([
  '12345678', 'password', '123456789', '1234567890', 'qwerty123',
  'abc123', '12345678910', 'password123', 'iloveyou', 'admin123',
  'welcome1', 'monkey', 'dragon', 'master', 'shadow',
  'sunshine', 'princess', 'football', 'baseball', 'trustno1',
])

const s = {
  label:    { display:'block', fontSize:'.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', color:GRAY[700], marginBottom:'.375rem' },
  input:    { background:GRAY[100], width:'100%', borderRadius:8, padding:'.625rem 1rem .625rem 2.5rem', fontSize:'.875rem', color:GRAY[900], outline:'none', transition:'all .2s', boxSizing:'border-box', border:`1px solid ${GRAY[200]}` },
  iconPin:  { position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', width:14, height:14, color:GRAY[400], pointerEvents:'none' },
  fieldset: { border:'none', padding:0, margin:0 },
  errorMsg: { fontSize:'.75rem', color:'#dc2626', marginTop:'.25rem', display:'block' },
}

const Icon = ({ d, size = 14, style = {} }) => (
  <svg style={{ width:size, height:size, ...style }} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
  </svg>
)

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

  const inputStyle = (name) => ({ ...s.input, border:`1px solid ${fieldErrors[name] ? '#dc2626' : GRAY[200]}`, paddingRight:'2.5rem' })

  const onFocus = (e) => { e.target.style.borderColor = G[600]; e.target.style.boxShadow = '0 0 0 2px rgba(22,163,74,0.15)'; e.target.style.background = '#fff' }
  const onBlur = (e, name) => { e.target.style.borderColor = fieldErrors[name] ? '#dc2626' : GRAY[200]; e.target.style.boxShadow = 'none'; e.target.style.background = GRAY[100] }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        @keyframes fadeUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        .fade-up{animation:fadeUp .65s cubic-bezier(.22,1,.36,1) both}
        .glow-desk{display:none}
        @media(min-width:1024px){.glow-desk{display:block}}
      `}</style>

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
                <AppLogo size={20} style={{ fill:'#fff' }} />
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
              Restablece tu <em style={{ fontStyle:'italic', color:G[600] }}>contraseña</em>
            </h1>
            <p style={{ fontSize:'.875rem', fontWeight:300, color:GRAY[500], marginBottom:'1.25rem', lineHeight:1.625 }}>
              Ingresa tu nueva contraseña para completar el proceso.
            </p>

            {/* Messages */}
            {status === 'success' && (
              <p style={{ background:'#f0fdf4', color:G[600], padding:'.75rem', borderRadius:8, marginBottom:'1rem', fontSize:'.875rem', textAlign:'center', border:'1px solid #bbf7d0' }}>
                {message}
              </p>
            )}
            {status === 'error' && !Object.keys(fieldErrors).length && (
              <p style={{ background:'#fef2f2', color:'#dc2626', padding:'.75rem', borderRadius:8, marginBottom:'1rem', fontSize:'.875rem', textAlign:'center' }}>
                {message}
              </p>
            )}

            {/* Invalid link */}
            {isInvalidLink && status !== 'success' && (
              <p style={{ background:'#fef2f2', color:'#dc2626', padding:'.75rem', borderRadius:8, marginBottom:'1rem', fontSize:'.875rem', textAlign:'center' }}>
                El enlace es inválido o ha expirado. Solicita un nuevo restablecimiento de contraseña.
              </p>
            )}

            {/* ═══ FORM ═══ */}
            {!isInvalidLink && status !== 'success' && (
              <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>

                <fieldset style={s.fieldset}>

                  <legend style={{ display:'flex', alignItems:'center', gap:'.5rem', marginBottom:'0.75rem', fontSize:'0.68rem', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.12em', color:GRAY[400], width: '100%', padding: 0 }}>
                    <span>Seguridad</span>
                    <div style={{ height:1, flex:1, background:GRAY[200] }} />
                  </legend>

                  {/* New password */}
                  <div style={{ marginBottom:'0.75rem' }}>
                    <label htmlFor="new_password1" style={s.label}>Nueva contraseña</label>
                    <div style={{ position:'relative' }}>
                      <Icon d={ICON_LOCK} style={s.iconPin} />
                      <input id="new_password1" name="new_password1"
                        type={showPwd[1] ? 'text' : 'password'} value={form.new_password1}
                        placeholder="••••••••" autoComplete="new-password" required
                        style={inputStyle('new_password1')}
                        onChange={handleChange}
                        onFocus={onFocus}
                        onBlur={e => onBlur(e, 'new_password1')} />
                      <span onClick={() => setShowPwd(p => ({ ...p, [1]: !p[1] }))}
                        style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', cursor:'pointer', userSelect:'none', padding:4, color:GRAY[400] }}>
                        <Icon d={showPwd[1] ? 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21' : 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'} size={16} />
                      </span>
                    </div>
                    {fieldErrors.new_password1 && <span style={s.errorMsg}>{fieldErrors.new_password1}</span>}
                  </div>

                  {/* Confirm password */}
                  <div>
                    <label htmlFor="new_password2" style={s.label}>Confirmar contraseña</label>
                    <div style={{ position:'relative' }}>
                      <Icon d={ICON_LOCK} style={s.iconPin} />
                      <input id="new_password2" name="new_password2"
                        type={showPwd[2] ? 'text' : 'password'} value={form.new_password2}
                        placeholder="••••••••" autoComplete="new-password" required
                        style={inputStyle('new_password2')}
                        onChange={handleChange}
                        onFocus={onFocus}
                        onBlur={e => onBlur(e, 'new_password2')} />
                      <span onClick={() => setShowPwd(p => ({ ...p, [2]: !p[2] }))}
                        style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', cursor:'pointer', userSelect:'none', padding:4, color:GRAY[400] }}>
                        <Icon d={showPwd[2] ? 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21' : 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'} size={16} />
                      </span>
                    </div>
                    {fieldErrors.new_password2 && <span style={s.errorMsg}>{fieldErrors.new_password2}</span>}
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
                  {status === 'loading' ? 'Restableciendo…' : 'Restablecer contraseña'}
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
