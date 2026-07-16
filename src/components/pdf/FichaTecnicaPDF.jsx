import { useEffect, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { B, SL, R, SERIF, SANS, MONO, BrandLogo, PdfLoadingOverlay, SevPill, PdfSectionLabel, resetSections, sevColor, sevBg, sevBorder, sevText, normSev, createPageGeometry, avoidPageCuts, preloadImages } from './pdfCommon'

const W     = 820
const PAD   = 48
const FOOTER_MM = 9
const TOPM_MM   = 12
const geo = createPageGeometry(W, FOOTER_MM, TOPM_MM)
const { pageEndFor, PAGEN_PX, TOPM_PX } = geo

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
  const refCode      = `PV-FICHA-${new Date().toISOString().replace(/[-T:.Z]/g,'').slice(0,12)}`
  const trendColor   = severityTrend==='Empeorando' ? R.red : severityTrend==='Mejorando' ? B[600] : SL[400]
  const reversedAna  = [...fichaAnalyses].reverse()
  const imagesWithUrl = fichaAnalyses.filter(a => a.image_url)
  const latestSev    = fichaAnalyses[0]?.severity || ''
  const isRisk       = sevColor(latestSev) !== B[600]
  const plotSubtitle = [farmName, plotName, zone].filter(Boolean).join(' · ')

  return (
    <div style={{ width:W, background:'#fff', fontFamily:SANS, color:SL[900] }}>

      {/* ══ HEADER ════════════════════════════════════════════════════════════ */}
      <div style={{ background:'#fff', borderBottom:`1px solid ${SL[200]}` }}>

        {/* Top accent line */}
        <div style={{ height:4, background:`linear-gradient(90deg, ${B[800]}, ${B[500]}, ${B[800]})` }} />

        {/* Main header row */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:24, padding:`20px ${PAD}px 16px` }}>

          {/* Left: logo + brand */}
          <div style={{ display:'flex', gap:13, alignItems:'center' }}>
            <div style={{ width:44, height:44, background:B[700], borderRadius:13, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <BrandLogo size={21} color="#fff" />
            </div>
            <div>
              <div style={{ fontFamily:SANS, fontSize:17, fontWeight:700, letterSpacing:'0.07em', color:SL[900], lineHeight:1 }}>
                PITAHAYA VISION
              </div>
              <div style={{ fontFamily:SANS, fontSize:9.5, color:SL[400], letterSpacing:'0.03em', marginTop:4 }}>
                Sistema de Monitoreo Fitosanitario · UNEMI · Ecuador
              </div>
            </div>
          </div>

          {/* Right: document label + plant ID + ref */}
          <div style={{ textAlign:'right' }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:B[50], border:`1px solid ${B[200]}`, borderRadius:999, padding:'5px 13px', marginBottom:8 }}>
              <span style={{ fontFamily:SANS, fontSize:8.5, fontWeight:700, letterSpacing:'0.16em', textTransform:'uppercase', color:B[700] }}>
                Ficha técnica fitosanitaria
              </span>
            </div>
            <div style={{ fontFamily:MONO, fontSize:14, fontWeight:600, color:SL[900], letterSpacing:'0.02em', lineHeight:1 }}>
              {plantId}
            </div>
            <div style={{ fontFamily:MONO, fontSize:8.5, color:SL[300], letterSpacing:'0.07em', marginTop:4 }}>
              {refCode}
            </div>
            <div style={{ fontFamily:SANS, fontSize:9, color:SL[400], marginTop:2 }}>
              {generatedAt}
            </div>
          </div>
        </div>

        {/* Bottom row: descriptor tags + status badge */}
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:`9px ${PAD}px 12px`, borderTop:`1px solid ${SL[100]}`, background:SL[50] }}>
          <span style={{ fontFamily:SANS, fontSize:7.5, fontWeight:700, letterSpacing:'0.16em', textTransform:'uppercase', color:SL[500] }}>
            Reporte fitosanitario individual
          </span>
          <span style={{ width:3, height:3, borderRadius:'50%', background:SL[300], flexShrink:0 }} />
          <span style={{ fontFamily:SANS, fontSize:9.5, color:SL[600] }}>Seguimiento de planta</span>
          <span style={{ width:3, height:3, borderRadius:'50%', background:SL[300], flexShrink:0 }} />
          <span style={{ fontFamily:SANS, fontSize:9.5, color:SL[600] }}>Diagnóstico asistido por IA</span>
          {user?.name && (
            <>
              <span style={{ width:3, height:3, borderRadius:'50%', background:SL[300], flexShrink:0 }} />
              <span style={{ fontFamily:SANS, fontSize:9.5, color:SL[600] }}>Productor: {user.name}</span>
            </>
          )}
          {latestSev && (
            <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6, background:sevBg(latestSev), border:`1px solid ${sevBorder(latestSev)}`, borderRadius:999, padding:'5px 12px' }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:sevColor(latestSev), flexShrink:0 }} />
              <span style={{ fontFamily:SANS, fontSize:9.5, fontWeight:600, color:sevText(latestSev) }}>
                {isRisk ? 'Requiere atención' : 'Estado saludable'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ══ TITLE BLOCK ═══════════════════════════════════════════════════════ */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', gap:24, padding:`18px ${PAD}px 0` }}>
        <div>
          <div style={{ fontFamily:SANS, fontSize:9.5, fontWeight:600, letterSpacing:'0.16em', textTransform:'uppercase', color:B[600], marginBottom:5 }}>
            Identificación del sujeto
          </div>
          <div style={{ fontFamily:SERIF, fontSize:30, fontWeight:600, color:SL[900], lineHeight:1.05, letterSpacing:'-0.01em' }}>
            {plantId}
          </div>
          <div style={{ fontFamily:SANS, fontSize:11.5, color:SL[500], marginTop:5 }}>{plotSubtitle}</div>
        </div>
      </div>

      {/* ══ META STRIP ════════════════════════════════════════════════════════ */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', border:`1px solid ${SL[200]}`, borderRadius:12, margin:`14px ${PAD}px 24px`, overflow:'hidden' }}>
        {[
          { label:'Emisión',        v1: new Date().toLocaleDateString('es-EC',{day:'2-digit',month:'short',year:'numeric'}), v2: new Date().toLocaleTimeString('es-EC',{hour:'2-digit',minute:'2-digit'}), mono:true },
          { label:'Análisis',       v1:`${fichaTotal} registrados`, v2: fichaLastDate ? `Último: ${fichaLastDate}` : '—' },
          { label:'Severidad media',v1:avgSeverityLabel, v2: severityTrend!=='—' ? `Tend. ${severityTrend}` : '—', color:sevColor(avgSeverityLabel) },
          { label:'Coordenadas GPS',v1: gps ? gps.split(',')[0]?.trim() : '—', v2: gps ? gps.split(',')[1]?.trim() : '', mono:true },
        ].map((cell, i, arr) => (
          <div key={i} style={{ padding:'10px 14px', borderRight: i<arr.length-1 ? `1px solid ${SL[200]}` : 'none' }}>
            <div style={{ fontFamily:SANS, fontSize:8, fontWeight:600, letterSpacing:'0.12em', textTransform:'uppercase', color:SL[400], marginBottom:5 }}>{cell.label}</div>
            <div style={{ fontFamily: cell.mono ? MONO : SANS, fontSize:11.5, fontWeight:600, color: cell.color || SL[800], lineHeight:1.2 }}>{cell.v1}</div>
            <div style={{ fontFamily: cell.mono ? MONO : SANS, fontSize:9.5, color:SL[400], marginTop:2 }}>{cell.v2}</div>
          </div>
        ))}
      </div>

      {/* ══ SECTIONS ══════════════════════════════════════════════════════════ */}
      <div style={{ padding:`0 ${PAD}px` }}>

        {/* 01 Resumen ejecutivo */}
        <section data-section="resumen" style={{ marginBottom:22 }}>
          <PdfSectionLabel>Resumen ejecutivo</PdfSectionLabel>
          <div style={{ display:'grid', gap:8 }}>
            {[
              `Se registraron <strong>${fichaTotal} análisis fitosanitarios</strong> para la planta ${plantId} en ${farmName}.`,
              fichaDiseases.length > 0 ? `Se identificaron <strong>${fichaDiseases.length} patología${fichaDiseases.length!==1?'s':''} distintas</strong>, siendo &ldquo;${fichaTopDisease}&rdquo; la más relevante.` : null,
              `La severidad promedio registrada es <strong style="color:${sevColor(avgSeverityLabel)}">${avgSeverityLabel}</strong>; tendencia ${severityTrend.toLowerCase()}.`,
              gps ? `Parcela georreferenciada en las coordenadas <span style="font-family:${MONO};font-size:12px">${gps}</span>.` : null,
            ].filter(Boolean).map((b, i) => (
              <div key={i} style={{ display:'grid', gridTemplateColumns:'14px 1fr', alignItems:'baseline' }}>
                <span style={{ fontFamily:SANS, fontSize:13, fontWeight:700, color:B[500], lineHeight:1 }}>·</span>
                <p style={{ margin:0, fontFamily:SANS, fontSize:12.5, lineHeight:1.6, color:SL[700] }} dangerouslySetInnerHTML={{ __html: b }} />
              </div>
            ))}
          </div>
        </section>

        {/* 02 Indicadores */}
        <section data-section="kpis" style={{ marginBottom:22 }}>
          <PdfSectionLabel>Indicadores de seguimiento</PdfSectionLabel>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
            {[
              { value:fichaTotal,           label:'Total de análisis',      accent:B[600],        textColor:SL[900], big:true },
              { value:fichaDiseases.length, label:'Enfermedades distintas', accent:B[600],        textColor:SL[900], big:true },
              { value:avgSeverityLabel,     label:'Severidad promedio',     accent:sevColor(avgSeverityLabel), textColor:sevColor(avgSeverityLabel) },
              { value:severityTrend,        label:'Tendencia sanitaria',    accent:trendColor,    textColor:trendColor },
            ].map((k, i) => (
              <div key={i} style={{ border:`1px solid ${SL[200]}`, borderTop:`3px solid ${k.accent}`, borderRadius:11, padding:'13px 14px 12px' }}>
                <div style={{ fontFamily:k.big?SERIF:SANS, fontSize:k.big?32:17, fontWeight:600, color:k.textColor, letterSpacing:k.big?'-0.02em':'-0.01em', lineHeight:1, display:'flex', alignItems:'center', minHeight:34 }}>
                  {k.value}
                </div>
                <div style={{ fontFamily:SANS, fontSize:9, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:SL[400], marginTop:8 }}>
                  {k.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 03 Finca y parcela */}
        <section data-section="finca" style={{ marginBottom:22 }}>
          <PdfSectionLabel>Finca y parcela</PdfSectionLabel>
          <div style={{ border:`1px solid ${SL[200]}`, borderRadius:11, overflow:'hidden' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)' }}>
              {[
                { label:'Finca / Corporación', value:farmName,   br:true, bb:true },
                { label:'Parcela',             value:plotName,   br:true, bb:true },
                { label:'Zona',                value:zone,       br:false,bb:true },
                { label:'Hileras',             value:fichaPh?._rows, br:true, bb:false, mono:true },
                { label:'Hectáreas',           value:fichaPh?._hectares ? `${fichaPh._hectares} ha` : null, br:true, bb:false, mono:true },
                { label:'Coordenadas GPS',     value:gps,        br:false,bb:false, mono:true },
              ].map((c, i) => (
                <div key={i} style={{ padding:'10px 14px', borderRight:c.br?`1px solid ${SL[200]}`:'none', borderBottom:c.bb?`1px solid ${SL[200]}`:'none' }}>
                  <div style={{ fontFamily:SANS, fontSize:8, fontWeight:600, letterSpacing:'0.12em', textTransform:'uppercase', color:SL[400], marginBottom:5 }}>{c.label}</div>
                  <div style={{ fontFamily:c.mono?MONO:SANS, fontSize:12.5, fontWeight:500, color:c.value?SL[800]:SL[300] }}>{c.value||'—'}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 04 Contexto clínico */}
        <section data-section="contexto" style={{ marginBottom:22 }}>
          <PdfSectionLabel>Contexto clínico</PdfSectionLabel>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
            {[
              { label:'ID de planta',      value:plantId },
              { label:'Estado observado',  value:fichaPh?._status },
              { label:'Síntoma principal', value:fichaPh?._mainSymptom },
              { label:'Órgano afectado',   value:fichaPh?._affectedPart },
            ].map((c, i) => (
              <div key={i} style={{ border:`1px solid ${SL[200]}`, borderRadius:11, padding:'10px 14px' }}>
                <div style={{ fontFamily:SANS, fontSize:8, fontWeight:600, letterSpacing:'0.12em', textTransform:'uppercase', color:SL[400], marginBottom:5 }}>{c.label}</div>
                <div style={{ fontFamily:SANS, fontSize:12.5, fontWeight:500, color:c.value?SL[800]:SL[300] }}>{c.value||'Sin registro'}</div>
              </div>
            ))}
          </div>
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
              const col     = sevColor(e.severity)
              const imgSrc  = e.image_url ? imgMap[e.image_url] : null

              return (
                <div key={i} data-section={`tl-${i}`} style={{ border:`1px solid ${SL[200]}`, borderRadius:11, borderLeft:`3px solid ${col}`, padding:'12px 16px' }}>
                  {/* Header row */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:14 }}>
                    <div>
                      <div style={{ fontFamily:SANS, fontSize:13.5, fontWeight:600, color:SL[900] }}>{disease}</div>
                      <div style={{ fontFamily:MONO, fontSize:9.5, color:SL[400], marginTop:3 }}>{date}</div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <SevPill label={e.severity} />
                      {conf && <div style={{ fontFamily:MONO, fontSize:9, color:SL[400], marginTop:5 }}>confianza {conf}%</div>}
                    </div>
                  </div>

                  {/* Body: thumbnail + recommendation */}
                  {(imgSrc || recs) && (
                    <div style={{ display:'flex', gap:12, alignItems:'stretch', marginTop:10 }}>
                      {imgSrc && (
                        <div style={{ width:76, height:56, borderRadius:8, overflow:'hidden', flexShrink:0, background:SL[100] }}>
                          <img src={imgSrc} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                        </div>
                      )}
                      {recs && (
                        <div style={{ flex:1, background:SL[50], borderRadius:8, padding:'8px 12px' }}>
                          <div style={{ fontFamily:SANS, fontSize:8, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:B[600], marginBottom:4 }}>Recomendación</div>
                          <p style={{ margin:0, fontFamily:SANS, fontSize:11.5, lineHeight:1.5, color:SL[700] }}>{recs}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Treatment */}
                  {treat && (
                    <div style={{ background:R.ambL, border:`1px solid ${R.ambB}`, borderRadius:8, padding:'7px 12px', marginTop:8 }}>
                      <div style={{ fontFamily:SANS, fontSize:8, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:R.amb, marginBottom:3 }}>Tratamiento aplicado</div>
                      <p style={{ margin:0, fontFamily:SANS, fontSize:11.5, lineHeight:1.5, color:SL[700] }}>{treat}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* Aviso legal */}
        <div style={{ borderTop:`1px solid ${SL[100]}`, paddingTop:12, marginBottom:18 }}>
          <p style={{ fontFamily:SANS, fontSize:9, color:SL[400], lineHeight:1.65, margin:0 }}>
            <strong style={{ color:SL[500] }}>Aviso:</strong> Este documento fue generado automáticamente por Pitahaya Vision como herramienta de apoyo al monitoreo fitosanitario.
            Los datos reflejan los registros disponibles a la fecha de generación y tienen carácter informativo.
            Para decisiones agronómicas críticas se recomienda la validación por un técnico especializado en sanidad vegetal.
          </p>
        </div>

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
        // 1. Pre-load images
        const map = await preloadImages(data.fichaAnalyses || [])
        setImgMap(map)

        // 2. Wait for render with images
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
        await new Promise(r => setTimeout(r, 300))

        const template = templateRef.current
        if (!template) throw new Error('Template not mounted')

        // 3. Avoid page cuts (individual cards + sections)
        avoidPageCuts(template, { pageEndFor, maxPagePx: PAGEN_PX, spacerExtra: 6 })
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))

        // 4. Capture canvas
        const canvas = await html2canvas(template, {
          scale: 2, useCORS: true, allowTaint: false,
          logging: false, backgroundColor: '#ffffff', windowWidth: W,
        })

        const imgData  = canvas.toDataURL('image/jpeg', 0.96)
        const pdf      = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' })
        const pageW    = pdf.internal.pageSize.getWidth()
        const pageH    = pdf.internal.pageSize.getHeight()
        const imgProps = pdf.getImageProperties(imgData)
        const imgH     = (imgProps.height * pageW) / imgProps.width

        // Footer + top-margin (mm) — same constants avoidPageCuts() used to lay things out
        const FOOTER_H = FOOTER_MM
        const TOP_M    = TOPM_MM
        const C1       = pageH - FOOTER_H
        const CN       = pageH - FOOTER_H - TOP_M
        const pages    = 1 + Math.ceil(Math.max(0, imgH - C1) / CN)

        // 5. Pages
        for (let i = 0; i < pages; i++) {
          if (i > 0) pdf.addPage()

          const imageY = (i === 0) ? 0 : TOP_M - (C1 + (i-1)*CN)
          pdf.addImage(imgData, 'JPEG', 0, imageY, pageW, imgH)

          // White top margin on pages 2+
          if (i > 0) {
            pdf.setFillColor(255, 255, 255)
            pdf.rect(0, 0, pageW, TOP_M, 'F')
          }

          // Footer — white background, dark text, green top border line
          pdf.setFillColor(255, 255, 255)
          pdf.rect(0, pageH - FOOTER_H, pageW, FOOTER_H, 'F')
          // Thin green accent line at top of footer
          pdf.setFillColor(22, 163, 74)   // B[600] #16a34a
          pdf.rect(0, pageH - FOOTER_H, pageW, 0.6, 'F')
          pdf.setFontSize(6.5)
          pdf.setTextColor(51, 65, 85)    // slate-700
          pdf.setFont('helvetica', 'bold')
          pdf.text('Pitahaya Vision', 10, pageH - FOOTER_H + 3.5)
          pdf.setFont('helvetica', 'normal')
          pdf.setTextColor(100, 116, 139)
          pdf.text(`Pág. ${i+1} / ${pages}`, pageW - 10, pageH - FOOTER_H + 3.5, { align:'right' })
          pdf.setFontSize(5.5)
          pdf.setTextColor(148, 163, 184) // slate-400
          pdf.text(`© ${new Date().getFullYear()} Pitahaya Vision · Todos los derechos reservados`, 10, pageH - FOOTER_H + 6.5)
          pdf.text(generatedAt, pageW - 10, pageH - FOOTER_H + 6.5, { align:'right' })
        }

        const plantPart = data.fichaPh?._plantId ? `_planta_${data.fichaPh._plantId}` : ''
        pdf.save(`pitahaya-vision-ficha${plantPart}-${new Date().toISOString().slice(0,10)}.pdf`)
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