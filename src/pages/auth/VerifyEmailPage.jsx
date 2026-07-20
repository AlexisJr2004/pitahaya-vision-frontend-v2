import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { confirmEmail } from '../../services/authService'
import AppLogo from '../../components/AppLogo'
import './auth.css'

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

        <article className="auth-fade-up auth-card auth-card--padded" style={{ textAlign: 'center' }}>

          <header className="auth-brand-row" style={{ justifyContent: 'center', marginBottom: '1.5rem' }}>
            <figure className="auth-brand-logo">
              <AppLogo size={20} style={{ fill:'#fff' }} />
            </figure>
            <span className="auth-brand-name">Pitahaya Vision</span>
          </header>

          {status === 'loading' && (
            <>
              <div className="auth-status-icon auth-status-icon--ok">
                <div className="auth-spinner" />
              </div>
              <h1 className="auth-heading auth-heading--sm">Verificando correo...</h1>
              <p className="auth-subtitle" style={{ marginBottom: 0 }}>Espera un momento mientras confirmamos tu identidad.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="auth-status-icon auth-status-icon--ok">
                <svg style={{ width:32, height:32, color:'#16a34a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="auth-heading">Correo verificado</h1>
              <p className="auth-subtitle" style={{ marginBottom: 0 }}>Tu cuenta ha sido activada correctamente. Ya puedes iniciar sesión.</p>
              <button onClick={handleRedirect} className="auth-submit-btn auth-submit-btn--wide">Ir a iniciar sesión</button>
            </>
          )}

          {(status === 'error' || status === 'invalid') && (
            <>
              <div className="auth-status-icon auth-status-icon--err">
                <svg style={{ width:32, height:32, color:'#dc2626' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="auth-heading">Enlace inválido</h1>
              <p className="auth-subtitle" style={{ marginBottom: 0 }}>
                {status === 'invalid'
                  ? 'El enlace de verificación no contiene los datos necesarios.'
                  : 'El enlace es inválido o ya expiró. Solicita un nuevo correo de verificación.'}
              </p>
              <button onClick={handleRedirect} className="auth-outline-btn">Volver al inicio de sesión</button>
            </>
          )}

        </article>
      </section>
    </main>
  )
}
