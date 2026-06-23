import { useEffect, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const B  = { 50:'#f0fdf4',100:'#dcfce7',200:'#bbf7d0',300:'#86efac',400:'#4ade80',500:'#22c55e',600:'#16a34a',700:'#15803d',800:'#166534' }
const SL = { 50:'#f8fafc',100:'#f1f5f9',200:'#e2e8f0',300:'#cbd5e1',400:'#94a3b8',500:'#64748b',600:'#475569',700:'#334155',800:'#1e293b',900:'#0f172a' }
const R  = { red:'#dc2626',redL:'#fef2f2',redB:'#fecaca', ora:'#ea580c',oraL:'#fff7ed',oraB:'#fed7aa', amb:'#d97706',ambL:'#fffbeb',ambB:'#fde68a', blu:'#2563eb',bluL:'#eff6ff',bluB:'#bfdbfe', pur:'#7c3aed',purL:'#f5f3ff',purB:'#ddd6fe', tea:'#0d9488',teaL:'#f0fdfa',teaB:'#99f6e4' }

const SERIF = "'Cormorant Garamond', Georgia, serif"
const SANS  = "Inter, -apple-system, 'Segoe UI', Arial, sans-serif"
const W     = 800                              // template width px
const PAGE_H = Math.round(W * 297 / 210)      // ≈ 1131 px per A4 page
const PAD   = 48                               // horizontal margin

const BAR_COLORS = [B[600],'#0284c7',R.ora,R.amb,R.pur,R.tea,'#db2777']

// ─── Page-cut avoidance ───────────────────────────────────────────────────────
function avoidPageCuts(template) {
  template.querySelectorAll('[data-pdf-spacer]').forEach(el => el.remove())
  for (let iter = 0; iter < 15; iter++) {
    const sections = [...template.querySelectorAll('[data-section]')]
    let changed = false
    for (const s of sections) {
      const top = s.offsetTop, bottom = top + s.offsetHeight
      const boundary = (Math.floor(top / PAGE_H) + 1) * PAGE_H
      if (bottom > boundary && top < boundary) {
        const div = document.createElement('div')
        div.setAttribute('data-pdf-spacer', '')
        div.style.cssText = `display:block;height:${boundary - top + 4}px;background:transparent;`
        s.parentElement.insertBefore(div, s)
        changed = true; break
      }
    }
    if (!changed) break
  }
}

// ─── Brand logo SVG ───────────────────────────────────────────────────────────
function BrandLogo({ size = 22, color = B[700] }) {
  return (
    <svg viewBox="0 0 24 24" style={{ width: size, height: size, fill: color, display: 'block', flexShrink: 0 }}>
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-8 2 4-4 8.5-4 8.5-4-8 3.5-9 6-9 6A8 8 0 0 1 17 8z"/>
    </svg>
  )
}

// ─── FA icon ──────────────────────────────────────────────────────────────────
function Icon({ name, color = SL[500], size = 13 }) {
  return <i className={`fas fa-${name}`} style={{ fontSize: size, color, lineHeight: 1, display: 'inline-block' }} />
}

// ─── SVG Health Donut ─────────────────────────────────────────────────────────
function HealthDonut({ pctHealthy, size = 130, thick = 18 }) {
  const pctSick = 100 - pctHealthy
  const r  = size / 2 - thick / 2 - 3
  const cx = size / 2, cy = size / 2
  const circ = 2 * Math.PI * r
  const dH   = (pctHealthy / 100) * circ
  const dS   = (pctSick / 100) * circ
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
        style={{ display: 'block', transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={SL[100]} strokeWidth={thick} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={B[500]} strokeWidth={thick}
          strokeDasharray={`${dH} ${circ - dH}`} strokeLinecap="butt" />
        {pctSick > 0 && (
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={R.red} strokeWidth={thick}
            strokeDasharray={`${dS} ${circ - dS}`}
            strokeDashoffset={-dH} strokeLinecap="butt" />
        )}
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <div style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 600, color: SL[900], lineHeight: 1 }}>{pctHealthy}<span style={{ fontSize: 14 }}>%</span></div>
        <div style={{ fontFamily: SANS, fontSize: 8.5, color: SL[400], marginTop: 3, letterSpacing: '0.1em', textTransform: 'uppercase' }}>sano</div>
      </div>
    </div>
  )
}

// ─── SVG Timeline bar chart ───────────────────────────────────────────────────
function TimelineChart({ data }) {
  if (!data?.length) return null
  const W_chart = W - PAD * 2 - 44  // usable width inside card (minus card padding)
  const H_chart = 90
  const max  = Math.max(...data.map(d => d.value), 1)
  const barW = Math.max(Math.floor((W_chart - 20) / data.length) - 8, 10)
  const chartTop = 16, chartBot = H_chart - 22
  const chartH   = chartBot - chartTop

  return (
    <svg width={W_chart} height={H_chart} viewBox={`0 0 ${W_chart} ${H_chart}`} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id="tl-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={B[400]} />
          <stop offset="100%" stopColor={B[700]} />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {[0.25, 0.5, 0.75, 1.0].map((f, i) => {
        const y = chartBot - f * chartH
        return (
          <g key={i}>
            <line x1={28} y1={y} x2={W_chart} y2={y} stroke={SL[100]} strokeWidth={1} strokeDasharray="3,3" />
            <text x={24} y={y + 3} textAnchor="end" fontSize={7.5} fill={SL[400]} fontFamily={SANS}>
              {Math.round(max * f)}
            </text>
          </g>
        )
      })}
      {/* Baseline */}
      <line x1={28} y1={chartBot} x2={W_chart} y2={chartBot} stroke={SL[200]} strokeWidth={1} />
      {/* Bars */}
      {data.map((d, i) => {
        const x  = 30 + i * (barW + 8)
        const bH = Math.max((d.value / max) * chartH, 3)
        const y  = chartBot - bH
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={bH} rx={4} fill="url(#tl-grad)"
              opacity={0.65 + (i / data.length) * 0.35} />
            <text x={x + barW / 2} y={y - 3} textAnchor="middle" fontSize={9.5}
              fill={SL[700]} fontFamily={SANS} fontWeight="600">{d.value}</text>
            <text x={x + barW / 2} y={H_chart - 3} textAnchor="middle" fontSize={8}
              fill={SL[400]} fontFamily={SANS}>{d.label}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── Pill ─────────────────────────────────────────────────────────────────────
function Pill({ label, color, bg, border }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', padding:'3px 10px', borderRadius:99, fontSize:10, fontWeight:700, letterSpacing:'0.04em', fontFamily:SANS, color, background:bg, border:`1px solid ${border||color+'33'}` }}>
      {label}
    </span>
  )
}

function RiskPill({ rate }) {
  if (rate >= 0.6) return <Pill label={`Crítico · ${Math.round(rate*100)}%`} color={R.red}   bg={R.redL} border={R.redB} />
  if (rate >= 0.3) return <Pill label={`Medio · ${Math.round(rate*100)}%`}  color={R.amb}   bg={R.ambL} border={R.ambB} />
  if (rate >  0)   return <Pill label={`Bajo · ${Math.round(rate*100)}%`}   color={B[700]}  bg={B[50]}  border={B[200]} />
  return                   <Pill label="Sin alertas"                          color={SL[500]} bg={SL[100]} border={SL[200]} />
}

// ─── Section label with number ────────────────────────────────────────────────
let _sectionCounter = 0
function resetSections() { _sectionCounter = 0 }
function SectionLabel({ icon, children }) {
  _sectionCounter++
  const num = String(_sectionCounter).padStart(2, '0')
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
      <div style={{ width:28, height:28, borderRadius:9, background:B[50], border:`1px solid ${B[200]}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <span style={{ fontFamily:SANS, fontSize:9.5, fontWeight:800, color:B[700] }}>{num}</span>
      </div>
      {icon && <Icon name={icon} color={B[600]} size={12} />}
      <span style={{ fontFamily:SANS, fontSize:10, fontWeight:700, letterSpacing:'0.18em', textTransform:'uppercase', color:B[700] }}>{children}</span>
      <div style={{ flex:1, height:1, background:B[100] }} />
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────
function Card({ children, style }) {
  return (
    <div style={{ background:'#fff', border:`1px solid rgba(226,232,240,0.85)`, borderRadius:22, padding:'20px 22px', boxShadow:'0 1px 8px rgba(0,0,0,0.04)', ...style }}>
      {children}
    </div>
  )
}

// ─── Bar row with rank + percentage ──────────────────────────────────────────
function Bar({ label, value, pct, total, index }) {
  const pctLabel = total ? Math.round((value / total) * 100) : (pct ?? 0)
  const barW     = pct ?? Math.round((value / (total || 1)) * 100)
  const col      = BAR_COLORS[index % BAR_COLORS.length]
  const isTop    = index === 0
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
      <div style={{ width:24, height:24, borderRadius:8, background: isTop ? col : SL[100], display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <span style={{ fontFamily:SANS, fontSize:10, fontWeight:800, color: isTop ? '#fff' : SL[400] }}>#{index+1}</span>
      </div>
      <span style={{ width:190, fontFamily:SANS, fontSize:11, fontWeight:500, color:SL[600], overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flexShrink:0 }} title={label}>{label}</span>
      <div style={{ flex:1, height:12, background:SL[100], borderRadius:99, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${Math.max(barW, 3)}%`, background:col, borderRadius:99 }} />
      </div>
      <div style={{ flexShrink:0, textAlign:'right', minWidth:56 }}>
        <span style={{ fontFamily:SERIF, fontSize:15, fontWeight:600, color:SL[800] }}>{value}</span>
        <span style={{ fontFamily:SANS, fontSize:9.5, color:SL[400], marginLeft:4 }}>{pctLabel}%</span>
      </div>
    </div>
  )
}

// ─── Table ────────────────────────────────────────────────────────────────────
function Table({ columns, rows }) {
  return (
    <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:SANS }}>
      <thead>
        <tr style={{ background:SL[50] }}>
          {columns.map((c, i) => (
            <th key={i} style={{ padding:'9px 12px', textAlign:c.right?'right':'left', fontSize:9, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:SL[400], borderBottom:`2px solid ${B[100]}`, whiteSpace:'nowrap' }}>{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ background: i%2===0 ? '#fff' : SL[50] }}>
            {columns.map((c, j) => (
              <td key={j} style={{ padding:'9px 12px', fontSize:11, color:SL[700], borderBottom:`1px solid ${SL[100]}`, textAlign:c.right?'right':'left', verticalAlign:'middle' }}>
                {c.render ? c.render(row) : (row[c.key] ?? '—')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ─── KPI grid ─────────────────────────────────────────────────────────────────
function KpiGrid({ items }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:`repeat(${items.length},1fr)`, gap:14 }}>
      {items.map((k, i) => (
        <div key={i} style={{ background:'#fff', border:`1px solid rgba(226,232,240,0.85)`, borderRadius:22, padding:'18px 18px 16px', position:'relative', overflow:'hidden', boxShadow:'0 1px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:k.accent, borderRadius:'22px 22px 0 0' }} />
          <div style={{ width:38, height:38, borderRadius:12, background:k.iconBg, border:`1px solid ${k.iconBorder}`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }}>
            <Icon name={k.icon} color={k.iconColor} size={16} />
          </div>
          <div style={{ fontFamily:SERIF, fontSize:32, fontWeight:600, color:SL[900], lineHeight:1, letterSpacing:'-0.02em' }}>{k.value}</div>
          <div style={{ fontFamily:SANS, fontSize:10.5, fontWeight:500, color:SL[500], marginTop:6, lineHeight:1.35 }}>{k.label}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Executive summary prose ──────────────────────────────────────────────────
function ExecutiveSummary({ bullets, highlights }) {
  return (
    <div data-section="exec" style={{ marginBottom:24 }}>
      <Card style={{ background:`linear-gradient(135deg, ${B[50]} 0%, #fff 60%)`, borderColor: B[200] }}>
        <div style={{ display:'flex', gap:20, alignItems:'flex-start' }}>
          <div style={{ width:40, height:40, borderRadius:13, background:`linear-gradient(135deg,${B[600]},${B[800]})`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}>
            <Icon name="clipboard-list" color="#fff" size={17} />
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:SANS, fontSize:9.5, fontWeight:700, letterSpacing:'0.18em', textTransform:'uppercase', color:B[700], marginBottom:10 }}>Resumen ejecutivo</div>
            <div style={{ fontFamily:SANS, fontSize:11.5, color:SL[600], lineHeight:1.75 }}>
              {bullets.map((b, i) => <div key={i} style={{ marginBottom: i < bullets.length - 1 ? 4 : 0 }}>· {b}</div>)}
            </div>
          </div>
        </div>
        {highlights?.length > 0 && (
          <div style={{ display:'flex', gap:10, marginTop:16, paddingTop:16, borderTop:`1px solid ${B[100]}`, flexWrap:'wrap' }}>
            {highlights.map((h, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:7, background:'#fff', border:`1px solid ${B[200]}`, borderRadius:12, padding:'6px 12px' }}>
                <Icon name={h.icon} color={h.color||B[600]} size={11} />
                <span style={{ fontFamily:SANS, fontSize:10.5, fontWeight:600, color:SL[700] }}>{h.label}</span>
                <span style={{ fontFamily:SERIF, fontSize:14, fontWeight:600, color:h.color||B[700] }}>{h.value}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

// ─── Page header ─────────────────────────────────────────────────────────────
function PageHeader({ title, subtitle, generatedAt, meta, refCode }) {
  return (
    <div>
      <div style={{ height:5, background:`linear-gradient(90deg,${B[800]},${B[400]},${B[800]})` }} />
      <div style={{ padding:`24px ${PAD}px 20px`, background:'#fff', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:24 }}>
        {/* Brand */}
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:52, height:52, borderRadius:16, background:B[50], border:`1.5px solid ${B[200]}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <BrandLogo size={26} color={B[700]} />
          </div>
          <div>
            <div style={{ fontFamily:SERIF, fontSize:26, fontWeight:600, color:B[700], lineHeight:1, letterSpacing:'-0.01em' }}>Pitahaya Vision</div>
            <div style={{ fontFamily:SANS, fontSize:8.5, fontWeight:700, letterSpacing:'0.22em', textTransform:'uppercase', color:SL[400], marginTop:5 }}>
              Sistema de Monitoreo Fitosanitario · UNEMI
            </div>
          </div>
        </div>
        {/* Meta */}
        <div style={{ textAlign:'right' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:7, background:B[50], border:`1px solid ${B[200]}`, borderRadius:99, padding:'5px 14px 5px 11px', marginBottom:10 }}>
            <Icon name="file-lines" color={B[600]} size={11} />
            <span style={{ fontFamily:SANS, fontSize:9.5, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:B[700] }}>{title}</span>
          </div>
          <div style={{ fontFamily:SANS, fontSize:10.5, color:SL[500], lineHeight:1.9 }}>
            {meta?.map((m, i) => <div key={i} style={{ fontWeight: i===0 ? 600 : 400, color: i===0 ? SL[700] : SL[400] }}>{m}</div>)}
            <div style={{ color:SL[400] }}>{generatedAt}</div>
          </div>
          {refCode && <div style={{ fontFamily:'monospace', fontSize:9, color:SL[300], marginTop:4, letterSpacing:'0.1em' }}>{refCode}</div>}
        </div>
      </div>
      {/* Subtitle band */}
      <div style={{ background:B[50], borderTop:`1px solid ${B[200]}`, borderBottom:`1px solid ${B[200]}`, padding:`10px ${PAD}px`, display:'flex', alignItems:'center', gap:10 }}>
        <Icon name="leaf" color={B[500]} size={12} />
        <span style={{ fontFamily:SERIF, fontSize:17, fontStyle:'italic', color:SL[700] }}>{subtitle}</span>
      </div>
    </div>
  )
}

// ─── Page footer ─────────────────────────────────────────────────────────────
function PageFooter({ mode }) {
  return (
    <div data-section="footer">
      <div style={{ borderTop:`1px solid ${SL[100]}`, padding:`10px ${PAD}px`, background:SL[50] }}>
        <p style={{ fontFamily:SANS, fontSize:8.5, color:SL[400], lineHeight:1.65, maxWidth:640, margin:0 }}>
          <strong style={{ color:SL[500] }}>Aviso:</strong> Este documento fue generado automáticamente por el sistema Pitahaya Vision como
          herramienta de apoyo al monitoreo fitosanitario. Los datos reflejan los registros disponibles a la fecha de generación y tienen
          carácter informativo. Para decisiones agronómicas críticas se recomienda la validación por un técnico especializado en sanidad vegetal.
        </p>
      </div>
      <div style={{ background:B[700], padding:`15px ${PAD}px`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:34, height:34, borderRadius:11, background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.18)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <BrandLogo size={19} color="#fff" />
          </div>
          <div>
            <div style={{ fontFamily:SERIF, fontSize:15, color:B[200], fontWeight:600, lineHeight:1 }}>Pitahaya Vision</div>
            <div style={{ fontFamily:SANS, fontSize:8.5, color:B[300], marginTop:3, letterSpacing:'0.06em' }}>
              Universidad Estatal de Milagro · UNEMI · Ecuador
            </div>
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontFamily:SANS, fontSize:9, color:B[300], letterSpacing:'0.05em' }}>
            Módulo {mode === 'admin' ? 'Administrativo' : 'Productor'} · Diagnóstico IA
          </div>
          <div style={{ fontFamily:SANS, fontSize:8.5, color:B[400], marginTop:3 }}>
            © {new Date().getFullYear()} Pitahaya Vision · Todos los derechos reservados
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Helper: format date ──────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-EC', { day:'2-digit', month:'long', year:'numeric' })
}

// ─── User template ────────────────────────────────────────────────────────────
function UserTemplate({ data, generatedAt }) {
  resetSections()
  const { kpis, topDiseases, farmZones, recentAlerts, userName } = data
  const total      = kpis.total || 1
  const pctH       = Math.round((kpis.healthy / total) * 100)
  const pctR       = Math.round((kpis.highRisk / total) * 100)
  const topDisease = topDiseases?.[0]?.label
  const topCount   = topDiseases?.[0]?.value

  const refCode = `PV-USER-${new Date().toISOString().replace(/[-T:.Z]/g,'').slice(0,12)}`

  const bullets = [
    `Se documentaron ${kpis.total} evaluaciones fitosanitarias distribuidas en ${kpis.farms} corporaciones agrícolas durante el período de análisis.`,
    `El ${pctH}% de los registros se encuentran en estado saludable, mientras que ${kpis.highRisk} análisis (${pctR}%) presentan indicadores de riesgo que requieren atención técnica.`,
    ...(topDisease ? [`La patología más frecuente identificada es "${topDisease}" con ${topCount} casos registrados, representando el ${Math.round((topCount / total) * 100)}% del total.`] : []),
    ...(recentAlerts?.length ? [`Se reportan ${recentAlerts.length} alertas activas de alto riesgo que deben ser atendidas con prioridad.`] : []),
  ]

  const highlights = [
    { icon:'microscope',    color:B[600],  label:'Análisis',  value:kpis.total },
    { icon:'seedling',      color:R.amb,   label:'Fincas',    value:kpis.farms },
    { icon:'circle-check',  color:R.blu,   label:'Saludables',value:`${pctH}%` },
    { icon:'triangle-exclamation', color:R.red, label:'En riesgo', value:kpis.highRisk },
  ]

  const kpiItems = [
    { icon:'microscope',           value:kpis.total,    label:'Análisis registrados',  accent:B[600],  iconBg:B[50],   iconBorder:B[200],  iconColor:B[600] },
    { icon:'triangle-exclamation', value:kpis.highRisk, label:'En alerta de riesgo',   accent:R.red,   iconBg:R.redL,  iconBorder:R.redB,  iconColor:R.red  },
    { icon:'circle-check',         value:kpis.healthy,  label:'Estado saludable',      accent:R.blu,   iconBg:R.bluL,  iconBorder:R.bluB,  iconColor:R.blu  },
    { icon:'seedling',             value:kpis.farms,    label:'Fincas monitoreadas',   accent:R.amb,   iconBg:R.ambL,  iconBorder:R.ambB,  iconColor:R.amb  },
  ]

  return (
    <div>
      <PageHeader
        title="Reporte Fitosanitario"
        subtitle="Resumen de análisis de cultivos, estado sanitario de parcelas y alertas activas"
        generatedAt={generatedAt}
        meta={[`Productor: ${userName || '—'}`]}
        refCode={refCode}
      />

      <div style={{ padding:`28px ${PAD}px 0` }}>

        {/* Executive Summary */}
        <ExecutiveSummary bullets={bullets} highlights={highlights} />

        {/* KPIs */}
        <div data-section="kpis" style={{ marginBottom:24 }}>
          <SectionLabel icon="chart-bar">Indicadores clave de desempeño</SectionLabel>
          <KpiGrid items={kpiItems} />
        </div>

        {/* Health status — donut + stats */}
        <div data-section="health" style={{ marginBottom:24 }}>
          <SectionLabel icon="heart-pulse">Estado de salud del cultivo</SectionLabel>
          <Card>
            <div style={{ display:'flex', gap:28, alignItems:'center', flexWrap:'wrap' }}>
              {/* Donut */}
              <HealthDonut pctHealthy={pctH} size={130} thick={18} />
              {/* Legend + bar */}
              <div style={{ flex:1, minWidth:220 }}>
                <div style={{ marginBottom:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                      <div style={{ width:10, height:10, borderRadius:'50%', background:B[500] }} />
                      <span style={{ fontFamily:SANS, fontSize:11, color:SL[600], fontWeight:500 }}>Saludable</span>
                    </div>
                    <span style={{ fontFamily:SERIF, fontSize:15, fontWeight:600, color:SL[800] }}>{kpis.healthy} <span style={{ fontFamily:SANS, fontSize:10, color:SL[400] }}>({pctH}%)</span></span>
                  </div>
                  <div style={{ height:9, borderRadius:99, background:SL[100], overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${pctH}%`, background:`linear-gradient(90deg,${B[400]},${B[600]})`, borderRadius:99 }} />
                  </div>
                </div>
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                      <div style={{ width:10, height:10, borderRadius:'50%', background:R.red }} />
                      <span style={{ fontFamily:SANS, fontSize:11, color:SL[600], fontWeight:500 }}>En alerta</span>
                    </div>
                    <span style={{ fontFamily:SERIF, fontSize:15, fontWeight:600, color:R.red }}>{kpis.highRisk} <span style={{ fontFamily:SANS, fontSize:10, color:SL[400] }}>({pctR}%)</span></span>
                  </div>
                  <div style={{ height:9, borderRadius:99, background:SL[100], overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${pctR}%`, background:`linear-gradient(90deg,${R.red},#b91c1c)`, borderRadius:99 }} />
                  </div>
                </div>
              </div>
              {/* Last activity */}
              {kpis.latest?.created_at && (
                <div style={{ background:SL[50], border:`1px solid ${SL[200]}`, borderRadius:16, padding:'14px 18px', minWidth:160, textAlign:'center' }}>
                  <Icon name="calendar-check" color={B[600]} size={18} />
                  <div style={{ fontFamily:SANS, fontSize:9, color:SL[400], letterSpacing:'0.1em', textTransform:'uppercase', marginTop:8, marginBottom:4 }}>Último análisis</div>
                  <div style={{ fontFamily:SERIF, fontSize:13, fontWeight:600, color:SL[800], lineHeight:1.3 }}>{fmtDate(kpis.latest.created_at)}</div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Diseases */}
        {topDiseases?.length > 0 && (
          <div data-section="diseases" style={{ marginBottom:24 }}>
            <SectionLabel icon="disease">Distribución de enfermedades detectadas</SectionLabel>
            <Card>
              {/* Header row */}
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, paddingBottom:10, borderBottom:`1px solid ${SL[100]}` }}>
                <div style={{ width:24, flexShrink:0 }} />
                <span style={{ width:190, fontFamily:SANS, fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:SL[400], flexShrink:0 }}>Enfermedad</span>
                <span style={{ flex:1, fontFamily:SANS, fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:SL[400] }}>Frecuencia relativa</span>
                <span style={{ fontFamily:SANS, fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:SL[400], minWidth:56, textAlign:'right' }}>Casos / %</span>
              </div>
              {topDiseases.map((d, i) => {
                const pct = Math.round((d.value / total) * 100)
                const barPct = d.pct ?? Math.round((d.value / (topDiseases[0]?.value || 1)) * 100)
                return <Bar key={i} label={d.label} value={d.value} pct={barPct} total={total} index={i} />
              })}
              <div style={{ paddingTop:10, borderTop:`1px solid ${SL[100]}`, display:'flex', justifyContent:'flex-end' }}>
                <span style={{ fontFamily:SANS, fontSize:10, color:SL[400] }}>Total enfermedades distintas: <strong style={{ color:SL[600] }}>{topDiseases.length}</strong></span>
              </div>
            </Card>
          </div>
        )}

        {/* Farm zones */}
        {farmZones?.length > 0 && (
          <div data-section="farmzones" style={{ marginBottom:24 }}>
            <SectionLabel icon="map-location-dot">Análisis por finca y corporación agrícola</SectionLabel>
            <Card style={{ padding:0, overflow:'hidden' }}>
              <Table
                columns={[
                  { label:'Finca / Corporación', render:r=>(
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background: r.riskRate>=0.6?R.red : r.riskRate>=0.3?R.amb : B[500], flexShrink:0 }} />
                      <span style={{ fontFamily:SERIF, fontSize:13, fontWeight:600, color:SL[800] }}>{r.farmName||'—'}</span>
                    </div>
                  )},
                  { label:'Análisis', right:true, render:r=><span style={{ fontFamily:SERIF, fontSize:15, fontWeight:600, color:SL[800] }}>{r.total}</span> },
                  { label:'Alertas', right:true, render:r=>(
                    <span style={{ fontFamily:SERIF, fontSize:15, fontWeight:600, color:r.alerts>0?R.red:SL[300] }}>{r.alerts}</span>
                  )},
                  { label:'Tasa de riesgo', render:r=><RiskPill rate={r.riskRate} /> },
                  { label:'Enfermedad más frecuente', render:r=>(
                    <div>
                      <div style={{ fontSize:11, color:SL[700] }}>{r.topDisease||'Sin diagnóstico'}</div>
                    </div>
                  )},
                  { label:'Último análisis', render:r=><span style={{ fontSize:10, color:SL[400] }}>{r.lastDate ? new Date(r.lastDate).toLocaleDateString('es-EC',{day:'2-digit',month:'short',year:'numeric'}) : '—'}</span> },
                ]}
                rows={farmZones}
              />
            </Card>
          </div>
        )}

        {/* Recent alerts */}
        {recentAlerts?.length > 0 && (
          <div data-section="alerts" style={{ marginBottom:32 }}>
            <SectionLabel icon="bell">Alertas activas de alto riesgo sanitario</SectionLabel>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {recentAlerts.map((h, i) => {
                const ctx = h.context_detail || {}
                return (
                  <div key={i} style={{ background:'#fff', border:`1px solid ${R.redB}`, borderLeft:`3px solid ${R.red}`, borderRadius:14, padding:'12px 16px', display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{ width:34, height:34, borderRadius:10, background:R.redL, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Icon name="triangle-exclamation" color={R.red} size={15} />
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:SERIF, fontSize:13, fontWeight:600, color:SL[800] }}>{h.disease_name_predicted||'Sin diagnóstico'}</div>
                      <div style={{ fontFamily:SANS, fontSize:10, color:SL[500], marginTop:2 }}>
                        {[ctx.farm_name,ctx.plot_name,ctx.plant_tag].filter(Boolean).join(' · ') || '—'}
                      </div>
                    </div>
                    {ctx.main_symptom && (
                      <div style={{ fontFamily:SANS, fontSize:10, color:SL[600], maxWidth:170, textAlign:'right', flexShrink:0, lineHeight:1.45 }}>
                        <span style={{ fontFamily:SANS, fontSize:9, color:SL[400], display:'block', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:2 }}>Síntoma</span>
                        {ctx.main_symptom}
                      </div>
                    )}
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <span style={{ fontFamily:SANS, fontSize:9, color:SL[400], display:'block', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:2 }}>Fecha</span>
                      <span style={{ fontFamily:SANS, fontSize:10.5, fontWeight:600, color:SL[600] }}>
                        {h.created_at ? new Date(h.created_at).toLocaleDateString('es-EC',{day:'2-digit',month:'short'}) : '—'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
      <PageFooter mode="user" />
    </div>
  )
}

// ─── Admin template ───────────────────────────────────────────────────────────
function AdminTemplate({ data, generatedAt }) {
  resetSections()
  const { kpis, health, topDiseases, sevTotals, userCards, timeline } = data
  const total      = kpis.total || 1
  const imgPct     = Math.round(((kpis.withImg || 0) / total) * 100)
  const topDisease = topDiseases?.[0]?.label
  const topCount   = topDiseases?.[0]?.value

  const refCode = `PV-ADMIN-${new Date().toISOString().replace(/[-T:.Z]/g,'').slice(0,12)}`

  const bullets = [
    `El sistema Pitahaya Vision consolidó ${kpis.total} análisis fitosanitarios provenientes de ${userCards?.length || 0} productores activos registrados.`,
    `La tasa de riesgo del sistema alcanza el ${health?.pctSick || 0}%, con ${kpis.highRisk} registros que requieren seguimiento técnico inmediato.`,
    `El ${imgPct}% de los análisis cuentan con imagen adjunta, lo que habilita el diagnóstico visual asistido por inteligencia artificial.`,
    ...(topDisease ? [`La enfermedad más frecuente del período es "${topDisease}" con ${topCount} casos (${Math.round((topCount/total)*100)}% del total de registros).`] : []),
  ]

  const highlights = [
    { icon:'microscope',           color:B[600],  label:'Total análisis',  value:kpis.total      },
    { icon:'users',                color:R.pur,   label:'Productores',     value:userCards?.length||0 },
    { icon:'triangle-exclamation', color:R.red,   label:'En riesgo',       value:kpis.highRisk   },
    { icon:'image',                color:R.blu,   label:'Con imagen',      value:`${imgPct}%`    },
  ]

  const kpiItems = [
    { icon:'microscope',           value:kpis.total,        label:'Análisis en el sistema', accent:B[600], iconBg:B[50],  iconBorder:B[200],  iconColor:B[600] },
    { icon:'triangle-exclamation', value:kpis.highRisk,     label:'Registros en riesgo',    accent:R.red,  iconBg:R.redL, iconBorder:R.redB,  iconColor:R.red  },
    { icon:'image',                value:kpis.withImg,      label:'Con imagen adjunta',     accent:R.blu,  iconBg:R.bluL, iconBorder:R.bluB,  iconColor:R.blu  },
    { icon:'users',                value:userCards?.length||0, label:'Productores activos', accent:R.pur,  iconBg:R.purL, iconBorder:R.purB,  iconColor:R.pur  },
  ]

  return (
    <div>
      <PageHeader
        title="Reporte Ejecutivo"
        subtitle="Consolidado del sistema · Salud del cultivo, distribución de enfermedades y actividad de productores"
        generatedAt={generatedAt}
        meta={['Acceso: Administrador del sistema']}
        refCode={refCode}
      />

      <div style={{ padding:`28px ${PAD}px 0` }}>

        <ExecutiveSummary bullets={bullets} highlights={highlights} />

        {/* KPIs */}
        <div data-section="kpis" style={{ marginBottom:24 }}>
          <SectionLabel icon="chart-bar">Indicadores clave del sistema</SectionLabel>
          <KpiGrid items={kpiItems} />
        </div>

        {/* Health + Severity side by side */}
        <div data-section="health-sev" style={{ marginBottom:24 }}>
          <SectionLabel icon="heart-pulse">Estado de salud y distribución por severidad</SectionLabel>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

            {/* Health */}
            {health && (
              <Card>
                <div style={{ fontFamily:SANS, fontSize:9, fontWeight:700, letterSpacing:'0.16em', textTransform:'uppercase', color:SL[400], marginBottom:14 }}>Estado de salud global</div>
                <div style={{ display:'flex', alignItems:'center', gap:20 }}>
                  <HealthDonut pctHealthy={health.pctSanas} size={120} thick={16} />
                  <div style={{ flex:1 }}>
                    <div style={{ marginBottom:10 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <div style={{ width:8, height:8, borderRadius:'50%', background:B[500] }} />
                          <span style={{ fontFamily:SANS, fontSize:10.5, color:SL[600] }}>Saludables</span>
                        </div>
                        <span style={{ fontFamily:SERIF, fontSize:14, fontWeight:600, color:SL[800] }}>{health.sanas} ({health.pctSanas}%)</span>
                      </div>
                      <div style={{ height:8, borderRadius:99, background:SL[100], overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${health.pctSanas}%`, background:`linear-gradient(90deg,${B[400]},${B[600]})` }} />
                      </div>
                    </div>
                    <div>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <div style={{ width:8, height:8, borderRadius:'50%', background:R.red }} />
                          <span style={{ fontFamily:SANS, fontSize:10.5, color:SL[600] }}>En riesgo</span>
                        </div>
                        <span style={{ fontFamily:SERIF, fontSize:14, fontWeight:600, color:R.red }}>{health.sick} ({health.pctSick}%)</span>
                      </div>
                      <div style={{ height:8, borderRadius:99, background:SL[100], overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${health.pctSick}%`, background:`linear-gradient(90deg,${R.red},#b91c1c)` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Severity */}
            {sevTotals?.length > 0 && (
              <Card>
                <div style={{ fontFamily:SANS, fontSize:9, fontWeight:700, letterSpacing:'0.16em', textTransform:'uppercase', color:SL[400], marginBottom:14 }}>Clasificación por nivel de severidad</div>
                <div style={{ display:'flex', flexDirection:'column', gap:11 }}>
                  {sevTotals.map((sv, i) => (
                    <div key={i}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                          <div style={{ width:8, height:8, borderRadius:'50%', background:sv.color, flexShrink:0 }} />
                          <span style={{ fontFamily:SANS, fontSize:10.5, fontWeight:500, color:SL[600] }}>{sv.label}</span>
                        </div>
                        <span style={{ fontFamily:SERIF, fontSize:14, fontWeight:600, color:SL[800] }}>{sv.count} <span style={{ fontFamily:SANS, fontSize:9.5, color:SL[400] }}>({sv.pct}%)</span></span>
                      </div>
                      <div style={{ height:8, background:SL[100], borderRadius:99, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${Math.max(sv.pct,2)}%`, background:sv.color, borderRadius:99 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Diseases */}
        {topDiseases?.length > 0 && (
          <div data-section="diseases" style={{ marginBottom:24 }}>
            <SectionLabel icon="bacteria">Distribución de enfermedades del sistema</SectionLabel>
            <Card>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, paddingBottom:10, borderBottom:`1px solid ${SL[100]}` }}>
                <div style={{ width:24, flexShrink:0 }} />
                <span style={{ width:190, fontFamily:SANS, fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:SL[400], flexShrink:0 }}>Patología</span>
                <span style={{ flex:1, fontFamily:SANS, fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:SL[400] }}>Frecuencia relativa</span>
                <span style={{ fontFamily:SANS, fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:SL[400], minWidth:56, textAlign:'right' }}>Casos / %</span>
              </div>
              {topDiseases.map((d, i) => (
                <Bar key={i} label={d.label} value={d.value} pct={d.pct} total={total} index={i} />
              ))}
              <div style={{ paddingTop:10, borderTop:`1px solid ${SL[100]}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontFamily:SANS, fontSize:10, color:SL[400] }}>Patologías distintas registradas: <strong style={{ color:SL[600] }}>{topDiseases.length}</strong></span>
                <span style={{ fontFamily:SANS, fontSize:10, color:SL[400] }}>Total de casos analizados: <strong style={{ color:SL[600] }}>{total}</strong></span>
              </div>
            </Card>
          </div>
        )}

        {/* Timeline */}
        {timeline?.length > 0 && (
          <div data-section="timeline" style={{ marginBottom:24 }}>
            <SectionLabel icon="chart-line">Actividad de análisis — últimos días registrados</SectionLabel>
            <Card>
              <div style={{ fontFamily:SANS, fontSize:9, color:SL[400], letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:14 }}>
                Número de análisis por fecha · {timeline.length} períodos
              </div>
              <TimelineChart data={timeline} />
            </Card>
          </div>
        )}

        {/* Users */}
        {userCards?.length > 0 && (
          <div data-section="users" style={{ marginBottom:32 }}>
            <SectionLabel icon="users">Análisis por productor registrado en el sistema</SectionLabel>
            <Card style={{ padding:0, overflow:'hidden' }}>
              <Table
                columns={[
                  { label:'Productor', render:r=>(
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background: r.riskRate>=0.6?R.red : r.riskRate>=0.3?R.amb : B[500], flexShrink:0 }} />
                      <span style={{ fontFamily:SERIF, fontSize:13, fontWeight:600, color:SL[800] }}>{r.name}</span>
                    </div>
                  )},
                  { label:'Email', render:r=><span style={{ fontSize:10, color:SL[400] }}>{r.email||'—'}</span> },
                  { label:'Análisis', right:true, render:r=><span style={{ fontFamily:SERIF, fontSize:15, fontWeight:600 }}>{r.total}</span> },
                  { label:'Alertas', right:true, render:r=><span style={{ fontFamily:SERIF, fontSize:15, fontWeight:600, color:r.alerts>0?R.red:SL[300] }}>{r.alerts}</span> },
                  { label:'Tasa de riesgo', render:r=><RiskPill rate={r.riskRate} /> },
                  { label:'Último análisis', render:r=><span style={{ fontSize:10, color:SL[400] }}>{r.last ? new Date(r.last).toLocaleDateString('es-EC',{day:'2-digit',month:'short',year:'numeric'}) : '—'}</span> },
                ]}
                rows={userCards}
              />
            </Card>
          </div>
        )}

      </div>
      <PageFooter mode="admin" />
    </div>
  )
}

// ─── Loading overlay ──────────────────────────────────────────────────────────
function LoadingOverlay({ status, onClose }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(15,23,42,0.65)', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(8px)' }}>
      <div style={{ background:'#fff', borderRadius:28, padding:'36px 44px', textAlign:'center', minWidth:300, boxShadow:'0 32px 64px rgba(0,0,0,0.2)', border:`1px solid rgba(226,232,240,0.9)` }}>
        {status === 'error' ? (
          <>
            <div style={{ width:52, height:52, borderRadius:'50%', background:R.redL, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
              <Icon name="circle-xmark" color={R.red} size={24} />
            </div>
            <div style={{ fontFamily:SERIF, fontSize:20, fontWeight:600, color:SL[800], marginBottom:6 }}>Error al generar</div>
            <div style={{ fontFamily:SANS, fontSize:12, color:SL[500], marginBottom:20 }}>No se pudo crear el PDF. Intenta de nuevo.</div>
            <button onClick={onClose} style={{ padding:'10px 28px', borderRadius:12, background:B[600], color:'#fff', border:'none', cursor:'pointer', fontFamily:SANS, fontWeight:600, fontSize:13 }}>Cerrar</button>
          </>
        ) : status === 'done' ? (
          <>
            <div style={{ width:52, height:52, borderRadius:'50%', background:B[50], border:`2px solid ${B[200]}`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
              <Icon name="circle-check" color={B[600]} size={24} />
            </div>
            <div style={{ fontFamily:SERIF, fontSize:20, fontWeight:600, color:SL[800] }}>¡PDF descargado!</div>
          </>
        ) : (
          <>
            <div style={{ width:54, height:54, borderRadius:16, background:B[50], border:`1.5px solid ${B[200]}`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
              <Icon name="file-pdf" color={B[600]} size={24} />
            </div>
            <div style={{ fontFamily:SERIF, fontSize:21, fontWeight:600, color:SL[800], marginBottom:6 }}>Generando reporte...</div>
            <div style={{ fontFamily:SANS, fontSize:12, color:SL[500], marginBottom:22 }}>Compilando datos, gráficos y diseño del informe</div>
            <div style={{ height:4, background:SL[100], borderRadius:99, overflow:'hidden' }}>
              <div style={{ height:'100%', width:'65%', background:`linear-gradient(90deg,${B[400]},${B[600]})`, borderRadius:99 }} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function DashboardReportPDF({ isOpen, onClose, mode = 'user', data = {} }) {
  const templateRef = useRef(null)
  const [status, setStatus] = useState('idle')

  const generatedAt = new Date().toLocaleDateString('es-EC', {
    weekday:'long', day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit',
  })

  useEffect(() => {
    if (!isOpen) { setStatus('idle'); return }
    setStatus('generating')

    const timer = setTimeout(async () => {
      try {
        const template = templateRef.current
        if (!template) throw new Error('Template not mounted')

        // Fix cuts: add spacers before any section that would be clipped by a page boundary
        avoidPageCuts(template)
        // Let layout settle after DOM mutations
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))

        const canvas = await html2canvas(template, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: W,
        })

        const imgData  = canvas.toDataURL('image/jpeg', 0.96)
        const pdf      = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
        const pageW    = pdf.internal.pageSize.getWidth()
        const pageH    = pdf.internal.pageSize.getHeight()
        const imgProps = pdf.getImageProperties(imgData)
        const imgH     = (imgProps.height * pageW) / imgProps.width
        const pages    = Math.ceil(imgH / pageH)

        for (let i = 0; i < pages; i++) {
          if (i > 0) pdf.addPage()
          pdf.addImage(imgData, 'JPEG', 0, -(pageH * i), pageW, imgH)
        }

        pdf.save(`pitahaya-vision-reporte-${mode}-${new Date().toISOString().slice(0, 10)}.pdf`)
        setStatus('done')
        setTimeout(onClose, 800)
      } catch (err) {
        console.error('PDF error:', err)
        setStatus('error')
      }
    }, 700)

    return () => clearTimeout(timer)
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null

  return (
    <>
      <LoadingOverlay status={status} onClose={onClose} />
      <div style={{ position:'fixed', top:0, left:'-9999px', zIndex:-1, pointerEvents:'none' }}>
        <div ref={templateRef} style={{ width:W, background:'#fff', fontFamily:SANS, position:'relative' }}>
          {mode === 'admin'
            ? <AdminTemplate data={data} generatedAt={generatedAt} />
            : <UserTemplate  data={data} generatedAt={generatedAt} />
          }
        </div>
      </div>
    </>
  )
}
