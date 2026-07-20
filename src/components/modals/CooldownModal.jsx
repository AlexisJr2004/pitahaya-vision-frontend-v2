import { useState, useEffect, useCallback } from 'react'
import { getRemainingSeconds, getCooldownType, clearCooldown } from '../../utils/cooldown'
import './modals.css'

export default function CooldownModal({ onComplete, type: propType }) {
  const type = propType || getCooldownType()
  const [remaining, setRemaining] = useState(getRemainingSeconds)

  const finish = useCallback(() => {
    clearCooldown()
    onComplete?.()
  }, [onComplete])

  useEffect(() => {
    if (remaining <= 0) {
      finish()
      return
    }
    const id = setInterval(() => {
      const r = getRemainingSeconds()
      setRemaining(r)
      if (r <= 0) {
        clearInterval(id)
        finish()
      }
    }, 1000)
    return () => clearInterval(id)
  }, [remaining, finish])

  if (remaining <= 0) return null

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const timeStr = minutes > 0
    ? `${minutes}:${String(seconds).padStart(2, '0')}`
    : `${seconds}s`

  const isLockout = type === 'lockout'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '2rem',
        maxWidth: 400, width: '90%', textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        animation: 'modalPopIn .4s cubic-bezier(.22,1,.36,1)',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: isLockout ? '#fff7ed' : '#fef2f2',
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', margin: '0 auto 1rem',
        }}>
          <svg style={{ width: 28, height: 28, color: isLockout ? '#ea580c' : '#dc2626' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isLockout ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m0 0v2m0-2h2m-2 0H10m9.364-11.364A9 9 0 1112 3a9 9 0 017.364 4.636z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            )}
          </svg>
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '.5rem' }}>
          {isLockout ? 'Cuenta bloqueada temporalmente' : 'Demasiados intentos'}
        </h2>
        <p style={{ fontSize: '.875rem', color: '#6b7280', marginBottom: '1.5rem' }}>
          {isLockout
            ? 'Has superado el número máximo de intentos fallidos. La cuenta ha sido bloqueada por seguridad. No podrás iniciar sesión hasta que termine el bloqueo.'
            : 'Has realizado demasiados intentos. Por favor, espera antes de intentar de nuevo.'}
        </p>
        <div style={{
          fontSize: '3rem', fontWeight: 700, color: isLockout ? '#ea580c' : '#dc2626',
          fontVariantNumeric: 'tabular-nums', marginBottom: '1rem',
        }}>
          {timeStr}
        </div>
        <p style={{ fontSize: '.75rem', color: '#9ca3af' }}>
          {isLockout ? 'La cuenta se desbloqueará automáticamente.' : 'La página se desbloqueará automáticamente.'}
        </p>
      </div>
    </div>
  )
}
