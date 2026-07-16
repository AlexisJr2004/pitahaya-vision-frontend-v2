import AppLogo from '../../../components/AppLogo'

const getSevColors = (sev) => {
  const s = (sev || '').toLowerCase()
  if (s.includes('crít') || s.includes('critic')) return { bg: '#fef2f2', border: '#fecaca', text: '#b91c1c', dot: '#ef4444' }
  if (s.includes('alta') || s.includes('high') || s.includes('grave')) return { bg: '#fff7ed', border: '#fed7aa', text: '#c2410c', dot: '#f97316' }
  if (s.includes('media') || s.includes('moder')) return { bg: '#fffbeb', border: '#fde68a', text: '#92400e', dot: '#f59e0b' }
  if (s.includes('baja') || s.includes('low') || s.includes('leve')) return { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', dot: '#22c55e' }
  if (s.includes('sana') || s.includes('health') || s.includes('normal') || s.includes('ninguna')) return { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', dot: '#22c55e' }
  return { bg: '#f8fafc', border: '#e2e8f0', text: '#475569', dot: '#94a3b8' }
}

export default function AnalysisCard({ cardData }) {
  const sev = getSevColors(cardData.severity)
  const confNum = Math.min(100, parseFloat(cardData.confidence) || 0)

  return (
    <div className="animate-fade-up" style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
      <div className="brand-avatar" style={{ width: 30, height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2, boxShadow: '0 2px 8px rgba(22,163,74,.2)' }}>
        <AppLogo size={14} style={{ fill: '#fff' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0, maxWidth: 360 }}>
        <div style={{ border: '1px solid #eef2f7', borderRadius: 22, background: '#fff', overflow: 'hidden' }}>
          <div style={{ borderBottom: '1px solid #eef2f7', padding: '0.62rem 1rem', display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <div className="brand-avatar" style={{ width: 22, height: 22, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg style={{ width: 11, height: 11, fill: '#fff' }} viewBox="0 0 24 24"><path d="M9.5 2A7.5 7.5 0 0 1 17 9.5c0 2.11-.87 4.02-2.28 5.39l.28.61H17l4 4-1.5 1.5-4-4v-1.5l-.61-.28A7.47 7.47 0 0 1 9.5 17 7.5 7.5 0 0 1 2 9.5 7.5 7.5 0 0 1 9.5 2m0 2A5.5 5.5 0 0 0 4 9.5 5.5 5.5 0 0 0 9.5 15 5.5 5.5 0 0 0 15 9.5 5.5 5.5 0 0 0 9.5 4z"/></svg>
            </div>
            <span className="context-section-title" style={{ lineHeight: 1 }}>Pitahaya Vision · Análisis</span>
            <span className="context-badge" style={{ marginLeft: 'auto' }}>Completado</span>
          </div>
          <div style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <div>
              <p style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#64748b', margin: '0 0 0.2rem' }}>Enfermedad detectada</p>
              <p style={{ fontSize: '0.92rem', fontWeight: 600, color: '#0f172a', lineHeight: 1.4, margin: 0 }}>{cardData.disease}</p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#64748b', margin: '0 0 0.38rem' }}>Severidad</p>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', borderRadius: 9999, border: `1px solid ${sev.border}`, background: sev.bg, color: sev.text, padding: '0.26rem 0.6rem', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: sev.dot, flexShrink: 0 }}></span>
                  {cardData.severity}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <p style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#64748b', margin: '0 0 0.38rem' }}>Confianza del modelo</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ height: 6, background: 'linear-gradient(90deg, #16a34a, #22c55e)', borderRadius: 999, width: `${confNum}%`, transition: 'width .7s ease' }}></div>
                  </div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums', minWidth: '2.6rem', textAlign: 'right' }}>{cardData.confidence}%</span>
                </div>
              </div>
            </div>
            {cardData.recs && (
              <div style={{ borderTop: '1px dashed #dcfce7', paddingTop: '0.7rem' }}>
                <p style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#64748b', margin: '0 0 0.25rem' }}>Observación del modelo</p>
                <p style={{ fontSize: '0.81rem', color: '#475569', lineHeight: 1.55, margin: 0 }}>{cardData.recs}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
