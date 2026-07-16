import { useEffect, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { B, SL, R, SERIF, SANS, MONO, BrandLogo, PdfLoadingOverlay, PdfSectionLabel, resetSections, createPageGeometry, avoidPageCuts } from './pdfCommon'

const W     = 820
const PAD   = 48
const FOOTER_MM = 9
const TOPM_MM   = 12
const geo = createPageGeometry(W, FOOTER_MM, TOPM_MM)
const { pageEndFor, PAGE1_PX, PAGEN_PX, TOPM_PX } = geo

const BAR_COLORS = [B[600],'#0284c7',R.ora,R.amb,R.pur,R.tea,'#db2777']

// ─── FA icon ──────────────────────────────────────────────────────────────────
function Icon({ name, color = SL[500], size = 13 }) {
  return <i className={`fas fa-${name}`} style={{ fontSize:size, color, lineHeight:1, display:'inline-block' }} />
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
    <div style={{ position:'relative', width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display:'block', transform:'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={SL[100]} strokeWidth={thick} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={B[500]} strokeWidth={thick}
          strokeDasharray={`${dH} ${circ - dH}`} strokeLinecap="butt" />
        {pctSick > 0 && (
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={R.red} strokeWidth={thick}
            strokeDasharray={`${dS} ${circ - dS}`} strokeDashoffset={-dH} strokeLinecap="butt" />
        )}
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <div style={{ fontFamily:SERIF, fontSize:26, fontWeight:600, color:SL[900], lineHeight:1 }}>{pctHealthy}<span style={{ fontSize:14 }}>%</span></div>
        <div style={{ fontFamily:SANS, fontSize:8.5, color:SL[400], marginTop:3, letterSpacing:'0.1em', textTransform:'uppercase' }}>sano</div>
      </div>
    </div>
  )
}

// ─── SVG Timeline bar chart ───────────────────────────────────────────────────
function TimelineChart({ data }) {
  if (!data?.length) return null
  const W_chart = W - PAD * 2 - 44
  const H_chart = 90
  const max  = Math.max(...data.map(d => d.value), 1)
  const barW = Math.max(Math.floor((W_chart - 20) / data.length) - 8, 10)
  const chartTop = 16, chartBot = H_chart - 22
  const chartH   = chartBot - chartTop
  return (
    <svg width={W_chart} height={H_chart} viewBox={`0 0 ${W_chart} ${H_chart}`} style={{ display:'block', overflow:'visible' }}>
      <defs>
        <linearGradient id="tl-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={B[400]} />
          <stop offset="100%" stopColor={B[700]} />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1.0].map((f, i) => {
        const y = chartBot - f * chartH
        return (
          <g key={i}>
            <line x1={28} y1={y} x2={W_chart} y2={y} stroke={SL[100]} strokeWidth={1} strokeDasharray="3,3" />
            <text x={24} y={y + 3} textAnchor="end" fontSize={7.5} fill={SL[400]} fontFamily={SANS}>{Math.round(max * f)}</text>
          </g>
        )
      })}
      <line x1={28} y1={chartBot} x2={W_chart} y2={chartBot} stroke={SL[200]} strokeWidth={1} />
      {data.map((d, i) => {
        const x  = 30 + i * (barW + 8)
        const bH = Math.max((d.value / max) * chartH, 3)
        const y  = chartBot - bH
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={bH} rx={4} fill="url(#tl-grad)" opacity={0.65 + (i / data.length) * 0.35} />
            <text x={x + barW / 2} y={y - 3} textAnchor="middle" fontSize={9.5} fill={SL[700]} fontFamily={SANS} fontWeight="600">{d.value}</text>
            <text x={x + barW / 2} y={H_chart - 3} textAnchor="middle" fontSize={8} fill={SL[400]} fontFamily={SANS}>{d.label}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── Pill / RiskPill ──────────────────────────────────────────────────────────
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



// ─── Card ─────────────────────────────────────────────────────────────────────
function Card({ children, style }) {
  return (
    <div style={{ background:'#fff', border:`1px solid ${SL[200]}`, borderRadius:11, padding:'16px 20px', ...style }}>
      {children}
    </div>
  )
}

// ─── Bar row ──────────────────────────────────────────────────────────────────
function Bar({ label, value, pct, total, index }) {
  const pctLabel = total ? Math.round((value / total) * 100) : (pct ?? 0)
  const barW     = pct ?? Math.round((value / (total || 1)) * 100)
  const col      = BAR_COLORS[index % BAR_COLORS.length]
  const isTop    = index === 0
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
      <div style={{ width:24, height:24, borderRadius:8, background:isTop?col:SL[100], display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <span style={{ fontFamily:SANS, fontSize:10, fontWeight:800, color:isTop?'#fff':SL[400] }}>#{index+1}</span>
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

// ─── Bar list header ──────────────────────────────────────────────────────────
const COL_HEAD = { fontFamily:SANS, fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:SL[400] }
function BarHeader({ firstLabel }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, paddingBottom:10, borderBottom:`1px solid ${SL[100]}` }}>
      <div style={{ width:24, flexShrink:0 }} />
      <span style={{ ...COL_HEAD, width:190, flexShrink:0 }}>{firstLabel}</span>
      <span style={{ ...COL_HEAD, flex:1 }}>Frecuencia relativa</span>
      <span style={{ ...COL_HEAD, minWidth:56, textAlign:'right' }}>Casos / %</span>
    </div>
  )
}

// ─── Health stat bar ──────────────────────────────────────────────────────────
function StatBar({ label, count, pct, dotColor, gradient, valueColor = SL[800], compact = false, noMb = false }) {
  const dotSize = compact ? 8 : 10
  const labelFs = compact ? 10.5 : 11
  const valueFs = compact ? 14 : 15
  const pctFs   = compact ? 9.5 : 10
  const barH    = compact ? 8 : 9
  const gap     = compact ? 6 : 7
  const rowMb   = compact ? 5 : 6
  const mb      = noMb ? 0 : compact ? 10 : 14
  return (
    <div style={{ marginBottom:mb }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:rowMb }}>
        <div style={{ display:'flex', alignItems:'center', gap }}>
          <div style={{ width:dotSize, height:dotSize, borderRadius:'50%', background:dotColor }} />
          <span style={{ fontFamily:SANS, fontSize:labelFs, color:SL[600], fontWeight:500 }}>{label}</span>
        </div>
        <span style={{ fontFamily:SERIF, fontSize:valueFs, fontWeight:600, color:valueColor }}>
          {count} <span style={{ fontFamily:SANS, fontSize:pctFs, color:SL[400] }}>({pct}%)</span>
        </span>
      </div>
      <div style={{ height:barH, borderRadius:99, background:SL[100], overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, background:gradient, borderRadius:99 }} />
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
          <tr key={i} style={{ background:i%2===0?'#fff':SL[50] }}>
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
    <div style={{ display:'grid', gridTemplateColumns:`repeat(${items.length},1fr)`, gap:12 }}>
      {items.map((k, i) => (
        <div key={i} style={{ border:`1px solid ${SL[200]}`, borderTop:`3px solid ${k.accent}`, borderRadius:11, padding:'13px 14px 12px' }}>
          <div style={{ fontFamily:SERIF, fontSize:32, fontWeight:600, color:SL[900], lineHeight:1, letterSpacing:'-0.02em', display:'flex', alignItems:'center', minHeight:34 }}>
            {k.value}
          </div>
          <div style={{ fontFamily:SANS, fontSize:9, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:SL[400], marginTop:8 }}>
            {k.label}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Executive summary ────────────────────────────────────────────────────────
function ExecutiveSummary({ bullets, highlights }) {
  return (
    <div data-section="exec" style={{ marginBottom:22 }}>
      <div style={{ border:`1px solid ${SL[200]}`, borderRadius:11, padding:'16px 20px' }}>
        <div style={{ display:'grid', gap:8, marginBottom:highlights?.length ? 14 : 0 }}>
          {bullets.map((b, i) => (
            <div key={i} style={{ display:'grid', gridTemplateColumns:'14px 1fr', alignItems:'baseline' }}>
              <span style={{ fontFamily:SANS, fontSize:13, fontWeight:700, color:B[500], lineHeight:1 }}>·</span>
              <p style={{ margin:0, fontFamily:SANS, fontSize:12, lineHeight:1.65, color:SL[700] }}>{b}</p>
            </div>
          ))}
        </div>
        {highlights?.length ? (
          <div style={{ display:'flex', gap:10, paddingTop:12, borderTop:`1px solid ${SL[100]}`, flexWrap:'wrap' }}>
            {highlights.map((h, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:7, border:`1px solid ${SL[200]}`, borderRadius:8, padding:'5px 10px' }}>
                <Icon name={h.icon} color={h.color||B[600]} size={10} />
                <span style={{ fontFamily:SANS, fontSize:10, fontWeight:600, color:SL[600] }}>{h.label}</span>
                <span style={{ fontFamily:SERIF, fontSize:14, fontWeight:600, color:h.color||B[700] }}>{h.value}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ─── Page header ─────────────────────────────────────────────────────────────
function PageHeader({ title, generatedAt, meta, refCode, mode }) {
  return (
    <div style={{ background:'#fff', borderBottom:`1px solid ${SL[200]}` }}>
      <div style={{ height:4, background:`linear-gradient(90deg, ${B[800]}, ${B[500]}, ${B[800]})` }} />
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:24, padding:`20px ${PAD}px 16px` }}>
        <div style={{ display:'flex', gap:13, alignItems:'center' }}>
          <div style={{ width:44, height:44, background:B[700], borderRadius:13, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <BrandLogo size={21} color="#fff" />
          </div>
          <div>
            <div style={{ fontFamily:SANS, fontSize:17, fontWeight:700, letterSpacing:'0.07em', color:SL[900], lineHeight:1 }}>PITAHAYA VISION</div>
            <div style={{ fontFamily:SANS, fontSize:9.5, color:SL[400], letterSpacing:'0.03em', marginTop:4 }}>Sistema de Monitoreo Fitosanitario · UNEMI · Ecuador</div>
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:B[50], border:`1px solid ${B[200]}`, borderRadius:999, padding:'5px 13px', marginBottom:8 }}>
            <span style={{ fontFamily:SANS, fontSize:8.5, fontWeight:700, letterSpacing:'0.16em', textTransform:'uppercase', color:B[700] }}>{title}</span>
          </div>
          {meta?.[0] && <div style={{ fontFamily:SANS, fontSize:11, fontWeight:600, color:SL[700], marginBottom:4 }}>{meta[0]}</div>}
          {refCode   && <div style={{ fontFamily:MONO, fontSize:8.5, color:SL[300], letterSpacing:'0.07em' }}>{refCode}</div>}
          <div style={{ fontFamily:SANS, fontSize:9, color:SL[400], marginTop:2 }}>{generatedAt}</div>
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:`9px ${PAD}px 12px`, borderTop:`1px solid ${SL[100]}`, background:SL[50] }}>
        <span style={{ fontFamily:SANS, fontSize:7.5, fontWeight:700, letterSpacing:'0.16em', textTransform:'uppercase', color:SL[500] }}>
          {mode === 'admin' ? 'Reporte ejecutivo' : 'Reporte fitosanitario'}
        </span>
        <span style={{ width:3, height:3, borderRadius:'50%', background:SL[300], flexShrink:0 }} />
        <span style={{ fontFamily:SANS, fontSize:9.5, color:SL[600] }}>Monitoreo fitosanitario</span>
        <span style={{ width:3, height:3, borderRadius:'50%', background:SL[300], flexShrink:0 }} />
        <span style={{ fontFamily:SANS, fontSize:9.5, color:SL[600] }}>Diagnóstico asistido por IA</span>
        <span style={{ width:3, height:3, borderRadius:'50%', background:SL[300], flexShrink:0 }} />
        <span style={{ fontFamily:SANS, fontSize:9.5, color:SL[600] }}>UNEMI · Ecuador</span>
      </div>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-EC', { day:'2-digit', month:'long', year:'numeric' })
}
function makeRefCode(prefix) {
  return `${prefix}-${new Date().toISOString().replace(/[-T:.Z]/g,'').slice(0,12)}`
}

// ─── User template ────────────────────────────────────────────────────────────
function UserTemplate({ data, generatedAt }) {
  resetSections()
  const { kpis, topDiseases, farmZones, recentAlerts, userName, sevTotals } = data
  const total      = kpis.total || 1
  const pctH       = Math.round((kpis.healthy  / total) * 100)
  const pctR       = Math.round((kpis.highRisk / total) * 100)
  const topDisease = topDiseases?.[0]?.label
  const topCount   = topDiseases?.[0]?.value

  const bullets = [
    `Se documentaron ${kpis.total} evaluaciones fitosanitarias distribuidas en ${kpis.farms} corporaciones agrícolas durante el período de análisis.`,
    `El ${pctH}% de los registros se encuentran en estado saludable, mientras que ${kpis.highRisk} análisis (${pctR}%) presentan indicadores de riesgo que requieren atención técnica.`,
    ...(topDisease ? [`La patología más frecuente identificada es "${topDisease}" con ${topCount} casos registrados, representando el ${Math.round((topCount / total) * 100)}% del total.`] : []),
    ...(recentAlerts?.length ? [`Se reportan ${recentAlerts.length} alertas activas de alto riesgo que deben ser atendidas con prioridad.`] : []),
  ]

  const highlights = [
    { icon:'microscope',           color:B[600], label:'Análisis',   value:kpis.total     },
    { icon:'seedling',             color:R.amb,  label:'Fincas',     value:kpis.farms     },
    { icon:'circle-check',         color:R.blu,  label:'Saludables', value:`${pctH}%`     },
    { icon:'triangle-exclamation', color:R.red,  label:'En riesgo',  value:kpis.highRisk  },
  ]

  const kpiItems = [
    { value:kpis.total,    label:'Análisis registrados', accent:B[600] },
    { value:kpis.highRisk, label:'En alerta de riesgo',  accent:R.red  },
    { value:kpis.healthy,  label:'Estado saludable',     accent:R.blu  },
    { value:kpis.farms,    label:'Fincas monitoreadas',  accent:R.amb  },
  ]

  return (
    <div>
      <PageHeader title="Reporte Fitosanitario" generatedAt={generatedAt} meta={[`Productor: ${userName || '—'}`]} refCode={makeRefCode('PV-USER')} mode="user" />

      <div style={{ padding:`28px ${PAD}px 0` }}>

        <ExecutiveSummary bullets={bullets} highlights={highlights} />

        <div data-section="kpis" style={{ marginBottom:22 }}>
          <PdfSectionLabel>Indicadores clave de desempeño</PdfSectionLabel>
          <KpiGrid items={kpiItems} />
        </div>

        <div data-section="health" style={{ marginBottom:22 }}>
          <PdfSectionLabel>Estado de salud del cultivo</PdfSectionLabel>
          <Card>
            <div style={{ display:'flex', gap:28, alignItems:'center', flexWrap:'wrap' }}>
              <HealthDonut pctHealthy={pctH} size={130} thick={18} />
              <div style={{ flex:1, minWidth:220 }}>
                <StatBar label="Saludable" count={kpis.healthy}  pct={pctH} dotColor={B[500]} gradient={`linear-gradient(90deg,${B[400]},${B[600]})`} />
                <StatBar label="En alerta" count={kpis.highRisk} pct={pctR} dotColor={R.red}  gradient={`linear-gradient(90deg,${R.red},#b91c1c)`}  valueColor={R.red} noMb />
              </div>
              {kpis.latest?.created_at && (
                <div style={{ background:SL[50], border:`1px solid ${SL[200]}`, borderRadius:11, padding:'14px 18px', minWidth:160, textAlign:'center' }}>
                  <Icon name="calendar-check" color={B[600]} size={18} />
                  <div style={{ fontFamily:SANS, fontSize:9, color:SL[400], letterSpacing:'0.1em', textTransform:'uppercase', marginTop:8, marginBottom:4 }}>Último análisis</div>
                  <div style={{ fontFamily:SERIF, fontSize:13, fontWeight:600, color:SL[800], lineHeight:1.3 }}>{fmtDate(kpis.latest.created_at)}</div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {topDiseases?.length > 0 && (
          <div data-section="diseases" style={{ marginBottom:22 }}>
            <PdfSectionLabel>Distribución de enfermedades detectadas</PdfSectionLabel>
            <Card>
              <BarHeader firstLabel="Enfermedad" />
              {topDiseases.map((d, i) => {
                const barPct = d.pct ?? Math.round((d.value / (topDiseases[0]?.value || 1)) * 100)
                return <Bar key={i} label={d.label} value={d.value} pct={barPct} total={total} index={i} />
              })}
              <div style={{ paddingTop:10, borderTop:`1px solid ${SL[100]}`, display:'flex', justifyContent:'flex-end' }}>
                <span style={{ fontFamily:SANS, fontSize:10, color:SL[400] }}>Total enfermedades distintas: <strong style={{ color:SL[600] }}>{topDiseases.length}</strong></span>
              </div>
            </Card>
          </div>
        )}

        {sevTotals?.length > 0 && (
          <div data-section="severity" style={{ marginBottom:22 }}>
            <PdfSectionLabel>Distribución por nivel de severidad</PdfSectionLabel>
            <Card>
              <div style={{ display:'flex', flexDirection:'column', gap:11 }}>
                {sevTotals.map((sv, i) => (
                  <div key={i}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                        <div style={{ width:8, height:8, borderRadius:'50%', background:sv.color, flexShrink:0 }} />
                        <span style={{ fontFamily:SANS, fontSize:11, fontWeight:500, color:SL[600] }}>{sv.label}</span>
                      </div>
                      <span style={{ fontFamily:SERIF, fontSize:14, fontWeight:600, color:SL[800] }}>
                        {sv.count} <span style={{ fontFamily:SANS, fontSize:9.5, color:SL[400] }}>({sv.pct}%)</span>
                      </span>
                    </div>
                    <div style={{ height:9, background:SL[100], borderRadius:99, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${Math.max(sv.pct,2)}%`, background:sv.color, borderRadius:99 }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {farmZones?.length > 0 && (
          <div data-section="farmzones" style={{ marginBottom:22 }}>
            <PdfSectionLabel>Análisis por finca y corporación agrícola</PdfSectionLabel>
            <Card style={{ padding:0, overflow:'hidden' }}>
              <Table
                columns={[
                  { label:'Finca / Corporación', render:r=>(
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background:r.riskRate>=0.6?R.red:r.riskRate>=0.3?R.amb:B[500], flexShrink:0 }} />
                      <span style={{ fontFamily:SERIF, fontSize:13, fontWeight:600, color:SL[800] }}>{r.farmName||'—'}</span>
                    </div>
                  )},
                  { label:'Análisis',  right:true, render:r=><span style={{ fontFamily:SERIF, fontSize:15, fontWeight:600, color:SL[800] }}>{r.total}</span> },
                  { label:'Alertas',   right:true, render:r=><span style={{ fontFamily:SERIF, fontSize:15, fontWeight:600, color:r.alerts>0?R.red:SL[300] }}>{r.alerts}</span> },
                  { label:'Tasa de riesgo', render:r=><RiskPill rate={r.riskRate} /> },
                  { label:'Enfermedad más frecuente', render:r=><div style={{ fontSize:11, color:SL[700] }}>{r.topDisease||'Sin diagnóstico'}</div> },
                  { label:'Último análisis', render:r=><span style={{ fontSize:10, color:SL[400] }}>{r.lastDate ? new Date(r.lastDate).toLocaleDateString('es-EC',{day:'2-digit',month:'short',year:'numeric'}) : '—'}</span> },
                ]}
                rows={farmZones}
              />
            </Card>
          </div>
        )}

        {recentAlerts?.length > 0 && (
          <div data-section="alerts" style={{ marginBottom:28 }}>
            <PdfSectionLabel>Alertas activas de alto riesgo sanitario</PdfSectionLabel>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {recentAlerts.map((h, i) => {
                const ctx = h.context_detail || {}
                return (
                  <div key={i} style={{ background:'#fff', border:`1px solid ${R.redB}`, borderLeft:`3px solid ${R.red}`, borderRadius:11, padding:'12px 16px', display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{ width:34, height:34, borderRadius:9, background:R.redL, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
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
                        <span style={{ fontSize:9, color:SL[400], display:'block', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:2 }}>Síntoma</span>
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
    </div>
  )
}

// ─── Admin template ───────────────────────────────────────────────────────────
function AdminTemplate({ data, generatedAt }) {
  resetSections()
  const { kpis, health, topDiseases, sevTotals, userCards, timeline, recentAlerts } = data
  const total      = kpis.total || 1
  const imgPct     = Math.round(((kpis.withImg || 0) / total) * 100)
  const topDisease = topDiseases?.[0]?.label
  const topCount   = topDiseases?.[0]?.value

  const bullets = [
    `El sistema Pitahaya Vision consolidó ${kpis.total} análisis fitosanitarios provenientes de ${userCards?.length || 0} productores activos registrados.`,
    `La tasa de riesgo del sistema alcanza el ${health?.pctSick || 0}%, con ${kpis.highRisk} registros que requieren seguimiento técnico inmediato.`,
    `El ${imgPct}% de los análisis cuentan con imagen adjunta, lo que habilita el diagnóstico visual asistido por inteligencia artificial.`,
    ...(topDisease ? [`La enfermedad más frecuente del período es "${topDisease}" con ${topCount} casos (${Math.round((topCount/total)*100)}% del total de registros).`] : []),
  ]

  const highlights = [
    { icon:'microscope',           color:B[600], label:'Total análisis', value:kpis.total          },
    { icon:'users',                color:R.pur,  label:'Productores',    value:userCards?.length||0 },
    { icon:'triangle-exclamation', color:R.red,  label:'En riesgo',      value:kpis.highRisk        },
    { icon:'image',                color:R.blu,  label:'Con imagen',     value:`${imgPct}%`         },
  ]

  const kpiItems = [
    { value:kpis.total,           label:'Análisis en el sistema', accent:B[600] },
    { value:kpis.highRisk,        label:'Registros en riesgo',    accent:R.red  },
    { value:kpis.withImg,         label:'Con imagen adjunta',     accent:R.blu  },
    { value:userCards?.length||0, label:'Productores activos',    accent:R.pur  },
  ]

  return (
    <div>
      <PageHeader title="Reporte Ejecutivo" generatedAt={generatedAt} meta={['Acceso: Administrador del sistema']} refCode={makeRefCode('PV-ADMIN')} mode="admin" />

      <div style={{ padding:`28px ${PAD}px 0` }}>

        <ExecutiveSummary bullets={bullets} highlights={highlights} />

        <div data-section="kpis" style={{ marginBottom:22 }}>
          <PdfSectionLabel>Indicadores clave del sistema</PdfSectionLabel>
          <KpiGrid items={kpiItems} />
        </div>

        <div data-section="health-sev" style={{ marginBottom:22 }}>
          <PdfSectionLabel>Estado de salud y distribución por severidad</PdfSectionLabel>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

            {health && (
              <Card>
                <div style={{ fontFamily:SANS, fontSize:9, fontWeight:700, letterSpacing:'0.16em', textTransform:'uppercase', color:SL[400], marginBottom:14 }}>Estado de salud global</div>
                <div style={{ display:'flex', alignItems:'center', gap:20 }}>
                  <HealthDonut pctHealthy={health.pctSanas} size={120} thick={16} />
                  <div style={{ flex:1 }}>
                    <StatBar label="Saludables" count={health.sanas} pct={health.pctSanas} dotColor={B[500]} gradient={`linear-gradient(90deg,${B[400]},${B[600]})`} compact />
                    <StatBar label="En riesgo"  count={health.sick}  pct={health.pctSick}  dotColor={R.red}  gradient={`linear-gradient(90deg,${R.red},#b91c1c)`}   valueColor={R.red} compact noMb />
                  </div>
                </div>
              </Card>
            )}

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

        {topDiseases?.length > 0 && (
          <div data-section="diseases" style={{ marginBottom:22 }}>
            <PdfSectionLabel>Distribución de enfermedades del sistema</PdfSectionLabel>
            <Card>
              <BarHeader firstLabel="Patología" />
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

        {timeline?.length > 0 && (
          <div data-section="timeline" style={{ marginBottom:22 }}>
            <PdfSectionLabel>Actividad de análisis — últimos días registrados</PdfSectionLabel>
            <Card>
              <div style={{ fontFamily:SANS, fontSize:9, color:SL[400], letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:14 }}>
                Número de análisis por fecha · {timeline.length} períodos
              </div>
              <TimelineChart data={timeline} />
            </Card>
          </div>
        )}

        {recentAlerts?.length > 0 && (
          <div data-section="alerts" style={{ marginBottom:22 }}>
            <PdfSectionLabel>Alertas recientes de riesgo sanitario</PdfSectionLabel>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {recentAlerts.map((a, i) => {
                const disease  = a.disease_name_predicted || '—'
                const owner    = a.owner_name || ''
                const dateStr  = a.created_at ? new Date(a.created_at).toLocaleDateString('es-EC',{day:'2-digit',month:'short',year:'numeric'}) : '—'
                const sev      = a.severity || ''
                const col      = sev.toLowerCase().includes('crit') ? R.red : sev.toLowerCase().includes('alta') ? R.ora : R.amb
                const colL     = sev.toLowerCase().includes('crit') ? R.redL : sev.toLowerCase().includes('alta') ? R.oraL : R.ambL
                const colB     = sev.toLowerCase().includes('crit') ? R.redB : sev.toLowerCase().includes('alta') ? R.oraB : R.ambB
                return (
                  <div key={i} style={{ background:'#fff', border:`1px solid ${colB}`, borderLeft:`3px solid ${col}`, borderRadius:11, padding:'11px 16px', display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{ width:32, height:32, borderRadius:9, background:colL, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Icon name="triangle-exclamation" color={col} size={14} />
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:SERIF, fontSize:13, fontWeight:600, color:SL[900] }}>{disease}</div>
                      {owner && <div style={{ fontFamily:SANS, fontSize:10, color:SL[500], marginTop:2 }}>{owner}</div>}
                    </div>
                    {sev && (
                      <span style={{ display:'inline-block', fontFamily:SANS, fontSize:9.5, fontWeight:600, color:col, background:colL, border:`1px solid ${colB}`, borderRadius:999, padding:'3px 10px', flexShrink:0 }}>
                        {sev}
                      </span>
                    )}
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <span style={{ fontFamily:SANS, fontSize:10, color:SL[400] }}>{dateStr}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {userCards?.length > 0 && (
          <div data-section="users" style={{ marginBottom:28 }}>
            <PdfSectionLabel>Análisis por productor registrado en el sistema</PdfSectionLabel>
            <Card style={{ padding:0, overflow:'hidden' }}>
              <Table
                columns={[
                  { label:'Productor', render:r=>(
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background:r.riskRate>=0.6?R.red:r.riskRate>=0.3?R.amb:B[500], flexShrink:0 }} />
                      <span style={{ fontFamily:SERIF, fontSize:13, fontWeight:600, color:SL[800] }}>{r.name}</span>
                    </div>
                  )},
                  { label:'Email',    render:r=><span style={{ fontSize:10, color:SL[400] }}>{r.email||'—'}</span> },
                  { label:'Análisis', right:true, render:r=><span style={{ fontFamily:SERIF, fontSize:15, fontWeight:600 }}>{r.total}</span> },
                  { label:'Alertas',  right:true, render:r=><span style={{ fontFamily:SERIF, fontSize:15, fontWeight:600, color:r.alerts>0?R.red:SL[300] }}>{r.alerts}</span> },
                  { label:'Tasa de riesgo', render:r=><RiskPill rate={r.riskRate} /> },
                  { label:'Último análisis', render:r=><span style={{ fontSize:10, color:SL[400] }}>{r.last ? new Date(r.last).toLocaleDateString('es-EC',{day:'2-digit',month:'short',year:'numeric'}) : '—'}</span> },
                ]}
                rows={userCards}
              />
            </Card>
          </div>
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

        avoidPageCuts(template, { pageEndFor, maxPagePx: PAGEN_PX, spacerExtra: 4 })
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))

        const canvas = await html2canvas(template, {
          scale: 2, useCORS: true, logging: false,
          backgroundColor: '#ffffff', windowWidth: W,
        })

        const imgData  = canvas.toDataURL('image/jpeg', 0.96)
        const pdf      = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' })
        const pageW    = pdf.internal.pageSize.getWidth()
        const pageH    = pdf.internal.pageSize.getHeight()
        const imgProps = pdf.getImageProperties(imgData)
        const imgH     = (imgProps.height * pageW) / imgProps.width

        const C1    = pageH - FOOTER_MM
        const CN    = pageH - FOOTER_MM - TOPM_MM
        const pages = 1 + Math.ceil(Math.max(0, imgH - C1) / CN)
        const year  = new Date().getFullYear()

        for (let i = 0; i < pages; i++) {
          if (i > 0) pdf.addPage()

          const imageY = i === 0 ? 0 : TOPM_MM - (C1 + (i - 1) * CN)
          pdf.addImage(imgData, 'JPEG', 0, imageY, pageW, imgH)

          if (i > 0) {
            pdf.setFillColor(255, 255, 255)
            pdf.rect(0, 0, pageW, TOPM_MM, 'F')
          }

          pdf.setFillColor(255, 255, 255)
          pdf.rect(0, pageH - FOOTER_MM, pageW, FOOTER_MM, 'F')
          pdf.setFillColor(22, 163, 74)
          pdf.rect(0, pageH - FOOTER_MM, pageW, 0.6, 'F')
          pdf.setFontSize(6.5)
          pdf.setTextColor(51, 65, 85)
          pdf.setFont('helvetica', 'bold')
          pdf.text('Pitahaya Vision', 10, pageH - FOOTER_MM + 3.5)
          pdf.setFont('helvetica', 'normal')
          pdf.setTextColor(100, 116, 139)
          pdf.text(`Pág. ${i+1} / ${pages}`, pageW - 10, pageH - FOOTER_MM + 3.5, { align:'right' })
          pdf.setFontSize(5.5)
          pdf.setTextColor(148, 163, 184)
          pdf.text(`© ${year} Pitahaya Vision · Todos los derechos reservados · Universidad Estatal de Milagro`, 10, pageH - FOOTER_MM + 6.5)
          pdf.text(generatedAt, pageW - 10, pageH - FOOTER_MM + 6.5, { align:'right' })
        }

        pdf.save(`pitahaya-vision-reporte-${mode}-${new Date().toISOString().slice(0,10)}.pdf`)
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
      <PdfLoadingOverlay status={status} onClose={onClose} title="Generando reporte..." subtitle="Compilando datos, gráficos y diseño del informe" doneMessage="¡PDF descargado!" buttonStyle={{ padding:'10px 28px', borderRadius:12 }} overlayStyle={{ borderRadius:28, padding:'36px 44px', border:'1px solid rgba(226,232,240,0.9)' }} />
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
