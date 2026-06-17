import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getAnalyses } from '../services/analysisService'
import { getFarms, getPlantHistories, getConversations } from '../services/chatbotService'

function esc(v) {
  return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function severityClass(val) {
  const s = (val||'').toLowerCase()
  if (s.includes('crít')||s.includes('crit')) return 'severity-critical'
  if (s.includes('alta')) return 'severity-high'
  if (s.includes('moder')) return 'severity-medium'
  return 'severity-low'
}

function severityBucket(val) {
  const s = (val||'').toLowerCase()
  if (s.includes('crít')||s.includes('crit')) return 'critical'
  if (s.includes('alta')) return 'high'
  if (s.includes('moder')) return 'medium'
  return 'low'
}

function fmtDate(v) {
  if (!v) return 'Sin fecha'
  const d = new Date(v)
  if (isNaN(d)) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-EC',{dateStyle:'medium',timeStyle:'short'}).format(d)
}

function fmtDateShort(v) {
  if (!v) return 'Sin fecha'
  const d = new Date(v)
  if (isNaN(d)) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-EC',{dateStyle:'long',timeStyle:'short'}).format(d)
}

const severityOrder = { baja:0, leve:0, moderada:1, alta:2, critica:3, crítica:3 }
const severityLabels = ['Baja','Moderada','Alta','Crítica']
const severityColors = ['#22c55e','#f59e0b','#fb923c','#ef4444']

export default function HistorialAnalisisPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const fichaRef = useRef(null)

  const [analyses, setAnalyses] = useState([])
  const [farms, setFarms] = useState([])
  const [plantHistories, setPlantHistories] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [showTrazabilidad, setShowTrazabilidad] = useState(false)
  const [showFicha, setShowFicha] = useState(false)
  const [tzEntries, setTzEntries] = useState([])
  const [fichaEntries, setFichaEntries] = useState([])

  const filters = [
    { key:'all', label:'Todos' },
    { key:'critical', label:'Críticos' },
    { key:'high', label:'Altos' },
    { key:'medium', label:'Moderados' },
    { key:'low', label:'Leves' },
  ]

  useEffect(() => {
    Promise.all([getAnalyses(), getFarms(), getPlantHistories()])
      .then(([a, f, ph]) => {
        setAnalyses(Array.isArray(a) ? a : a.results || [])
        setFarms(Array.isArray(f) ? f : f.results || [])
        const raw = Array.isArray(ph) ? ph : ph.results || []
        setPlantHistories(raw)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const stats = {
    total: analyses.length,
    lots: farms.length,
    critical: analyses.filter(a => severityBucket(a.severity)==='critical').length,
  }

  const filtered = analyses.filter(a => {
    const q = searchQuery.trim().toLowerCase()
    const mq = !q || (a.disease_name_predicted||'').toLowerCase().includes(q) || (a.severity||'').toLowerCase().includes(q) || (a.analysis_text||'').toLowerCase().includes(q)
    return mq && (activeFilter==='all' || severityBucket(a.severity)===activeFilter)
  })

  function getPlantKeyFromContext(ctx) {
    if (!ctx) return ''
    const p = typeof ctx === 'object'
      ? [ctx.plant_key_or_id || ctx.plantKey || ctx.plantId || '', ctx.plot || ctx.lotId || ctx.id_plot || '']
      : [String(ctx)]
    return p.filter(Boolean).join('|')
  }

  function openTrazabilidad(a) {
    console.log('TRAZABILIDAD: analysis=', a, 'plantHistories=', plantHistories)
    const myPhs = plantHistories.filter(ph => String(ph.analysis_result)===String(a.id))
    console.log('TRAZABILIDAD: myPhs=', myPhs)
    let plantKey = ''
    for (const ph of myPhs) {
      plantKey = getPlantKeyFromContext(ph.context)
      console.log('TRAZABILIDAD: ph.context=', ph.context, 'plantKey=', plantKey)
      if (plantKey) break
    }
    let entries
    if (plantKey) {
      const relatedPhs = plantHistories.filter(ph => getPlantKeyFromContext(ph.context)===plantKey)
      entries = relatedPhs.map(ph => {
        const an = analyses.find(x => String(x.id)===String(ph.analysis_result))
        return { ...ph, ...an, _phId: ph.id, _merged: true }
      }).sort((a, b) => new Date(b.created_at||0) - new Date(a.created_at||0))
    }
    if (!entries || !entries.length) {
      entries = myPhs.length ? myPhs : [a]
    }
    setTzEntries(entries)
    setShowTrazabilidad(true)
  }

  function openFicha(a) {
    const histories = plantHistories.filter(ph => ph.context && String(ph.analysis_result)==String(a.id))
    setFichaEntries(histories.length ? histories : [a])
    setShowFicha(true)
  }

  function downloadPDF() {
    const el = fichaRef.current
    if (!el) return
    import('html2canvas').then(h2c => {
      h2c.default(el, { scale:2, backgroundColor:'#ffffff', logging:false }).then(canvas => {
        const imgData = canvas.toDataURL('image/png')
        import('jspdf').then(({ jsPDF }) => {
          const pdf = new jsPDF('p','mm','a4')
          const pw = pdf.internal.pageSize.getWidth()
          const ph = (canvas.height * pw) / canvas.width
          let hl = ph, pos = 0
          pdf.addImage(imgData,'PNG',0,pos,pw,ph)
          hl -= pdf.internal.pageSize.getHeight()
          while (hl > 0) {
            pos = hl - ph
            pdf.addPage()
            pdf.addImage(imgData,'PNG',0,pos,pw,ph)
            hl -= pdf.internal.pageSize.getHeight()
          }
          pdf.save('ficha_tecnica.pdf')
        })
      })
    })
  }

  function renderAnalysisCard(a, idx) {
    const sev = a.severity || 'Sin severidad'
    const sevClass = severityClass(sev)
    const disease = a.disease_name_predicted || 'Diagnóstico pendiente'
    const preview = a.analysis_text ? a.analysis_text.substring(0,120)+'…' : 'Sin descripción'

    return (
      <article key={a.id||idx} className="analysis-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              <span className={`severity-pill ${sevClass}`}>{sev}</span>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-slate-900 leading-tight">{disease}</h3>
            <p className="text-sm text-slate-500 mt-1.5">{preview}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <button onClick={() => openTrazabilidad(a)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-brand-50 transition cursor-pointer" style={{border:'none'}}>
              <i className="fas fa-tree text-[0.78rem]"></i>
              Ver trazabilidad
            </button>
            <button onClick={() => openFicha(a)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-brand-50 transition cursor-pointer" style={{border:'none'}}>
              <i className="fas fa-file-medical text-[0.78rem]"></i>
              Ficha técnica
            </button>
            <button onClick={async () => {
              let convId = a.conversation || a.conversation_id
              if (!convId) {
                const ph = plantHistories.find(p => String(p.analysis_result) === String(a.id))
                if (ph && ph.context) {
                  try {
                    const convs = await getConversations()
                    const list = Array.isArray(convs) ? convs : convs.results || []
                    const match = list.find(c => c.context && String(c.context) === String(ph.context))
                    if (match) convId = match.id
                  } catch {}
                }
              }
              navigate('/chatbot', { state: { conversationId: convId } })
            }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-brand-100 bg-brand-50 px-3.5 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100 transition flex-shrink-0 cursor-pointer" style={{border:'none'}}>
              Abrir en chat
              <i className="fas fa-arrow-up-right-from-square text-[0.78rem]"></i>
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 mt-4 text-sm">
          <div className="rounded-xl bg-slate-50 p-2.5">
            <p className="text-[0.62rem] uppercase tracking-[0.18em] text-slate-400 font-semibold">Ubicación</p>
            <p className="mt-1 text-slate-700 leading-relaxed">Lote {a.id || '—'}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-2.5">
            <p className="text-[0.62rem] uppercase tracking-[0.18em] text-slate-400 font-semibold">Confianza</p>
            <p className="mt-1 text-slate-700 leading-relaxed">{a.confidence_percent || '—'}%</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-2.5">
            <p className="text-[0.62rem] uppercase tracking-[0.18em] text-slate-400 font-semibold">Severidad</p>
            <p className="mt-1 text-slate-700 leading-relaxed">{sev}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-2.5">
            <p className="text-[0.62rem] uppercase tracking-[0.18em] text-slate-400 font-semibold">Fecha</p>
            <p className="mt-1 text-slate-700 leading-relaxed">{a.created_at ? fmtDate(a.created_at) : '—'}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100">
          {a.image_url && (
            <img src={a.image_url} alt="" className="w-10 h-10 rounded-lg border border-slate-200 object-cover" />
          )}
          <p className="text-xs text-slate-400 ml-auto">Creado {a.created_at ? fmtDate(a.created_at) : '—'}</p>
        </div>
      </article>
    )
  }

  return (
    <>
      <style>{`
        *{box-sizing:border-box}
        body{font-family:'Inter',sans-serif;color:#0f172a;margin:0}
        .font-cormorant{font-family:'Cormorant Garamond',serif}
        .page-shell{position:relative;overflow:hidden;min-height:100vh}
        .botanical{position:absolute;inset:auto auto -4rem -4rem;width:20rem;opacity:.08;pointer-events:none}
        .botanical-right{position:absolute;inset:0 -4rem auto auto;width:18rem;opacity:.08;pointer-events:none;transform:scaleX(-1)}
        .glass-card{background:#fff;border:1px solid #eef2f7;border-radius:1rem}
        .stat-card{background:#fff;border:1px solid #e5e7eb;border-radius:18px}
        .analysis-card{background:#fff;border:1px solid #e5e7eb;border-radius:18px;transition:border-color .16s ease,background .16s ease}
        .analysis-card:hover{border-color:#bbf7d0;background:#f8fafc}
        .severity-pill{display:inline-flex;align-items:center;gap:.35rem;padding:.25rem .55rem;border-radius:9999px;font-size:.62rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
        .severity-low{background:#ecfdf5;color:#166534}
        .severity-medium{background:#fefce8;color:#a16207}
        .severity-high{background:#fff7ed;color:#c2410c}
        .severity-critical{background:#fef2f2;color:#b91c1c}
        .chip{border:1px solid #e5e7eb;background:#fff;border-radius:9999px;padding:.4rem .75rem;font-size:.8rem;color:#334155;transition:background .14s ease,border-color .14s ease,color .14s ease;cursor:pointer}
        .chip.active{background:#dcfce7;border-color:#bbf7d0;color:#166534}
        .search-input{width:100%;border:1px solid #dbe4ee;border-radius:14px;padding:.78rem .9rem .78rem 2.5rem;background:#fff;outline:none;transition:border-color .14s ease,box-shadow .14s ease}
        .search-input:focus{border-color:#16a34a;box-shadow:0 0 0 3px rgba(22,163,74,.12)}
        .detail-section{border:1px solid #e5e7eb;background:#fff;border-radius:22px;padding:1rem}
        .detail-section-title{font-size:.78rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#166534}
        .detail-field{display:flex;flex-direction:column;gap:.15rem}
        .detail-field-label{font-size:.62rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#94a3b8}
        .detail-field-value{font-size:.9rem;color:#0f172a;line-height:1.4}
      `}</style>

      <div className="page-shell">
        <svg className="botanical" viewBox="0 0 220 280" aria-hidden="true">
          <path d="M40 270 C40 190 80 160 65 70" stroke="#16a34a" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M65 70 C65 70 20 50 8 15" stroke="#16a34a" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <path d="M65 70 C65 70 115 45 130 8" stroke="#16a34a" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <path d="M52 155 C52 155 8 142 -8 122" stroke="#16a34a" strokeWidth="1" fill="none" strokeLinecap="round" />
          <path d="M52 155 C52 155 96 130 120 112" stroke="#16a34a" strokeWidth="1" fill="none" strokeLinecap="round" />
          <ellipse cx="130" cy="8" rx="13" ry="7.5" fill="#16a34a" opacity=".55" transform="rotate(-30 130 8)" />
          <ellipse cx="-8" cy="122" rx="11" ry="6" fill="#16a34a" opacity=".55" transform="rotate(20 -8 122)" />
          <ellipse cx="120" cy="112" rx="12" ry="6.5" fill="#16a34a" opacity=".55" transform="rotate(-15 120 112)" />
        </svg>
        <svg className="botanical-right" viewBox="0 0 220 280" aria-hidden="true">
          <path d="M40 270 C40 190 80 160 65 70" stroke="#16a34a" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M65 70 C65 70 20 50 8 15" stroke="#16a34a" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <path d="M65 70 C65 70 115 45 130 8" stroke="#16a34a" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <path d="M52 155 C52 155 8 142 -8 122" stroke="#16a34a" strokeWidth="1" fill="none" strokeLinecap="round" />
          <path d="M52 155 C52 155 96 130 120 112" stroke="#16a34a" strokeWidth="1" fill="none" strokeLinecap="round" />
          <ellipse cx="130" cy="8" rx="13" ry="7.5" fill="#16a34a" opacity=".55" transform="rotate(-30 130 8)" />
          <ellipse cx="-8" cy="122" rx="11" ry="6" fill="#16a34a" opacity=".55" transform="rotate(20 -8 122)" />
          <ellipse cx="120" cy="112" rx="12" ry="6.5" fill="#16a34a" opacity=".55" transform="rotate(-15 120 112)" />
        </svg>

        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white" style={{position:'sticky'}}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-600 via-green-500 to-emerald-400 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-8 2 4-4 8.5-4 8.5-4-8 3.5-9 6-9 6A8 8 0 0 1 17 8z"/></svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-green-700">Pitahaya Vision</p>
                  <h1 className="font-cormorant text-2xl sm:text-[2rem] font-semibold text-slate-900 leading-tight">Historial de análisis</h1>
                </div>
              </div>
              <button onClick={() => navigate('/chatbot')}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                style={{border:'none'}}
              >
                <i className="fas fa-arrow-left text-[0.8rem]"></i>
                Volver al chat
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <section className="glass-card rounded-2xl p-4 sm:p-5 mb-5">
            <div className="grid gap-5 lg:grid-cols-[1.25fr_.85fr] lg:items-center">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 text-brand-700 border border-brand-100 px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.18em]">
                  <i className="fas fa-chart-line text-[0.7rem]"></i>
                  Registro histórico
                </span>
                <h2 className="font-cormorant text-2xl sm:text-3xl font-semibold text-slate-900 mt-3 leading-tight">
                  Revisa cada caso, el contexto de la planta y la decisión que se tomó.
                </h2>
                <p className="text-slate-500 mt-2 max-w-2xl leading-relaxed text-sm sm:text-base">
                  Esta vista resume el análisis guardado desde el chatbot para consultar lotes, plantas, síntomas y estados sanitarios sin perder el hilo entre conversaciones.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <div className="stat-card p-3.5">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400 font-semibold">Análisis</p>
                  <p className="text-2xl font-semibold text-slate-900 mt-1.5">{stats.total}</p>
                  <p className="text-xs text-slate-500 mt-1">guardados</p>
                </div>
                <div className="stat-card p-3.5">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400 font-semibold">Lotes</p>
                  <p className="text-2xl font-semibold text-slate-900 mt-1.5">{stats.lots}</p>
                  <p className="text-xs text-slate-500 mt-1">con contexto</p>
                </div>
                <div className="stat-card p-3.5">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400 font-semibold">Casos críticos</p>
                  <p className="text-2xl font-semibold text-slate-900 mt-1.5">{stats.critical}</p>
                  <p className="text-xs text-slate-500 mt-1">requieren prioridad</p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="relative">
              <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input type="search" className="search-input" placeholder="Buscar por lote, planta, síntoma o diagnóstico..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2">
              {filters.map(f => (
                <button key={f.key} className={`chip ${activeFilter===f.key?'active':''}`}
                  onClick={() => setActiveFilter(f.key)} style={{border:'none',cursor:'pointer'}}>
                  {f.label}
                </button>
              ))}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div>
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Análisis recientes</h3>
                <p className="text-sm text-slate-500">{filtered.length} resultado{filtered.length!==1?'s':''}</p>
              </div>

              {loading ? (
                <div className="stat-card p-6 text-center mt-4 text-slate-500">Cargando...</div>
              ) : !analyses.length ? (
                <div className="stat-card p-6 text-center mt-4">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-3">
                    <i className="fas fa-notes-medical text-2xl"></i>
                  </div>
                  <h4 className="font-cormorant text-xl font-semibold text-slate-900">Aún no hay análisis guardados</h4>
                  <p className="text-slate-500 mt-2 max-w-md mx-auto text-sm">Vuelve al chat, registra el contexto de la planta y envía una imagen para que el historial empiece a llenarse.</p>
                  <button onClick={() => navigate('/chatbot')}
                    className="inline-flex items-center gap-2 mt-4 px-3.5 py-2 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 transition text-sm cursor-pointer"
                    style={{border:'none'}}
                  >
                    <i className="fas fa-arrow-left text-[0.8rem]"></i>
                    Ir al chat
                  </button>
                </div>
              ) : !filtered.length ? (
                <div className="stat-card p-6 text-slate-500">No se encontraron análisis con esos filtros.</div>
              ) : (
                <div className="grid gap-4">
                  {filtered.map((a,i) => renderAnalysisCard(a,i))}
                </div>
              )}
            </div>

            <aside className="space-y-4">
              <div className="stat-card p-4">
                <h4 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Qué muestra</h4>
                <div className="mt-3 space-y-2.5 text-sm text-slate-600 leading-relaxed">
                  <p><span className="font-semibold text-slate-900">Ubicación:</span> lote, zona, hilera y referencia exacta.</p>
                  <p><span className="font-semibold text-slate-900">Estado:</span> síntoma principal, órgano afectado, fase y severidad.</p>
                  <p><span className="font-semibold text-slate-900">Manejo:</span> riego reciente y tratamiento fitosanitario.</p>
                </div>
              </div>
              <div className="stat-card p-4">
                <h4 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Decisión rápida</h4>
                <p className="text-slate-600 mt-3 leading-relaxed text-sm">
                  Usa esta pantalla para identificar patrones por lote y revisar qué plantas requieren seguimiento antes de volver a escanear.
                </p>
              </div>
            </aside>
          </section>
        </main>
      </div>

      {/* ── TRAZABILIDAD MODAL ── */}
      {showTrazabilidad && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowTrazabilidad(false)}>
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-cormorant text-xl font-semibold text-slate-900">Trazabilidad de análisis</h2>
                <p className="text-sm text-slate-500 mt-0.5">{tzEntries.length} análisis encontrados</p>
              </div>
              <button onClick={() => setShowTrazabilidad(false)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center flex-shrink-0 cursor-pointer" style={{border:'none',background:'none'}}>
                <i className="fas fa-times text-slate-500"></i>
              </button>
            </div>
            <div className="p-6 space-y-2">
              {tzEntries.map((entry, idx) => {
                const disease = entry.disease_name_predicted || entry.final_diagnosis || '—'
                const sev = entry.severity || '—'
                const sevClass = severityClass(sev)
                const dateStr = fmtDateShort(entry.created_at)
                const imgSrc = entry.image_url || ''
                const analysis = entry.analysis_text || entry.notes || '—'
                const isLast = idx === tzEntries.length - 1
                const prob = entry.confidence_percent || (entry.confidence ? Math.round(entry.confidence*100) : '') || '—'
                let location = ''
                if (entry.context && typeof entry.context === 'object') {
                  const ctx = entry.context
                  location = [ctx.plant_key_or_id || ctx.plantKey || ctx.plantId, ctx.plot || ctx.lotId || ctx.id_plot].filter(Boolean).join(' · ')
                } else if (entry._merged) {
                  const ph2 = plantHistories.find(p => p.id === entry._phId)
                  if (ph2 && ph2.context && typeof ph2.context === 'object') {
                    const ctx = ph2.context
                    location = [ctx.plant_key_or_id || ctx.plantKey || ctx.plantId, ctx.plot || ctx.lotId || ctx.id_plot].filter(Boolean).join(' · ')
                  }
                }
                return (
                  <div key={entry.id || idx} className="relative pl-9 pb-5">
                    {idx < tzEntries.length - 1 && <div className="absolute left-[13px] top-4 bottom-0 w-0.5 bg-slate-200"></div>}
                    <div className={`absolute left-[7px] top-[7px] w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${!isLast ? 'bg-slate-300' : 'bg-brand-500'}`} style={{boxShadow:`0 0 0 2px ${!isLast ? '#cbd5e1' : '#22c55e'}`}}></div>
                    <div className="analysis-card p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className={`severity-pill ${sevClass}`}>{sev}</span>
                            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold">{prob}%</span>
                            {isLast && <span className="severity-pill severity-low"><i className="fas fa-clock text-[0.6rem]"></i> Último</span>}
                          </div>
                          <p className="text-sm text-slate-500">{dateStr}</p>
                        </div>
                        {imgSrc ? (
                          <img src={imgSrc} alt="" className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl border border-slate-200 object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">
                            <i className="fas fa-image text-xl"></i>
                          </div>
                        )}
                      </div>
                      <div className="grid gap-1.5 sm:grid-cols-2 text-sm mb-3">
                        <p><span className="font-semibold text-slate-800">Diagnóstico:</span> <span className="text-slate-700">{disease}</span></p>
                        <p><span className="font-semibold text-slate-800">Ubicación:</span> <span className="text-slate-700">{location || '—'}</span></p>
                      </div>
                      {analysis !== '—' && (
                        <div className="text-sm text-slate-700 bg-slate-50 rounded-xl p-3 leading-relaxed">{analysis}</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="p-5 border-t border-slate-200 text-center">
              <button onClick={() => setShowTrazabilidad(false)} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition cursor-pointer" style={{border:'none'}}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── FICHA TÉCNICA MODAL ── */}
      {showFicha && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowFicha(false)}>
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-cormorant text-xl font-semibold text-slate-900">Ficha técnica</h2>
                <p className="text-sm text-slate-500 mt-0.5">{fichaEntries.length} análisis registrados</p>
              </div>
              <button onClick={() => setShowFicha(false)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center flex-shrink-0 cursor-pointer" style={{border:'none',background:'none'}}>
                <i className="fas fa-times text-slate-500"></i>
              </button>
            </div>
            <div ref={fichaRef} className="p-5 space-y-4">
              {/* Summary */}
              <div className="detail-section">
                <p className="detail-section-title mb-3">Resumen</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="detail-field">
                    <span className="detail-field-label">Total análisis</span>
                    <span className="detail-field-value font-bold text-brand-700">{fichaEntries.length}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-field-label">Último análisis</span>
                    <span className="detail-field-value">{fmtDateShort(fichaEntries[fichaEntries.length-1]?.created_at)}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-field-label">Diagnóstico más frecuente</span>
                    <span className="detail-field-value">
                      {(() => {
                        const diseases = fichaEntries.map(e => e.disease_name_predicted || e.final_diagnosis || '—').filter(Boolean)
                        const freq = {}
                        diseases.forEach(d => { freq[d] = (freq[d]||0)+1 })
                        const top = Object.entries(freq).sort((a,b) => b[1]-a[1])
                        return top.length ? top[0][0] : '—'
                      })()}
                    </span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-field-label">Severidad promedio</span>
                    <span className="detail-field-value">
                      {(() => {
                        const levels = fichaEntries.map(e => severityOrder[(e.severity||'').toLowerCase()] ?? -1).filter(l => l>=0)
                        if (!levels.length) return '—'
                        const avg = levels.reduce((a,b)=>a+b,0)/levels.length
                        return severityLabels[Math.round(avg)] || '—'
                      })()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Severity distribution */}
              <div className="detail-section">
                <p className="detail-section-title mb-3">Distribución de severidad</p>
                <div className="space-y-2">
                  {(() => {
                    const counts = [0,0,0,0]
                    fichaEntries.forEach(e => {
                      const idx = severityOrder[(e.severity||'').toLowerCase()]
                      if (idx !== undefined && idx >= 0 && idx <= 3) counts[idx]++
                    })
                    const max = Math.max(...counts, 1)
                    return severityLabels.map((label, idx) => {
                      const pct = Math.round((counts[idx] / fichaEntries.length) * 100)
                      return (
                        <div key={label} className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-slate-600 w-20 text-right">{label}</span>
                          <div className="flex-1 h-5 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{width:`${Math.max(4,(counts[idx]/max)*100)}%`,background:severityColors[idx]}}></div>
                          </div>
                          <span className="text-xs font-semibold text-slate-700 w-10">{counts[idx]} ({pct}%)</span>
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>

              {/* Image gallery */}
              <div className="detail-section">
                <p className="detail-section-title mb-3">Galería de imágenes</p>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {fichaEntries.filter(e => e.image_url).map((e,i) => (
                    <div key={i} className="flex-shrink-0 w-48">
                      <img src={e.image_url} alt="" className="w-48 h-32 rounded-xl border border-slate-200 object-cover" />
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`severity-pill ${severityClass(e.severity)}`}>{e.severity || '—'}</span>
                        <span className="text-xs text-slate-500">{fmtDateShort(e.created_at)}</span>
                      </div>
                    </div>
                  ))}
                  {!fichaEntries.some(e => e.image_url) && (
                    <div className="text-sm text-slate-400 py-4">Sin imágenes disponibles</div>
                  )}
                </div>
              </div>

              {/* Timeline */}
              <div className="detail-section">
                <p className="detail-section-title mb-3">Línea de tiempo de análisis</p>
                {[...fichaEntries].reverse().map((e,i) => {
                  const sevClass = severityClass(e.severity)
                  const disease = e.disease_name_predicted || e.final_diagnosis || '—'
                  const isFirst = i === 0
                  return (
                    <div key={i} className="relative pl-8 pb-4">
                      {i < fichaEntries.length-1 && <div className="absolute left-[11px] top-4 bottom-0 w-0.5 bg-slate-200"></div>}
                      <div className={`absolute left-[5px] top-[6px] w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${isFirst ? 'bg-brand-500' : 'bg-slate-300'}`} style={{boxShadow:`0 0 0 2px ${isFirst ? '#22c55e' : '#cbd5e1'}`}}></div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">{disease}</p>
                          <p className="text-xs text-slate-500">{fmtDateShort(e.created_at)}</p>
                        </div>
                        <span className={`severity-pill ${sevClass} flex-shrink-0`}>{e.severity || '—'}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="p-5 border-t border-slate-200 flex items-center gap-3 justify-center">
              <button onClick={downloadPDF} className="px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition shadow-sm cursor-pointer" style={{border:'none'}}>
                <i className="fas fa-file-pdf mr-1.5"></i> Descargar PDF
              </button>
              <button onClick={() => setShowFicha(false)} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition cursor-pointer" style={{border:'none'}}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
