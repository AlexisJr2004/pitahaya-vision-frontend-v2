import AppLogo from '../../../components/AppLogo'
import { severityBucket } from '../../../utils/severity'
import '../../../components/modals/modals.css'
import '../ChatbotPage.css'

// Paleta propia de esta tarjeta, pero la clasificación (qué texto cuenta como
// "alta"/"crítica"/etc.) viene de utils/severity.js para que coincida con el
// resto de la app en vez de tener su propio criterio.
const SEV_COLOR_MAP = {
  critical: { bg: '#fef2f2', border: '#fecaca', text: '#b91c1c', dot: '#ef4444' },
  high:     { bg: '#fff7ed', border: '#fed7aa', text: '#c2410c', dot: '#f97316' },
  medium:   { bg: '#fffbeb', border: '#fde68a', text: '#92400e', dot: '#f59e0b' },
  low:      { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', dot: '#22c55e' },
}
const getSevColors = (sev) => SEV_COLOR_MAP[severityBucket(sev)]

export default function AnalysisCard({ cardData }) {
  const sev = getSevColors(cardData.severity)
  const confNum = Math.min(100, parseFloat(cardData.confidence) || 0)

  return (
    <div className="animate-fade-up ac-row">
      <div className="brand-avatar ac-avatar">
        <AppLogo size={14} style={{ fill: '#fff' }} />
      </div>
      <div className="ac-body">
        <div className="ac-card">
          <div className="ac-card-header">
            <div className="brand-avatar ac-icon-badge">
              <svg className="ac-icon-svg" viewBox="0 0 24 24"><path d="M9.5 2A7.5 7.5 0 0 1 17 9.5c0 2.11-.87 4.02-2.28 5.39l.28.61H17l4 4-1.5 1.5-4-4v-1.5l-.61-.28A7.47 7.47 0 0 1 9.5 17 7.5 7.5 0 0 1 2 9.5 7.5 7.5 0 0 1 9.5 2m0 2A5.5 5.5 0 0 0 4 9.5 5.5 5.5 0 0 0 9.5 15 5.5 5.5 0 0 0 15 9.5 5.5 5.5 0 0 0 9.5 4z"/></svg>
            </div>
            <span className="context-section-title" style={{ lineHeight: 1 }}>Pitahaya Vision · Análisis</span>
            <span className="context-badge" style={{ marginLeft: 'auto' }}>Completado</span>
          </div>
          <div className="ac-card-body">
            <div>
              <p className="ac-label ac-label--tight">Enfermedad detectada</p>
              <p className="ac-disease">{cardData.disease}</p>
            </div>
            <div className="ac-meta-row">
              <div>
                <p className="ac-label">Severidad</p>
                <span className="ac-sev-pill" style={{ border: `1px solid ${sev.border}`, background: sev.bg, color: sev.text }}>
                  <span className="ac-sev-dot" style={{ background: sev.dot }}></span>
                  {cardData.severity}
                </span>
              </div>
              <div className="ac-conf-col">
                <p className="ac-label">Confianza del modelo</p>
                <div className="ac-conf-row">
                  <div className="ac-conf-track">
                    <div className="ac-conf-fill" style={{ width: `${confNum}%` }}></div>
                  </div>
                  <span className="ac-conf-value">{cardData.confidence}%</span>
                </div>
              </div>
            </div>
            {cardData.recs && (
              <div className="ac-recs">
                <p className="ac-label ac-label--sm">Observación del modelo</p>
                <p className="ac-recs-text">{cardData.recs}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
