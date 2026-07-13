import { useEffect, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import formatAIText from '../utils/formatAIText'

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const B  = { 50:'#f0fdf4',100:'#dcfce7',200:'#bbf7d0',300:'#86efac',400:'#4ade80',500:'#22c55e',600:'#16a34a',700:'#15803d',800:'#166534',900:'#14532d' }
const SL = { 50:'#f8fafc',100:'#f1f5f9',200:'#e2e8f0',300:'#cbd5e1',400:'#94a3b8',500:'#64748b',600:'#475569',700:'#334155',800:'#1e293b',900:'#0f172a' }
const R  = { red:'#dc2626',redL:'#fef2f2',redB:'#fecaca', ora:'#ea580c',oraL:'#fff7ed',oraB:'#fed7aa', amb:'#d97706',ambL:'#fffbeb',ambB:'#fde68a' }

const SERIF = "'Cormorant Garamond', Georgia, serif"
const SANS  = "Inter, -apple-system, 'Segoe UI', Arial, sans-serif"
const MONO  = "'IBM Plex Mono', 'Courier New', monospace"
const W     = 820
const PAGE_H = Math.round(W * 297 / 210)
const PAD   = 48

// ─── Page geometry (mirrors FichaTecnicaPDF) ──────────────────────────────────
const A4_W_MM   = 210
const FOOTER_MM = 9
const TOPM_MM   = 12
const MM_TO_PX  = W / A4_W_MM
const FOOTER_PX = FOOTER_MM * MM_TO_PX
const TOPM_PX   = TOPM_MM   * MM_TO_PX
const PAGE1_PX  = PAGE_H - FOOTER_PX
const PAGEN_PX  = PAGE_H - FOOTER_PX - TOPM_PX

function pageEndFor(top) {
  if (top < PAGE1_PX) return PAGE1_PX
  const k = Math.floor((top - PAGE1_PX) / PAGEN_PX) + 1
  return PAGE1_PX + k * PAGEN_PX
}

function avoidPageCuts(template) {
  template.querySelectorAll('[data-pdf-spacer]').forEach(el => el.remove())
  function absTop(el) {
    let t = 0, cur = el
    while (cur && cur !== template) { t += cur.offsetTop; cur = cur.offsetParent }
    return t
  }
  for (let iter = 0; iter < 40; iter++) {
    const sections = [...template.querySelectorAll('[data-section]')]
    let changed = false
    for (const s of sections) {
      const h = s.offsetHeight
      if (h > PAGEN_PX) continue
      const top      = absTop(s)
      const bottom   = top + h
      const boundary = pageEndFor(top)
      if (top < boundary && bottom > boundary) {
        const div = document.createElement('div')
        div.setAttribute('data-pdf-spacer', '')
        div.style.cssText = `display:block;height:${boundary - top + 6}px;background:transparent;`
        s.parentElement.insertBefore(div, s)
        changed = true; break
      }
    }
    if (!changed) break
  }
}

// ─── Image pre-loader ─────────────────────────────────────────────────────────
async function preloadImages(analyses) {
  const map = {}
  await Promise.allSettled(
    analyses.filter(a => a.image_url).map(async a => {
      try {
        const resp = await fetch(a.image_url, { mode: 'cors' })
        const blob = await resp.blob()
        map[a.image_url] = await new Promise(res => {
          const r = new FileReader()
          r.onload  = () => res(r.result)
          r.onerror = () => res(null)
          r.readAsDataURL(blob)
        })
      } catch { map[a.image_url] = null }
    })
  )
  return map
}

// ─── Brand logo ───────────────────────────────────────────────────────────────
function BrandLogo({ size = 20, color = '#fff' }) {
  return (
    <svg viewBox="0 0 24 24" style={{ width: size, height: size, fill: color, display: 'block', flexShrink: 0 }}>
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-8 2 4-4 8.5-4 8.5-4-8 3.5-9 6-9 6A8 8 0 0 1 17 8z" />
    </svg>
  )
}

// ─── Section label ────────────────────────────────────────────────────────────
let _secN = 0
function resetSections() { _secN = 0 }
function SecLabel({ children }) {
  _secN++
  const num = String(_secN).padStart(2, '0')
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 13 }}>
      <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, color: B[700], border: `1px solid ${SL[300]}`, borderRadius: 7, letterSpacing: '0.04em', flexShrink: 0, width: 30, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', paddingBottom: 1 }}>
        {num}
      </span>
      <span style={{ fontFamily: SANS, fontSize: 11.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: SL[800], whiteSpace: 'nowrap' }}>
        {children}
      </span>
      <div style={{ flex: 1, height: 1, background: SL[200] }} />
    </div>
  )
}

// ─── Severity helpers ─────────────────────────────────────────────────────────
function normSev(v) { return String(v || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') }
function sevColor(v) {
  const s = normSev(v)
  if (s.includes('crit') || s.includes('extrem') || s.includes('muy alt'))              return R.red
  if (s.includes('alta') || s.includes('high') || s.includes('grav') || s.includes('enfer')) return R.ora
  if (s.includes('moder') || s.includes('media') || s.includes('inter'))                return R.amb
  if (s.includes('sana') || s.includes('buena') || s.includes('salud'))                 return B[600]
  return SL[500]
}
function sevBg(v)     { const c = sevColor(v); return c === R.red ? R.redL : c === R.ora ? R.oraL : c === R.amb ? R.ambL : c === B[600] ? B[50]  : SL[100] }
function sevBorder(v) { const c = sevColor(v); return c === R.red ? R.redB : c === R.ora ? R.oraB : c === R.amb ? R.ambB : c === B[600] ? B[200] : SL[200] }
function sevText(v)   { const c = sevColor(v); return c === R.red ? '#7f1d1d' : c === R.ora ? '#7c2d12' : c === R.amb ? '#78350f' : c === B[600] ? B[900] : SL[700] }

function SevPill({ label }) {
  if (!label) return null
  return (
    <span style={{ display: 'inline-block', fontFamily: SANS, fontSize: 9.5, fontWeight: 600, letterSpacing: '0.03em', color: sevText(label), background: sevBg(label), border: `1px solid ${sevBorder(label)}`, borderRadius: 999, padding: '3px 10px', whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

// ─── Loading overlay ──────────────────────────────────────────────────────────
function LoadingOverlay({ status, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
      <div style={{ background: '#fff', borderRadius: 24, padding: '32px 44px', textAlign: 'center', minWidth: 300, boxShadow: '0 32px 64px rgba(0,0,0,0.2)' }}>
        {status === 'error' ? (
          <>
            <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 600, color: SL[800], marginBottom: 6 }}>Error al generar</div>
            <div style={{ fontFamily: SANS, fontSize: 12, color: SL[500], marginBottom: 18 }}>No se pudo crear el PDF. Intenta de nuevo.</div>
            <button onClick={onClose} style={{ padding: '9px 26px', borderRadius: 10, background: B[600], color: '#fff', border: 'none', cursor: 'pointer', fontFamily: SANS, fontWeight: 600, fontSize: 13 }}>Cerrar</button>
          </>
        ) : status === 'done' ? (
          <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 600, color: SL[800] }}>¡Reporte descargado!</div>
        ) : (
          <>
            <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 600, color: SL[800], marginBottom: 5 }}>Generando reporte de trazabilidad...</div>
            <div style={{ fontFamily: SANS, fontSize: 11.5, color: SL[500], marginBottom: 20 }}>Compilando registros, evolución e imágenes</div>
            <div style={{ height: 3, background: SL[100], borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '65%', background: `linear-gradient(90deg,${B[400]},${B[600]})`, borderRadius: 99 }} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

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
  const refCode    = `PV-TRAZA-${new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 12)}`
  const trendColor = severityTrend === 'Empeorando' ? R.red : severityTrend === 'Mejorando' ? B[600] : SL[400]
  const plotSubtitle  = [farmName, plotName, zone].filter(Boolean).join(' · ')
  const firstEntry = tzAnalyses[0]
  const lastEntry  = tzAnalyses[tzAnalyses.length - 1]
  const firstDate  = firstEntry?.created_at ? new Date(firstEntry.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
  const lastDate   = lastEntry?.created_at  ? new Date(lastEntry.created_at).toLocaleDateString('es-EC',  { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

  return (
    <div style={{ width: W, background: '#fff', fontFamily: SANS, color: SL[900] }}>

      {/* ══ HEADER ════════════════════════════════════════════════════════════ */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${SL[200]}` }}>
        <div style={{ height: 4, background: `linear-gradient(90deg, ${B[800]}, ${B[500]}, ${B[800]})` }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, padding: `20px ${PAD}px 16px` }}>
          <div style={{ display: 'flex', gap: 13, alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, background: B[700], borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <BrandLogo size={21} color="#fff" />
            </div>
            <div>
              <div style={{ fontFamily: SANS, fontSize: 17, fontWeight: 700, letterSpacing: '0.07em', color: SL[900], lineHeight: 1 }}>
                PITAHAYA VISION
              </div>
              <div style={{ fontFamily: SANS, fontSize: 9.5, color: SL[400], letterSpacing: '0.03em', marginTop: 4 }}>
                Sistema de Monitoreo Fitosanitario · UNEMI · Ecuador
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: B[50], border: `1px solid ${B[200]}`, borderRadius: 999, padding: '5px 13px', marginBottom: 8 }}>
              <span style={{ fontFamily: SANS, fontSize: 8.5, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: B[700] }}>
                Reporte de trazabilidad
              </span>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 600, color: SL[900], letterSpacing: '0.02em', lineHeight: 1 }}>
              {plantId}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 8.5, color: SL[300], letterSpacing: '0.07em', marginTop: 4 }}>
              {refCode}
            </div>
            <div style={{ fontFamily: SANS, fontSize: 9, color: SL[400], marginTop: 2 }}>
              {generatedAt}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: `9px ${PAD}px 12px`, borderTop: `1px solid ${SL[100]}`, background: SL[50] }}>
          <span style={{ fontFamily: SANS, fontSize: 7.5, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: SL[500] }}>
            Evolución del cultivo
          </span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: SL[300], flexShrink: 0 }} />
          <span style={{ fontFamily: SANS, fontSize: 9.5, color: SL[600] }}>Seguimiento cronológico por planta</span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: SL[300], flexShrink: 0 }} />
          <span style={{ fontFamily: SANS, fontSize: 9.5, color: SL[600] }}>Análisis asistido por IA</span>
          {user?.name && (
            <>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: SL[300], flexShrink: 0 }} />
              <span style={{ fontFamily: SANS, fontSize: 9.5, color: SL[600] }}>Productor: {user.name}</span>
            </>
          )}
        </div>
      </div>

      {/* ══ TITLE BLOCK ═══════════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24, padding: `18px ${PAD}px 0` }}>
        <div>
          <div style={{ fontFamily: SANS, fontSize: 9.5, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: B[600], marginBottom: 5 }}>
            Identificación del sujeto
          </div>
          <div style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 600, color: SL[900], lineHeight: 1.05, letterSpacing: '-0.01em' }}>
            {plantId}
          </div>
          <div style={{ fontFamily: SANS, fontSize: 11.5, color: SL[500], marginTop: 5 }}>{plotSubtitle}</div>
        </div>
      </div>

      {/* ══ META STRIP ════════════════════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', border: `1px solid ${SL[200]}`, borderRadius: 12, margin: `14px ${PAD}px 24px`, overflow: 'hidden' }}>
        {[
          { label: 'Período analizado', v1: periodLabel, v2: total ? `${firstDate} — ${lastDate}` : '—' },
          { label: 'Registros',         v1: `${total} análisis`, v2: `${diseases.length} diagnóstico${diseases.length !== 1 ? 's' : ''} distinto${diseases.length !== 1 ? 's' : ''}` },
          { label: 'Severidad media',   v1: avgSeverityLabel, v2: severityTrend !== '—' ? `Tend. ${severityTrend}` : '—', color: sevColor(avgSeverityLabel) },
          { label: 'Coordenadas GPS',   v1: gps ? gps.split(',')[0]?.trim() : '—', v2: gps ? gps.split(',')[1]?.trim() : '', mono: true },
        ].map((cell, i, arr) => (
          <div key={i} style={{ padding: '10px 14px', borderRight: i < arr.length - 1 ? `1px solid ${SL[200]}` : 'none' }}>
            <div style={{ fontFamily: SANS, fontSize: 8, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: SL[400], marginBottom: 5 }}>{cell.label}</div>
            <div style={{ fontFamily: cell.mono ? MONO : SANS, fontSize: 11.5, fontWeight: 600, color: cell.color || SL[800], lineHeight: 1.2 }}>{cell.v1}</div>
            <div style={{ fontFamily: cell.mono ? MONO : SANS, fontSize: 9.5, color: SL[400], marginTop: 2 }}>{cell.v2}</div>
          </div>
        ))}
      </div>

      {/* ══ SECTIONS ══════════════════════════════════════════════════════════ */}
      <div style={{ padding: `0 ${PAD}px` }}>

        {/* 01 Resumen ejecutivo */}
        <section data-section="resumen" style={{ marginBottom: 22 }}>
          <SecLabel>Resumen ejecutivo</SecLabel>
          <div style={{ display: 'grid', gap: 8 }}>
            {[
              `Se analizaron <strong>${total} registro${total !== 1 ? 's' : ''} de trazabilidad</strong> de la planta ${plantId} en ${farmName}, correspondientes al período &ldquo;${periodLabel}&rdquo;.`,
              diseases.length > 0 ? `Se identificaron <strong>${diseases.length} patología${diseases.length !== 1 ? 's' : ''} distintas</strong> a lo largo del seguimiento.` : null,
              `La severidad promedio del período es <strong style="color:${sevColor(avgSeverityLabel)}">${avgSeverityLabel}</strong>, con una tendencia general de <strong>${severityTrend}</strong>.`,
              gps ? `Parcela georreferenciada en las coordenadas <span style="font-family:${MONO};font-size:12px">${gps}</span>.` : null,
            ].filter(Boolean).map((b, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '14px 1fr', alignItems: 'baseline' }}>
                <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: B[500], lineHeight: 1 }}>·</span>
                <p style={{ margin: 0, fontFamily: SANS, fontSize: 12.5, lineHeight: 1.6, color: SL[700] }} dangerouslySetInnerHTML={{ __html: b }} />
              </div>
            ))}
          </div>
        </section>

        {/* 02 Contexto de la planta */}
        <section data-section="contexto" style={{ marginBottom: 22 }}>
          <SecLabel>Contexto de la planta</SecLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            {[
              { label: 'Parcela / Zona',    value: [plotName, zone].filter(Boolean).join(' · ') },
              { label: 'Estado observado',  value: tzPh?._status },
              { label: 'Síntoma principal', value: tzPh?._mainSymptom },
              { label: 'Órgano afectado',   value: tzPh?._affectedPart },
            ].map((c, i) => (
              <div key={i} style={{ border: `1px solid ${SL[200]}`, borderRadius: 11, padding: '10px 14px' }}>
                <div style={{ fontFamily: SANS, fontSize: 8, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: SL[400], marginBottom: 5 }}>{c.label}</div>
                <div style={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 500, color: c.value ? SL[800] : SL[300] }}>{c.value || 'Sin registro'}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 03 Análisis de evolución (IA) */}
        <section data-section="ia" style={{ marginBottom: 22 }}>
          <SecLabel>Análisis de evolución · Inteligencia artificial</SecLabel>
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
          <SecLabel>Línea de tiempo de análisis</SecLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tzAnalyses.map((e, i) => {
              const isLast   = i === tzAnalyses.length - 1
              const disease  = e.disease_name_predicted || '—'
              const recs     = e.recommendations_text || e.analysis_recommendations_text || ''
              const treat    = e._ph?.history_treatment_applied || ''
              const notes    = e._ph?.history_notes || e._ph?.notes || ''
              const conf     = e.confidence_percent ?? (e.confidence ? (e.confidence <= 1 ? Math.round(e.confidence * 100) : Math.round(e.confidence)) : null)
              const date     = e.created_at ? new Date(e.created_at).toLocaleDateString('es-EC', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' }) : '—'
              const col      = sevColor(e.severity)
              const imgSrc   = e.image_url ? imgMap[e.image_url] : null

              return (
                <div key={i} data-section={`tl-${i}`} style={{ border: `1px solid ${SL[200]}`, borderRadius: 11, borderLeft: `3px solid ${col}`, padding: '12px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: SANS, fontSize: 13.5, fontWeight: 600, color: SL[900] }}>{disease}</span>
                        {isLast && (
                          <span style={{ fontFamily: SANS, fontSize: 8.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: B[700], background: B[100], borderRadius: 999, padding: '2px 8px' }}>
                            Estado más reciente
                          </span>
                        )}
                      </div>
                      <div style={{ fontFamily: MONO, fontSize: 9.5, color: SL[400], marginTop: 3 }}>{date}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <SevPill label={e.severity} />
                      {conf != null && <div style={{ fontFamily: MONO, fontSize: 9, color: SL[400], marginTop: 5 }}>confianza {conf}%</div>}
                    </div>
                  </div>

                  {(imgSrc || recs) && (
                    <div style={{ display: 'flex', gap: 12, alignItems: 'stretch', marginTop: 10 }}>
                      {imgSrc && (
                        <div style={{ width: 76, height: 56, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: SL[100] }}>
                          <img src={imgSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        </div>
                      )}
                      {recs && (
                        <div style={{ flex: 1, background: SL[50], borderRadius: 8, padding: '8px 12px' }}>
                          <div style={{ fontFamily: SANS, fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: B[600], marginBottom: 4 }}>Recomendación</div>
                          <p style={{ margin: 0, fontFamily: SANS, fontSize: 11.5, lineHeight: 1.5, color: SL[700] }}>{recs}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {treat && (
                    <div style={{ background: R.ambL, border: `1px solid ${R.ambB}`, borderRadius: 8, padding: '7px 12px', marginTop: 8 }}>
                      <div style={{ fontFamily: SANS, fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: R.amb, marginBottom: 3 }}>Tratamiento aplicado</div>
                      <p style={{ margin: 0, fontFamily: SANS, fontSize: 11.5, lineHeight: 1.5, color: SL[700] }}>{treat}</p>
                    </div>
                  )}

                  {notes && (
                    <div style={{ background: SL[50], borderRadius: 8, padding: '7px 12px', marginTop: 8 }}>
                      <div style={{ fontFamily: SANS, fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: SL[400], marginBottom: 3 }}>Notas</div>
                      <p style={{ margin: 0, fontFamily: SANS, fontSize: 11.5, lineHeight: 1.5, color: SL[700] }}>{notes}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* Aviso legal */}
        <div style={{ borderTop: `1px solid ${SL[100]}`, paddingTop: 12, marginBottom: 18 }}>
          <p style={{ fontFamily: SANS, fontSize: 9, color: SL[400], lineHeight: 1.65, margin: 0 }}>
            <strong style={{ color: SL[500] }}>Aviso:</strong> Este documento fue generado automáticamente por Pitahaya Vision como herramienta de apoyo al monitoreo fitosanitario.
            El análisis de evolución fue generado por un modelo de inteligencia artificial (google/gemma-3-4b-it) a partir de los registros disponibles y tiene carácter informativo.
            Para decisiones agronómicas críticas se recomienda la validación por un técnico especializado en sanidad vegetal.
          </p>
        </div>

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

        avoidPageCuts(template)
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))

        const canvas = await html2canvas(template, {
          scale: 2, useCORS: true, allowTaint: false,
          logging: false, backgroundColor: '#ffffff', windowWidth: W,
        })

        const imgData  = canvas.toDataURL('image/jpeg', 0.96)
        const pdf      = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
        const pageW    = pdf.internal.pageSize.getWidth()
        const pageH    = pdf.internal.pageSize.getHeight()
        const imgProps = pdf.getImageProperties(imgData)
        const imgH     = (imgProps.height * pageW) / imgProps.width

        const FOOTER_H = FOOTER_MM
        const TOP_M    = TOPM_MM
        const C1       = pageH - FOOTER_H
        const CN       = pageH - FOOTER_H - TOP_M
        const pages    = 1 + Math.ceil(Math.max(0, imgH - C1) / CN)

        for (let i = 0; i < pages; i++) {
          if (i > 0) pdf.addPage()

          const imageY = (i === 0) ? 0 : TOP_M - (C1 + (i - 1) * CN)
          pdf.addImage(imgData, 'JPEG', 0, imageY, pageW, imgH)

          if (i > 0) {
            pdf.setFillColor(255, 255, 255)
            pdf.rect(0, 0, pageW, TOP_M, 'F')
          }

          pdf.setFillColor(255, 255, 255)
          pdf.rect(0, pageH - FOOTER_H, pageW, FOOTER_H, 'F')
          pdf.setFillColor(22, 163, 74)
          pdf.rect(0, pageH - FOOTER_H, pageW, 0.6, 'F')
          pdf.setFontSize(6.5)
          pdf.setTextColor(51, 65, 85)
          pdf.setFont('helvetica', 'bold')
          pdf.text('Pitahaya Vision', 10, pageH - FOOTER_H + 3.5)
          pdf.setFont('helvetica', 'normal')
          pdf.setTextColor(100, 116, 139)
          pdf.text(`Pág. ${i + 1} / ${pages}`, pageW - 10, pageH - FOOTER_H + 3.5, { align: 'right' })
          pdf.setFontSize(5.5)
          pdf.setTextColor(148, 163, 184)
          pdf.text(`© ${new Date().getFullYear()} Pitahaya Vision · Todos los derechos reservados`, 10, pageH - FOOTER_H + 6.5)
          pdf.text(generatedAt, pageW - 10, pageH - FOOTER_H + 6.5, { align: 'right' })
        }

        const plantPart = data.tzPh?._plantId ? `_planta_${data.tzPh._plantId}` : ''
        pdf.save(`pitahaya-vision-trazabilidad${plantPart}-${new Date().toISOString().slice(0, 10)}.pdf`)
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
      <LoadingOverlay status={status} onClose={onClose} />
      <div style={{ position: 'fixed', top: 0, left: '-9999px', zIndex: -1, pointerEvents: 'none' }}>
        <div ref={templateRef} style={{ width: W, background: '#fff', fontFamily: SANS }}>
          <TrazabilidadTemplate data={data} imgMap={imgMap} generatedAt={generatedAt} />
        </div>
      </div>
    </>
  )
}
