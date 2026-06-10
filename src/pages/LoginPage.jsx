import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { login, loading } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await login(form)
      navigate('/', { replace: true })
    } catch (err) {
      const msg =
        err.response?.data?.non_field_errors?.[0] ||
        err.response?.data?.detail ||
        'Error al iniciar sesión'
      setError(msg)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }

        @keyframes fadeUp {
          0% { opacity: 0; transform: translateY(22px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
        .fade-up    { animation: fadeUp 0.65s cubic-bezier(0.22,1,0.36,1) both; }
        .fade-up-d1 { animation: fadeUp 0.7s  cubic-bezier(0.22,1,0.36,1) both; }
        .fade-up-d2 { animation: fadeUp 0.7s  0.12s cubic-bezier(0.22,1,0.36,1) both; }
        .fade-up-d3 { animation: fadeUp 0.85s 0.25s cubic-bezier(0.22,1,0.36,1) both; }

        .main-grid  { grid-template-columns: 1fr; }
        .right-panel,
        .wave-line,
        .glow-desk  { display: none; }
        @media (min-width: 1024px) {
          .main-grid  { grid-template-columns: 1fr 1fr; }
          .right-panel,
          .wave-line,
          .glow-desk  { display: block; }
        }
      `}</style>

      <main
        className="main-grid"
        style={{
          display: 'grid',
          height: '100vh',
          width: '100vw',
          position: 'relative',
          background: '#fff',
          color: '#111827',
          overflow: 'hidden',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* ─── LEFT PANEL ─── */}
        <section
          style={{
            position: 'relative',
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem 2rem',
            background: '#fff',
            overflow: 'hidden',
            height: '100vh',
          }}
        >
          <div
            className="glow-desk"
            style={{
              position: 'absolute',
              right: '-8rem',
              top: '8%',
              width: 420,
              height: 420,
              borderRadius: '50%',
              pointerEvents: 'none',
              background:
                'radial-gradient(circle at center, rgba(187,247,208,.55) 0%, rgba(220,252,231,.35) 35%, rgba(255,255,255,0) 70%)',
            }}
            aria-hidden="true"
          />

          <div
            style={{
              position: 'absolute',
              top: '-5rem',
              right: '-5rem',
              width: '20rem',
              height: '20rem',
              borderRadius: '50%',
              pointerEvents: 'none',
              opacity: 0.6,
              background: 'radial-gradient(circle at center, #f0fdf4, transparent 70%)',
            }}
            aria-hidden="true"
          />

          <svg
            style={{
              position: 'absolute',
              bottom: '-0.75rem',
              left: '-0.75rem',
              width: '12rem',
              opacity: 0.3,
              pointerEvents: 'none',
            }}
            viewBox="0 0 220 280"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path d="M40 270 C 40 190, 80 160, 65 70" stroke="#16a34a" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M65 70 C 65 70, 20 50, 8 15" stroke="#16a34a" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            <path d="M65 70 C 65 70, 115 45, 130 8" stroke="#16a34a" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            <path d="M52 155 C 52 155, 8 142, -8 122" stroke="#16a34a" strokeWidth="1" fill="none" strokeLinecap="round" />
            <path d="M52 155 C 52 155, 96 130, 120 112" stroke="#16a34a" strokeWidth="1" fill="none" strokeLinecap="round" />
            <path d="M58 110 C 58 110, 16 94, 0 76" stroke="#16a34a" strokeWidth=".9" fill="none" strokeLinecap="round" />
            <path d="M58 110 C 58 110, 98 88, 122 72" stroke="#16a34a" strokeWidth=".9" fill="none" strokeLinecap="round" />
            <ellipse cx="130" cy="8" rx="13" ry="7.5" fill="#16a34a" opacity=".55" transform="rotate(-30 130 8)" />
            <ellipse cx="-8" cy="122" rx="11" ry="6" fill="#16a34a" opacity=".55" transform="rotate(20 -8 122)" />
            <ellipse cx="120" cy="112" rx="12" ry="6.5" fill="#16a34a" opacity=".55" transform="rotate(-15 120 112)" />
            <ellipse cx="0" cy="76" rx="10" ry="5.5" fill="#16a34a" opacity=".45" transform="rotate(25 0 76)" />
            <ellipse cx="122" cy="72" rx="11" ry="6" fill="#16a34a" opacity=".45" transform="rotate(-20 122 72)" />
          </svg>

          <article
            className="fade-up"
            style={{
              position: 'relative',
              zIndex: 30,
              width: '100%',
              maxWidth: 448,
            }}
          >
            {/* Brand */}
            <header style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
              <figure
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  flexShrink: 0,
                }}
              >
                <svg style={{ width: 20, height: 20, fill: '#fff' }} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-8 2 4-4 8.5-4 8.5-4-8 3.5-9 6-9 6A8 8 0 0 1 17 8z" />
                </svg>
              </figure>
              <span
                style={{
                  fontFamily: '"Cormorant Garamond", serif',
                  fontSize: '1.5rem',
                  fontWeight: 600,
                  color: '#111827',
                }}
              >
                Pitahaya Vision
              </span>
            </header>

            {/* Eyebrow + heading */}
            <p
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#16a34a',
                marginBottom: '0.5rem',
              }}
            >
              Sistema de diagnóstico inteligente
            </p>
            <h1
              style={{
                fontFamily: '"Cormorant Garamond", serif',
                fontSize: '2.25rem',
                fontWeight: 500,
                lineHeight: 1.2,
                color: '#111827',
                marginBottom: '0.5rem',
              }}
            >
              Bienvenido{' '}
              <em style={{ fontStyle: 'italic', color: '#16a34a' }}>de vuelta</em>
            </h1>
            <p
              style={{
                fontSize: '0.875rem',
                fontWeight: 300,
                color: '#6b7280',
                marginBottom: '1.25rem',
                lineHeight: 1.625,
              }}
            >
              Ingresa tus credenciales para acceder a tu espacio de trabajo.
            </p>

            {/* Error */}
            {error && (
              <div
                style={{
                  background: '#fef2f2',
                  color: '#dc2626',
                  padding: '0.75rem',
                  borderRadius: 8,
                  marginBottom: '1rem',
                  fontSize: '0.875rem',
                  textAlign: 'center',
                }}
              >
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {/* Username */}
              <div>
                <label
                  htmlFor="username"
                  style={{
                    display: 'block',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#374151',
                    marginBottom: '0.375rem',
                  }}
                >
                  Usuario
                </label>
                <div style={{ position: 'relative' }}>
                  <svg
                    style={{
                      position: 'absolute',
                      left: 14,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 14,
                      height: 14,
                      color: '#9ca3af',
                      pointerEvents: 'none',
                    }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    placeholder="Tu usuario"
                    autoComplete="username"
                    required
                    style={{
                      background: '#F2F4FB',
                      width: '100%',
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      padding: '0.625rem 1rem 0.625rem 2.5rem',
                      fontSize: '0.875rem',
                      color: '#111827',
                      outline: 'none',
                      transition: 'all 0.2s',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#16a34a'
                      e.target.style.boxShadow = '0 0 0 2px rgba(22,163,74,0.15)'
                      e.target.style.background = '#fff'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb'
                      e.target.style.boxShadow = 'none'
                      e.target.style.background = '#F2F4FB'
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  style={{
                    display: 'block',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#374151',
                    marginBottom: '0.375rem',
                  }}
                >
                  Contraseña
                </label>
                <div style={{ position: 'relative' }}>
                  <svg
                    style={{
                      position: 'absolute',
                      left: 14,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 14,
                      height: 14,
                      color: '#9ca3af',
                      pointerEvents: 'none',
                    }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    style={{
                      background: '#F2F4FB',
                      width: '100%',
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      padding: '0.625rem 2.5rem 0.625rem 2.5rem',
                      fontSize: '0.875rem',
                      color: '#111827',
                      outline: 'none',
                      transition: 'all 0.2s',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#16a34a'
                      e.target.style.boxShadow = '0 0 0 2px rgba(22,163,74,0.15)'
                      e.target.style.background = '#fff'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb'
                      e.target.style.boxShadow = 'none'
                      e.target.style.background = '#F2F4FB'
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#9ca3af',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      userSelect: 'none',
                      padding: 4,
                    }}
                  >
                    <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </span>
                </div>
              </div>

              {/* Forgot password */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-0.25rem' }}>
                <a
                  href="/recuperar-cuenta"
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#16a34a',
                    textDecoration: 'none',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={(e) => { e.target.style.color = '#15803d'; e.target.style.textDecoration = 'underline' }}
                  onMouseLeave={(e) => { e.target.style.color = '#16a34a'; e.target.style.textDecoration = 'none' }}
                >
                  ¿Olvidaste tu contraseña?
                </a>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  borderRadius: 8,
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  background: '#16a34a',
                  color: '#fff',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.target.style.background = '#15803d'
                    e.target.style.transform = 'translateY(-2px)'
                    e.target.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#16a34a'
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)'
                }}
              >
                {loading ? 'Ingresando…' : 'Iniciar sesión'}
              </button>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '1rem 0' }}>
                <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
                <span style={{ fontSize: '0.75rem', color: '#9ca3af', padding: '0 0.25rem', letterSpacing: '0.05em' }}>
                  o
                </span>
                <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
              </div>

              {/* Register */}
              <p style={{ textAlign: 'center', fontSize: '0.875rem', color: '#6b7280' }}>
                ¿No tienes una cuenta?&nbsp;
                <a
                  href="/registro"
                  style={{
                    fontWeight: 700,
                    color: '#16a34a',
                    textDecoration: 'none',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={(e) => { e.target.style.color = '#15803d' }}
                  onMouseLeave={(e) => { e.target.style.color = '#16a34a' }}
                >
                  Regístrate gratis
                </a>
              </p>
            </form>
          </article>
        </section>

        {/* ─── RIGHT PANEL ─── */}
        <aside
          className="right-panel"
          style={{
            position: 'relative',
            overflow: 'hidden',
            height: '100vh',
            zIndex: 0,
            background: '#0f3d1e',
          }}
        >
          <img
            src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?fm=jpg&q=80&w=2400&auto=format&fit=crop"
            alt="Campo agrícola"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />

          {/* Wave overlay on the left edge */}
          <svg
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: '100%',
              height: '100%',
              zIndex: 11,
              pointerEvents: 'none',
            }}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M 0,0 L 9,0 C 2,12 14,26 5,42 C -3,58 13,74 4,88 C 3,94 7,100 7,100 L 0,100 Z"
              fill="#fff"
            />
          </svg>

          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to right, rgba(15,61,30,0.52), rgba(15,61,30,0.20), rgba(15,61,30,0.48))',
              zIndex: 10,
            }}
          />

          {/* Stats pills */}
          <div
            style={{
              position: 'absolute',
              top: '1.5rem',
              right: '1.5rem',
              zIndex: 30,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              alignItems: 'flex-end',
            }}
          >
            <div
              className="fade-up-d1"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 16,
                padding: '0.75rem 1rem',
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#4ade80',
                  animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
                }}
              />
              <span style={{ fontSize: '0.75rem', color: '#fff', whiteSpace: 'nowrap' }}>
                <strong style={{ fontWeight: 600 }}>1,240</strong> cultivos monitoreados
              </span>
            </div>
            <div
              className="fade-up-d2"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 16,
                padding: '0.75rem 1rem',
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#4ade80',
                  animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
                }}
              />
              <span style={{ fontSize: '0.75rem', color: '#fff', whiteSpace: 'nowrap' }}>
                <strong style={{ fontWeight: 600 }}>98.4%</strong> disponibilidad del sistema
              </span>
            </div>
          </div>

          {/* Quote card */}
          <div
            className="fade-up-d3"
            style={{
              position: 'absolute',
              bottom: '1.5rem',
              left: '12%',
              right: '1.5rem',
              zIndex: 30,
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 16,
              padding: '1.25rem',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: '1.25rem',
                bottom: '1.25rem',
                width: 4,
                borderRadius: '0 4px 4px 0',
                background: '#22c55e',
              }}
            />
            <p
              style={{
                fontFamily: '"Cormorant Garamond", serif',
                fontSize: '1rem',
                fontStyle: 'italic',
                color: '#fff',
                lineHeight: 1.625,
                marginBottom: '0.75rem',
                paddingLeft: '0.5rem',
              }}
            >
              &ldquo;La tierra es el mayor patrimonio del agricultor. Pitahaya Vision la protege.&rdquo;
            </p>
            <footer style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingLeft: '0.5rem' }}>
              <figure
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: '1px solid rgba(255,255,255,0.3)',
                }}
              >
                <svg style={{ width: 16, height: 16, fill: '#fff' }} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-8 2 4-4 8.5-4 8.5-4-8 3.5-9 6-9 6A8 8 0 0 1 17 8z" />
                </svg>
              </figure>
              <figcaption>
                <strong style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#fff', lineHeight: 1.2 }}>
                  Plataforma Pitahaya Vision
                </strong>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
                  Gestión inteligente del diagnóstico
                </span>
              </figcaption>
            </footer>
          </div>
        </aside>

        {/* Wave accent line */}
        <svg
          className="wave-line"
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: '4rem',
            height: '100vh',
            zIndex: 20,
          }}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M 54.5,0 C 51,12 57,26 52.5,42 C 48.5,58 56.5,74 52,88 C 51.5,94 53.5,100 53.5,100"
            stroke="#16a34a"
            strokeWidth="1.5"
            fill="none"
            opacity=".35"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </main>
    </>
  )
}
