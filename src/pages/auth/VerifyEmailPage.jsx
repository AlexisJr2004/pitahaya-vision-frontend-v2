import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { confirmEmail } from '../../services/authService'
import AppLogo from '../../components/AppLogo'

const G = { 800: '#15803d', 600: '#16a34a', 500: '#22c55e', 400: '#4ade80' }
const GRAY = { 900: '#111827', 700: '#374151', 500: '#6b7280', 400: '#9ca3af', 200: '#e5e7eb', 100: '#F2F4FB' }

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    const uid = searchParams.get('uid')
    const token = searchParams.get('token')
    if (!uid || !token) { setStatus('invalid'); return }
    confirmEmail(uid, token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'))
  }, [searchParams])

  const handleRedirect = () => navigate('/login', { replace: true })

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        @keyframes fadeUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
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

          <article className="fade-up" style={{ position:'relative', zIndex:30, width:'100%', maxWidth:448, textAlign:'center', paddingTop:'.5rem', paddingBottom:'.5rem' }}>

            {/* Brand */}
            <header style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'.75rem', marginBottom:'1.5rem' }}>
              <figure style={{ width:40, height:40, borderRadius:8, background:G[600], display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 6px -1px rgba(22,163,74,0.2)', flexShrink:0 }}>
                <AppLogo size={20} style={{ fill:'#fff' }} />
              </figure>
              <span style={{ fontFamily:'"Cormorant Garamond",serif', fontSize:'1.5rem', fontWeight:600, color:GRAY[900] }}>
                Pitahaya Vision
              </span>
            </header>

            {/* Loading */}
            {status === 'loading' && (
              <>
                <div style={{ width:64, height:64, borderRadius:'50%', background:'#f0fdf4', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1.5rem' }}>
                  <div style={{ width:28, height:28, border:'3px solid #bbf7d0', borderTopColor:G[600], borderRadius:'50%', animation:'spin .8s linear infinite' }} />
                </div>
                <h1 style={{ fontFamily:'"Cormorant Garamond",serif', fontSize:'1.75rem', fontWeight:500, color:GRAY[900], marginBottom:'.5rem', lineHeight:1.25 }}>
                  Verificando correo...
                </h1>
                <p style={{ fontSize:'.875rem', color:GRAY[500], lineHeight:1.625 }}>
                  Espera un momento mientras confirmamos tu identidad.
                </p>
              </>
            )}

            {/* Success */}
            {status === 'success' && (
              <>
                <div style={{ width:64, height:64, borderRadius:'50%', background:'#f0fdf4', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1.5rem' }}>
                  <svg style={{ width:32, height:32, color:G[600] }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h1 style={{ fontFamily:'"Cormorant Garamond",serif', fontSize:'1.75rem', fontWeight:500, color:GRAY[900], marginBottom:'.5rem', lineHeight:1.25 }}>
                  Correo verificado
                </h1>
                <p style={{ fontSize:'.875rem', color:GRAY[500], lineHeight:1.625 }}>
                  Tu cuenta ha sido activada correctamente. Ya puedes iniciar sesión.
                </p>
                <button onClick={handleRedirect} style={{
                  marginTop:'1.5rem', padding:'.75rem 2rem', borderRadius:8, fontSize:'.875rem',
                  fontWeight:700, letterSpacing:'.05em', background:G[600], color:'#fff',
                  border:'none', cursor:'pointer',
                  boxShadow:'0 4px 6px -1px rgba(22,163,74,0.2)', transition:'all .15s',
                }}
                  onMouseEnter={e => { e.target.style.background = G[800]; e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 10px 15px -3px rgba(22,163,74,0.3)' }}
                  onMouseLeave={e => { e.target.style.background = G[600]; e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 6px -1px rgba(22,163,74,0.2)' }}>
                  Ir a iniciar sesión
                </button>
              </>
            )}

            {/* Error / Invalid */}
            {(status === 'error' || status === 'invalid') && (
              <>
                <div style={{ width:64, height:64, borderRadius:'50%', background:'#fef2f2', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1.5rem' }}>
                  <svg style={{ width:32, height:32, color:'#dc2626' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h1 style={{ fontFamily:'"Cormorant Garamond",serif', fontSize:'1.75rem', fontWeight:500, color:GRAY[900], marginBottom:'.5rem', lineHeight:1.25 }}>
                  Enlace inválido
                </h1>
                <p style={{ fontSize:'.875rem', color:GRAY[500], lineHeight:1.625 }}>
                  {status === 'invalid'
                    ? 'El enlace de verificación no contiene los datos necesarios.'
                    : 'El enlace es inválido o ya expiró. Solicita un nuevo correo de verificación.'}
                </p>
                <button onClick={handleRedirect} style={{
                  marginTop:'1.5rem', padding:'.75rem 2rem', borderRadius:8, fontSize:'.875rem',
                  fontWeight:600, border:`1.5px solid ${G[600]}`, cursor:'pointer',
                  background:'#fff', color:G[600], transition:'all .15s',
                }}
                  onMouseEnter={e => { e.target.background = '#f0fdf4' }}
                  onMouseLeave={e => { e.target.background = '#fff' }}>
                  Volver al inicio de sesión
                </button>
              </>
            )}

          </article>
        </section>
      </main>
    </>
  )
}
