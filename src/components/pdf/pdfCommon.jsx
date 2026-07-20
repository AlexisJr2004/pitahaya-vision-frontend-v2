export const B  = { 50:'#f0fdf4',100:'#dcfce7',200:'#bbf7d0',300:'#86efac',400:'#4ade80',500:'#22c55e',600:'#16a34a',700:'#15803d',800:'#166534',900:'#14532d' }
export const SL = { 50:'#f8fafc',100:'#f1f5f9',200:'#e2e8f0',300:'#cbd5e1',400:'#94a3b8',500:'#64748b',600:'#475569',700:'#334155',800:'#1e293b',900:'#0f172a' }
export const R  = { red:'#dc2626',redL:'#fef2f2',redB:'#fecaca', ora:'#ea580c',oraL:'#fff7ed',oraB:'#fed7aa', amb:'#d97706',ambL:'#fffbeb',ambB:'#fde68a', blu:'#2563eb',bluL:'#eff6ff',bluB:'#bfdbfe', pur:'#7c3aed',purL:'#f5f3ff',purB:'#ddd6fe', tea:'#0d9488',teaL:'#f0fdfa',teaB:'#99f6e4' }

import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { PITAHAYA_PATH } from '../AppLogo'

export const SERIF = "'Cormorant Garamond', Georgia, serif"
export const SANS  = "Inter, -apple-system, 'Segoe UI', Arial, sans-serif"
export const MONO  = "'IBM Plex Mono', 'Courier New', monospace"

export function normSev(v) { return String(v||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'') }
export function sevColor(v) {
  const s = normSev(v)
  if (s.includes('crit')||s.includes('extrem')||s.includes('muy alt')) return R.red
  if (s.includes('alta')||s.includes('high')||s.includes('grav')||s.includes('enfer')) return R.ora
  if (s.includes('moder')||s.includes('media')||s.includes('inter')) return R.amb
  if (s.includes('sana')||s.includes('buena')||s.includes('salud')||s.includes('baja')||s.includes('low')) return B[600]
  return SL[500]
}
export function sevBg(v)     { const c=sevColor(v); return c===R.red?R.redL:c===R.ora?R.oraL:c===R.amb?R.ambL:c===B[600]?B[50]:SL[100] }
export function sevBorder(v) { const c=sevColor(v); return c===R.red?R.redB:c===R.ora?R.oraB:c===R.amb?R.ambB:c===B[600]?B[200]:SL[200] }
export function sevText(v)   { const c=sevColor(v); return c===R.red?'#7f1d1d':c===R.ora?'#7c2d12':c===R.amb?'#78350f':c===B[600]?B[900]:SL[700] }

export function BrandLogo({ size=20, color='#fff' }) {
  return (
    <svg viewBox="0 0 24 24" style={{ width:size, height:size, fill:color, display:'block', flexShrink:0 }}>
      <path d={PITAHAYA_PATH}/>
    </svg>
  )
}

export function PdfLoadingOverlay({ status, onClose, title='Generando PDF...', subtitle='', doneMessage='¡PDF descargado!', buttonStyle={}, overlayStyle={} }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(15,23,42,0.65)', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(8px)' }}>
      <div style={{ background:'#fff', borderRadius:24, padding:'32px 44px', textAlign:'center', minWidth:300, boxShadow:'0 32px 64px rgba(0,0,0,0.2)', ...overlayStyle }}>
        {status === 'error' ? (
          <>
            <div style={{ fontFamily:SERIF, fontSize:20, fontWeight:600, color:SL[800], marginBottom:6 }}>Error al generar</div>
            <div style={{ fontFamily:SANS, fontSize:12, color:SL[500], marginBottom:18 }}>No se pudo crear el PDF. Intenta de nuevo.</div>
            <button onClick={onClose} style={{ padding:buttonStyle.padding||'9px 26px', borderRadius:buttonStyle.borderRadius||10, background:B[600], color:'#fff', border:'none', cursor:'pointer', fontFamily:SANS, fontWeight:600, fontSize:13 }}>Cerrar</button>
          </>
        ) : status === 'done' ? (
          <div style={{ fontFamily:SERIF, fontSize:20, fontWeight:600, color:SL[800] }}>{doneMessage}</div>
        ) : (
          <>
            <div style={{ fontFamily:SERIF, fontSize:20, fontWeight:600, color:SL[800], marginBottom:5 }}>{title}</div>
            <div style={{ fontFamily:SANS, fontSize:11.5, color:SL[500], marginBottom:20 }}>{subtitle}</div>
            <div style={{ height:3, background:SL[100], borderRadius:99, overflow:'hidden' }}>
              <div style={{ height:'100%', width:'65%', background:`linear-gradient(90deg,${B[400]},${B[600]})`, borderRadius:99 }} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function SevPill({ label }) {
  if (!label) return null
  return (
    <span style={{ display:'inline-block', fontFamily:SANS, fontSize:9.5, fontWeight:600, letterSpacing:'0.03em', color:sevText(label), background:sevBg(label), border:`1px solid ${sevBorder(label)}`, borderRadius:999, padding:'3px 10px', whiteSpace:'nowrap' }}>
      {label}
    </span>
  )
}

let _secN = 0
export function resetSections() { _secN = 0 }
export function PdfSectionLabel({ children }) {
  _secN++
  const num = String(_secN).padStart(2,'0')
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:13 }}>
      <span style={{ fontFamily:MONO, fontSize:10, fontWeight:600, color:B[700], border:`1px solid ${SL[300]}`, borderRadius:7, letterSpacing:'0.04em', flexShrink:0, width:30, height:22, display:'inline-flex', alignItems:'center', justifyContent:'center', paddingBottom:1 }}>
        {num}
      </span>
      <span style={{ fontFamily:SANS, fontSize:11.5, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:SL[800], whiteSpace:'nowrap' }}>
        {children}
      </span>
      <div style={{ flex:1, height:1, background:SL[200] }} />
    </div>
  )
}

export async function preloadImages(analyses) {
  const map = {}
  await Promise.allSettled(
    analyses.filter(a => a.image_url).map(async a => {
      try {
        const resp = await fetch(a.image_url, { mode:'cors' })
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

export function createPageGeometry(W, FOOTER_MM, TOPM_MM = 0) {
  const A4_W_MM = 210
  const A4_H_MM = 297
  const PAGE_H = Math.round(W * A4_H_MM / A4_W_MM)
  const MM_TO_PX = W / A4_W_MM
  const FOOTER_PX = FOOTER_MM * MM_TO_PX
  const TOPM_PX = TOPM_MM * MM_TO_PX
  const PAGE1_PX = PAGE_H - FOOTER_PX
  const PAGEN_PX = PAGE_H - FOOTER_PX - TOPM_PX

  function pageEndFor(top) {
    if (TOPM_MM === 0) {
      const k = Math.floor(top / PAGE1_PX) + 1
      return k * PAGE1_PX
    }
    if (top < PAGE1_PX) return PAGE1_PX
    const k = Math.floor((top - PAGE1_PX) / PAGEN_PX) + 1
    return PAGE1_PX + k * PAGEN_PX
  }

  return { PAGE_H, PAGE1_PX, PAGEN_PX, MM_TO_PX, FOOTER_PX, TOPM_PX, pageEndFor }
}

export function avoidPageCuts(template, { pageEndFor, maxPagePx, spacerExtra=6 } = {}) {
  template.querySelectorAll('[data-pdf-spacer]').forEach(el => el.remove())

  function absTop(el) {
    let t = 0, cur = el
    while (cur && cur !== template) { t += cur.offsetTop; cur = cur.offsetParent }
    return t
  }

  for (let iter = 0; iter < 40; iter++) {
    let sections = [...template.querySelectorAll('[data-section]')]
    let changed = false
    for (const s of sections) {
      const h = s.offsetHeight
      if (h > maxPagePx) continue
      const top      = absTop(s)
      const bottom   = top + h
      const boundary = pageEndFor(top)
      if (top < boundary && bottom > boundary) {
        const div = document.createElement('div')
        div.setAttribute('data-pdf-spacer', '')
        div.style.cssText = `display:block;height:${boundary - top + spacerExtra}px;background:transparent;`
        s.parentElement.insertBefore(div, s)
        sections = [...template.querySelectorAll('[data-section]')]
        changed = true; break
      }
    }
    if (!changed) break
  }
}

// ─── Ref. de documento ──────────────────────────────────────────────────────
export function makeRefCode(prefix) {
  return `${prefix}-${new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 12)}`
}

// ─── Captura + paginación + pie de página compartidos (todos los reportes) ───
// Reproduce exactamente la lógica que antes estaba duplicada en cada PDF:
// con TOPM_MM > 0 reserva un margen superior blanco en las páginas 2+ (avanza
// de a CN = pageH-FOOTER-TOPM); sin TOPM_MM avanza de a pageH completo (como
// usaba ConversationPDF, que no reserva margen superior en continuaciones).
export async function renderTemplateToPdf(template, {
  W, FOOTER_MM, TOPM_MM = 0, pageEndFor, maxPagePx,
  generatedAt, filename, copyrightSuffix = '', spacerExtra = 6,
}) {
  avoidPageCuts(template, { pageEndFor, maxPagePx, spacerExtra })
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

  const C1    = pageH - FOOTER_MM
  const CN    = pageH - FOOTER_MM - TOPM_MM
  const pages = TOPM_MM
    ? 1 + Math.ceil(Math.max(0, imgH - C1) / CN)
    : 1 + Math.ceil(Math.max(0, imgH - C1) / pageH)

  for (let i = 0; i < pages; i++) {
    if (i > 0) pdf.addPage()
    const imageY = i === 0
      ? 0
      : TOPM_MM ? TOPM_MM - (C1 + (i - 1) * CN) : -(C1 + (i - 1) * pageH)
    pdf.addImage(imgData, 'JPEG', 0, imageY, pageW, imgH)

    if (i > 0 && TOPM_MM) {
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
    pdf.text(`Pág. ${i + 1} / ${pages}`, pageW - 10, pageH - FOOTER_MM + 3.5, { align: 'right' })
    pdf.setFontSize(5.5)
    pdf.setTextColor(148, 163, 184)
    pdf.text(`© ${new Date().getFullYear()} Pitahaya Vision${copyrightSuffix}`, 10, pageH - FOOTER_MM + 6.5)
    pdf.text(generatedAt, pageW - 10, pageH - FOOTER_MM + 6.5, { align: 'right' })
  }

  pdf.save(filename)
}

// ─── Encabezado de documento compartido (FichaTecnicaPDF, TrazabilidadPDF) ───
export function PdfDocHeader({
  badgeText, plantId, refCode, generatedAt, pad,
  descriptorItems = [], userName, statusBadge,
  brandSubtitle = 'Sistema de Monitoreo Fitosanitario · UNEMI · Ecuador',
}) {
  return (
    <div style={{ background: '#fff', borderBottom: `1px solid ${SL[200]}` }}>
      <div style={{ height: 4, background: `linear-gradient(90deg, ${B[800]}, ${B[500]}, ${B[800]})` }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, padding: `20px ${pad}px 16px` }}>
        <div style={{ display: 'flex', gap: 13, alignItems: 'center' }}>
          <div style={{ width: 44, height: 44, background: B[700], borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <BrandLogo size={21} color="#fff" />
          </div>
          <div>
            <div style={{ fontFamily: SANS, fontSize: 17, fontWeight: 700, letterSpacing: '0.07em', color: SL[900], lineHeight: 1 }}>PITAHAYA VISION</div>
            <div style={{ fontFamily: SANS, fontSize: 9.5, color: SL[400], letterSpacing: '0.03em', marginTop: 4 }}>{brandSubtitle}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {badgeText && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: B[50], border: `1px solid ${B[200]}`, borderRadius: 999, padding: '5px 13px', marginBottom: 8 }}>
              <span style={{ fontFamily: SANS, fontSize: 8.5, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: B[700] }}>{badgeText}</span>
            </div>
          )}
          {plantId && <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 600, color: SL[900], letterSpacing: '0.02em', lineHeight: 1 }}>{plantId}</div>}
          <div style={{ fontFamily: MONO, fontSize: 8.5, color: SL[300], letterSpacing: '0.07em', marginTop: plantId ? 4 : 0 }}>{refCode}</div>
          <div style={{ fontFamily: SANS, fontSize: 9, color: SL[400], marginTop: 2 }}>{generatedAt}</div>
        </div>
      </div>
      {descriptorItems.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: `9px ${pad}px 12px`, borderTop: `1px solid ${SL[100]}`, background: SL[50] }}>
          <span style={{ fontFamily: SANS, fontSize: 7.5, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: SL[500] }}>
            {descriptorItems[0]}
          </span>
          {[...descriptorItems.slice(1), ...(userName ? [`Productor: ${userName}`] : [])].map((item, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: SL[300], flexShrink: 0 }} />
              <span style={{ fontFamily: SANS, fontSize: 9.5, color: SL[600] }}>{item}</span>
            </span>
          ))}
          {statusBadge && <div style={{ marginLeft: 'auto' }}>{statusBadge}</div>}
        </div>
      )}
    </div>
  )
}

// ─── Bloque de título (eyebrow + título serif + subtítulo opcional) ─────────
export function PdfTitleBlock({ eyebrow, title, subtitle, size = 30, pad }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24, padding: `18px ${pad}px 0` }}>
      <div>
        <div style={{ fontFamily: SANS, fontSize: 9.5, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: B[600], marginBottom: 5 }}>
          {eyebrow}
        </div>
        <div style={{ fontFamily: SERIF, fontSize: size, fontWeight: 600, color: SL[900], lineHeight: 1.05, letterSpacing: '-0.01em' }}>
          {title}
        </div>
        {subtitle && <div style={{ fontFamily: SANS, fontSize: 11.5, color: SL[500], marginTop: 5 }}>{subtitle}</div>}
      </div>
    </div>
  )
}

// ─── Franja de metadatos de 4 columnas (label + valor + valor secundario) ───
export function PdfMetaStrip({ cells, pad }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', border: `1px solid ${SL[200]}`, borderRadius: 12, margin: `14px ${pad}px 24px`, overflow: 'hidden' }}>
      {cells.map((cell, i, arr) => (
        <div key={i} style={{ padding: '10px 14px', borderRight: i < arr.length - 1 ? `1px solid ${SL[200]}` : 'none' }}>
          <div style={{ fontFamily: SANS, fontSize: 8, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: SL[400], marginBottom: 5 }}>{cell.label}</div>
          <div style={{ fontFamily: cell.mono ? MONO : SANS, fontSize: 11.5, fontWeight: 600, color: cell.color || SL[800], lineHeight: 1.2 }}>{cell.v1}</div>
          <div style={{ fontFamily: cell.mono ? MONO : SANS, fontSize: 9.5, color: SL[400], marginTop: 2 }}>{cell.v2}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Grilla de celdas individuales con borde propio (ficha/contexto) ────────
export function PdfCellGrid({ columns, cells }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns},1fr)`, gap: 10 }}>
      {cells.map((c, i) => (
        <div key={i} style={{ border: `1px solid ${SL[200]}`, borderRadius: 11, padding: '10px 14px' }}>
          <div style={{ fontFamily: SANS, fontSize: 8, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: SL[400], marginBottom: 5 }}>{c.label}</div>
          <div style={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 500, color: c.value ? SL[800] : SL[300] }}>{c.value || 'Sin registro'}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Grilla de celdas con un solo borde exterior y divisores internos ───────
export function PdfDividedGrid({ columns, cells }) {
  return (
    <div style={{ border: `1px solid ${SL[200]}`, borderRadius: 11, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns},1fr)` }}>
        {cells.map((c, i) => (
          <div key={i} style={{ padding: '10px 14px', borderRight: c.br ? `1px solid ${SL[200]}` : 'none', borderBottom: c.bb ? `1px solid ${SL[200]}` : 'none' }}>
            <div style={{ fontFamily: SANS, fontSize: 8, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: SL[400], marginBottom: 5 }}>{c.label}</div>
            <div style={{ fontFamily: c.mono ? MONO : SANS, fontSize: 12.5, fontWeight: 500, color: c.value ? SL[800] : SL[300] }}>{c.value || '—'}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Lista de viñetas del resumen ejecutivo (admite HTML inline) ────────────
export function PdfBullets({ items }) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {items.map((b, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '14px 1fr', alignItems: 'baseline' }}>
          <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: B[500], lineHeight: 1 }}>·</span>
          <p style={{ margin: 0, fontFamily: SANS, fontSize: 12.5, lineHeight: 1.6, color: SL[700] }} dangerouslySetInnerHTML={{ __html: b }} />
        </div>
      ))}
    </div>
  )
}

// ─── Tarjeta de la línea de tiempo de análisis ───────────────────────────────
export function PdfTimelineEntry({ disease, date, severityLabel, confidence, imgSrc, recs, treat, notes, showRecentBadge }) {
  const col = sevColor(severityLabel)
  return (
    <div style={{ border: `1px solid ${SL[200]}`, borderRadius: 11, borderLeft: `3px solid ${col}`, padding: '12px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: SANS, fontSize: 13.5, fontWeight: 600, color: SL[900] }}>{disease}</span>
            {showRecentBadge && (
              <span style={{ fontFamily: SANS, fontSize: 8.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: B[700], background: B[100], borderRadius: 999, padding: '2px 8px' }}>
                Estado más reciente
              </span>
            )}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 9.5, color: SL[400], marginTop: 3 }}>{date}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <SevPill label={severityLabel} />
          {confidence != null && <div style={{ fontFamily: MONO, fontSize: 9, color: SL[400], marginTop: 5 }}>confianza {confidence}%</div>}
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
}

// ─── Aviso legal de pie de sección ───────────────────────────────────────────
export function PdfLegalNotice({ children, size = 9, style, dataSection }) {
  return (
    <div data-section={dataSection} style={{ borderTop: `1px solid ${SL[100]}`, paddingTop: 12, marginBottom: 18, ...style }}>
      <p style={{ fontFamily: SANS, fontSize: size, color: SL[400], lineHeight: 1.65, margin: 0 }}>
        <strong style={{ color: SL[500] }}>Aviso:</strong> {children}
      </p>
    </div>
  )
}

// ─── Grilla de KPIs (número grande + etiqueta) ───────────────────────────────
export function PdfKpiGrid({ items }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length},1fr)`, gap: 12 }}>
      {items.map((k, i) => (
        <div key={i} style={{ border: `1px solid ${SL[200]}`, borderTop: `3px solid ${k.accent}`, borderRadius: 11, padding: '13px 14px 12px' }}>
          <div style={{ fontFamily: k.big ? SERIF : SANS, fontSize: k.big ? 32 : 17, fontWeight: 600, color: k.textColor, letterSpacing: k.big ? '-0.02em' : '-0.01em', lineHeight: 1, display: 'flex', alignItems: 'center', minHeight: 34 }}>
            {k.value}
          </div>
          <div style={{ fontFamily: SANS, fontSize: 9, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: SL[400], marginTop: 8 }}>
            {k.label}
          </div>
        </div>
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// Widgets del reporte ejecutivo (DashboardReportPDF)
// ══════════════════════════════════════════════════════════════════════════

export function PdfIcon({ name, color = SL[500], size = 13 }) {
  return <i className={`fas fa-${name}`} style={{ fontSize: size, color, lineHeight: 1, display: 'inline-block' }} />
}

export function PdfHealthDonut({ pctHealthy, size = 130, thick = 18 }) {
  const pctSick = 100 - pctHealthy
  const r  = size / 2 - thick / 2 - 3
  const cx = size / 2, cy = size / 2
  const circ = 2 * Math.PI * r
  const dH   = (pctHealthy / 100) * circ
  const dS   = (pctSick / 100) * circ
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={SL[100]} strokeWidth={thick} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={B[500]} strokeWidth={thick}
          strokeDasharray={`${dH} ${circ - dH}`} strokeLinecap="butt" />
        {pctSick > 0 && (
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={R.red} strokeWidth={thick}
            strokeDasharray={`${dS} ${circ - dS}`} strokeDashoffset={-dH} strokeLinecap="butt" />
        )}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 600, color: SL[900], lineHeight: 1 }}>{pctHealthy}<span style={{ fontSize: 14 }}>%</span></div>
        <div style={{ fontFamily: SANS, fontSize: 8.5, color: SL[400], marginTop: 3, letterSpacing: '0.1em', textTransform: 'uppercase' }}>sano</div>
      </div>
    </div>
  )
}

export function PdfTimelineChart({ data, width }) {
  if (!data?.length) return null
  const H_chart = 90
  const max  = Math.max(...data.map(d => d.value), 1)
  const barW = Math.max(Math.floor((width - 20) / data.length) - 8, 10)
  const chartTop = 16, chartBot = H_chart - 22
  const chartH   = chartBot - chartTop
  return (
    <svg width={width} height={H_chart} viewBox={`0 0 ${width} ${H_chart}`} style={{ display: 'block', overflow: 'visible' }}>
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
            <line x1={28} y1={y} x2={width} y2={y} stroke={SL[100]} strokeWidth={1} strokeDasharray="3,3" />
            <text x={24} y={y + 3} textAnchor="end" fontSize={7.5} fill={SL[400]} fontFamily={SANS}>{Math.round(max * f)}</text>
          </g>
        )
      })}
      <line x1={28} y1={chartBot} x2={width} y2={chartBot} stroke={SL[200]} strokeWidth={1} />
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

export function PdfPill({ label, color, bg, border }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', fontFamily: SANS, color, background: bg, border: `1px solid ${border || color + '33'}` }}>
      {label}
    </span>
  )
}
export function PdfRiskPill({ rate }) {
  if (rate >= 0.6) return <PdfPill label={`Crítico · ${Math.round(rate * 100)}%`} color={R.red}   bg={R.redL} border={R.redB} />
  if (rate >= 0.3) return <PdfPill label={`Medio · ${Math.round(rate * 100)}%`}  color={R.amb}   bg={R.ambL} border={R.ambB} />
  if (rate >  0)   return <PdfPill label={`Bajo · ${Math.round(rate * 100)}%`}   color={B[700]}  bg={B[50]}  border={B[200]} />
  return                   <PdfPill label="Sin alertas"                          color={SL[500]} bg={SL[100]} border={SL[200]} />
}

export function PdfCard({ children, style }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${SL[200]}`, borderRadius: 11, padding: '16px 20px', ...style }}>
      {children}
    </div>
  )
}

export const PDF_BAR_COLORS = [B[600], '#0284c7', R.ora, R.amb, R.pur, R.tea, '#db2777']

export function PdfBarRow({ label, value, pct, total, index }) {
  const pctLabel = total ? Math.round((value / total) * 100) : (pct ?? 0)
  const barW     = pct ?? Math.round((value / (total || 1)) * 100)
  const col      = PDF_BAR_COLORS[index % PDF_BAR_COLORS.length]
  const isTop    = index === 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <div style={{ width: 24, height: 24, borderRadius: 8, background: isTop ? col : SL[100], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontFamily: SANS, fontSize: 10, fontWeight: 800, color: isTop ? '#fff' : SL[400] }}>#{index + 1}</span>
      </div>
      <span style={{ width: 190, fontFamily: SANS, fontSize: 11, fontWeight: 500, color: SL[600], overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }} title={label}>{label}</span>
      <div style={{ flex: 1, height: 12, background: SL[100], borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.max(barW, 3)}%`, background: col, borderRadius: 99 }} />
      </div>
      <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 56 }}>
        <span style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 600, color: SL[800] }}>{value}</span>
        <span style={{ fontFamily: SANS, fontSize: 9.5, color: SL[400], marginLeft: 4 }}>{pctLabel}%</span>
      </div>
    </div>
  )
}

const PDF_COL_HEAD = { fontFamily: SANS, fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: SL[400] }
export function PdfBarHeader({ firstLabel }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 10, borderBottom: `1px solid ${SL[100]}` }}>
      <div style={{ width: 24, flexShrink: 0 }} />
      <span style={{ ...PDF_COL_HEAD, width: 190, flexShrink: 0 }}>{firstLabel}</span>
      <span style={{ ...PDF_COL_HEAD, flex: 1 }}>Frecuencia relativa</span>
      <span style={{ ...PDF_COL_HEAD, minWidth: 56, textAlign: 'right' }}>Casos / %</span>
    </div>
  )
}

export function PdfStatBar({ label, count, pct, dotColor, gradient, valueColor = SL[800], compact = false, noMb = false }) {
  const dotSize = compact ? 8 : 10
  const labelFs = compact ? 10.5 : 11
  const valueFs = compact ? 14 : 15
  const pctFs   = compact ? 9.5 : 10
  const barH    = compact ? 8 : 9
  const gap     = compact ? 6 : 7
  const rowMb   = compact ? 5 : 6
  const mb      = noMb ? 0 : compact ? 10 : 14
  return (
    <div style={{ marginBottom: mb }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: rowMb }}>
        <div style={{ display: 'flex', alignItems: 'center', gap }}>
          <div style={{ width: dotSize, height: dotSize, borderRadius: '50%', background: dotColor }} />
          <span style={{ fontFamily: SANS, fontSize: labelFs, color: SL[600], fontWeight: 500 }}>{label}</span>
        </div>
        <span style={{ fontFamily: SERIF, fontSize: valueFs, fontWeight: 600, color: valueColor }}>
          {count} <span style={{ fontFamily: SANS, fontSize: pctFs, color: SL[400] }}>({pct}%)</span>
        </span>
      </div>
      <div style={{ height: barH, borderRadius: 99, background: SL[100], overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: gradient, borderRadius: 99 }} />
      </div>
    </div>
  )
}

export function PdfTable({ columns, rows }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: SANS }}>
      <thead>
        <tr style={{ background: SL[50] }}>
          {columns.map((c, i) => (
            <th key={i} style={{ padding: '9px 12px', textAlign: c.right ? 'right' : 'left', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: SL[400], borderBottom: `2px solid ${B[100]}`, whiteSpace: 'nowrap' }}>{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : SL[50] }}>
            {columns.map((c, j) => (
              <td key={j} style={{ padding: '9px 12px', fontSize: 11, color: SL[700], borderBottom: `1px solid ${SL[100]}`, textAlign: c.right ? 'right' : 'left', verticalAlign: 'middle' }}>
                {c.render ? c.render(row) : (row[c.key] ?? '—')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function PdfExecutiveSummary({ bullets, highlights }) {
  return (
    <div data-section="exec" style={{ marginBottom: 22 }}>
      <PdfCard>
        <div style={{ display: 'grid', gap: 8, marginBottom: highlights?.length ? 14 : 0 }}>
          {bullets.map((b, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '14px 1fr', alignItems: 'baseline' }}>
              <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: B[500], lineHeight: 1 }}>·</span>
              <p style={{ margin: 0, fontFamily: SANS, fontSize: 12, lineHeight: 1.65, color: SL[700] }}>{b}</p>
            </div>
          ))}
        </div>
        {highlights?.length ? (
          <div style={{ display: 'flex', gap: 10, paddingTop: 12, borderTop: `1px solid ${SL[100]}`, flexWrap: 'wrap' }}>
            {highlights.map((h, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, border: `1px solid ${SL[200]}`, borderRadius: 8, padding: '5px 10px' }}>
                <PdfIcon name={h.icon} color={h.color || B[600]} size={10} />
                <span style={{ fontFamily: SANS, fontSize: 10, fontWeight: 600, color: SL[600] }}>{h.label}</span>
                <span style={{ fontFamily: SERIF, fontSize: 14, fontWeight: 600, color: h.color || B[700] }}>{h.value}</span>
              </div>
            ))}
          </div>
        ) : null}
      </PdfCard>
    </div>
  )
}

export function PdfReportHeader({ title, generatedAt, meta, refCode, mode, pad }) {
  return (
    <div style={{ background: '#fff', borderBottom: `1px solid ${SL[200]}` }}>
      <div style={{ height: 4, background: `linear-gradient(90deg, ${B[800]}, ${B[500]}, ${B[800]})` }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, padding: `20px ${pad}px 16px` }}>
        <div style={{ display: 'flex', gap: 13, alignItems: 'center' }}>
          <div style={{ width: 44, height: 44, background: B[700], borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <BrandLogo size={21} color="#fff" />
          </div>
          <div>
            <div style={{ fontFamily: SANS, fontSize: 17, fontWeight: 700, letterSpacing: '0.07em', color: SL[900], lineHeight: 1 }}>PITAHAYA VISION</div>
            <div style={{ fontFamily: SANS, fontSize: 9.5, color: SL[400], letterSpacing: '0.03em', marginTop: 4 }}>Sistema de Monitoreo Fitosanitario · UNEMI · Ecuador</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: B[50], border: `1px solid ${B[200]}`, borderRadius: 999, padding: '5px 13px', marginBottom: 8 }}>
            <span style={{ fontFamily: SANS, fontSize: 8.5, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: B[700] }}>{title}</span>
          </div>
          {meta?.[0] && <div style={{ fontFamily: SANS, fontSize: 11, fontWeight: 600, color: SL[700], marginBottom: 4 }}>{meta[0]}</div>}
          {refCode   && <div style={{ fontFamily: MONO, fontSize: 8.5, color: SL[300], letterSpacing: '0.07em' }}>{refCode}</div>}
          <div style={{ fontFamily: SANS, fontSize: 9, color: SL[400], marginTop: 2 }}>{generatedAt}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: `9px ${pad}px 12px`, borderTop: `1px solid ${SL[100]}`, background: SL[50] }}>
        <span style={{ fontFamily: SANS, fontSize: 7.5, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: SL[500] }}>
          {mode === 'admin' ? 'Reporte ejecutivo' : 'Reporte fitosanitario'}
        </span>
        <span style={{ width: 3, height: 3, borderRadius: '50%', background: SL[300], flexShrink: 0 }} />
        <span style={{ fontFamily: SANS, fontSize: 9.5, color: SL[600] }}>Monitoreo fitosanitario</span>
        <span style={{ width: 3, height: 3, borderRadius: '50%', background: SL[300], flexShrink: 0 }} />
        <span style={{ fontFamily: SANS, fontSize: 9.5, color: SL[600] }}>Diagnóstico asistido por IA</span>
        <span style={{ width: 3, height: 3, borderRadius: '50%', background: SL[300], flexShrink: 0 }} />
        <span style={{ fontFamily: SANS, fontSize: 9.5, color: SL[600] }}>UNEMI · Ecuador</span>
      </div>
    </div>
  )
}
