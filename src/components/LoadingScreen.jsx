const LOGO_PATH = 'M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-8 2 4-4 8.5-4 8.5-4-8 3.5-9 6-9 6A8 8 0 0 1 17 8z'

export default function LoadingScreen() {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, display: 'flex',
      alignItems: 'center', justifyContent: 'center', background: '#fff',
    }}>
      <style>{`
        @keyframes ls-cw  { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes ls-ccw { from { transform: rotate(0deg) } to { transform: rotate(-360deg) } }
      `}</style>
      <div style={{ position: 'relative', width: 130, height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          position: 'absolute', borderRadius: '50%', width: 112, height: 112,
          border: '3px solid transparent', borderBottomColor: '#86efac', borderLeftColor: '#86efac',
          animation: 'ls-ccw 1.2s linear infinite',
        }} />
        <div style={{
          position: 'absolute', borderRadius: '50%', width: 76, height: 76,
          border: '3px solid transparent', borderTopColor: '#16a34a', borderRightColor: '#16a34a',
          animation: 'ls-cw 0.9s linear infinite',
        }} />
        <svg style={{ position: 'relative', zIndex: 2, width: 40, height: 40, fill: '#16a34a' }} viewBox="0 0 24 24">
          <path d={LOGO_PATH} />
        </svg>
      </div>
    </div>
  )
}
