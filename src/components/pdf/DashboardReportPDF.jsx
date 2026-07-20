import { useEffect, useRef, useState } from 'react'
import {
  B, SL, R, SERIF, SANS, PdfLoadingOverlay, PdfSectionLabel, resetSections,
  createPageGeometry, makeRefCode, renderTemplateToPdf,
  PdfIcon, PdfHealthDonut, PdfTimelineChart, PdfRiskPill, PdfCard,
  PdfBarRow, PdfBarHeader, PdfStatBar, PdfTable, PdfKpiGrid, PdfExecutiveSummary, PdfReportHeader,
} from './pdfCommon'

const W     = 820
const PAD   = 48
const FOOTER_MM = 9
const TOPM_MM   = 12
const geo = createPageGeometry(W, FOOTER_MM, TOPM_MM)
const { pageEndFor, PAGEN_PX } = geo
const CHART_W = W - PAD * 2 - 44

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-EC', { day:'2-digit', month:'long', year:'numeric' })
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
    { value:kpis.total,    label:'Análisis registrados', accent:B[600], big:true, textColor:SL[900] },
    { value:kpis.highRisk, label:'En alerta de riesgo',  accent:R.red,  big:true, textColor:SL[900] },
    { value:kpis.healthy,  label:'Estado saludable',     accent:R.blu,  big:true, textColor:SL[900] },
    { value:kpis.farms,    label:'Fincas monitoreadas',  accent:R.amb,  big:true, textColor:SL[900] },
  ]

  return (
    <div>
      <PdfReportHeader title="Reporte Fitosanitario" generatedAt={generatedAt} meta={[`Productor: ${userName || '—'}`]} refCode={makeRefCode('PV-USER')} mode="user" pad={PAD} />

      <div style={{ padding:`28px ${PAD}px 0` }}>

        <PdfExecutiveSummary bullets={bullets} highlights={highlights} />

        <div data-section="kpis" style={{ marginBottom:22 }}>
          <PdfSectionLabel>Indicadores clave de desempeño</PdfSectionLabel>
          <PdfKpiGrid items={kpiItems} />
        </div>

        <div data-section="health" style={{ marginBottom:22 }}>
          <PdfSectionLabel>Estado de salud del cultivo</PdfSectionLabel>
          <PdfCard>
            <div style={{ display:'flex', gap:28, alignItems:'center', flexWrap:'wrap' }}>
              <PdfHealthDonut pctHealthy={pctH} size={130} thick={18} />
              <div style={{ flex:1, minWidth:220 }}>
                <PdfStatBar label="Saludable" count={kpis.healthy}  pct={pctH} dotColor={B[500]} gradient={`linear-gradient(90deg,${B[400]},${B[600]})`} />
                <PdfStatBar label="En alerta" count={kpis.highRisk} pct={pctR} dotColor={R.red}  gradient={`linear-gradient(90deg,${R.red},#b91c1c)`}  valueColor={R.red} noMb />
              </div>
              {kpis.latest?.created_at && (
                <div style={{ background:SL[50], border:`1px solid ${SL[200]}`, borderRadius:11, padding:'14px 18px', minWidth:160, textAlign:'center' }}>
                  <PdfIcon name="calendar-check" color={B[600]} size={18} />
                  <div style={{ fontFamily:SANS, fontSize:9, color:SL[400], letterSpacing:'0.1em', textTransform:'uppercase', marginTop:8, marginBottom:4 }}>Último análisis</div>
                  <div style={{ fontFamily:SERIF, fontSize:13, fontWeight:600, color:SL[800], lineHeight:1.3 }}>{fmtDate(kpis.latest.created_at)}</div>
                </div>
              )}
            </div>
          </PdfCard>
        </div>

        {topDiseases?.length > 0 && (
          <div data-section="diseases" style={{ marginBottom:22 }}>
            <PdfSectionLabel>Distribución de enfermedades detectadas</PdfSectionLabel>
            <PdfCard>
              <PdfBarHeader firstLabel="Enfermedad" />
              {topDiseases.map((d, i) => {
                const barPct = d.pct ?? Math.round((d.value / (topDiseases[0]?.value || 1)) * 100)
                return <PdfBarRow key={i} label={d.label} value={d.value} pct={barPct} total={total} index={i} />
              })}
              <div style={{ paddingTop:10, borderTop:`1px solid ${SL[100]}`, display:'flex', justifyContent:'flex-end' }}>
                <span style={{ fontFamily:SANS, fontSize:10, color:SL[400] }}>Total enfermedades distintas: <strong style={{ color:SL[600] }}>{topDiseases.length}</strong></span>
              </div>
            </PdfCard>
          </div>
        )}

        {sevTotals?.length > 0 && (
          <div data-section="severity" style={{ marginBottom:22 }}>
            <PdfSectionLabel>Distribución por nivel de severidad</PdfSectionLabel>
            <PdfCard>
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
            </PdfCard>
          </div>
        )}

        {farmZones?.length > 0 && (
          <div data-section="farmzones" style={{ marginBottom:22 }}>
            <PdfSectionLabel>Análisis por finca y corporación agrícola</PdfSectionLabel>
            <PdfCard style={{ padding:0, overflow:'hidden' }}>
              <PdfTable
                columns={[
                  { label:'Finca / Corporación', render:r=>(
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background:r.riskRate>=0.6?R.red:r.riskRate>=0.3?R.amb:B[500], flexShrink:0 }} />
                      <span style={{ fontFamily:SERIF, fontSize:13, fontWeight:600, color:SL[800] }}>{r.farmName||'—'}</span>
                    </div>
                  )},
                  { label:'Análisis',  right:true, render:r=><span style={{ fontFamily:SERIF, fontSize:15, fontWeight:600, color:SL[800] }}>{r.total}</span> },
                  { label:'Alertas',   right:true, render:r=><span style={{ fontFamily:SERIF, fontSize:15, fontWeight:600, color:r.alerts>0?R.red:SL[300] }}>{r.alerts}</span> },
                  { label:'Tasa de riesgo', render:r=><PdfRiskPill rate={r.riskRate} /> },
                  { label:'Enfermedad más frecuente', render:r=><div style={{ fontSize:11, color:SL[700] }}>{r.topDisease||'Sin diagnóstico'}</div> },
                  { label:'Último análisis', render:r=><span style={{ fontSize:10, color:SL[400] }}>{r.lastDate ? new Date(r.lastDate).toLocaleDateString('es-EC',{day:'2-digit',month:'short',year:'numeric'}) : '—'}</span> },
                ]}
                rows={farmZones}
              />
            </PdfCard>
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
                      <PdfIcon name="triangle-exclamation" color={R.red} size={15} />
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
    { value:kpis.total,           label:'Análisis en el sistema', accent:B[600], big:true, textColor:SL[900] },
    { value:kpis.highRisk,        label:'Registros en riesgo',    accent:R.red,  big:true, textColor:SL[900] },
    { value:kpis.withImg,         label:'Con imagen adjunta',     accent:R.blu,  big:true, textColor:SL[900] },
    { value:userCards?.length||0, label:'Productores activos',    accent:R.pur,  big:true, textColor:SL[900] },
  ]

  return (
    <div>
      <PdfReportHeader title="Reporte Ejecutivo" generatedAt={generatedAt} meta={['Acceso: Administrador del sistema']} refCode={makeRefCode('PV-ADMIN')} mode="admin" pad={PAD} />

      <div style={{ padding:`28px ${PAD}px 0` }}>

        <PdfExecutiveSummary bullets={bullets} highlights={highlights} />

        <div data-section="kpis" style={{ marginBottom:22 }}>
          <PdfSectionLabel>Indicadores clave del sistema</PdfSectionLabel>
          <PdfKpiGrid items={kpiItems} />
        </div>

        <div data-section="health-sev" style={{ marginBottom:22 }}>
          <PdfSectionLabel>Estado de salud y distribución por severidad</PdfSectionLabel>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

            {health && (
              <PdfCard>
                <div style={{ fontFamily:SANS, fontSize:9, fontWeight:700, letterSpacing:'0.16em', textTransform:'uppercase', color:SL[400], marginBottom:14 }}>Estado de salud global</div>
                <div style={{ display:'flex', alignItems:'center', gap:20 }}>
                  <PdfHealthDonut pctHealthy={health.pctSanas} size={120} thick={16} />
                  <div style={{ flex:1 }}>
                    <PdfStatBar label="Saludables" count={health.sanas} pct={health.pctSanas} dotColor={B[500]} gradient={`linear-gradient(90deg,${B[400]},${B[600]})`} compact />
                    <PdfStatBar label="En riesgo"  count={health.sick}  pct={health.pctSick}  dotColor={R.red}  gradient={`linear-gradient(90deg,${R.red},#b91c1c)`}   valueColor={R.red} compact noMb />
                  </div>
                </div>
              </PdfCard>
            )}

            {sevTotals?.length > 0 && (
              <PdfCard>
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
              </PdfCard>
            )}
          </div>
        </div>

        {topDiseases?.length > 0 && (
          <div data-section="diseases" style={{ marginBottom:22 }}>
            <PdfSectionLabel>Distribución de enfermedades del sistema</PdfSectionLabel>
            <PdfCard>
              <PdfBarHeader firstLabel="Patología" />
              {topDiseases.map((d, i) => (
                <PdfBarRow key={i} label={d.label} value={d.value} pct={d.pct} total={total} index={i} />
              ))}
              <div style={{ paddingTop:10, borderTop:`1px solid ${SL[100]}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontFamily:SANS, fontSize:10, color:SL[400] }}>Patologías distintas registradas: <strong style={{ color:SL[600] }}>{topDiseases.length}</strong></span>
                <span style={{ fontFamily:SANS, fontSize:10, color:SL[400] }}>Total de casos analizados: <strong style={{ color:SL[600] }}>{total}</strong></span>
              </div>
            </PdfCard>
          </div>
        )}

        {timeline?.length > 0 && (
          <div data-section="timeline" style={{ marginBottom:22 }}>
            <PdfSectionLabel>Actividad de análisis — últimos días registrados</PdfSectionLabel>
            <PdfCard>
              <div style={{ fontFamily:SANS, fontSize:9, color:SL[400], letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:14 }}>
                Número de análisis por fecha · {timeline.length} períodos
              </div>
              <PdfTimelineChart data={timeline} width={CHART_W} />
            </PdfCard>
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
                      <PdfIcon name="triangle-exclamation" color={col} size={14} />
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
            <PdfCard style={{ padding:0, overflow:'hidden' }}>
              <PdfTable
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
                  { label:'Tasa de riesgo', render:r=><PdfRiskPill rate={r.riskRate} /> },
                  { label:'Último análisis', render:r=><span style={{ fontSize:10, color:SL[400] }}>{r.last ? new Date(r.last).toLocaleDateString('es-EC',{day:'2-digit',month:'short',year:'numeric'}) : '—'}</span> },
                ]}
                rows={userCards}
              />
            </PdfCard>
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

        await renderTemplateToPdf(template, {
          W, FOOTER_MM, TOPM_MM, pageEndFor, maxPagePx: PAGEN_PX, generatedAt, spacerExtra: 4,
          filename: `pitahaya-vision-reporte-${mode}-${new Date().toISOString().slice(0,10)}.pdf`,
          copyrightSuffix: ' · Todos los derechos reservados · Universidad Estatal de Milagro',
        })
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
