import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getAnalyses, getWeather } from '../services/analysisService'
import { getFarms, getPlantHistories } from '../services/chatbotService'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import 'leaflet.heat'
import DashboardReportPDF from '../components/DashboardReportPDF'
import AIAnalysisPanel from '../components/AIAnalysisPanel'

// ── helpers ───────────────────────────────────────────────────────────────────
function escapeHtml(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function computeSevBucket(h) {
  const sev     = (h.severity || '').toLowerCase()
  const disease = (h.disease_name_predicted || '').toLowerCase()
  if (sev === 'sana' || disease.includes('sana'))   return 0
  if (disease.includes('pudric'))                    return 4
  if (disease.includes('cancro') || disease.includes('tiz') || disease.includes('antrac')) return 3
  if (disease.includes('mancha'))                    return 2
  if (sev === 'enferma')                             return 2
  return 0
}
function computeSevLabel(h) { return riskLabelFromBucket(computeSevBucket(h)) }
function isHighRisk(h) { return computeSevBucket(h) >= 2 }
function riskLabelFromBucket(b) { return ['Sin riesgo', 'Baja', 'Moderada', 'Alta', 'Crítica'][b] ?? '—' }
function riskColorFromBucket(b) { return ['#16a34a', '#84cc16', '#d97706', '#ea580c', '#dc2626'][b] ?? '#94a3b8' }
function riskBgFromBucket(b) { return ['#f0fdf4', '#f7fee7', '#fff7ed', '#fff7ed', '#fef2f2'][b] ?? '#f8fafc' }
function formatDate(v) {
  if (!v) return '—'
  try { return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(v)) }
  catch { return '—' }
}

// ── Map tile layers ────────────────────────────────────────────────────────────
const TILE_LAYERS = {
  street:    { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '© OpenStreetMap contributors', subdomains: 'abc',  maxNativeZoom: 19, maxZoom: 21 },
  satellite: { url: 'https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', attribution: '© Google',                 subdomains: '0123', maxNativeZoom: 20, maxZoom: 21 },
  terrain:   { url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', attribution: '© OpenTopoMap contributors',    subdomains: 'abc',  maxNativeZoom: 17, maxZoom: 21 },
}

// ── SeverityBars ───────────────────────────────────────────────────────────────
function SeverityBars({ data }) {
  return (
    <div className="space-y-4">
      {data.map((d, i) => (
        <div key={i}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
              <span className="text-sm font-medium text-slate-700">{d.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold" style={{ color: d.color }}>{d.count}</span>
              <span className="text-xs text-slate-400 w-9 text-right">{d.pct}%</span>
            </div>
          </div>
          <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${d.count > 0 ? Math.max(d.pct, 3) : 0}%`, background: d.color, opacity: 0.82 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── DiseaseBarChart ─────────────────────────────────────────────────────────────
const CHART_COLORS = ['#16a34a', '#0284c7', '#ea580c', '#d97706', '#7c3aed', '#0d9488', '#db2777']
function DiseaseBarChart({ data, total }) {
  if (!data?.length) return null
  const max  = data[0].value || 1
  const W = 560, H = 260, padT = 24, padB = 90, padL = 32, padR = 8
  const chartW = W - padL - padR, chartH = H - padT - padB
  const barW = Math.max(Math.floor(chartW / data.length) - 10, 18)
  const step = chartW / data.length
  const gridVals = [0.25, 0.5, 0.75, 1.0]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block', overflow: 'visible' }}>
      <defs>
        {data.map((_, i) => (
          <linearGradient key={i} id={`dbc-${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity="1" />
            <stop offset="100%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity="0.65" />
          </linearGradient>
        ))}
      </defs>
      {gridVals.map((f, i) => {
        const y = padT + chartH - f * chartH
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#e2e8f0" strokeWidth={1} strokeDasharray="4,3" />
            <text x={padL - 5} y={y + 4} textAnchor="end" fontSize={9} fill="#94a3b8" fontFamily="Inter,sans-serif">{Math.round(max * f)}</text>
          </g>
        )
      })}
      <line x1={padL} y1={padT + chartH} x2={W - padR} y2={padT + chartH} stroke="#cbd5e1" strokeWidth={1.5} />
      {data.map((d, i) => {
        const barH = Math.max((d.value / max) * chartH, 4)
        const cx = padL + i * step + step / 2
        const x = cx - barW / 2
        const y = padT + chartH - barH
        const color = CHART_COLORS[i % CHART_COLORS.length]
        const pct = Math.round((d.value / (total || 1)) * 100)
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx={5} fill={`url(#dbc-${i})`} />
            <text x={cx} y={y - 14} textAnchor="middle" fontSize={10} fontWeight="700" fill="#334155" fontFamily="Inter,sans-serif">{d.value}</text>
            <text x={cx} y={y - 4} textAnchor="middle" fontSize={8.5} fill={color} fontFamily="Inter,sans-serif">{pct}%</text>
            <text transform={`translate(${cx}, ${padT + chartH + 8}) rotate(-40)`} textAnchor="end" fontSize={9.5} fill="#475569" fontFamily="Inter,sans-serif">{d.label}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ── SeverityTrendChart ─────────────────────────────────────────────────────────
function SeverityTrendChart({ data }) {
  if (!data?.length) return <div className="flex items-center justify-center h-56 text-slate-400 text-sm">Sin datos suficientes para mostrar tendencia</div>
  const W = 620, H = 240, PX = 22, PY = 18, PB = 24
  const chartH = H - PY - PB
  const pts = data.map((d, i) => ({
    x: PX + (i / Math.max(data.length - 1, 1)) * (W - PX * 2),
    y: PY + (1 - d.pctRisk / 100) * chartH,
    ...d,
  }))
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const area = `${line} L${pts[pts.length - 1].x.toFixed(1)},${PY + chartH} L${pts[0].x.toFixed(1)},${PY + chartH} Z`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id="sev-trend-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dc2626" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 25, 50, 75, 100].map(v => {
        const y = PY + (1 - v / 100) * chartH
        return (
          <g key={v}>
            <line x1={PX} y1={y} x2={W - PX} y2={y} stroke="#f1f5f9" strokeWidth={1} strokeDasharray="4,3" />
            <text x={PX - 4} y={y + 3} textAnchor="end" fontSize={8.5} fill="#94a3b8">{v}%</text>
          </g>
        )
      })}
      <path d={area} fill="url(#sev-trend-grad)" />
      <path d={line} fill="none" stroke="#dc2626" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={3.5} fill="#dc2626" stroke="#fff" strokeWidth="1.5" />
          <text x={p.x} y={H - 6} textAnchor="middle" fontSize={8} fill="#94a3b8">{p.label}</text>
        </g>
      ))}
    </svg>
  )
}

// ── ClimateCorrelationChart ─────────────────────────────────────────────────────
function ClimateCorrelationChart({ data }) {
  if (!data?.length) return <div className="flex items-center justify-center h-56 text-slate-400 text-sm">Aún no hay datos de clima para correlacionar</div>
  const W = 620, H = 240, PX = 22, PY = 18, PB = 24
  const chartH = H - PY - PB
  const step = (W - PX * 2) / data.length
  const maxRisk = Math.max(...data.map(d => d.riskCount), 1)
  const barW = Math.max(step - 2, 2)
  const linePts = data.map((d, i) => ({
    x: PX + i * step + step / 2,
    y: PY + (1 - d.riskCount / maxRisk) * chartH,
  }))
  const line = linePts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const labelEvery = Math.ceil(data.length / 8)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block', overflow: 'visible' }}>
      {data.map((d, i) => {
        const barH = (Math.min(d.humidity, 100) / 100) * chartH
        const x = PX + i * step
        const y = PY + chartH - barH
        return <rect key={i} x={x} y={y} width={barW} height={barH} rx={2} fill="#93c5fd" opacity={0.75} />
      })}
      <path d={line} fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {linePts.map((p, i) => (data[i].riskCount > 0 ? <circle key={i} cx={p.x} cy={p.y} r={3} fill="#dc2626" stroke="#fff" strokeWidth={1.2} /> : null))}
      {data.map((d, i) => (i % labelEvery === 0 ? (
        <text key={i} x={PX + i * step + step / 2} y={H - 6} textAnchor="middle" fontSize={8} fill="#94a3b8">
          {new Date(d.date + 'T12:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}
        </text>
      ) : null))}
    </svg>
  )
}

// ── ZoneCard ───────────────────────────────────────────────────────────────────
function ZoneCard({ zone, idx }) {
  const color = riskColorFromBucket(zone.maxBucket)
  const bg = riskBgFromBucket(zone.maxBucket)
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[0.68rem] uppercase tracking-[0.18em] text-slate-400">Corp. {idx + 1}</p>
          <h4 className="mt-1 text-sm font-semibold text-slate-900 leading-tight truncate">{zone.farmName}</h4>
        </div>
        <span className="px-2 py-1 rounded-full text-[0.62rem] font-bold uppercase tracking-[0.08em] flex-shrink-0" style={{ background: bg, color }}>
          {riskLabelFromBucket(zone.maxBucket)}
        </span>
      </div>
      <div className="mt-3 rounded-2xl p-3 min-h-[80px] flex flex-col justify-between" style={{ background: `linear-gradient(180deg, ${bg} 0%, #fff 100%)` }}>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[0.65rem] uppercase tracking-[0.16em] text-slate-500">Registros</p>
            <p className="text-2xl font-bold text-slate-900">{zone.total}</p>
          </div>
          <div className="text-right">
            <p className="text-[0.65rem] uppercase tracking-[0.16em] text-slate-500">Alertas</p>
            <p className="text-lg font-semibold" style={{ color }}>{zone.alerts}</p>
          </div>
        </div>
        <div className="mt-3 h-2 rounded-full bg-white/70 overflow-hidden border border-white/80">
          <span className="block h-full rounded-full" style={{ width: `${Math.max(6, zone.riskRate * 100)}%`, background: color }}></span>
        </div>
        {zone.topDisease && <p className="mt-2 text-[0.7rem] text-slate-500 truncate">Princ.: {zone.topDisease}</p>}
        <p className="mt-1 text-[0.68rem] text-slate-400">Últ. registro: {formatDate(zone.lastDate)}</p>
      </div>
    </article>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function DashboardView({ onOpenSidebar }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [analyses, setAnalyses] = useState([])
  const [farms, setFarms] = useState([])
  const [histories, setHistories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPDF, setShowPDF] = useState(false)

  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const contentRef = useRef(null)
  const tileLayerRef = useRef(null)
  const markerGroupRef = useRef(null)
  const heatLayerRef = useRef(null)

  const [mapLayer, setMapLayer] = useState('street')
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [showClusters, setShowClusters] = useState(false)
  const [mapSevFilter, setMapSevFilter] = useState(new Set([0, 1, 2, 3, 4]))
  const [selectedAnalysis, setSelectedAnalysis] = useState(null)

  const [climateWeather, setClimateWeather] = useState(null)
  const [climateError, setClimateError] = useState('')

  const displayName = user?.full_name || user?.username || 'Usuario'

  // ── load data ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const toArr = (d) => Array.isArray(d) ? d : (d?.results ?? [])
    Promise.allSettled([getAnalyses(), getFarms(), getPlantHistories()])
      .then(([ra, rf, rh]) => {
        setAnalyses(toArr(ra.value))
        setFarms(toArr(rf.value))
        setHistories(toArr(rh.value))
      })
      .finally(() => setLoading(false))
  }, [])

  // ── weather history (30 días, para correlación clima-enfermedad) ────────────
  useEffect(() => {
    if (!navigator.geolocation) { setClimateError('Tu navegador no permite obtener la ubicación.'); return }
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const data = await getWeather(coords.latitude, coords.longitude, 30)
          setClimateWeather(data)
        } catch { setClimateError('No se pudo obtener el historial de clima.') }
      },
      () => setClimateError('Activa la ubicación para ver la correlación con el clima.'),
      { timeout: 10000 }
    )
  }, [])

  // ── KPIs ─────────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const total = analyses.length
    const highRisk = histories.filter(h => isHighRisk(h)).length
    const farmSet = new Set(histories.map(h => h.context_detail?.farm_id).filter(Boolean))
    const healthy = Math.max(total - highRisk, 0)
    return { total, highRisk, healthy, farms: farmSet.size || farms.length }
  }, [analyses, farms, histories])

  // ── top diseases ──────────────────────────────────────────────────────────────
  const topDiseases = useMemo(() => {
    const map = new Map()
    histories.forEach(h => { const k = h.disease_name_predicted || 'Sin diagnóstico'; map.set(k, (map.get(k) || 0) + 1) })
    return Array.from(map.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 6)
  }, [histories])

  // ── farm zones ────────────────────────────────────────────────────────────────
  const farmZones = useMemo(() => {
    const map = new Map()
    histories.forEach(h => {
      const ctx = h.context_detail
      if (!ctx?.farm_id) return
      if (!map.has(ctx.farm_id)) map.set(ctx.farm_id, { farmId: ctx.farm_id, farmName: ctx.farm_name || 'Sin nombre', total: 0, alerts: 0, maxBucket: 0, diseases: new Map(), lastDate: null })
      const z = map.get(ctx.farm_id)
      z.total++
      const b = computeSevBucket(h)
      if (b >= 2) z.alerts++
      if (b > z.maxBucket) z.maxBucket = b
      const d = h.disease_name_predicted || ''
      if (d) z.diseases.set(d, (z.diseases.get(d) || 0) + 1)
      if (h.created_at && (!z.lastDate || new Date(h.created_at) > new Date(z.lastDate))) z.lastDate = h.created_at
    })
    return Array.from(map.values()).map(z => ({
      ...z,
      riskRate: z.total > 0 ? z.alerts / z.total : 0,
      topDisease: z.diseases.size > 0 ? [...z.diseases.entries()].sort((a, b) => b[1] - a[1])[0][0] : null,
    })).sort((a, b) => b.maxBucket - a.maxBucket || b.alerts - a.alerts)
  }, [histories])

  // ── recent alerts ─────────────────────────────────────────────────────────────
  const recentAlerts = useMemo(() =>
    histories.filter(h => isHighRisk(h))
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 6)
  , [histories])

  // ── severity distribution ─────────────────────────────────────────────────────
  const severityData = useMemo(() => {
    const buckets = [0, 0, 0, 0, 0]
    histories.forEach(h => { buckets[computeSevBucket(h)]++ })
    const total = histories.length || 1
    return [
      { label: 'Sin riesgo', count: buckets[0], pct: Math.round(buckets[0] / total * 100), color: '#16a34a' },
      { label: 'Baja',       count: buckets[1], pct: Math.round(buckets[1] / total * 100), color: '#84cc16' },
      { label: 'Moderada',   count: buckets[2], pct: Math.round(buckets[2] / total * 100), color: '#d97706' },
      { label: 'Alta',       count: buckets[3], pct: Math.round(buckets[3] / total * 100), color: '#ea580c' },
      { label: 'Crítica',    count: buckets[4], pct: Math.round(buckets[4] / total * 100), color: '#dc2626' },
    ]
  }, [histories])

  // ── monthly comparison ────────────────────────────────────────────────────────
  const monthComparison = useMemo(() => {
    const now = new Date()
    const thisM = now.getMonth(), thisY = now.getFullYear()
    const prevM = thisM === 0 ? 11 : thisM - 1
    const prevY = thisM === 0 ? thisY - 1 : thisY
    const inMonth = (h, m, y) => { const d = new Date(h.created_at); return d.getMonth() === m && d.getFullYear() === y }
    const topDis = arr => { const mp = new Map(); arr.forEach(h => { const k = h.disease_name_predicted || 'Sin diagnóstico'; mp.set(k, (mp.get(k) || 0) + 1) }); return [...mp.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '—' }
    const monthLbl = (m) => new Date(2024, m, 1).toLocaleDateString('es-EC', { month: 'long' })
    const cur = histories.filter(h => inMonth(h, thisM, thisY))
    const prev = histories.filter(h => inMonth(h, prevM, prevY))
    const delta = (a, b) => b === 0 ? null : Math.round(((a - b) / b) * 100)
    return {
      currentLabel: monthLbl(thisM),
      previousLabel: monthLbl(prevM),
      total:      { cur: cur.length,                      prev: prev.length,                      delta: delta(cur.length, prev.length) },
      risk:       { cur: cur.filter(isHighRisk).length,   prev: prev.filter(isHighRisk).length,   delta: delta(cur.filter(isHighRisk).length, prev.filter(isHighRisk).length) },
      topDisease: { cur: topDis(cur),                     prev: topDis(prev) },
    }
  }, [histories])

  // ── tendencia de severidad (últimas 10 semanas) ──────────────────────────────
  const severityTrend = useMemo(() => {
    const now = new Date()
    const weeks = []
    for (let i = 9; i >= 0; i--) {
      const end = new Date(now); end.setDate(now.getDate() - i * 7)
      const start = new Date(end); start.setDate(end.getDate() - 6)
      weeks.push({ start, end, label: `${start.getDate()}/${start.getMonth() + 1}` })
    }
    return weeks.map(w => {
      const inWeek = histories.filter(h => {
        const d = new Date(h.created_at)
        return d >= w.start && d <= new Date(w.end.getFullYear(), w.end.getMonth(), w.end.getDate(), 23, 59, 59)
      })
      const risk = inWeek.filter(isHighRisk).length
      const total = inWeek.length
      return { label: w.label, total, risk, pctRisk: total > 0 ? Math.round((risk / total) * 100) : 0 }
    })
  }, [histories])

  const severityTrendInsight = useMemo(() => {
    const withData = severityTrend.filter(w => w.total > 0)
    if (withData.length < 2) return null
    const firstHalf = withData.slice(0, Math.ceil(withData.length / 2))
    const secondHalf = withData.slice(Math.ceil(withData.length / 2))
    const avg = arr => arr.reduce((s, w) => s + w.pctRisk, 0) / arr.length
    const before = avg(firstHalf), after = avg(secondHalf)
    if (Math.abs(after - before) < 5) return { trend: 'Estable', color: '#64748b' }
    return after > before ? { trend: 'Empeorando', color: '#dc2626' } : { trend: 'Mejorando', color: '#16a34a' }
  }, [severityTrend])

  // ── correlación clima-enfermedad (últimos 30 días) ───────────────────────────
  const climateCorrelation = useMemo(() => {
    if (!climateWeather?.days?.length) return []
    return climateWeather.days.map(d => {
      const dayHistories = histories.filter(h => (h.created_at || '').startsWith(d.date))
      return { date: d.date, humidity: d.humidity, precip: d.precip, riskCount: dayHistories.filter(isHighRisk).length, total: dayHistories.length }
    })
  }, [climateWeather, histories])

  // ── reincidencia de enfermedades por planta ──────────────────────────────────
  const recurringDiseases = useMemo(() => {
    const byPlant = new Map()
    histories.forEach(h => {
      const key = h.plant_key
      if (!key) return
      if (!byPlant.has(key)) byPlant.set(key, [])
      byPlant.get(key).push(h)
    })
    const results = []
    byPlant.forEach(entries => {
      const byDisease = new Map()
      entries.forEach(h => {
        const d = h.disease_name_predicted || 'Sin diagnóstico'
        if (!byDisease.has(d)) byDisease.set(d, [])
        byDisease.get(d).push(h)
      })
      byDisease.forEach((occurrences, disease) => {
        if (occurrences.length < 2) return
        const sorted = [...occurrences].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        const ctx = sorted[0].context_detail || {}
        results.push({
          plantLabel: ctx.plant_key_or_id || 'Planta sin identificar',
          plotName: ctx.plot_name || '',
          farmName: ctx.farm_name || '',
          disease,
          count: occurrences.length,
          lastDate: sorted[0].created_at,
        })
      })
    })
    return results.sort((a, b) => b.count - a.count).slice(0, 6)
  }, [histories])

  // ── parcelas descuidadas (más tiempo sin análisis) ───────────────────────────
  const neglectedPlots = useMemo(() => {
    const lastByPlot = new Map()
    histories.forEach(h => {
      const plotId = h.context_detail?.plot_id
      if (!plotId) return
      const cur = lastByPlot.get(plotId)
      if (!cur || new Date(h.created_at) > new Date(cur)) lastByPlot.set(plotId, h.created_at)
    })
    const allPlots = []
    farms.forEach(f => (f.plots || []).forEach(p => allPlots.push({ ...p, farmName: f.name })))
    const now = new Date()
    return allPlots.map(p => {
      const last = lastByPlot.get(p.id) || null
      const daysSince = last ? Math.floor((now - new Date(last)) / 86400000) : null
      return { ...p, lastDate: last, daysSince }
    }).sort((a, b) => {
      if (a.daysSince == null && b.daysSince == null) return 0
      if (a.daysSince == null) return -1
      if (b.daysSince == null) return 1
      return b.daysSince - a.daysSince
    }).slice(0, 6)
  }, [farms, histories])

  // ── Leaflet map: init (runs once) ────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return
    const map = L.map(mapRef.current, { zoomControl: true, maxZoom: 21 })
    L.control.scale({ imperial: false, position: 'bottomright' }).addTo(map)
    map.setView([-1.83, -79.97], 9)
    mapInstanceRef.current = map
    return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null } }
  }, [])

  // ── Leaflet map: tile layer ───────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return
    if (tileLayerRef.current) { tileLayerRef.current.remove(); tileLayerRef.current = null }
    const cfg = TILE_LAYERS[mapLayer] || TILE_LAYERS.street
    tileLayerRef.current = L.tileLayer(cfg.url, { attribution: cfg.attribution, subdomains: cfg.subdomains || 'abc', maxZoom: cfg.maxZoom, maxNativeZoom: cfg.maxNativeZoom }).addTo(map)
  }, [mapLayer])

  // ── Leaflet map: markers + heatmap ───────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return
    if (markerGroupRef.current) { markerGroupRef.current.remove(); markerGroupRef.current = null }
    if (heatLayerRef.current) { heatLayerRef.current.remove(); heatLayerRef.current = null }

    const geoAnalyses = analyses.filter(a => a.latitude != null && a.longitude != null)
    const filtered = geoAnalyses.filter(a => {
      const b = computeSevBucket({ disease_name_predicted: a.disease_name_predicted, severity: a.severity })
      return mapSevFilter.has(b)
    })

    const group = showClusters
      ? L.markerClusterGroup({ maxClusterRadius: 60, showCoverageOnHover: false })
      : L.featureGroup()

    filtered.forEach(a => {
      const bucket = computeSevBucket({ disease_name_predicted: a.disease_name_predicted, severity: a.severity })
      const color = riskColorFromBucket(bucket)
      const riskLbl = riskLabelFromBucket(bucket)
      const marker = L.circleMarker([a.latitude, a.longitude], { radius: 11, fillColor: color, color: '#fff', weight: 2.5, opacity: 1, fillOpacity: 0.9 })
      marker.bindTooltip(`<b>${escapeHtml(a.disease_name_predicted || 'Análisis')}</b> · <span style="color:${color}">${riskLbl}</span>`, { direction: 'top', offset: [0, -8] })
      marker.on('click', () => setSelectedAnalysis(a))
      group.addLayer(marker)
    })

    group.addTo(map)
    markerGroupRef.current = group

    if (showHeatmap && geoAnalyses.length > 0) {
      const pts = geoAnalyses.map(a => {
        const b = computeSevBucket({ disease_name_predicted: a.disease_name_predicted, severity: a.severity })
        return [a.latitude, a.longitude, (b + 1) / 5]
      })
      heatLayerRef.current = L.heatLayer(pts, { radius: 35, blur: 25, maxZoom: 17, gradient: { 0.3: '#22c55e', 0.6: '#f59e0b', 1.0: '#dc2626' } }).addTo(map)
    }

    if (filtered.length > 0) {
      try { map.fitBounds(group.getBounds().pad(0.3)) } catch { map.setView([-1.83, -79.97], 9) }
    } else if (geoAnalyses.length === 0) {
      map.setView([-1.83, -79.97], 9)
    }
  }, [analyses, mapSevFilter, showClusters, showHeatmap])

  const exportPDF = useCallback(() => setShowPDF(true), [])

  // ════════════════════════════════════════════════════════════════════════════
  return (
    <>
      <style>{`
        .panel-title{font-family:'Cormorant Garamond',serif;letter-spacing:-0.02em;}
        .glass-card{background:#fff;border:1px solid rgba(226,232,240,.9);border-radius:30px;}
        .dash-panel{border:1px solid rgba(226,232,240,.9);border-radius:30px;background:#fff;}
        .dash-panel-hdr{border-bottom:1px solid #eef2f7;background:rgba(255,255,255,.82);}
        .sev-pill{display:inline-flex;align-items:center;gap:.35rem;padding:.25rem .6rem;border-radius:9999px;font-size:.62rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;}
        .sev-low{background:#ecfdf5;color:#166534;}
        .sev-medium{background:#fefce8;color:#a16207;}
        .sev-high{background:#fff7ed;color:#c2410c;}
        .sev-critical{background:#fef2f2;color:#b91c1c;}
        .map-legend-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;}
        #dash-main::-webkit-scrollbar{width:3px;}
        #dash-main::-webkit-scrollbar-thumb{background:#d1fae5;border-radius:4px;}
        .export-btn{display:inline-flex;align-items:center;gap:0.5rem;padding:0.55rem 1rem;border-radius:10px;font-size:0.8rem;font-weight:600;cursor:pointer;transition:all 0.15s;border:1px solid;}
        .export-btn-pdf{background:#dc2626;color:#fff;border-color:#dc2626;}
        .export-btn-pdf:hover{background:#b91c1c;}
        .marker-cluster-small,.marker-cluster-medium,.marker-cluster-large{background:rgba(22,163,74,.18)!important;}
        .marker-cluster-small div,.marker-cluster-medium div,.marker-cluster-large div{background:#16a34a!important;color:#fff!important;font-weight:700;font-size:0.72rem;}
      `}</style>

      <main className="flex-1 flex flex-col overflow-hidden bg-white min-w-0">

        <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button id="histMenuBtn" onClick={onOpenSidebar} className="p-2 -ml-1 rounded-xl hover:bg-brand-50 transition text-gray-500" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
            </button>
            <div className="brand-avatar w-8 h-8 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
              <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-8 2 4-4 8.5-4 8.5-4-8 3.5-9 6-9 6A8 8 0 0 1 17 8z" /></svg>
            </div>
            <div>
              <h1 className="font-cormorant text-base font-semibold text-gray-900 leading-none">Pitahaya Vision</h1>
              <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-brand-600 leading-none mt-0.5">Dashboard agrícola</p>
            </div>
          </div>
          <div />
        </header>

        <div id="dash-main" ref={contentRef} className="flex-1 overflow-y-auto p-4 md:p-7">
          <div className="fade-in space-y-6 pb-8">

            <section className="glass-card rounded-2xl p-4 sm:p-5">
              <div className="grid gap-5 lg:grid-cols-[1fr_1.13fr] lg:items-center">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 text-brand-700 border border-brand-100 px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.18em]">
                    <i className="fas fa-chart-line text-[0.7rem]"></i>
                    Centro de control agrícola
                  </span>
                  <h2 className="font-cormorant text-2xl sm:text-3xl font-semibold text-slate-900 mt-3 leading-tight">
                    Dashboard inteligente de parcelas y análisis
                  </h2>
                  <p className="text-slate-500 mt-2 max-w-2xl leading-relaxed text-sm sm:text-base">
                    Consolidación de análisis del chatbot e historial de enfermedades para visualizar la salud del cultivo, zonas críticas y tendencias clínicas en tiempo real.
                  </p>
                </div>
                <div className="grid gap-3 grid-cols-2 xl:grid-cols-4">
                  <div className="stat-card p-3.5">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400 font-semibold">Total análisis</p>
                    <p className="text-2xl font-semibold text-slate-900 mt-1.5">{kpis.total}</p>
                    <p className="text-xs text-slate-500 mt-1">en la plataforma</p>
                  </div>
                  <div className="stat-card p-3.5">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400 font-semibold">En riesgo</p>
                    <p className="text-2xl font-semibold text-red-700 mt-1.5">{kpis.highRisk}</p>
                    <p className="text-xs text-slate-500 mt-1">severidad mod. o mayor</p>
                  </div>
                  <div className="stat-card p-3.5">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400 font-semibold">Sin alerta</p>
                    <p className="text-2xl font-semibold text-emerald-700 mt-1.5">{kpis.healthy}</p>
                    <p className="text-xs text-slate-500 mt-1">plantas en buen estado</p>
                  </div>
                  <div className="stat-card p-3.5">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400 font-semibold">Corporaciones</p>
                    <p className="text-2xl font-semibold text-sky-700 mt-1.5">{kpis.farms}</p>
                    <p className="text-xs text-slate-500 mt-1">con análisis registrados</p>
                  </div>
                </div>
              </div>
            </section>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={exportPDF} disabled={loading || histories.length === 0}
                title="Exportar reporte PDF"
                style={{ background: 'transparent', border: '1.5px solid #f87171', borderRadius: '9999px', color: '#f87171', fontFamily: 'Inter,sans-serif', fontSize: '0.82rem', fontWeight: 600, padding: '0.45rem 1.2rem', cursor: 'pointer', letterSpacing: '0.04em', transition: 'background 0.15s,color 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f87171'; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#f87171' }}>
                Exportar PDF
              </button>
            </div>

            <article className="glass-card p-6">
              <header className="flex items-start justify-between gap-4 mb-5">
                <hgroup>
                  <p className="text-xs uppercase tracking-[0.25em] text-brand-600 font-semibold">Geolocalización</p>
                  <h3 className="mt-1 panel-title text-2xl font-semibold text-slate-900">Distribución geográfica de enfermedades</h3>
                </hgroup>
                <span className="inline-flex items-center gap-1 border border-brand-100 bg-brand-50 text-brand-700 rounded-full px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.08em] flex-shrink-0">
                  <i className="fas fa-location-dot text-[0.6rem]"></i>{analyses.filter(a => a.latitude != null && a.longitude != null).length} puntos GPS
                </span>
              </header>
              {/* Map toolbar */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginBottom: '0.65rem', alignItems: 'center' }}>
                {/* Layer selector */}
                <div style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
                  {[['street', 'Mapa'], ['satellite', 'Satélite'], ['terrain', 'Terreno']].map(([key, label], idx, arr) => (
                    <button key={key} onClick={() => setMapLayer(key)}
                      style={{ padding: '0.28rem 0.65rem', fontSize: '0.7rem', fontWeight: 600, border: 'none', cursor: 'pointer',
                        background: mapLayer === key ? '#16a34a' : '#fff', color: mapLayer === key ? '#fff' : '#64748b',
                        transition: 'all 0.15s', borderRight: idx < arr.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                      {label}
                    </button>
                  ))}
                </div>
                {/* Heatmap toggle */}
                <button onClick={() => setShowHeatmap(v => !v)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.28rem 0.65rem', fontSize: '0.7rem', fontWeight: 600,
                    border: `1px solid ${showHeatmap ? '#fbbf24' : '#e2e8f0'}`, borderRadius: 10, cursor: 'pointer',
                    background: showHeatmap ? '#fef9c3' : '#fff', color: showHeatmap ? '#92400e' : '#64748b', transition: 'all 0.15s' }}>
                  <svg style={{ width: 11, height: 11 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                  Mapa de calor
                </button>
                {/* Cluster toggle */}
                <button onClick={() => setShowClusters(v => !v)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.28rem 0.65rem', fontSize: '0.7rem', fontWeight: 600,
                    border: `1px solid ${showClusters ? '#93c5fd' : '#e2e8f0'}`, borderRadius: 10, cursor: 'pointer',
                    background: showClusters ? '#eff6ff' : '#fff', color: showClusters ? '#1d4ed8' : '#64748b', transition: 'all 0.15s' }}>
                  <svg style={{ width: 11, height: 11 }} viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="3"/><circle cx="12" cy="5" r="3"/><circle cx="19" cy="12" r="3"/><circle cx="12" cy="19" r="3"/></svg>
                  Agrupación
                </button>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[3fr_2fr] gap-6 items-stretch">
                <div className="min-w-0">
                  <div ref={mapRef} style={{ height: '400px', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', zIndex: 0 }}></div>
                  {/* Severity filter chips */}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {[
                      { bucket: 0, color: '#16a34a', label: 'Sin riesgo' },
                      { bucket: 1, color: '#84cc16', label: 'Baja' },
                      { bucket: 2, color: '#d97706', label: 'Moderada' },
                      { bucket: 3, color: '#ea580c', label: 'Alta' },
                      { bucket: 4, color: '#dc2626', label: 'Crítica' },
                    ].map(({ bucket, color, label }) => {
                      const active = mapSevFilter.has(bucket)
                      return (
                        <button key={bucket} onClick={() => setMapSevFilter(prev => {
                          const next = new Set(prev)
                          if (next.has(bucket)) next.delete(bucket); else next.add(bucket)
                          return next
                        })}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.55rem',
                            borderRadius: 9999, border: `1.5px solid ${active ? color : '#e2e8f0'}`,
                            background: active ? `${color}18` : '#f8fafc', color: active ? color : '#94a3b8',
                            cursor: 'pointer', transition: 'all 0.15s', fontWeight: active ? 700 : 500,
                            fontSize: '0.68rem', opacity: active ? 1 : 0.65 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: active ? color : '#cbd5e1', flexShrink: 0 }}></span>
                          {label}
                        </button>
                      )
                    })}
                    <button onClick={() => setMapSevFilter(new Set([0, 1, 2, 3, 4]))}
                      style={{ padding: '0.2rem 0.55rem', borderRadius: 9999, border: '1.5px solid #e2e8f0',
                        background: '#f8fafc', color: '#94a3b8', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 500 }}>
                      Todos
                    </button>
                  </div>
                </div>

                {/* Side panel: shows analysis detail on click, else AI panel */}
                <div className="min-w-0 rounded-[22px] border border-slate-200 bg-white overflow-hidden" style={{ height: 400 }}>
                  {selectedAnalysis ? (() => {
                    const bucket = computeSevBucket({ disease_name_predicted: selectedAnalysis.disease_name_predicted, severity: selectedAnalysis.severity })
                    const color = riskColorFromBucket(bucket)
                    const bg = riskBgFromBucket(bucket)
                    const riskLbl = riskLabelFromBucket(bucket)
                    const confPct = Math.min(100, parseFloat(selectedAnalysis.confidence_percent ?? (selectedAnalysis.confidence > 1 ? selectedAnalysis.confidence : (selectedAnalysis.confidence || 0) * 100)) || 0)
                    return (
                      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                        {/* Panel header */}
                        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #eef2f7', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#16a34a' }}>Detalle del análisis</span>
                          <button onClick={() => setSelectedAnalysis(null)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1rem', lineHeight: 1, padding: '0.1rem 0.3rem', borderRadius: 6, transition: 'color 0.1s' }}>✕</button>
                        </div>
                        <div style={{ padding: '0.85rem 1rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {/* Image */}
                          {selectedAnalysis.image_url && (
                            <img src={selectedAnalysis.image_url} alt="leaf"
                              style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 12, border: '1px solid #e2e8f0' }} />
                          )}
                          {/* Disease name */}
                          <div>
                            <p style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: '0.2rem' }}>Diagnóstico</p>
                            <p style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>{selectedAnalysis.disease_name_predicted || 'Sin diagnóstico'}</p>
                          </div>
                          {/* Severity + confidence row */}
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                              <p style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '0.3rem' }}>Severidad</p>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.22rem 0.6rem', borderRadius: 9999, background: bg, color, fontSize: '0.7rem', fontWeight: 700 }}>
                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }}></span>
                                {riskLbl}
                              </span>
                            </div>
                            <div style={{ flex: 1 }}>
                              <p style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '0.3rem' }}>Confianza</p>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <div style={{ flex: 1, height: 5, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
                                  <div style={{ height: 5, background: 'linear-gradient(90deg,#16a34a,#22c55e)', borderRadius: 999, width: `${confPct}%`, transition: 'width .6s ease' }}></div>
                                </div>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#16a34a', flexShrink: 0 }}>{confPct.toFixed(1)}%</span>
                              </div>
                            </div>
                          </div>
                          {/* Date + GPS */}
                          <div style={{ borderTop: '1px solid #eef2f7', paddingTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                              <span style={{ color: '#94a3b8', fontWeight: 600 }}>Fecha</span>
                              <span style={{ color: '#334155', fontWeight: 600 }}>{new Date(selectedAnalysis.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                              <span style={{ color: '#94a3b8', fontWeight: 600 }}>GPS</span>
                              <span style={{ color: '#334155', fontFamily: 'monospace', fontSize: '0.66rem' }}>{selectedAnalysis.latitude?.toFixed(5)}, {selectedAnalysis.longitude?.toFixed(5)}</span>
                            </div>
                          </div>
                          {/* Analysis excerpt */}
                          {selectedAnalysis.analysis_text && (
                            <div style={{ borderTop: '1px solid #eef2f7', paddingTop: '0.6rem' }}>
                              <p style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '0.35rem' }}>Observaciones</p>
                              <p style={{ fontSize: '0.72rem', color: '#475569', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{selectedAnalysis.analysis_text}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })() : (
                    <AIAnalysisPanel
                      analyses={analyses}
                      buildSummary={() => {
                        const geoPoints = analyses.filter(a => a.latitude != null && a.longitude != null)
                        const sick = analyses.filter(a => (a.severity || '').toLowerCase() !== 'sana').length
                        const pctSick = analyses.length ? Math.round(sick / analyses.length * 100) : 0
                        const diseaseCounts = {}
                        analyses.forEach(a => { const d = a.disease_name_predicted || 'Desconocido'; diseaseCounts[d] = (diseaseCounts[d] || 0) + 1 })
                        const topD = Object.entries(diseaseCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => `- ${name}: ${count} caso${count > 1 ? 's' : ''}`).join('\n')
                        const sevCounts = { Baja: 0, Media: 0, Alta: 0, Crítica: 0 }
                        analyses.forEach(a => {
                          const s = (a.severity || '').toLowerCase(); const d = (a.disease_name_predicted || '').toLowerCase()
                          if (s === 'sana' || d.includes('sana')) sevCounts.Baja++
                          else if (d.includes('pudric')) sevCounts.Crítica++
                          else if (d.includes('cancro') || d.includes('tiz') || d.includes('antrac')) sevCounts.Alta++
                          else if (d.includes('mancha')) sevCounts.Media++
                          else sevCounts.Alta++
                        })
                        return `Resumen del mapa geográfico de enfermedades en la finca del usuario:\n- Total de análisis registrados: ${analyses.length}\n- Análisis con coordenadas GPS: ${geoPoints.length}\n- Plantas enfermas detectadas: ${sick} (${pctSick}%)\n- Distribución por severidad: Baja=${sevCounts.Baja}, Media=${sevCounts.Media}, Alta=${sevCounts.Alta}, Crítica=${sevCounts.Crítica}\n\nEnfermedades más frecuentes:\n${topD}\n${geoPoints.length === 0 ? '\nNota: Aún no hay puntos GPS registrados en el mapa.' : ''}`
                      }}
                      title="Diagnóstico fitosanitario"
                      buttonLabel="Analizar mapa"
                      emptyText="Gemma 3 interpretará los patrones del mapa y entregará un reporte agronómico"
                      showGeoStats={true}
                    />
                  )}
                </div>
              </div>
            </article>

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <article className="glass-card p-6">
                <header className="flex items-start justify-between gap-4 mb-5">
                  <hgroup>
                    <p className="text-xs uppercase tracking-[0.25em] text-red-600 font-semibold">Tendencia</p>
                    <h3 className="mt-1 panel-title text-2xl font-semibold text-slate-900">Severidad en el tiempo (10 semanas)</h3>
                  </hgroup>
                  {severityTrendInsight && (
                    <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.08em] flex-shrink-0"
                      style={{ background: `${severityTrendInsight.color}18`, color: severityTrendInsight.color }}>
                      {severityTrendInsight.trend}
                    </span>
                  )}
                </header>
                <SeverityTrendChart data={severityTrend} />
                <p className="mt-3 text-xs text-slate-500">% de análisis con severidad moderada o mayor, agrupados por semana. Te ayuda a ver si el cultivo mejora o empeora en el tiempo, más allá del último análisis.</p>
              </article>

              <article className="glass-card p-6">
                <header className="flex items-start justify-between gap-4 mb-5">
                  <hgroup>
                    <p className="text-xs uppercase tracking-[0.25em] text-sky-600 font-semibold">Prevención</p>
                    <h3 className="mt-1 panel-title text-2xl font-semibold text-slate-900">Clima vs. enfermedad (30 días)</h3>
                  </hgroup>
                </header>
                {climateError && !climateWeather ? (
                  <div className="flex flex-col items-center justify-center h-56 text-slate-400 gap-2 text-center px-4">
                    <i className="fas fa-cloud-question text-3xl"></i>
                    <p className="text-sm">{climateError}</p>
                  </div>
                ) : (
                  <>
                    <ClimateCorrelationChart data={climateCorrelation} />
                    <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: '#93c5fd' }}></span>Humedad diaria (%)</span>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: '#dc2626' }}></span>Análisis en riesgo</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">Si los picos rojos coinciden con barras altas de humedad, el clima húmedo podría estar detonando los brotes: refuerza la prevención en esos días.</p>
                  </>
                )}
              </article>
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <article className="glass-card p-6">
                <header className="flex items-start justify-between gap-3 mb-5">
                  <hgroup>
                    <p className="text-xs uppercase tracking-[0.25em] text-brand-600 font-semibold">Evolución</p>
                    <h3 className="mt-1 panel-title text-2xl font-semibold text-slate-900">Este mes vs. mes anterior</h3>
                  </hgroup>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 flex-shrink-0 mt-1">
                    <span className="font-semibold text-slate-600 capitalize">{monthComparison.currentLabel}</span>
                    <span>vs</span>
                    <span className="capitalize">{monthComparison.previousLabel}</span>
                  </div>
                </header>
                {monthComparison.total.prev === 0 && monthComparison.total.cur === 0
                  ? <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-3">
                      <i className="fas fa-calendar-xmark text-3xl"></i>
                      <p className="text-sm text-center">No hay datos en los últimos dos meses aún</p>
                    </div>
                  : <div className="space-y-3">
                      {[
                        { label: 'Total análisis', cur: monthComparison.total.cur, prev: monthComparison.total.prev, delta: monthComparison.total.delta, goodWhenUp: true,  icon: 'microscope' },
                        { label: 'En riesgo',      cur: monthComparison.risk.cur,  prev: monthComparison.risk.prev,  delta: monthComparison.risk.delta,  goodWhenUp: false, icon: 'triangle-exclamation' },
                      ].map((row, i) => {
                        const up = row.delta > 0
                        const neutral = row.delta === null || row.delta === 0
                        const good = neutral ? null : (row.goodWhenUp ? up : !up)
                        const deltaColor = neutral ? '#94a3b8' : good ? '#16a34a' : '#dc2626'
                        const arrow = neutral ? '—' : up ? '↑' : '↓'
                        return (
                          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                              <i className={`fas fa-${row.icon} text-slate-400`}></i>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold">{row.label}</p>
                              <div className="flex items-end gap-3 mt-1">
                                <span className="text-2xl font-semibold text-slate-900">{row.cur}</span>
                                <span className="text-sm text-slate-400 mb-0.5">antes: {row.prev}</span>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className="text-lg font-bold" style={{ color: deltaColor }}>{arrow}</span>
                              {!neutral && <p className="text-xs font-semibold mt-0.5" style={{ color: deltaColor }}>{Math.abs(row.delta)}%</p>}
                            </div>
                          </div>
                        )
                      })}
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold mb-2">Enfermedad principal</p>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs text-slate-400 capitalize mb-0.5">{monthComparison.currentLabel}</p>
                            <p className="text-sm font-semibold text-slate-800 truncate max-w-[160px]">{monthComparison.topDisease.cur}</p>
                          </div>
                          <i className="fas fa-arrow-right text-slate-200 text-sm flex-shrink-0"></i>
                          <div className="text-right">
                            <p className="text-xs text-slate-400 capitalize mb-0.5">{monthComparison.previousLabel}</p>
                            <p className="text-sm font-medium text-slate-500 truncate max-w-[160px]">{monthComparison.topDisease.prev}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                }
              </article>

              <article className="glass-card p-6">
                <header className="flex items-start justify-between gap-4 mb-5">
                  <hgroup>
                    <p className="text-xs uppercase tracking-[0.25em] text-brand-600 font-semibold">Diagnóstico</p>
                    <h3 className="mt-1 panel-title text-2xl font-semibold text-slate-900">Distribución por severidad</h3>
                  </hgroup>
                  <span className="inline-flex items-center gap-1 border border-slate-200 bg-white text-slate-500 rounded-full px-3 py-1 text-[0.68rem] font-bold uppercase flex-shrink-0">
                    {histories.length} registros
                  </span>
                </header>
                {histories.length === 0
                  ? <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-3">
                      <i className="fas fa-chart-bar text-3xl"></i>
                      <p className="text-sm">Sin registros aún</p>
                    </div>
                  : <>
                      <SeverityBars data={severityData} />
                      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                        <span>Total registros: <strong className="text-slate-600">{histories.length}</strong></span>
                        <span>En riesgo (mod+): <strong className="text-red-600">{severityData.slice(2).reduce((s, d) => s + d.count, 0)}</strong></span>
                      </div>
                    </>
                }
              </article>
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <article className="glass-card p-6">
                <header className="flex items-start justify-between gap-4 mb-5">
                  <hgroup>
                    <p className="text-xs uppercase tracking-[0.25em] text-red-600 font-semibold">Tendencia clínica</p>
                    <h3 className="mt-1 panel-title text-2xl font-semibold text-slate-900">Enfermedades más frecuentes</h3>
                  </hgroup>
                  {topDiseases.length > 0 && (
                    <span className="inline-flex items-center gap-1 border border-slate-200 bg-white text-slate-500 rounded-full px-3 py-1 text-[0.68rem] font-bold uppercase flex-shrink-0">
                      {topDiseases.length} patologías
                    </span>
                  )}
                </header>
                {topDiseases.length === 0
                  ? <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-3">
                      <i className="fas fa-virus-slash text-3xl"></i>
                      <p className="text-sm">Sin diagnósticos registrados aún</p>
                    </div>
                  : <DiseaseBarChart data={topDiseases} total={histories.length} />
                }
              </article>

              {farmZones.length > 0 ? (
                <article className="glass-card p-6">
                  <header className="flex items-center justify-between mb-5 gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-brand-600 font-semibold">Territorio</p>
                      <h3 className="mt-1 panel-title text-2xl font-semibold text-slate-900">Resumen de riesgo por corporación</h3>
                    </div>
                    <span className="text-xs px-2 py-1 bg-brand-50 text-brand-600 rounded-full border border-brand-100 flex-shrink-0">
                      {farmZones.length} corporación{farmZones.length !== 1 ? 'es' : ''}
                    </span>
                  </header>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {farmZones.map((zone, i) => <ZoneCard key={zone.farmId} zone={zone} idx={i} />)}
                  </div>
                </article>
              ) : (
                <article className="glass-card p-6 flex flex-col items-center justify-center text-slate-400 gap-3">
                  <i className="fas fa-map text-3xl"></i>
                  <p className="text-sm text-center">El resumen por corporación aparecerá cuando tengas análisis vinculados a corporaciones</p>
                </article>
              )}
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <article className="glass-card p-6">
                <header className="flex items-start justify-between gap-3 mb-5">
                  <hgroup>
                    <p className="text-xs uppercase tracking-[0.25em] text-amber-600 font-semibold">Efectividad de manejo</p>
                    <h3 className="mt-1 panel-title text-2xl font-semibold text-slate-900">Enfermedades reincidentes</h3>
                  </hgroup>
                </header>
                {recurringDiseases.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-3">
                    <i className="fas fa-circle-check text-3xl text-brand-300"></i>
                    <p className="text-sm text-center">Ninguna planta repite la misma enfermedad. Buena señal de manejo.</p>
                  </div>
                ) : (
                  <ul className="space-y-2.5 list-none p-0 m-0">
                    {recurringDiseases.map((r, i) => (
                      <li key={i} className="rounded-2xl border border-amber-100 bg-amber-50/40 p-3.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{r.disease}</p>
                          <p className="text-xs text-slate-500 mt-0.5 truncate">{r.plantLabel}{r.plotName ? ` · ${r.plotName}` : ''}{r.farmName ? ` · ${r.farmName}` : ''}</p>
                          <p className="text-[0.68rem] text-slate-400 mt-0.5">Último: {formatDate(r.lastDate)}</p>
                        </div>
                        <span className="flex-shrink-0 text-center">
                          <span className="block text-lg font-bold text-amber-600">{r.count}×</span>
                          <span className="block text-[0.6rem] uppercase tracking-wide text-slate-400">veces</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-3 text-xs text-slate-500">La misma enfermedad reapareciendo en la misma planta sugiere que el tratamiento actual no está funcionando: considera cambiar de estrategia.</p>
              </article>

              <article className="glass-card p-6">
                <header className="flex items-start justify-between gap-3 mb-5">
                  <hgroup>
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500 font-semibold">Monitoreo</p>
                    <h3 className="mt-1 panel-title text-2xl font-semibold text-slate-900">Parcelas descuidadas</h3>
                  </hgroup>
                </header>
                {neglectedPlots.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-3">
                    <i className="fas fa-seedling text-3xl"></i>
                    <p className="text-sm text-center">Registra parcelas para hacerles seguimiento de monitoreo.</p>
                  </div>
                ) : (
                  <ul className="space-y-2.5 list-none p-0 m-0">
                    {neglectedPlots.map((p, i) => {
                      const stale = p.daysSince == null || p.daysSince > 14
                      return (
                        <li key={p.id ?? i} className="rounded-2xl border border-slate-200 bg-white p-3.5 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{p.name || 'Parcela'}</p>
                            <p className="text-xs text-slate-500 mt-0.5 truncate">{p.farmName}{p.zone ? ` · Zona ${p.zone}` : ''}</p>
                          </div>
                          <span className="flex-shrink-0 text-[0.68rem] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full"
                            style={{ background: stale ? '#fef2f2' : '#f0fdf4', color: stale ? '#b91c1c' : '#15803d' }}>
                            {p.daysSince == null ? 'Nunca analizada' : `Hace ${p.daysSince} día${p.daysSince !== 1 ? 's' : ''}`}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                )}
                <p className="mt-3 text-xs text-slate-500">Parcelas sin análisis reciente pueden esconder problemas que aún no se han detectado. Prioriza revisarlas pronto.</p>
              </article>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
              <article className="glass-card p-6">
                <header className="flex items-center justify-between mb-4 gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500 font-semibold">Alertas recientes</p>
                    <h3 className="mt-1 panel-title text-2xl font-semibold text-slate-900">Lo que merece atención hoy</h3>
                  </div>
                  <button onClick={() => navigate('/historial')}
                    className="text-sm text-brand-600 hover:text-brand-700 font-medium flex-shrink-0"
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    Ver historial →
                  </button>
                </header>
                {recentAlerts.length === 0
                  ? <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-400">
                      <i className="fas fa-circle-check text-2xl text-brand-300 mb-2 block"></i>
                      Sin alertas activas. ¡El cultivo está bien!
                    </div>
                  : <ul className="space-y-3 list-none p-0">
                      {recentAlerts.map(h => {
                        const ctx = h.context_detail || {}
                        const bucket = computeSevBucket(h)
                        const color = riskColorFromBucket(bucket)
                        const bg = riskBgFromBucket(bucket)
                        return (
                          <li key={h.id}>
                            <article className="flex items-start gap-3 rounded-3xl border border-slate-200 bg-white p-4 hover:border-red-200 hover:shadow-sm transition-shadow">
                              <div className="mt-1 w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: bg, color }}>
                                <i className="fas fa-triangle-exclamation"></i>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-slate-900 truncate">{h.disease_name_predicted || ctx.main_symptom || 'Sin diagnóstico'}</p>
                                <p className="text-xs text-slate-500 mt-0.5 truncate">{ctx.farm_name || '—'}{ctx.plot_name ? ` · ${ctx.plot_name}` : ''}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{formatDate(h.created_at)}</p>
                              </div>
                              <span className="sev-pill flex-shrink-0" style={{ background: riskBgFromBucket(bucket), color }}>{computeSevLabel(h)}</span>
                            </article>
                          </li>
                        )
                      })}
                    </ul>
                }
              </article>

              <article className="glass-card p-6">
                <header className="mb-5">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500 font-semibold">Reportes</p>
                  <h3 className="mt-1 panel-title text-2xl font-semibold text-slate-900">Descargar informes</h3>
                </header>
                <div className="space-y-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
                        <i className="fas fa-file-pdf text-red-600"></i>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Reporte PDF del dashboard</p>
                        <p className="text-xs text-slate-500 mt-0.5">Captura completa con mapa, gráficos e indicadores</p>
                      </div>
                    </div>
                    <button onClick={exportPDF} disabled={loading || histories.length === 0}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition"
                      style={{ background: '#dc2626', border: 'none', cursor: loading || histories.length === 0 ? 'not-allowed' : 'pointer', opacity: loading || histories.length === 0 ? 0.6 : 1 }}>
                      <i className="fas fa-download mr-2"></i>Descargar PDF
                    </button>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 mb-2">Resumen de datos</p>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between"><span className="text-slate-600">Total análisis</span><span className="font-semibold text-slate-900">{kpis.total}</span></div>
                      <div className="flex justify-between"><span className="text-slate-600">Con alerta de riesgo</span><span className="font-semibold text-red-700">{kpis.highRisk}</span></div>
                      <div className="flex justify-between"><span className="text-slate-600">Corporaciones</span><span className="font-semibold text-slate-900">{kpis.farms}</span></div>
                      <div className="flex justify-between"><span className="text-slate-600">Enfermedades detectadas</span><span className="font-semibold text-slate-900">{topDiseases.length}</span></div>
                    </div>
                  </div>
                </div>
              </article>
            </section>

          </div>
        </div>

        <footer className="hidden md:flex flex-shrink-0 items-center justify-center px-6 py-3 border-t border-gray-100 text-sm text-slate-400">
          Pitahaya Vision © 2026. Todos los derechos reservados.
        </footer>
      </main>

      <DashboardReportPDF
        isOpen={showPDF}
        onClose={() => setShowPDF(false)}
        mode="user"
        data={{ kpis, topDiseases, farmZones, recentAlerts, userName: displayName, sevTotals: severityData }}
      />
    </>
  )
}
