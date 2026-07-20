import './modals.css'

export default function SuccessModal({ message, onReload }) {
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
          background: '#f0fdf4', display: 'flex', alignItems: 'center',
          justifyContent: 'center', margin: '0 auto 1rem',
        }}>
          <svg style={{ width: 28, height: 28, color: '#16a34a' }} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '.5rem' }}>
          Operación exitosa
        </h2>
        <p style={{ fontSize: '.875rem', color: '#6b7280', marginBottom: '1.5rem' }}>
          {message}
        </p>
        <button onClick={onReload} style={{
          padding: '.7rem 1.5rem', borderRadius: 12, border: 'none',
          background: 'linear-gradient(135deg,#16a34a,#22c55e)',
          color: '#fff', fontSize: '.9rem', fontWeight: 700,
          cursor: 'pointer', transition: 'transform .14s',
          boxShadow: '0 8px 20px rgba(22,163,74,.25)',
        }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseLeave={e => e.currentTarget.style.transform = ''}>
          Recargar página
        </button>
      </div>
    </div>
  )
}
