import { useState, useEffect, useMemo, useRef } from 'react'
import { Chart, BarController, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js'
Chart.register(BarController, CategoryScale, LinearScale, BarElement, Tooltip)
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.heat'
import { getAnalyses } from '../services/analysisService'
import AIAnalysisPanel from '../components/AIAnalysisPanel'
import DashboardReportPDF from '../components/DashboardReportPDF'

const toArr = (d) => Array.isArray(d) ? d : (d?.results ?? [])

/* ── Severity helpers (same logic as HistorialAdminPage) ── */
function computeSev(a) {
  const status  = (a.severity || '').toLowerCase()
  const disease = (a.disease_name_predicted || '').toLowerCase()
  if (status === 'sana' || disease.includes('sana'))  return { bucket: 'low',      label: 'Baja'    }
  if (disease.includes('pudric'))                      return { bucket: 'critical',  label: 'Crítica' }
  if (disease.includes('cancro') || disease.includes('tiz') || disease.includes('antrac'))
                                                       return { bucket: 'high',     label: 'Alta'    }
  if (disease.includes('mancha'))                      return { bucket: 'medium',   label: 'Media'   }
  const conf = a.confidence_percent ?? 0
  if (conf >= 75)  return { bucket: 'high',   label: 'Alta'   }
                   return { bucket: 'medium', label: 'Media'  }
}

function isRisk(a) {
  const b = computeSev(a).bucket
  return b === 'critical' || b === 'high' || b === 'medium'
}

function sevPillClass(bucket) {
  if (bucket === 'critical') return 'da-sev-critical'
  if (bucket === 'high')     return 'da-sev-high'
  if (bucket === 'medium')   return 'da-sev-medium'
  return 'da-sev-low'
}

function fmtShort(s) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })
}

function fmtFull(s) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/* ── SVG Donut (sanas vs en riesgo) ── */
function HealthDonut({ sanas, sick, size = 200, thickness = 36 }) {
  const r     = (size - thickness) / 2
  const circ  = 2 * Math.PI * r
  const total = (sanas + sick) || 1
  const hDash = (sanas / total) * circ
  const sDash = (sick  / total) * circ
  const cx = size / 2, cy = size / 2

  if (total === 0) return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={thickness} />
    </svg>
  )
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={thickness} />
      {sanas > 0 && (
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#22c55e" strokeWidth={thickness}
          strokeDasharray={`${hDash} ${circ - hDash}`} strokeDashoffset={0} strokeLinecap="butt" />
      )}
      {sick > 0 && (
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ef4444" strokeWidth={thickness}
          strokeDasharray={`${sDash} ${circ - sDash}`} strokeDashoffset={-hDash} strokeLinecap="butt" />
      )}
    </svg>
  )
}

/* ── SVG Mini Line Chart ── */
function TrendLine({ data }) {
  if (!data.length) {
    return <div className="flex items-center justify-center h-full text-slate-400 text-sm">Sin datos</div>
  }
  const W = 300, H = 110, PX = 16, PY = 16
  const max = Math.max(...data.map(d => d.value), 1)
  const pts = data.map((d, i) => ({
    x: PX + (i / Math.max(data.length - 1, 1)) * (W - PX * 2),
    y: PY + (1 - d.value / max) * (H - PY * 2),
    ...d,
  }))
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const area = `${line} L${pts[pts.length - 1].x.toFixed(1)},${H - PY} L${pts[0].x.toFixed(1)},${H - PY} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full overflow-visible">
      <defs>
        <linearGradient id="da-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#16a34a" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#da-grad)" />
      <path d={line} fill="none" stroke="#16a34a" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#16a34a" stroke="#fff" strokeWidth="1.5" />
      ))}
      {pts.map((p, i) => (
        <text key={`t${i}`} x={p.x} y={H - 2} textAnchor="middle" fontSize="8" fill="#94a3b8">{p.label}</text>
      ))}
    </svg>
  )
}


/* ── Leaflet heatmap de la finca ── */
function FarmHeatmap({ analyses }) {
  const mapRef  = useRef(null)
  const tileRef = useRef(null)
  const heatRef = useRef(null)

  // Puntos con coordenadas válidas: [lat, lon, intensidad]
  const points = useMemo(() => {
    return analyses
      .filter(a => a.latitude != null && a.longitude != null)
      .map(a => {
        const bucket = (() => {
          const s = (a.severity || '').toLowerCase()
          const d = (a.disease_name_predicted || '').toLowerCase()
          if (s === 'sana' || d.includes('sana')) return 0.2
          if (d.includes('pudric')) return 1.0
          if (d.includes('cancro') || d.includes('tiz') || d.includes('antrac')) return 0.8
          if (d.includes('mancha')) return 0.5
          return 0.6
        })()
        return [a.latitude, a.longitude, bucket]
      })
  }, [analyses])

  const center = useMemo(() => {
    if (!points.length) return [-1.8312, -78.1834] // Ecuador centro
    const lat = points.reduce((s, p) => s + p[0], 0) / points.length
    const lon = points.reduce((s, p) => s + p[1], 0) / points.length
    return [lat, lon]
  }, [points])

  useEffect(() => {
    if (!mapRef.current) return

    // Inicializar mapa solo una vez
    if (!tileRef.current) {
      tileRef.current = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: false })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(tileRef.current)
    }

    const map = tileRef.current
    map.setView(center, points.length ? 15 : 7)

    // Actualizar capa de calor
    if (heatRef.current) { map.removeLayer(heatRef.current); heatRef.current = null }

    if (points.length) {
      heatRef.current = L.heatLayer(points, {
        radius: 35,
        blur: 25,
        maxZoom: 18,
        max: 1.0,
        gradient: { 0.2: '#22c55e', 0.4: '#86efac', 0.6: '#fbbf24', 0.8: '#f97316', 1.0: '#ef4444' },
      }).addTo(map)

      // Marcadores con popup por cada punto
      analyses
        .filter(a => a.latitude != null && a.longitude != null)
        .forEach(a => {
          const sev   = (a.severity || '').toLowerCase()
          const isRisk = !sev.includes('sana')
          const color = isRisk ? '#ef4444' : '#22c55e'
          const icon = L.divIcon({
            className: '',
            html: `<div style="width:10px;height:10px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 4px rgba(0,0,0,.3)"></div>`,
            iconSize: [10, 10],
            iconAnchor: [5, 5],
          })
          L.marker([a.latitude, a.longitude], { icon })
            .addTo(map)
            .bindPopup(`
              <div style="font-family:Inter,sans-serif;min-width:160px">
                <p style="font-weight:600;font-size:.85rem;margin:0 0 4px">${a.disease_name_predicted || 'Análisis'}</p>
                <p style="font-size:.75rem;color:#64748b;margin:0">${a.owner_name || '—'}</p>
                <p style="font-size:.72rem;color:#94a3b8;margin:4px 0 0">${new Date(a.created_at).toLocaleDateString('es-EC')}</p>
              </div>
            `, { maxWidth: 220 })
        })

      const bounds = L.latLngBounds(points.map(p => [p[0], p[1]]))
      map.fitBounds(bounds, { padding: [40, 40] })
    }

    return () => {}
  }, [points, center])

  useEffect(() => {
    return () => {
      if (tileRef.current) { tileRef.current.remove(); tileRef.current = null }
      heatRef.current = null
    }
  }, [])

  if (!analyses.length) return null

  return (
    <div className="relative">
      <div ref={mapRef} style={{ height: 400, borderRadius: 20, overflow: 'hidden', zIndex: 0 }} />
      {points.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/90 rounded-[20px] gap-3">
          <div className="w-16 h-16 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center">
            <i className="fas fa-location-crosshairs text-brand-500 text-2xl"></i>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700">Sin puntos GPS registrados aún</p>
            <p className="text-xs text-slate-400 mt-1">Los próximos análisis capturarán la ubicación automáticamente</p>
          </div>
        </div>
      )}
      {/* Leyenda */}
      <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm rounded-xl px-3 py-2 shadow-md border border-slate-100 z-[1000]">
        <p className="text-[0.62rem] font-bold uppercase tracking-[0.1em] text-slate-500 mb-1.5">Intensidad</p>
        <div className="flex items-center gap-1.5">
          {[['#22c55e','Baja'],['#fbbf24','Media'],['#f97316','Alta'],['#ef4444','Crítica']].map(([c,l]) => (
            <div key={l} className="flex flex-col items-center gap-0.5">
              <span className="w-4 h-4 rounded-sm" style={{ background: c }}></span>
              <span className="text-[0.55rem] text-slate-500">{l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Chart.js horizontal bar — idéntico a admin.html symptomCanvas ── */
function HBarChart({ data }) {
  const canvasRef = useRef(null)
  const chartRef  = useRef(null)

  useEffect(() => {
    if (!canvasRef.current || !data.length) return
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: data.map(d => d.label),
        datasets: [{
          data: data.map(d => d.value),
          backgroundColor: 'rgba(220,38,38,0.85)',
          borderRadius: 10,
          barThickness: 22,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.x} casos` } } },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: '#f8fafc' },
            ticks: { color: '#64748b', precision: 0 },
          },
          y: {
            grid: { display: false },
            ticks: { color: '#0f172a' },
          },
        },
      },
    })
    return () => { chartRef.current?.destroy(); chartRef.current = null }
  }, [data])

  if (!data.length) return <div className="flex items-center justify-center h-full text-slate-400 text-sm">Sin datos suficientes.</div>
  return <canvas ref={canvasRef} />
}

export default function DashboardAdminPage() {
  const [analyses, setAnalyses] = useState([])
  const [loading, setLoading]   = useState(true)
  const [showPDF, setShowPDF] = useState(false)

  useEffect(() => {
    getAnalyses({ page_size: 200 })
      .then(d => setAnalyses(toArr(d)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  /* ── KPIs ── */
  const kpis = useMemo(() => {
    const total    = analyses.length
    const withImg  = analyses.filter(a => !!a.image_url).length
    const highRisk = analyses.filter(isRisk).length
    const diseases = {}
    analyses.forEach(a => {
      const d = a.disease_name_predicted || '—'
      diseases[d] = (diseases[d] || 0) + 1
    })
    const topDisease = Object.entries(diseases).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'
    const latest = analyses.length
      ? analyses.reduce((a, b) => new Date(a.created_at) > new Date(b.created_at) ? a : b)
      : null
    return { total, withImg, highRisk, topDisease, latest }
  }, [analyses])

  /* ── Sanas vs En riesgo ── */
  const health = useMemo(() => {
    const sick   = analyses.filter(isRisk).length
    const sanas  = analyses.length - sick
    const total  = analyses.length || 1
    return { sanas, sick, pctSanas: Math.round(sanas / total * 100), pctSick: Math.round(sick / total * 100) }
  }, [analyses])

  /* ── Top enfermedades (top 6) ── */
  const topDiseases = useMemo(() => {
    const map = {}
    analyses.forEach(a => {
      const d = a.disease_name_predicted || 'Desconocida'
      map[d] = (map[d] || 0) + 1
    })
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6)
    const max = sorted[0]?.[1] || 1
    return sorted.map(([label, value]) => ({ label, value, pct: Math.round(value / max * 100) }))
  }, [analyses])

  /* ── Top severidades ── */
  const sevTotals = useMemo(() => {
    const c = { critical: 0, high: 0, medium: 0, low: 0 }
    analyses.forEach(a => { c[computeSev(a).bucket]++ })
    const t = analyses.length || 1
    return [
      { label: 'Crítica',   count: c.critical, pct: Math.round(c.critical / t * 100), color: '#ef4444', bg: '#fef2f2' },
      { label: 'Alta',      count: c.high,     pct: Math.round(c.high     / t * 100), color: '#f97316', bg: '#fff7ed' },
      { label: 'Media',     count: c.medium,   pct: Math.round(c.medium   / t * 100), color: '#eab308', bg: '#fefce8' },
      { label: 'Saludable', count: c.low,      pct: Math.round(c.low      / t * 100), color: '#22c55e', bg: '#ecfdf5' },
    ]
  }, [analyses])

  /* ── Análisis por usuario (top 8) ── */
  const userCards = useMemo(() => {
    const map = {}
    analyses.forEach(a => {
      const u = a.owner_name || 'Sin nombre'
      if (!map[u]) map[u] = { name: u, email: a.owner_email || '', total: 0, alerts: 0, last: null }
      map[u].total++
      if (isRisk(a)) map[u].alerts++
      if (!map[u].last || new Date(a.created_at) > new Date(map[u].last)) map[u].last = a.created_at
    })
    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
      .map(u => ({ ...u, riskRate: u.total ? u.alerts / u.total : 0 }))
  }, [analyses])

  /* ── Timeline (últimos 8 días) ── */
  const timeline = useMemo(() => {
    const map = {}
    analyses.forEach(a => {
      const d = a.created_at?.slice(0, 10)
      if (d) map[d] = (map[d] || 0) + 1
    })
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-8)
      .map(([date, value]) => ({
        label: new Date(date + 'T12:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'short' }),
        value,
      }))
  }, [analyses])

  /* ── Alertas recientes ── */
  const recentAlerts = useMemo(() => {
    return analyses
      .filter(isRisk)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 4)
  }, [analyses])

  function riskColor(rate) {
    if (rate >= 0.7) return '#dc2626'
    if (rate >= 0.4) return '#ea580c'
    if (rate >= 0.15) return '#d97706'
    return '#16a34a'
  }
  function riskLabel(rate) {
    if (rate >= 0.7) return 'Crítica'
    if (rate >= 0.4) return 'Alta'
    if (rate >= 0.15) return 'Media'
    return 'Baja'
  }
  function riskPillBg(rate) {
    if (rate >= 0.7) return '#fef2f2'
    if (rate >= 0.4) return '#fff7ed'
    if (rate >= 0.15) return '#fefce8'
    return '#ecfdf5'
  }

  return (
    <>
      <style>{`
        .da-kpi { position:relative; overflow:hidden; border-radius:28px; border:1px solid rgba(226,232,240,0.9); background:linear-gradient(180deg,#ffffff 0%,#fbfdff 100%); }
        .da-card { border:1px solid rgba(226,232,240,0.9); border-radius:30px; background:#fff; }
        .da-panel-title { font-family:'Cormorant Garamond',serif; letter-spacing:-0.02em; }
        .da-sparkline { height:0.4rem; border-radius:9999px; background:linear-gradient(90deg,rgba(34,197,94,.1),rgba(34,197,94,.4)); }
        .da-muted { color:#64748b; }
        .da-fade { animation:daFade 0.3s ease-in-out; }
        @keyframes daFade { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .da-badge { display:inline-flex;align-items:center;gap:.35rem;border-radius:9999px;border:1px solid #dcfce7;background:#f0fdf4;color:#15803d;padding:.3rem .7rem;font-size:.68rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase; }
        .da-severity-pill { display:inline-flex;align-items:center;padding:.22rem .5rem;border-radius:9999px;font-size:.6rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase; }
        .da-sev-low      { background:#ecfdf5; color:#166534; }
        .da-sev-medium   { background:#fefce8; color:#a16207; }
        .da-sev-high     { background:#fff7ed; color:#c2410c; }
        .da-sev-critical { background:#fef2f2; color:#b91c1c; }
      `}</style>

      <section className="mb-10 da-fade space-y-6">

        {/* ── Header ── */}
        <header className="flex items-start justify-between flex-wrap gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-600 mb-2">Centro de control agrícola</p>
            <h2 className="da-panel-title text-3xl md:text-4xl font-semibold text-slate-900 leading-tight">
              Dashboard inteligente de análisis
            </h2>
            <p className="mt-3 text-sm md:text-base text-slate-500 leading-7">
              Los análisis históricos se consolidan aquí para mostrar salud del cultivo, enfermedades frecuentes y patrones de actividad en tiempo real.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="da-card px-4 py-3 min-w-[240px]">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-slate-400">Actualización reciente</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{kpis.latest ? fmtFull(kpis.latest.created_at) : 'Sin actividad reciente'}</p>
              <p className="mt-1 text-sm da-muted">{analyses.length} análisis · {kpis.withImg} con imagen</p>
            </div>
            <button
              onClick={() => setShowPDF(true)}
              disabled={loading || analyses.length === 0}
              title="Exportar reporte ejecutivo PDF"
              style={{ alignSelf:'flex-end', background:'transparent', border:'1.5px solid #f87171', borderRadius:'9999px', color:'#f87171', fontFamily:'Inter,sans-serif', fontSize:'0.82rem', fontWeight:600, padding:'0.45rem 1.2rem', cursor:'pointer', letterSpacing:'0.04em', transition:'background 0.15s,color 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background='#f87171'; e.currentTarget.style.color='#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#f87171' }}>
              Exportar PDF
            </button>
          </div>
        </header>

        {/* ── KPIs ── */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          <article className="da-kpi p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Registros consolidados</p>
                <p className="mt-2 text-4xl font-bold text-slate-900">{kpis.total}</p>
                <p className="mt-2 text-sm da-muted">Análisis históricos totales</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center border border-brand-100 flex-shrink-0">
                <i className="fas fa-chart-column text-brand-600 text-xl"></i>
              </div>
            </div>
            <div className="mt-5 da-sparkline"></div>
          </article>

          <article className="da-kpi p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Con imagen</p>
                <p className="mt-2 text-4xl font-bold text-emerald-700">{kpis.withImg}</p>
                <p className="mt-2 text-sm da-muted">Análisis con foto adjunta</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center border border-emerald-100 flex-shrink-0">
                <i className="fas fa-image text-emerald-600 text-xl"></i>
              </div>
            </div>
            <div className="mt-5 da-sparkline" style={{ background: 'linear-gradient(90deg,rgba(16,185,129,.1),rgba(16,185,129,.45))' }}></div>
          </article>

          <article className="da-kpi p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Alertas de riesgo</p>
                <p className="mt-2 text-4xl font-bold text-red-700">{kpis.highRisk}</p>
                <p className="mt-2 text-sm da-muted">Severidad media, alta o crítica</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center border border-red-100 flex-shrink-0">
                <i className="fas fa-triangle-exclamation text-red-600 text-xl"></i>
              </div>
            </div>
            <div className="mt-5 da-sparkline" style={{ background: 'linear-gradient(90deg,rgba(239,68,68,.1),rgba(239,68,68,.45))' }}></div>
          </article>

          <article className="da-kpi p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Enfermedad frecuente</p>
                <p className="mt-2 text-lg font-bold text-slate-900 truncate">{kpis.topDisease}</p>
                <p className="mt-2 text-sm da-muted">Diagnóstico más repetido</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center border border-amber-100 flex-shrink-0">
                <i className="fas fa-bug text-amber-600 text-xl"></i>
              </div>
            </div>
            <div className="mt-5 da-sparkline" style={{ background: 'linear-gradient(90deg,rgba(234,179,8,.1),rgba(234,179,8,.45))' }}></div>
          </article>
        </section>

        {/* ── Row 1: Donut + Top enfermedades ── */}
        <section className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">

          {/* Sanas vs En riesgo */}
          <article className="da-card p-6">
            <header className="flex items-start justify-between gap-4 mb-5">
              <hgroup>
                <p className="text-xs uppercase tracking-[0.25em] text-brand-600 font-semibold">Salud general</p>
                <h3 className="mt-1 da-panel-title text-2xl font-semibold text-slate-900">Plantas sanas vs. en riesgo</h3>
              </hgroup>
              <span className="da-badge"><i className="fas fa-chart-pie mr-1"></i>Distribución</span>
            </header>

            <section className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-6 items-center">
              <figure className="flex justify-center">
                <div className="relative">
                  <HealthDonut sanas={health.sanas} sick={health.sick} size={200} thickness={36} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="da-panel-title text-3xl font-bold text-slate-900">{health.pctSanas}%</span>
                    <span className="text-xs text-slate-500 font-medium">Sin alerta</span>
                  </div>
                </div>
              </figure>
              <div className="space-y-3">
                <article className="rounded-2xl border border-brand-100 bg-brand-50/50 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Sin alerta</p>
                  <div className="mt-1 flex items-end justify-between gap-3">
                    <span className="text-2xl font-semibold text-brand-700">{health.sanas}</span>
                    <span className="text-sm font-medium text-brand-600">{health.pctSanas}%</span>
                  </div>
                </article>
                <article className="rounded-2xl border border-red-100 bg-red-50/50 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">En riesgo</p>
                  <div className="mt-1 flex items-end justify-between gap-3">
                    <span className="text-2xl font-semibold text-red-700">{health.sick}</span>
                    <span className="text-sm font-medium text-red-600">{health.pctSick}%</span>
                  </div>
                </article>
                <article className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Impacto operativo</p>
                  <p className="mt-1 text-sm text-slate-700 leading-relaxed">
                    {health.sick > 0
                      ? `${health.pctSick}% de los análisis presentan algún nivel de riesgo fitosanitario.`
                      : 'Todos los análisis muestran plantas saludables. Buen trabajo de monitoreo.'}
                  </p>
                </article>
              </div>
            </section>
          </article>

          {/* Top enfermedades — barras horizontales */}
          <article className="da-card p-6">
            <header className="flex items-start justify-between gap-4 mb-5">
              <hgroup>
                <p className="text-xs uppercase tracking-[0.25em] text-red-600 font-semibold">Tendencia clínica</p>
                <h3 className="mt-1 da-panel-title text-2xl font-semibold text-slate-900">Enfermedades más frecuentes</h3>
              </hgroup>
            </header>
            <figure className="relative h-72 w-full">
              <HBarChart data={topDiseases} />
            </figure>
          </article>
        </section>

        {/* ── Mapa de calor geográfico + Panel IA ── */}
        <article className="da-card p-6">
          {/* Cabecera completa */}
          <header className="flex items-center justify-between mb-5 gap-3 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-brand-600 font-semibold">Territorio</p>
              <h3 className="mt-1 da-panel-title text-2xl font-semibold text-slate-900">Mapa de calor de la finca</h3>
              <p className="mt-1 text-sm da-muted">Distribución geográfica de detecciones por severidad</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs px-2 py-1 bg-brand-50 text-brand-600 rounded-full border border-brand-100">
                {analyses.filter(a => a.latitude != null).length} puntos GPS
              </span>
              <span className="text-xs px-2 py-1 bg-slate-50 text-slate-600 rounded-full border border-slate-200">
                {analyses.length} análisis totales
              </span>
            </div>
          </header>

          {/* Layout 2 columnas: mapa (izquierda) + IA (derecha) */}
          <div className="grid grid-cols-1 xl:grid-cols-[3fr_2fr] gap-6 items-stretch">
            {/* Mapa */}
            <div className="min-w-0">
              <FarmHeatmap analyses={analyses} />
            </div>

            {/* Panel IA — misma altura que el mapa */}
            <div className="min-w-0 rounded-[22px] border border-slate-200 bg-white overflow-hidden" style={{ height: 400 }}>
              <AIAnalysisPanel
                analyses={analyses}
                buildSummary={() => {
                  const geoPoints = analyses.filter(a => a.latitude != null && a.longitude != null)
                  const sick = analyses.filter(a => (a.severity || '').toLowerCase() !== 'sana').length
                  const pctSick = analyses.length ? Math.round(sick / analyses.length * 100) : 0
                  const diseaseCounts = {}
                  analyses.forEach(a => { const d = a.disease_name_predicted || 'Desconocido'; diseaseCounts[d] = (diseaseCounts[d] || 0) + 1 })
                  const topDiseases = Object.entries(diseaseCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => `- ${name}: ${count} caso${count > 1 ? 's' : ''}`).join('\n')
                  const sevCounts = { Baja: 0, Media: 0, Alta: 0, Crítica: 0 }
                  analyses.forEach(a => {
                    const s = (a.severity || '').toLowerCase(); const d = (a.disease_name_predicted || '').toLowerCase()
                    if (s === 'sana' || d.includes('sana')) sevCounts.Baja++
                    else if (d.includes('pudric')) sevCounts.Crítica++
                    else if (d.includes('cancro') || d.includes('tiz') || d.includes('antrac')) sevCounts.Alta++
                    else if (d.includes('mancha')) sevCounts.Media++
                    else sevCounts.Alta++
                  })
                  return `Resumen del mapa de calor de la finca:\n- Total de análisis registrados: ${analyses.length}\n- Análisis con coordenadas GPS: ${geoPoints.length}\n- Plantas enfermas detectadas: ${sick} (${pctSick}%)\n- Distribución por severidad: Baja=${sevCounts.Baja}, Media=${sevCounts.Media}, Alta=${sevCounts.Alta}, Crítica=${sevCounts.Crítica}\n\nEnfermedades más frecuentes:\n${topDiseases}\n${geoPoints.length === 0 ? '\nNota: Aún no hay puntos GPS registrados en el mapa.' : ''}`
                }}
                title="Diagnóstico fitosanitario"
                buttonLabel="Analizar mapa"
                emptyText="Gemma 3 interpretará los patrones del mapa y entregará un reporte agronómico"
                showGeoStats={true}
              />
            </div>
          </div>
        </article>

        {/* ── Row 2: Usuarios + Línea de tendencia ── */}
        <section className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">

          {/* Análisis por usuario (reemplaza mapa de zonas) */}
          <article className="da-card p-6">
            <header className="flex items-center justify-between mb-4 gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-brand-600 font-semibold">Usuarios</p>
                <h3 className="mt-1 da-panel-title text-2xl font-semibold text-slate-900">Actividad por cliente</h3>
              </div>
              <span className="text-xs px-2 py-1 bg-brand-50 text-brand-600 rounded-full border border-brand-100">
                {userCards.length} usuarios activos
              </span>
            </header>
            {userCards.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">Sin datos de usuarios.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {userCards.map((u, i) => {
                  const color = riskColor(u.riskRate)
                  const ring  = u.riskRate >= 0.4 ? 'rgba(220,38,38,.14)' : u.riskRate >= 0.15 ? 'rgba(217,119,6,.14)' : 'rgba(22,163,74,.14)'
                  return (
                    <article key={i} className="rounded-3xl border border-slate-200 bg-white p-3 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[0.68rem] uppercase tracking-[0.18em] text-slate-400">Usuario {i + 1}</p>
                          <h4 className="mt-1 text-sm font-semibold text-slate-900 leading-tight truncate">{u.name}</h4>
                        </div>
                        <span className="px-2 py-1 rounded-full text-[0.6rem] font-bold uppercase flex-shrink-0"
                          style={{ background: riskPillBg(u.riskRate), color }}>
                          {riskLabel(u.riskRate)}
                        </span>
                      </div>
                      <div className="mt-3 rounded-2xl p-3"
                        style={{ background: `linear-gradient(180deg,${ring} 0%,rgba(255,255,255,1) 100%)` }}>
                        <div className="flex items-end justify-between gap-2">
                          <div>
                            <p className="text-[0.65rem] uppercase tracking-[0.16em] text-slate-500">Análisis</p>
                            <p className="text-xl font-bold text-slate-900">{u.total}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[0.65rem] uppercase tracking-[0.16em] text-slate-500">Alertas</p>
                            <p className="text-lg font-semibold" style={{ color }}>{u.alerts}</p>
                          </div>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-white/70 overflow-hidden border border-white/80">
                          <span className="block h-full rounded-full"
                            style={{ width: `${Math.max(6, Math.round(u.riskRate * 100))}%`, background: color }}></span>
                        </div>
                        <p className="mt-1 text-[0.68rem] text-slate-400">Último: {fmtShort(u.last)}</p>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </article>

          {/* Registro por día */}
          <article className="da-card p-6">
            <header className="flex items-center justify-between mb-4 gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500 font-semibold">Actividad</p>
                <h3 className="mt-1 da-panel-title text-2xl font-semibold text-slate-900">Registro por día</h3>
              </div>
              <span className="text-xs px-2 py-1 bg-slate-50 text-slate-600 rounded-full border border-slate-200">Últimos eventos</span>
            </header>
            <figure className="h-40 w-full mb-4">
              <TrendLine data={timeline} />
            </figure>
            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Último registro</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{kpis.latest?.owner_name || 'Sin actividad'}</p>
                <p className="text-xs text-slate-500 mt-1 truncate">{kpis.latest?.disease_name_predicted || 'Aún no hay datos cargados'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Lectura rápida</p>
                <p className="mt-1 text-sm text-slate-700 leading-relaxed">
                  {analyses.length > 0
                    ? `Se han registrado ${analyses.length} análisis. ${kpis.withImg} cuentan con imagen adjunta para diagnóstico visual.`
                    : 'Cuando los usuarios realicen análisis, aquí verás el historial de actividad diaria.'}
                </p>
              </div>
            </div>
          </article>
        </section>

        {/* ── Row 3: Distribución de severidad + Alertas recientes ── */}
        <section className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6 mb-8">

          {/* Distribución de severidad */}
          <article className="da-card p-6">
            <header className="flex items-center justify-between mb-4 gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500 font-semibold">Distribución clínica</p>
                <h3 className="mt-1 da-panel-title text-2xl font-semibold text-slate-900">Severidad de los análisis</h3>
              </div>
              <span className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded-full border border-red-100">Niveles</span>
            </header>
            {analyses.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">Sin datos.</p>
            ) : (
              <ul className="space-y-3 list-none p-0 m-0">
                {sevTotals.map((s, i) => (
                  <li key={i} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }}></span>
                        <p className="text-sm font-semibold text-slate-900">{s.label}</p>
                      </div>
                      <span className="text-xs font-semibold text-slate-500">{s.count} · {s.pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <span className="block h-full rounded-full transition-all"
                        style={{ width: `${Math.max(4, s.pct)}%`, background: s.color }}></span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>

          {/* Alertas recientes */}
          <article className="da-card p-6">
            <header className="flex items-center justify-between mb-4 gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500 font-semibold">Alertas recientes</p>
                <h3 className="mt-1 da-panel-title text-2xl font-semibold text-slate-900">Lo que merece atención hoy</h3>
              </div>
            </header>
            {recentAlerts.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                No hay alertas relevantes registradas.
              </div>
            ) : (
              <ul className="space-y-3 list-none p-0 m-0">
                {recentAlerts.map((a, i) => {
                  const s = computeSev(a)
                  const isHigh = s.bucket === 'critical' || s.bucket === 'high'
                  return (
                    <li key={a.id ?? i}>
                      <article className="flex items-start gap-3 rounded-3xl border border-slate-200 bg-white p-4 hover:border-brand-200 hover:shadow-sm transition-shadow">
                        <figure className="mt-0.5 w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                          style={{ background: isHigh ? '#fef2f2' : '#fefce8', color: isHigh ? '#dc2626' : '#d97706' }}>
                          <i className={`fas ${isHigh ? 'fa-triangle-exclamation' : 'fa-circle-exclamation'}`}></i>
                        </figure>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-semibold text-slate-900 truncate">{a.disease_name_predicted || '—'}</h4>
                          <p className="text-xs text-slate-500 mt-1">{a.owner_name || '—'}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{fmtShort(a.created_at)}</p>
                        </div>
                        <span className={`da-severity-pill ${sevPillClass(s.bucket)} flex-shrink-0`}>{s.label}</span>
                      </article>
                    </li>
                  )
                })}
              </ul>
            )}
          </article>
        </section>

      </section>

      <DashboardReportPDF
        isOpen={showPDF}
        onClose={() => setShowPDF(false)}
        mode="admin"
        data={{ kpis, health, topDiseases, sevTotals, userCards, timeline }}
      />
    </>
  )
}
