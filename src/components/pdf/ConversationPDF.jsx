import { useEffect, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { B, SL, R, SERIF, SANS, MONO, BrandLogo, PdfLoadingOverlay, sevColor, sevBg, sevBorder, sevText, normSev, createPageGeometry, avoidPageCuts } from './pdfCommon'

const W     = 760
const PAD   = 40
const FOOTER_MM = 9
const geo = createPageGeometry(W, FOOTER_MM)
const { pageEndFor, PAGE1_PX: PAGE_VIS_PX } = geo

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

        avoidPageCuts(template, { pageEndFor, maxPagePx: PAGE_VIS_PX, spacerExtra: 6 })
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
      <PdfLoadingOverlay status={status} onClose={onClose} title="Generando PDF..." subtitle="Compilando análisis e imágenes" doneMessage="¡Conversación exportada!" />
      <div style={{ position: 'fixed', top: 0, left: '-9999px', zIndex: -1, pointerEvents: 'none' }}>
        <div ref={templateRef} style={{ width: W, background: '#fff', fontFamily: SANS }}>
          <ConversationTemplate title={data?.title || 'Conversación'} items={items} imgMap={imgMap} generatedAt={generatedAt} />
        </div>
      </div>
    </>
  )
}
