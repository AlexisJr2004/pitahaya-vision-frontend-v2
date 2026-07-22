import { useState, useEffect, useMemo, useRef } from 'react'
import { Chart, BarController, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js'
Chart.register(BarController, CategoryScale, LinearScale, BarElement, Tooltip)
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.heat'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { getAnalyses } from '../../services/analysisService'
import { getCustomers } from '../../services/adminService'
import AIAnalysisPanel from '../../components/AIAnalysisPanel'
import DashboardReportPDF from '../../components/pdf/DashboardReportPDF'
import { toArray } from '../../utils/arrayUtils'
import AnalysisImage from '../../components/AnalysisImage'
import PageHeader from '../../components/PageHeader'
import HistoryFilterBar from '../../components/HistoryFilterBar'
import { API_PAGE_SIZE } from '../../services/apiConfig'
import { TILE_LAYERS } from '../../constants/mapLayers'
import { computeSev, isRisk, sevPillClass, sevColor, sevBg, sevLabel, riskColor, riskLabel, riskPillBg } from '../../utils/severity'
import { escapeHtml, formatDateShort as fmtShort, formatDateWithTime as fmtFull, extractConfidence } from '../../utils/formatters'
import './dashboard.css'

const RANGE_OPTIONS = [
  { key: 'all',   label: 'Todos los registros' },
  { key: 'today', label: 'Hoy' },
  { key: 'last7', label: 'Últimos 7 días' },
  { key: 'month', label: 'Este mes' },
]

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


/* ── Leaflet map con 7 features ── */
function FarmHeatmap({ analyses, onSelectAnalysis }) {
  const mapRef        = useRef(null)
  const mapInstanceRef = useRef(null)
  const tileLayerRef  = useRef(null)
  const markerGroupRef = useRef(null)
  const heatLayerRef  = useRef(null)

  const [mapLayer,     setMapLayer]     = useState('street')
  const [showHeatmap,  setShowHeatmap]  = useState(true)
  const [showClusters, setShowClusters] = useState(false)
  const [mapSevFilter, setMapSevFilter] = useState(new Set(['low', 'medium', 'high', 'critical']))

  const geoAnalyses = useMemo(() => analyses.filter(a => a.latitude != null && a.longitude != null), [analyses])

  // ── init map (once) ──
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return
    const map = L.map(mapRef.current, { zoomControl: true, maxZoom: 21 })
    L.control.scale({ imperial: false, position: 'bottomright' }).addTo(map)
    map.setView([-1.8312, -78.1834], 7)
    mapInstanceRef.current = map
    return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null } }
  }, [])

  // ── tile layer ──
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return
    if (tileLayerRef.current) { tileLayerRef.current.remove(); tileLayerRef.current = null }
    const cfg = TILE_LAYERS[mapLayer] || TILE_LAYERS.street
    tileLayerRef.current = L.tileLayer(cfg.url, { attribution: cfg.attribution, subdomains: cfg.subdomains || 'abc', maxZoom: cfg.maxZoom, maxNativeZoom: cfg.maxNativeZoom }).addTo(map)
  }, [mapLayer])

  // ── markers + heatmap ──
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return
    if (markerGroupRef.current) { markerGroupRef.current.remove(); markerGroupRef.current = null }
    if (heatLayerRef.current)   { heatLayerRef.current.remove();   heatLayerRef.current = null }

    const filtered = geoAnalyses.filter(a => mapSevFilter.has(computeSev(a).bucket))

    const group = showClusters
      ? L.markerClusterGroup({ maxClusterRadius: 60, showCoverageOnHover: false })
      : L.featureGroup()

    filtered.forEach(a => {
      const sev   = computeSev(a)
      const color = sevColor(sev.bucket)
      const marker = L.circleMarker([a.latitude, a.longitude], { radius: 11, fillColor: color, color: '#fff', weight: 2.5, opacity: 1, fillOpacity: 0.9 })
      marker.bindTooltip(`<b>${escapeHtml(a.disease_name_predicted || 'Análisis')}</b> · ${escapeHtml(a.owner_name || '—')}`, { direction: 'top', offset: [0, -8] })
      marker.on('click', () => onSelectAnalysis && onSelectAnalysis(a))
      group.addLayer(marker)
    })

    group.addTo(map)
    markerGroupRef.current = group

    if (showHeatmap && geoAnalyses.length > 0) {
      const pts = geoAnalyses.map(a => {
        const s = (a.severity || '').toLowerCase()
        const d = (a.disease_name_predicted || '').toLowerCase()
        const intensity = s === 'sana' || d.includes('sana') ? 0.2 : d.includes('pudric') ? 1.0 : d.includes('cancro') || d.includes('tiz') || d.includes('antrac') ? 0.8 : d.includes('mancha') ? 0.5 : 0.6
        return [a.latitude, a.longitude, intensity]
      })
      heatLayerRef.current = L.heatLayer(pts, { radius: 35, blur: 25, maxZoom: 17, max: 1.0, gradient: { 0.2: '#22c55e', 0.4: '#86efac', 0.6: '#fbbf24', 0.8: '#f97316', 1.0: '#ef4444' } }).addTo(map)
    }

    if (filtered.length > 0) {
      try { map.fitBounds(group.getBounds().pad(0.3)) } catch { map.setView([-1.8312, -78.1834], 7) }
    } else if (geoAnalyses.length === 0) {
      map.setView([-1.8312, -78.1834], 7)
    }
  }, [analyses, mapSevFilter, showClusters, showHeatmap, geoAnalyses])

  return (
    <div>
      {/* Toolbar */}
      <div className="dv-toolbar">
        <div className="dv-layer-group">
          {[['street', 'Mapa'], ['satellite', 'Satélite'], ['terrain', 'Terreno']].map(([key, label]) => (
            <button key={key} onClick={() => setMapLayer(key)} className={`dv-layer-btn${mapLayer === key ? ' active' : ''}`}>
              {label}
            </button>
          ))}
        </div>
        <button onClick={() => setShowHeatmap(v => !v)} className={`dv-toggle-btn dv-toggle-btn--amber${showHeatmap ? ' active' : ''}`}>
          <svg className="dv-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          Mapa de calor
        </button>
        <button onClick={() => setShowClusters(v => !v)} className={`dv-toggle-btn dv-toggle-btn--blue${showClusters ? ' active' : ''}`}>
          <svg className="dv-toggle-icon" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="3"/><circle cx="12" cy="5" r="3"/><circle cx="19" cy="12" r="3"/><circle cx="12" cy="19" r="3"/></svg>
          Agrupación
        </button>
      </div>

      {/* Map */}
      <div className="relative">
        <div ref={mapRef} style={{ height: 400, borderRadius: 20, overflow: 'hidden', zIndex: 0, border: '1px solid #e2e8f0' }} />
        {geoAnalyses.length === 0 && (
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
      </div>

      {/* Severity filter chips */}
      <div style={{ marginTop: '0.6rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
        {(['low', 'medium', 'high', 'critical']).map(bucket => {
          const active = mapSevFilter.has(bucket)
          const color  = sevColor(bucket)
          return (
            <button key={bucket} onClick={() => setMapSevFilter(prev => {
              const next = new Set(prev)
              if (next.has(bucket)) next.delete(bucket); else next.add(bucket)
              return next
            })}
              className={`dv-sev-chip${active ? ' active' : ''}`}
              style={active ? { borderColor: color, background: `${color}18`, color } : undefined}>
              <span className="dv-sev-dot" style={active ? { background: color } : undefined}></span>
              {sevLabel(bucket)}
            </button>
          )
        })}
        <button onClick={() => setMapSevFilter(new Set(['low', 'medium', 'high', 'critical']))} className="dv-sev-chip-all">
          Todos
        </button>
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
  const [analyses, setAnalyses]           = useState([])
  const [allAnalyses, setAllAnalyses]     = useState([])
  const [customers, setCustomers]         = useState([])
  const [loading, setLoading]             = useState(true)
  const [showPDF, setShowPDF]             = useState(false)
  const [selectedAnalysis, setSelectedAnalysis] = useState(null)

  const [period,   setPeriod]   = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')

  useEffect(() => {
    const params = { page_size: API_PAGE_SIZE }
    if (period !== 'all') params.range = period
    if (dateFrom) params.date_from = dateFrom
    if (dateTo)   params.date_to   = dateTo
    setLoading(true)
    Promise.allSettled([
      getAnalyses(params),
      getCustomers({ page_size: API_PAGE_SIZE }),
    ])
      .then(([ra, rc]) => {
        setAnalyses(toArray(ra.value))
        setCustomers(toArray(rc.value))
      })
      .finally(() => setLoading(false))
  }, [period, dateFrom, dateTo])

  // Historial completo, sin el filtro de período — "usuarios en riesgo de
  // abandono" necesita saber cuándo fue el ÚLTIMO análisis real de cada
  // usuario, no solo dentro del rango que se esté visualizando ahora mismo.
  useEffect(() => {
    getAnalyses({ page_size: API_PAGE_SIZE }).then(r => setAllAnalyses(toArray(r))).catch(() => {})
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

  /* ── helper: últimas 10 semanas ── */
  const lastWeeks = useMemo(() => {
    const now = new Date()
    const weeks = []
    for (let i = 9; i >= 0; i--) {
      const end = new Date(now); end.setDate(now.getDate() - i * 7)
      const start = new Date(end); start.setDate(end.getDate() - 6)
      const endOfDay = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59)
      weeks.push({ start, end: endOfDay, label: `${start.getDate()}/${start.getMonth() + 1}` })
    }
    return weeks
  }, [])

  /* ── 1. Crecimiento de usuarios registrados (curva acumulada) ── */
  const userGrowth = useMemo(() => {
    if (!customers.length) return []
    let cumulative = customers.filter(c => new Date(c.date_joined) < lastWeeks[0].start).length
    return lastWeeks.map(w => {
      const newCount = customers.filter(c => {
        const d = new Date(c.date_joined)
        return d >= w.start && d <= w.end
      }).length
      cumulative += newCount
      return { label: w.label, value: cumulative, newCount }
    })
  }, [customers, lastWeeks])

  /* ── 2. Usuarios inactivos / en riesgo de abandono (30+ días sin análisis) ──
     Usa allAnalyses (sin el filtro de período): si se filtrara por período,
     cualquier rango corto marcaría a casi todos como "inactivos" solo por
     quedar sus análisis reales fuera de la ventana seleccionada. ── */
  const inactiveUsers = useMemo(() => {
    if (!customers.length) return []
    const lastByEmail = new Map()
    allAnalyses.forEach(a => {
      const email = (a.owner_email || '').toLowerCase()
      if (!email) return
      const cur = lastByEmail.get(email)
      if (!cur || new Date(a.created_at) > new Date(cur)) lastByEmail.set(email, a.created_at)
    })
    const now = new Date()
    return customers
      .filter(c => c.role !== 'admin' && c.is_active)
      .map(c => {
        const last = lastByEmail.get((c.email || '').toLowerCase()) || null
        const daysSince = last ? Math.floor((now - new Date(last)) / 86400000) : null
        return { ...c, lastAnalysis: last, daysSince }
      })
      .filter(c => c.daysSince == null || c.daysSince >= 30)
      .sort((a, b) => {
        if (a.daysSince == null && b.daysSince == null) return 0
        if (a.daysSince == null) return -1
        if (b.daysSince == null) return 1
        return b.daysSince - a.daysSince
      })
      .slice(0, 8)
  }, [customers, allAnalyses])

  /* ── 3. Confianza promedio del modelo en el tiempo ── */
  const confidenceTrend = useMemo(() => {
    return lastWeeks
      .map(w => {
        const inWeek = analyses.filter(a => {
          const d = new Date(a.created_at)
          return d >= w.start && d <= w.end
        })
        const confs = inWeek.map(extractConfidence).filter(v => v != null && !Number.isNaN(v))
        return { label: w.label, value: confs.length ? Math.round(confs.reduce((s, v) => s + v, 0) / confs.length) : null }
      })
      .filter(w => w.value != null)
  }, [analyses, lastWeeks])

  /* ── 4. Brotes regionales (misma enfermedad, misma zona, varios agricultores, últimos 14 días) ── */
  const regionalOutbreaks = useMemo(() => {
    const now = new Date()
    const cutoff = new Date(now); cutoff.setDate(now.getDate() - 14)
    const recent = analyses.filter(a => a.latitude != null && a.longitude != null && new Date(a.created_at) >= cutoff && isRisk(a))
    const groups = new Map()
    recent.forEach(a => {
      const zoneLat = Math.round(a.latitude * 20) / 20
      const zoneLon = Math.round(a.longitude * 20) / 20
      const disease = a.disease_name_predicted || 'Sin diagnóstico'
      const key = `${zoneLat}|${zoneLon}|${disease}`
      if (!groups.has(key)) groups.set(key, { lat: zoneLat, lon: zoneLon, disease, count: 0, owners: new Set(), lastDate: a.created_at })
      const g = groups.get(key)
      g.count++
      if (a.owner_name) g.owners.add(a.owner_name)
      if (new Date(a.created_at) > new Date(g.lastDate)) g.lastDate = a.created_at
    })
    return Array.from(groups.values())
      .filter(g => g.count >= 2 && g.owners.size >= 2)
      .map(g => ({ ...g, farms: g.owners.size }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [analyses])

  /* ── 5. Volumen total de análisis en el tiempo (throughput de la plataforma) ── */
  const volumeTrend = useMemo(() => {
    return lastWeeks.map(w => {
      const count = analyses.filter(a => {
        const d = new Date(a.created_at)
        return d >= w.start && d <= w.end
      }).length
      return { label: w.label, value: count }
    })
  }, [analyses, lastWeeks])

  return (
    <>
      <section className="mb-10 fade-in-up space-y-6">

        <PageHeader
          eyebrow="Centro de control agrícola"
          title="Dashboard inteligente de análisis"
          description="Los análisis históricos se consolidan aquí para mostrar salud del cultivo, enfermedades frecuentes y patrones de actividad en tiempo real."
          info={{
            label: 'Actualización reciente',
            value: kpis.latest ? fmtFull(kpis.latest.created_at) : 'Sin actividad reciente',
            note: `${analyses.length} análisis · ${kpis.withImg} con imagen`,
          }}
          action={
            <button
              onClick={() => setShowPDF(true)}
              disabled={loading || analyses.length === 0}
              title="Exportar reporte ejecutivo PDF"
              className="dv-export-btn">
              Exportar PDF
            </button>
          }
          kpis={[
            { label: 'Registros consolidados', value: kpis.total, note: 'Análisis históricos totales', icon: 'fa-chart-column', tone: 'brand' },
            { label: 'Con imagen', value: kpis.withImg, note: 'Análisis con foto adjunta', icon: 'fa-image', tone: 'emerald' },
            { label: 'Alertas de riesgo', value: kpis.highRisk, note: 'Severidad media, alta o crítica', icon: 'fa-triangle-exclamation', tone: 'red' },
            { label: 'Enfermedad frecuente', value: kpis.topDisease, note: 'Diagnóstico más repetido', icon: 'fa-bug', tone: 'amber', small: true },
          ]}
        />

        {/* ── Filtro de período: afecta todas las gráficas de este dashboard ── */}
        <section className="mb-4 info-card p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400 mb-3">Filtrar por período</p>
          <HistoryFilterBar
            rangeOptions={RANGE_OPTIONS}
            range={period}
            onRangeChange={setPeriod}
            dateFrom={dateFrom}
            onDateFromChange={setDateFrom}
            dateTo={dateTo}
            onDateToChange={setDateTo}
            onClear={() => { setPeriod('all'); setDateFrom(''); setDateTo('') }}
          />
        </section>

        {/* ── Row growth: Crecimiento de usuarios + Volumen de análisis ── */}
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <article className="info-card p-6">
            <header className="flex items-center justify-between mb-4 gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-brand-600 font-semibold">Crecimiento</p>
                <h3 className="mt-1 panel-title text-2xl font-semibold text-slate-900">Usuarios registrados</h3>
              </div>
              <span className="text-xs px-2 py-1 bg-brand-50 text-brand-600 rounded-full border border-brand-100">
                {customers.length} usuarios totales
              </span>
            </header>
            <figure className="h-40 w-full mb-4">
              <TrendLine data={userGrowth} />
            </figure>
            <p className="text-sm text-slate-500 leading-relaxed">
              Curva acumulada de cuentas creadas en las últimas 10 semanas. Útil para medir la adopción de la plataforma y planificar capacidad.
            </p>
          </article>

          <article className="info-card p-6">
            <header className="flex items-center justify-between mb-4 gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500 font-semibold">Throughput</p>
                <h3 className="mt-1 panel-title text-2xl font-semibold text-slate-900">Volumen de análisis</h3>
              </div>
              <span className="text-xs px-2 py-1 bg-slate-50 text-slate-600 rounded-full border border-slate-200">10 semanas</span>
            </header>
            <figure className="h-40 w-full mb-4">
              <TrendLine data={volumeTrend} />
            </figure>
            <p className="text-sm text-slate-500 leading-relaxed">
              Total de análisis procesados por semana en toda la plataforma. Permite anticipar demanda de infraestructura y estacionalidad de uso.
            </p>
          </article>
        </section>

        {/* ── Row 1: Donut + Top enfermedades ── */}
        <section className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">

          {/* Sanas vs En riesgo */}
          <article className="info-card p-6">
            <header className="flex items-start justify-between gap-4 mb-5">
              <hgroup>
                <p className="text-xs uppercase tracking-[0.25em] text-brand-600 font-semibold">Salud general</p>
                <h3 className="mt-1 panel-title text-2xl font-semibold text-slate-900">Plantas sanas vs. en riesgo</h3>
              </hgroup>
              <span className="da-badge"><i className="fas fa-chart-pie mr-1"></i>Distribución</span>
            </header>

            <section className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-6 items-center">
              <figure className="flex justify-center">
                <div className="relative">
                  <HealthDonut sanas={health.sanas} sick={health.sick} size={200} thickness={36} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="panel-title text-3xl font-bold text-slate-900">{health.pctSanas}%</span>
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
          <article className="info-card p-6">
            <header className="flex items-start justify-between gap-4 mb-5">
              <hgroup>
                <p className="text-xs uppercase tracking-[0.25em] text-red-600 font-semibold">Tendencia clínica</p>
                <h3 className="mt-1 panel-title text-2xl font-semibold text-slate-900">Enfermedades más frecuentes</h3>
              </hgroup>
            </header>
            <figure className="relative h-72 w-full">
              <HBarChart data={topDiseases} />
            </figure>
          </article>
        </section>

        {/* ── Row: Confianza del modelo + Brotes regionales ── */}
        <section className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-6">
          <article className="info-card p-6">
            <header className="flex items-center justify-between mb-4 gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-brand-600 font-semibold">Calidad del modelo</p>
                <h3 className="mt-1 panel-title text-2xl font-semibold text-slate-900">Confianza promedio</h3>
              </div>
            </header>
            <figure className="h-40 w-full mb-4">
              <TrendLine data={confidenceTrend} />
            </figure>
            <p className="text-sm text-slate-500 leading-relaxed">
              Promedio semanal de confianza del clasificador. Una tendencia a la baja puede indicar imágenes de menor calidad, nuevas variedades no vistas por el modelo, o la necesidad de reentrenamiento.
            </p>
          </article>

          <article className="info-card p-6">
            <header className="flex items-center justify-between mb-4 gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-red-600 font-semibold">Vigilancia epidemiológica</p>
                <h3 className="mt-1 panel-title text-2xl font-semibold text-slate-900">Brotes regionales</h3>
              </div>
              <span className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded-full border border-red-100">Últimos 14 días</span>
            </header>
            {regionalOutbreaks.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                No se detectan brotes concentrados: ninguna zona registra la misma enfermedad en 2 o más fincas distintas en los últimos 14 días.
              </div>
            ) : (
              <ul className="space-y-3 list-none p-0 m-0">
                {regionalOutbreaks.map((g, i) => (
                  <li key={i}>
                    <article className="flex items-start gap-3 rounded-3xl border border-red-100 bg-red-50/40 p-4">
                      <figure className="mt-0.5 w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 bg-red-100 text-red-600">
                        <i className="fas fa-map-location-dot"></i>
                      </figure>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-semibold text-slate-900 truncate">{g.disease}</h4>
                        <p className="text-xs text-slate-500 mt-1">{g.farms} fincas afectadas · {g.count} casos</p>
                        <p className="text-xs text-slate-400 mt-0.5 font-mono">{g.lat.toFixed(3)}, {g.lon.toFixed(3)} · última detección {fmtShort(g.lastDate)}</p>
                      </div>
                      <span className="sev-pill sev-critical flex-shrink-0">Brote</span>
                    </article>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>

        {/* ── Mapa de calor geográfico + Panel IA ── */}
        <article className="info-card p-6">
          {/* Cabecera completa */}
          <header className="flex items-center justify-between mb-5 gap-3 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-brand-600 font-semibold">Territorio</p>
              <h3 className="mt-1 panel-title text-2xl font-semibold text-slate-900">Mapa de calor de la finca</h3>
              <p className="mt-1 text-sm text-slate-500">Distribución geográfica de detecciones por severidad</p>
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

          {/* Layout 2 columnas: mapa (izquierda) + panel (derecha) */}
          <div className="grid grid-cols-1 xl:grid-cols-[3fr_2fr] gap-6 items-stretch">
            {/* Mapa */}
            <div className="min-w-0">
              <FarmHeatmap analyses={analyses} onSelectAnalysis={setSelectedAnalysis} />
            </div>

            {/* Panel derecho: detalle de análisis seleccionado o IA */}
            <div className="min-w-0 rounded-[22px] border border-slate-200 bg-white overflow-hidden" style={{ height: 484 }}>
              {selectedAnalysis ? (() => {
                const sev     = computeSev(selectedAnalysis)
                const color   = sevColor(sev.bucket)
                const bg      = sevBg(sev.bucket)
                const confPct = extractConfidence(selectedAnalysis)
                return (
                  <div className="dv-detail">
                    <div className="dv-detail-hdr">
                      <span className="dv-detail-hdr-label">Detalle del análisis</span>
                      <button onClick={() => setSelectedAnalysis(null)} className="dv-detail-close">✕</button>
                    </div>
                    <div className="dv-detail-body">
                      <AnalysisImage src={selectedAnalysis.image_url}
                        style={{ width: '100%', height: 130, borderRadius: 12, border: '1px solid #e2e8f0' }} />
                      <div>
                        <p className="dv-detail-label">Diagnóstico</p>
                        <p className="dv-detail-title">{selectedAnalysis.disease_name_predicted || 'Sin diagnóstico'}</p>
                      </div>
                      <div>
                        <p className="dv-detail-label">Usuario</p>
                        <p className="dv-detail-sub">{selectedAnalysis.owner_name || '—'}</p>
                        {selectedAnalysis.owner_email && <p className="dv-detail-sub-muted">{selectedAnalysis.owner_email}</p>}
                      </div>
                      <div className="dv-detail-row2">
                        <div className="dv-detail-col">
                          <p className="dv-detail-label dv-detail-label--wide">Severidad</p>
                          <span className="dv-detail-sev-pill" style={{ background: bg, color }}>
                            <span className="dv-detail-sev-dot" style={{ background: color }}></span>
                            {sev.label}
                          </span>
                        </div>
                        <div className="dv-detail-col">
                          <p className="dv-detail-label dv-detail-label--wide">Confianza</p>
                          <div className="dv-detail-conf-row">
                            <div className="dv-detail-conf-track">
                              <div className="dv-detail-conf-fill" style={{ width: `${confPct}%` }}></div>
                            </div>
                            <span className="dv-detail-conf-value">{confPct.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="dv-detail-meta">
                        <div className="dv-detail-meta-row">
                          <span className="dv-detail-meta-key">Fecha</span>
                          <span className="dv-detail-meta-val">{new Date(selectedAnalysis.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                        <div className="dv-detail-meta-row">
                          <span className="dv-detail-meta-key">GPS</span>
                          <span className="dv-detail-meta-mono">{selectedAnalysis.latitude?.toFixed(5)}, {selectedAnalysis.longitude?.toFixed(5)}</span>
                        </div>
                      </div>
                      {selectedAnalysis.analysis_text && (
                        <div className="dv-detail-excerpt">
                          <p className="dv-detail-label dv-detail-label--wide">Observaciones</p>
                          <p className="dv-detail-excerpt-text dv-detail-excerpt-text--5">{selectedAnalysis.analysis_text}</p>
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
              )}
            </div>
          </div>
        </article>

        {/* ── Row 2: Usuarios + Línea de tendencia ── */}
        <section className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">

          {/* Análisis por usuario (reemplaza mapa de zonas) */}
          <article className="info-card p-6">
            <header className="flex items-center justify-between mb-4 gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-brand-600 font-semibold">Usuarios</p>
                <h3 className="mt-1 panel-title text-2xl font-semibold text-slate-900">Actividad por cliente</h3>
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
          <article className="info-card p-6">
            <header className="flex items-center justify-between mb-4 gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500 font-semibold">Actividad</p>
                <h3 className="mt-1 panel-title text-2xl font-semibold text-slate-900">Registro por día</h3>
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

        {/* ── Usuarios inactivos / en riesgo de abandono ── */}
        <article className="info-card p-6">
          <header className="flex items-center justify-between mb-4 gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-amber-600 font-semibold">Retención</p>
              <h3 className="mt-1 panel-title text-2xl font-semibold text-slate-900">Usuarios en riesgo de abandono</h3>
            </div>
            <span className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-100">
              30+ días sin análisis
            </span>
          </header>
          {inactiveUsers.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
              Todos los usuarios activos tienen análisis recientes. Sin señales de abandono por ahora.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {inactiveUsers.map((u, i) => (
                <article key={u.id ?? i} className="rounded-3xl border border-amber-100 bg-amber-50/40 p-3">
                  <p className="text-[0.68rem] uppercase tracking-[0.18em] text-slate-400">{u.role_label || 'Agricultor'}</p>
                  <h4 className="mt-1 text-sm font-semibold text-slate-900 leading-tight truncate">{u.full_name || u.username}</h4>
                  <p className="text-xs text-slate-500 mt-1 truncate">{u.email}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      {u.lastAnalysis ? `Último análisis: ${fmtShort(u.lastAnalysis)}` : 'Nunca ha analizado'}
                    </span>
                    {u.daysSince != null && (
                      <span className="text-xs font-bold text-amber-700">{u.daysSince}d</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </article>

        {/* ── Row 3: Distribución de severidad + Alertas recientes ── */}
        <section className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6 mb-8">

          {/* Distribución de severidad */}
          <article className="info-card p-6">
            <header className="flex items-center justify-between mb-4 gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500 font-semibold">Distribución clínica</p>
                <h3 className="mt-1 panel-title text-2xl font-semibold text-slate-900">Severidad de los análisis</h3>
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
          <article className="info-card p-6">
            <header className="flex items-center justify-between mb-4 gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500 font-semibold">Alertas recientes</p>
                <h3 className="mt-1 panel-title text-2xl font-semibold text-slate-900">Lo que merece atención hoy</h3>
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
                        <span className={`sev-pill ${sevPillClass(s.bucket)} flex-shrink-0`}>{s.label}</span>
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
        data={{ kpis, health, topDiseases, sevTotals, userCards, timeline, recentAlerts }}
      />
    </>
  )
}
