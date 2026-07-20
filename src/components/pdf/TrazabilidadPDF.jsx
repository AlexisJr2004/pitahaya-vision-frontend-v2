import { useEffect, useRef, useState } from 'react'
import formatAIText from '../../utils/formatAIText'
import {
  B, SL, R, SERIF, SANS, MONO, PdfLoadingOverlay, SevPill, PdfSectionLabel, resetSections,
  sevColor, createPageGeometry, preloadImages,
  makeRefCode, renderTemplateToPdf, PdfDocHeader, PdfTitleBlock, PdfMetaStrip,
  PdfCellGrid, PdfBullets, PdfTimelineEntry, PdfLegalNotice,
} from './pdfCommon'

const W     = 820
const PAD   = 48
const FOOTER_MM = 9
const TOPM_MM   = 12
const geo = createPageGeometry(W, FOOTER_MM, TOPM_MM)
const { pageEndFor, PAGEN_PX } = geo

// ─── PDF Template ─────────────────────────────────────────────────────────────
function TrazabilidadTemplate({ data, imgMap, generatedAt }) {
  resetSections()
  const {
    tzPh, tzAnalyses, periodLabel, aiAnalysis,
    avgSeverityLabel, severityTrend, user,
  } = data

  const plantId    = tzPh?._plantId  || '—'
  const farmName   = tzPh?._farmName || '—'
  const plotName   = tzPh?._plotName || ''
  const zone       = tzPh?._zone     || ''
  const gps        = tzPh?._gps      || ''
  const total      = tzAnalyses.length
  const diseases   = [...new Set(tzAnalyses.map(e => e.disease_name_predicted).filter(Boolean))]
  const refCode    = makeRefCode('PV-TRAZA')
  const plotSubtitle  = [farmName, plotName, zone].filter(Boolean).join(' · ')
  const firstEntry = tzAnalyses[0]
  const lastEntry  = tzAnalyses[tzAnalyses.length - 1]
  const firstDate  = firstEntry?.created_at ? new Date(firstEntry.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
  const lastDate   = lastEntry?.created_at  ? new Date(lastEntry.created_at).toLocaleDateString('es-EC',  { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

  return (
    <div style={{ width: W, background: '#fff', fontFamily: SANS, color: SL[900] }}>

      <PdfDocHeader
        badgeText="Reporte de trazabilidad"
        plantId={plantId}
        refCode={refCode}
        generatedAt={generatedAt}
        pad={PAD}
        descriptorItems={['Evolución del cultivo', 'Seguimiento cronológico por planta', 'Análisis asistido por IA']}
        userName={user?.name}
      />

      <PdfTitleBlock eyebrow="Identificación del sujeto" title={plantId} subtitle={plotSubtitle} pad={PAD} />

      <PdfMetaStrip pad={PAD} cells={[
        { label: 'Período analizado', v1: periodLabel, v2: total ? `${firstDate} — ${lastDate}` : '—' },
        { label: 'Registros',         v1: `${total} análisis`, v2: `${diseases.length} diagnóstico${diseases.length !== 1 ? 's' : ''} distinto${diseases.length !== 1 ? 's' : ''}` },
        { label: 'Severidad media',   v1: avgSeverityLabel, v2: severityTrend !== '—' ? `Tend. ${severityTrend}` : '—', color: sevColor(avgSeverityLabel) },
        { label: 'Coordenadas GPS',   v1: gps ? gps.split(',')[0]?.trim() : '—', v2: gps ? gps.split(',')[1]?.trim() : '', mono: true },
      ]} />

      {/* ══ SECTIONS ══════════════════════════════════════════════════════════ */}
      <div style={{ padding: `0 ${PAD}px` }}>

        {/* 01 Resumen ejecutivo */}
        <section data-section="resumen" style={{ marginBottom: 22 }}>
          <PdfSectionLabel>Resumen ejecutivo</PdfSectionLabel>
          <PdfBullets items={[
            `Se analizaron <strong>${total} registro${total !== 1 ? 's' : ''} de trazabilidad</strong> de la planta ${plantId} en ${farmName}, correspondientes al período &ldquo;${periodLabel}&rdquo;.`,
            diseases.length > 0 ? `Se identificaron <strong>${diseases.length} patología${diseases.length !== 1 ? 's' : ''} distintas</strong> a lo largo del seguimiento.` : null,
            `La severidad promedio del período es <strong style="color:${sevColor(avgSeverityLabel)}">${avgSeverityLabel}</strong>, con una tendencia general de <strong>${severityTrend}</strong>.`,
            gps ? `Parcela georreferenciada en las coordenadas <span style="font-family:${MONO};font-size:12px">${gps}</span>.` : null,
          ].filter(Boolean)} />
        </section>

        {/* 02 Contexto de la planta */}
        <section data-section="contexto" style={{ marginBottom: 22 }}>
          <PdfSectionLabel>Contexto de la planta</PdfSectionLabel>
          <PdfCellGrid columns={4} cells={[
            { label: 'Parcela / Zona',    value: [plotName, zone].filter(Boolean).join(' · ') },
            { label: 'Estado observado',  value: tzPh?._status },
            { label: 'Síntoma principal', value: tzPh?._mainSymptom },
            { label: 'Órgano afectado',   value: tzPh?._affectedPart },
          ]} />
        </section>

        {/* 03 Análisis de evolución (IA) */}
        <section data-section="ia" style={{ marginBottom: 22 }}>
          <PdfSectionLabel>Análisis de evolución · Inteligencia artificial</PdfSectionLabel>
          <div style={{ border: `1px solid ${B[200]}`, background: B[50], borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ width: 26, height: 26, borderRadius: 8, background: '#fff', border: `1px solid ${B[200]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="fas fa-robot" style={{ fontSize: 12, color: B[700] }}></i>
              </span>
              <span style={{ fontFamily: SANS, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: B[700] }}>
                Generado por google/gemma-3-4b-it
              </span>
            </div>
            {aiAnalysis ? (
              <div style={{ fontFamily: SANS, fontSize: 12.5, lineHeight: 1.65, color: SL[800] }}
                dangerouslySetInnerHTML={{ __html: formatAIText(aiAnalysis) }} />
            ) : (
              <p style={{ margin: 0, fontFamily: SANS, fontSize: 12, lineHeight: 1.6, color: SL[500], fontStyle: 'italic' }}>
                No se generó un análisis de IA para este reporte. Genera el análisis de evolución desde el panel correspondiente antes de exportar.
              </p>
            )}
          </div>
        </section>

        {/* 04 Línea de tiempo de análisis */}
        <section data-section="timeline" style={{ marginBottom: 28 }}>
          <PdfSectionLabel>Línea de tiempo de análisis</PdfSectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tzAnalyses.map((e, i) => {
              const isLast   = i === tzAnalyses.length - 1
              const disease  = e.disease_name_predicted || '—'
              const recs     = e.recommendations_text || e.analysis_recommendations_text || ''
              const treat    = e._ph?.history_treatment_applied || ''
              const notes    = e._ph?.history_notes || e._ph?.notes || ''
              const conf     = e.confidence_percent ?? (e.confidence ? (e.confidence <= 1 ? Math.round(e.confidence * 100) : Math.round(e.confidence)) : null)
              const date     = e.created_at ? new Date(e.created_at).toLocaleDateString('es-EC', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' }) : '—'
              const imgSrc   = e.image_url ? imgMap[e.image_url] : null

              return (
                <div key={i} data-section={`tl-${i}`}>
                  <PdfTimelineEntry
                    disease={disease} date={date} severityLabel={e.severity}
                    confidence={conf} imgSrc={imgSrc} recs={recs} treat={treat} notes={notes}
                    showRecentBadge={isLast}
                  />
                </div>
              )
            })}
          </div>
        </section>

        <PdfLegalNotice>
          Este documento fue generado automáticamente por Pitahaya Vision como herramienta de apoyo al monitoreo fitosanitario.
          El análisis de evolución fue generado por un modelo de inteligencia artificial (google/gemma-3-4b-it) a partir de los registros disponibles y tiene carácter informativo.
          Para decisiones agronómicas críticas se recomienda la validación por un técnico especializado en sanidad vegetal.
        </PdfLegalNotice>

      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function TrazabilidadPDF({ isOpen, onClose, data }) {
  const templateRef = useRef(null)
  const [status, setStatus] = useState('idle')
  const [imgMap, setImgMap] = useState({})

  const generatedAt = new Date().toLocaleDateString('es-EC', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  useEffect(() => {
    if (!isOpen) { setStatus('idle'); setImgMap({}); return }
    setStatus('generating')

    const timer = setTimeout(async () => {
      try {
        const map = await preloadImages(data.tzAnalyses || [])
        setImgMap(map)

        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
        await new Promise(r => setTimeout(r, 300))

        const template = templateRef.current
        if (!template) throw new Error('Template not mounted')

        const plantPart = data.tzPh?._plantId ? `_planta_${data.tzPh._plantId}` : ''
        await renderTemplateToPdf(template, {
          W, FOOTER_MM, TOPM_MM, pageEndFor, maxPagePx: PAGEN_PX, generatedAt,
          filename: `pitahaya-vision-trazabilidad${plantPart}-${new Date().toISOString().slice(0, 10)}.pdf`,
          copyrightSuffix: ' · Todos los derechos reservados',
        })
        setStatus('done')
        setTimeout(onClose, 800)
      } catch (err) {
        console.error('TrazabilidadPDF error:', err)
        setStatus('error')
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null

  return (
    <>
      <PdfLoadingOverlay status={status} onClose={onClose} title="Generando reporte de trazabilidad..." subtitle="Compilando registros, evolución e imágenes" doneMessage="¡Reporte descargado!" />
      <div style={{ position: 'fixed', top: 0, left: '-9999px', zIndex: -1, pointerEvents: 'none' }}>
        <div ref={templateRef} style={{ width: W, background: '#fff', fontFamily: SANS }}>
          <TrazabilidadTemplate data={data} imgMap={imgMap} generatedAt={generatedAt} />
        </div>
      </div>
    </>
  )
}
