import { useEffect, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const B  = { 50:'#f0fdf4',100:'#dcfce7',200:'#bbf7d0',400:'#4ade80',500:'#22c55e',600:'#16a34a',700:'#15803d',900:'#14532d' }
const SL = { 50:'#f8fafc',100:'#f1f5f9',200:'#e2e8f0',300:'#cbd5e1',400:'#94a3b8',500:'#64748b',700:'#334155',800:'#1e293b',900:'#0f172a' }
const R  = { red:'#dc2626',redL:'#fef2f2',redB:'#fecaca', ora:'#ea580c',oraL:'#fff7ed',oraB:'#fed7aa', amb:'#d97706',ambL:'#fffbeb',ambB:'#fde68a' }

const SERIF = "'Cormorant Garamond', Georgia, serif"
const SANS  = "Inter, -apple-system, 'Segoe UI', Arial, sans-serif"
const MONO  = "'IBM Plex Mono', 'Courier New', monospace"
const W     = 760
const PAD   = 40
const FOOTER_MM = 9

// ─── Page geometry (must mirror the pagination math in the export step) ──────
const A4_W_MM      = 210
const A4_H_MM      = 297
const MM_TO_PX     = W / A4_W_MM
const FOOTER_PX    = FOOTER_MM * MM_TO_PX
const PAGE_H_PX    = Math.round(W * A4_H_MM / A4_W_MM)
const PAGE_VIS_PX  = PAGE_H_PX - FOOTER_PX

function pageEndFor(top) {
  const k = Math.floor(top / PAGE_VIS_PX) + 1
  return k * PAGE_VIS_PX
}

// ─── Page-cut avoidance: pushes sections past a page boundary instead of splitting them ──
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
      if (h > PAGE_VIS_PX) continue
      const top = absTop(s)
      const bottom = top + h
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

// ─── Severity helpers ─────────────────────────────────────────────────────────
function normSev(v) { return String(v || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') }
function sevColor(v) {
  const s = normSev(v)
  if (s.includes('crit') || s.includes('extrem')) return R.red
  if (s.includes('alta') || s.includes('high') || s.includes('grav')) return R.ora
  if (s.includes('moder') || s.includes('media')) return R.amb
  if (s.includes('sana') || s.includes('baja') || s.includes('low')) return B[600]
  return SL[500]
}
function sevBg(v)     { const c = sevColor(v); return c === R.red ? R.redL : c === R.ora ? R.oraL : c === R.amb ? R.ambL : c === B[600] ? B[50] : SL[100] }
function sevBorder(v) { const c = sevColor(v); return c === R.red ? R.redB : c === R.ora ? R.oraB : c === R.amb ? R.ambB : c === B[600] ? B[200] : SL[200] }
function sevText(v)   { const c = sevColor(v); return c === R.red ? '#7f1d1d' : c === R.ora ? '#7c2d12' : c === R.amb ? '#78350f' : c === B[600] ? B[900] : SL[700] }

// ─── Minimal markdown-lite → HTML ──────────────────────────────────────────────
function mdToHtml(text) {
  if (!text) return ''
  const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const inline = (t) => t.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight:700">$1</strong>')
  const lines = esc.split('\n')
  const out = []
  let inList = false
  for (const raw of lines) {
    const t = raw.trim()
    if (!t) continue
    const num = /^(\d+)[.)]\s+(.*)/.exec(t)
    const bullet = /^[-*•]\s+(.*)/.exec(t)
    if (num || bullet) {
      if (!inList) { out.push('<ol style="margin:0 0 0 18px;padding:0">'); inList = true }
      out.push(`<li style="margin-bottom:5px;line-height:1.5">${inline(num ? num[2] : bullet[1])}</li>`)
    } else {
      if (inList) { out.push('</ol>'); inList = false }
      out.push(`<p style="margin:0 0 7px;line-height:1.55">${inline(t)}</p>`)
    }
  }
  if (inList) out.push('</ol>')
  return out.join('')
}

function BrandLogo({ size = 20, color = '#fff' }) {
  return (
    <svg viewBox="0 0 24 24" style={{ width: size, height: size, fill: color, display: 'block', flexShrink: 0 }}>
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-8 2 4-4 8.5-4 8.5-4-8 3.5-9 6-9 6A8 8 0 0 1 17 8z" />
    </svg>
  )
}

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
          <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 600, color: SL[800] }}>¡Conversación exportada!</div>
        ) : (
          <>
            <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 600, color: SL[800], marginBottom: 5 }}>Generando PDF...</div>
            <div style={{ fontFamily: SANS, fontSize: 11.5, color: SL[500], marginBottom: 20 }}>Compilando análisis e imágenes</div>
            <div style={{ height: 3, background: SL[100], borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '65%', background: `linear-gradient(90deg,${B[400]},${B[600]})`, borderRadius: 99 }} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Analysis block: resultado del modelo (izq) + imagen (der) → tratamiento debajo ──
function AnalysisBlock({ card, imgSrc }) {
  return (
    <div style={{ border: `1px solid ${SL[200]}`, borderRadius: 14, overflow: 'hidden', marginBottom: 18 }}>
      <div style={{ display: 'flex' }}>
        {/* Izquierda: resultado del análisis del modelo */}
        <div style={{ flex: 1, minWidth: 0, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center' }}>
          <div>
            <div style={{ fontFamily: SANS, fontSize: 8.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: SL[400], marginBottom: 4 }}>Enfermedad detectada</div>
            <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: SL[900] }}>{card.disease}</div>
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: 999, border: `1px solid ${sevBorder(card.severity)}`, background: sevBg(card.severity), color: sevText(card.severity), padding: '3px 10px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: sevColor(card.severity), flexShrink: 0 }} />
              {card.severity}
            </span>
            <span style={{ fontFamily: MONO, fontSize: 10.5, color: SL[700] }}>Confianza: <strong>{card.confidence}%</strong></span>
          </div>
          {card.recs && <p style={{ margin: 0, fontFamily: SANS, fontSize: 11, lineHeight: 1.5, color: SL[600] }}>{card.recs}</p>}
        </div>

        {/* Derecha: imagen */}
        {imgSrc && (
          <div style={{ width: 220, height: 200, flexShrink: 0, borderLeft: `1px solid ${SL[200]}`, overflow: 'hidden' }}>
            <img src={imgSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        )}
      </div>

      {/* Debajo: plan de tratamiento */}
      {card.treatmentText && (
        <div style={{ borderTop: `1px solid ${SL[200]}`, background: SL[50], padding: '13px 16px' }}>
          <div style={{ fontFamily: SANS, fontSize: 8.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: SL[500], marginBottom: 6 }}>Plan de tratamiento</div>
          <div style={{ fontFamily: SANS, fontSize: 11.5, color: SL[700] }} dangerouslySetInnerHTML={{ __html: mdToHtml(card.treatmentText) }} />
        </div>
      )}
    </div>
  )
}

// ─── PDF Template ─────────────────────────────────────────────────────────────
function ConversationTemplate({ title, items, imgMap, generatedAt }) {
  const refCode = `PV-CHAT-${new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 12)}`
  return (
    <div style={{ width: W, background: '#fff', fontFamily: SANS, color: SL[900] }}>
      <div style={{ background: '#fff', borderBottom: `1px solid ${SL[200]}` }}>
        <div style={{ height: 4, background: `linear-gradient(90deg, ${B[700]}, ${B[500]}, ${B[700]})` }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, padding: `18px ${PAD}px 14px` }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 40, height: 40, background: B[700], borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <BrandLogo size={19} color="#fff" />
            </div>
            <div>
              <div style={{ fontFamily: SANS, fontSize: 15.5, fontWeight: 700, letterSpacing: '0.06em', color: SL[900], lineHeight: 1 }}>PITAHAYA VISION</div>
              <div style={{ fontFamily: SANS, fontSize: 9, color: SL[400], letterSpacing: '0.03em', marginTop: 4 }}>Historial de análisis · Chat</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: MONO, fontSize: 8.5, color: SL[300], letterSpacing: '0.06em' }}>{refCode}</div>
            <div style={{ fontFamily: SANS, fontSize: 9, color: SL[400], marginTop: 3 }}>{generatedAt}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: `20px ${PAD}px 0` }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: SANS, fontSize: 9.5, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: B[600], marginBottom: 5 }}>
            Análisis exportados
          </div>
          <div style={{ fontFamily: SERIF, fontSize: 25, fontWeight: 600, color: SL[900], lineHeight: 1.15 }}>{title}</div>
        </div>

        <div>
          {items.map((it, i) => (
            <div key={i} data-section={`analysis-${it._i}`}>
              <AnalysisBlock card={it} imgSrc={it.imageUrl ? imgMap[it.imageUrl] : null} />
            </div>
          ))}
        </div>

        <div data-section="aviso" style={{ borderTop: `1px solid ${SL[100]}`, paddingTop: 12, paddingBottom: 12, marginBottom: 18 }}>
          <p style={{ fontFamily: SANS, fontSize: 8.5, color: SL[400], lineHeight: 1.6, margin: 0 }}>
            <strong style={{ color: SL[500] }}>Aviso:</strong> Documento generado automáticamente por Pitahaya Vision a partir de una conversación del chatbot.
            Tiene carácter informativo; para decisiones agronómicas críticas valide con un técnico especializado en sanidad vegetal.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function ConversationPDF({ isOpen, onClose, data }) {
  const templateRef = useRef(null)
  const [status, setStatus] = useState('idle')
  const [imgMap, setImgMap] = useState({})

  const generatedAt = new Date().toLocaleDateString('es-EC', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  useEffect(() => {
    if (!isOpen) { setStatus('idle'); setImgMap({}); return }
    setStatus('generating')

    const timer = setTimeout(async () => {
      try {
        const items = data?.items || []
        const urls = [...new Set(items.map(it => it.imageUrl).filter(Boolean))]
        const map = {}
        await Promise.allSettled(urls.map(async (url) => {
          try {
            const resp = await fetch(url, { mode: 'cors' })
            const blob = await resp.blob()
            map[url] = await new Promise(res => {
              const r = new FileReader()
              r.onload = () => res(r.result)
              r.onerror = () => res(null)
              r.readAsDataURL(blob)
            })
          } catch { map[url] = null }
        }))
        setImgMap(map)

        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
        await new Promise(r => setTimeout(r, 250))

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
        const C1       = pageH - FOOTER_H
        const pages    = 1 + Math.ceil(Math.max(0, imgH - C1) / pageH)

        for (let i = 0; i < pages; i++) {
          if (i > 0) pdf.addPage()
          const imageY = (i === 0) ? 0 : -(C1 + (i - 1) * pageH)
          pdf.addImage(imgData, 'JPEG', 0, imageY, pageW, imgH)

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
          pdf.text(`© ${new Date().getFullYear()} Pitahaya Vision`, 10, pageH - FOOTER_H + 6.5)
          pdf.text(generatedAt, pageW - 10, pageH - FOOTER_H + 6.5, { align: 'right' })
        }

        const titlePart = (data?.title || 'conversacion').replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 40)
        pdf.save(`pitahaya-vision-${titlePart}-${new Date().toISOString().slice(0, 10)}.pdf`)
        setStatus('done')
        setTimeout(onClose, 800)
      } catch (err) {
        console.error('ConversationPDF error:', err)
        setStatus('error')
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null

  const items = (data?.items || []).map((it, i) => ({ ...it, _i: i }))

  return (
    <>
      <LoadingOverlay status={status} onClose={onClose} />
      <div style={{ position: 'fixed', top: 0, left: '-9999px', zIndex: -1, pointerEvents: 'none' }}>
        <div ref={templateRef} style={{ width: W, background: '#fff', fontFamily: SANS }}>
          <ConversationTemplate title={data?.title || 'Conversación'} items={items} imgMap={imgMap} generatedAt={generatedAt} />
        </div>
      </div>
    </>
  )
}
