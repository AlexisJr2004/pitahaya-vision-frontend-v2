import AppLogo from './AppLogo'

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
        <AppLogo size={40} style={{ position: 'relative', zIndex: 2, fill: '#16a34a' }} />
      </div>
    </div>
  )
}
