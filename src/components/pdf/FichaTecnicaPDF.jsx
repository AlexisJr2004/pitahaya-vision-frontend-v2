import { useEffect, useRef, useState } from 'react'
import {
  B, SL, R, SERIF, SANS, MONO, PdfLoadingOverlay, SevPill, PdfSectionLabel, resetSections,
  sevColor, sevBg, sevBorder, sevText, createPageGeometry, preloadImages,
  makeRefCode, renderTemplateToPdf, PdfDocHeader, PdfTitleBlock, PdfMetaStrip,
  PdfCellGrid, PdfDividedGrid, PdfBullets, PdfTimelineEntry, PdfLegalNotice, PdfKpiGrid,
} from './pdfCommon'

const W     = 820
const PAD   = 48
const FOOTER_MM = 9
const TOPM_MM   = 12
const geo = createPageGeometry(W, FOOTER_MM, TOPM_MM)
const { pageEndFor, PAGEN_PX } = geo

// ─── PDF Template ─────────────────────────────────────────────────────────────
function FichaTemplate({ data, imgMap, generatedAt }) {
  resetSections()
  const {
    fichaPh, fichaAnalyses, fichaTotal, fichaDiseases,
    fichaTopDisease, fichaLastDate, avgSeverityLabel,
    severityTrend, sevDistEntries, user,
  } = data

  const plantId      = fichaPh?._plantId  || '—'
  const farmName     = fichaPh?._farmName || '—'
  const plotName     = fichaPh?._plotName || ''
  const zone         = fichaPh?._zone     || ''
  const gps          = fichaPh?._gps      || ''
  const refCode      = makeRefCode('PV-FICHA')
  const trendColor   = severityTrend==='Empeorando' ? R.red : severityTrend==='Mejorando' ? B[600] : SL[400]
  const reversedAna  = [...fichaAnalyses].reverse()
  const imagesWithUrl = fichaAnalyses.filter(a => a.image_url)
  const latestSev    = fichaAnalyses[0]?.severity || ''
  const isRisk       = sevColor(latestSev) !== B[600]
  const plotSubtitle = [farmName, plotName, zone].filter(Boolean).join(' · ')

  return (
    <div style={{ width:W, background:'#fff', fontFamily:SANS, color:SL[900] }}>

      <PdfDocHeader
        badgeText="Ficha técnica fitosanitaria"
        plantId={plantId}
        refCode={refCode}
        generatedAt={generatedAt}
        pad={PAD}
        descriptorItems={['Reporte fitosanitario individual', 'Seguimiento de planta', 'Diagnóstico asistido por IA']}
        userName={user?.name}
        statusBadge={latestSev && (
          <div style={{ display:'flex', alignItems:'center', gap:6, background:sevBg(latestSev), border:`1px solid ${sevBorder(latestSev)}`, borderRadius:999, padding:'5px 12px' }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:sevColor(latestSev), flexShrink:0 }} />
            <span style={{ fontFamily:SANS, fontSize:9.5, fontWeight:600, color:sevText(latestSev) }}>
              {isRisk ? 'Requiere atención' : 'Estado saludable'}
            </span>
          </div>
        )}
      />

      <PdfTitleBlock eyebrow="Identificación del sujeto" title={plantId} subtitle={plotSubtitle} pad={PAD} />

      <PdfMetaStrip pad={PAD} cells={[
        { label:'Emisión',        v1: new Date().toLocaleDateString('es-EC',{day:'2-digit',month:'short',year:'numeric'}), v2: new Date().toLocaleTimeString('es-EC',{hour:'2-digit',minute:'2-digit'}), mono:true },
        { label:'Análisis',       v1:`${fichaTotal} registrados`, v2: fichaLastDate ? `Último: ${fichaLastDate}` : '—' },
        { label:'Severidad media',v1:avgSeverityLabel, v2: severityTrend!=='—' ? `Tend. ${severityTrend}` : '—', color:sevColor(avgSeverityLabel) },
        { label:'Coordenadas GPS',v1: gps ? gps.split(',')[0]?.trim() : '—', v2: gps ? gps.split(',')[1]?.trim() : '', mono:true },
      ]} />

      {/* ══ SECTIONS ══════════════════════════════════════════════════════════ */}
      <div style={{ padding:`0 ${PAD}px` }}>

        {/* 01 Resumen ejecutivo */}
        <section data-section="resumen" style={{ marginBottom:22 }}>
          <PdfSectionLabel>Resumen ejecutivo</PdfSectionLabel>
          <PdfBullets items={[
            `Se registraron <strong>${fichaTotal} análisis fitosanitarios</strong> para la planta ${plantId} en ${farmName}.`,
            fichaDiseases.length > 0 ? `Se identificaron <strong>${fichaDiseases.length} patología${fichaDiseases.length!==1?'s':''} distintas</strong>, siendo &ldquo;${fichaTopDisease}&rdquo; la más relevante.` : null,
            `La severidad promedio registrada es <strong style="color:${sevColor(avgSeverityLabel)}">${avgSeverityLabel}</strong>; tendencia ${severityTrend.toLowerCase()}.`,
            gps ? `Parcela georreferenciada en las coordenadas <span style="font-family:${MONO};font-size:12px">${gps}</span>.` : null,
          ].filter(Boolean)} />
        </section>

        {/* 02 Indicadores */}
        <section data-section="kpis" style={{ marginBottom:22 }}>
          <PdfSectionLabel>Indicadores de seguimiento</PdfSectionLabel>
          <PdfKpiGrid items={[
            { value:fichaTotal,           label:'Total de análisis',      accent:B[600],        textColor:SL[900], big:true },
            { value:fichaDiseases.length, label:'Enfermedades distintas', accent:B[600],        textColor:SL[900], big:true },
            { value:avgSeverityLabel,     label:'Severidad promedio',     accent:sevColor(avgSeverityLabel), textColor:sevColor(avgSeverityLabel) },
            { value:severityTrend,        label:'Tendencia sanitaria',    accent:trendColor,    textColor:trendColor },
          ]} />
        </section>

        {/* 03 Finca y parcela */}
        <section data-section="finca" style={{ marginBottom:22 }}>
          <PdfSectionLabel>Finca y parcela</PdfSectionLabel>
          <PdfDividedGrid columns={3} cells={[
            { label:'Finca / Corporación', value:farmName,   br:true, bb:true },
            { label:'Parcela',             value:plotName,   br:true, bb:true },
            { label:'Zona',                value:zone,       br:false,bb:true },
            { label:'Hileras',             value:fichaPh?._rows, br:true, bb:false, mono:true },
            { label:'Hectáreas',           value:fichaPh?._hectares ? `${fichaPh._hectares} ha` : null, br:true, bb:false, mono:true },
            { label:'Coordenadas GPS',     value:gps,        br:false,bb:false, mono:true },
          ]} />
        </section>

        {/* 04 Contexto clínico */}
        <section data-section="contexto" style={{ marginBottom:22 }}>
          <PdfSectionLabel>Contexto clínico</PdfSectionLabel>
          <PdfCellGrid columns={4} cells={[
            { label:'ID de planta',      value:plantId },
            { label:'Estado observado',  value:fichaPh?._status },
            { label:'Síntoma principal', value:fichaPh?._mainSymptom },
            { label:'Órgano afectado',   value:fichaPh?._affectedPart },
          ]} />
        </section>

        {/* 05 Distribución de severidad */}
        {sevDistEntries.length > 0 && (
          <section data-section="severidad" style={{ marginBottom:22 }}>
            <PdfSectionLabel>Distribución de severidad</PdfSectionLabel>
            <div style={{ border:`1px solid ${SL[200]}`, borderRadius:11, padding:'16px 20px' }}>
              {sevDistEntries.map(([label, count], i) => {
                const pct = fichaTotal > 0 ? ((count/fichaTotal)*100) : 0
                const col = sevColor(label)
                return (
                  <div key={label} style={{ display:'grid', gridTemplateColumns:'96px 1fr 52px', alignItems:'center', gap:14, marginBottom:i<sevDistEntries.length-1?13:0 }}>
                    <div style={{ fontFamily:SANS, fontSize:11.5, fontWeight:500, color:sevText(label), textAlign:'right' }}>{label}</div>
                    <div style={{ height:13, background:SL[100], borderRadius:999, overflow:'hidden' }}>
                      <div style={{ width:`${Math.max(pct,2)}%`, height:'100%', background:col, borderRadius:999 }} />
                    </div>
                    <div style={{ fontFamily:MONO, fontSize:11, fontWeight:500, color:SL[800] }}>{pct.toFixed(1)}%</div>
                  </div>
                )
              })}
              <div style={{ display:'flex', gap:16, marginTop:14, paddingTop:11, borderTop:`1px solid ${SL[100]}`, flexWrap:'wrap' }}>
                {sevDistEntries.map(([label, count]) => (
                  <div key={label} style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ width:9, height:9, borderRadius:2, background:sevColor(label), flexShrink:0 }} />
                    <span style={{ fontFamily:SANS, fontSize:10.5, color:SL[500] }}>{label} · {count}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 06 Diagnósticos identificados */}
        {fichaDiseases.length > 0 && (
          <section data-section="diagnosticos" style={{ marginBottom:22 }}>
            <PdfSectionLabel>Diagnósticos identificados</PdfSectionLabel>
            <div style={{ border:`1px solid ${SL[200]}`, borderRadius:11, overflow:'hidden' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 100px 130px', background:SL[50], borderBottom:`1px solid ${SL[200]}` }}>
                {['Diagnóstico','Frecuencia','Clasificación'].map((h,i) => (
                  <div key={i} style={{ padding:'8px 14px', fontFamily:SANS, fontSize:8.5, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:SL[500], textAlign:i===1?'center':'left' }}>{h}</div>
                ))}
              </div>
              {fichaDiseases.map((d, i) => {
                const cnt    = fichaAnalyses.filter(e => e.disease_name_predicted===d).length
                const sev    = fichaAnalyses.find(e => e.disease_name_predicted===d)?.severity || ''
                const isLast = i === fichaDiseases.length-1
                return (
                  <div key={i} data-section={`diag-${i}`} style={{ display:'grid', gridTemplateColumns:'1fr 100px 130px', alignItems:'center', borderBottom:isLast?'none':`1px solid ${SL[100]}`, background:i%2===0?'#fff':SL[50] }}>
                    <div style={{ padding:'10px 14px', fontFamily:SANS, fontSize:12.5, fontWeight:500, color:SL[800] }}>{d}</div>
                    <div style={{ padding:'10px 14px', fontFamily:MONO, fontSize:12, color:SL[500], textAlign:'center' }}>{cnt}×</div>
                    <div style={{ padding:'10px 14px' }}><SevPill label={sev} /></div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* 07 Registro fotográfico — 3 columnas, imágenes compactas */}
        {imagesWithUrl.length > 0 && (
          <section data-section="galeria" style={{ marginBottom:22 }}>
            <PdfSectionLabel>Registro fotográfico</PdfSectionLabel>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
              {[...imagesWithUrl].reverse().slice(0, 6).map((a, i) => {
                const src  = imgMap[a.image_url]
                const conf = a.confidence > 0 ? (a.confidence<=1?(a.confidence*100).toFixed(1):a.confidence.toFixed(1)) : null
                const date = a.created_at ? new Date(a.created_at).toLocaleDateString('es-EC',{day:'2-digit',month:'short',year:'numeric'}) : '—'
                return (
                  <div key={i} data-section={`photo-${i}`} style={{ border:`1px solid ${SL[200]}`, borderRadius:11, overflow:'hidden' }}>
                    {src ? (
                      <img src={src} alt="" style={{ width:'100%', height:110, objectFit:'cover', display:'block' }} />
                    ) : (
                      <div style={{ width:'100%', height:110, background:SL[100], display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <span style={{ fontFamily:SANS, fontSize:10.5, color:SL[400] }}>Sin imagen</span>
                      </div>
                    )}
                    <div style={{ padding:'9px 12px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:6 }}>
                        <span style={{ fontFamily:SANS, fontSize:10.5, fontWeight:600, color:SL[800], lineHeight:1.3 }}>
                          Fig. {i+1} · {a.disease_name_predicted || '—'}
                        </span>
                        <SevPill label={a.severity} />
                      </div>
                      <div style={{ fontFamily:MONO, fontSize:9, color:SL[400], marginTop:4 }}>
                        {date}{conf ? ` · ${conf}%` : ''}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* 08 Línea de tiempo */}
        <section data-section="timeline" style={{ marginBottom:28 }}>
          <PdfSectionLabel>Línea de tiempo de análisis</PdfSectionLabel>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {reversedAna.map((e, i) => {
              const disease = e.disease_name_predicted || '—'
              const recs    = e.recommendations_text   || ''
              const treat   = e._ph?.history_treatment_applied || ''
              const conf    = e.confidence > 0 ? (e.confidence<=1?(e.confidence*100).toFixed(1):e.confidence.toFixed(1)) : null
              const date    = e.created_at ? new Date(e.created_at).toLocaleDateString('es-EC',{weekday:'short',day:'2-digit',month:'long',year:'numeric'}) : '—'
              const imgSrc  = e.image_url ? imgMap[e.image_url] : null

              return (
                <div key={i} data-section={`tl-${i}`}>
                  <PdfTimelineEntry
                    disease={disease} date={date} severityLabel={e.severity}
                    confidence={conf || null} imgSrc={imgSrc} recs={recs} treat={treat}
                  />
                </div>
              )
            })}
          </div>
        </section>

        <PdfLegalNotice>
          Este documento fue generado automáticamente por Pitahaya Vision como herramienta de apoyo al monitoreo fitosanitario.
          Los datos reflejan los registros disponibles a la fecha de generación y tienen carácter informativo.
          Para decisiones agronómicas críticas se recomienda la validación por un técnico especializado en sanidad vegetal.
        </PdfLegalNotice>

      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function FichaTecnicaPDF({ isOpen, onClose, data }) {
  const templateRef = useRef(null)
  const [status, setStatus] = useState('idle')
  const [imgMap, setImgMap] = useState({})

  const generatedAt = new Date().toLocaleDateString('es-EC', {
    weekday:'long', day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit',
  })

  useEffect(() => {
    if (!isOpen) { setStatus('idle'); setImgMap({}); return }
    setStatus('generating')

    const timer = setTimeout(async () => {
      try {
        const map = await preloadImages(data.fichaAnalyses || [])
        setImgMap(map)

        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
        await new Promise(r => setTimeout(r, 300))

        const template = templateRef.current
        if (!template) throw new Error('Template not mounted')

        const plantPart = data.fichaPh?._plantId ? `_planta_${data.fichaPh._plantId}` : ''
        await renderTemplateToPdf(template, {
          W, FOOTER_MM, TOPM_MM, pageEndFor, maxPagePx: PAGEN_PX, generatedAt,
          filename: `pitahaya-vision-ficha${plantPart}-${new Date().toISOString().slice(0,10)}.pdf`,
          copyrightSuffix: ' · Todos los derechos reservados',
        })
        setStatus('done')
        setTimeout(onClose, 800)
      } catch (err) {
        console.error('FichaPDF error:', err)
        setStatus('error')
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null

  return (
    <>
      <PdfLoadingOverlay status={status} onClose={onClose} title="Generando ficha técnica..." subtitle="Compilando datos, imágenes y diseño" doneMessage="¡Ficha descargada!" />
      <div style={{ position:'fixed', top:0, left:'-9999px', zIndex:-1, pointerEvents:'none' }}>
        <div ref={templateRef} style={{ width:W, background:'#fff', fontFamily:SANS }}>
          <FichaTemplate data={data} imgMap={imgMap} generatedAt={generatedAt} />
        </div>
      </div>
    </>
  )
}
