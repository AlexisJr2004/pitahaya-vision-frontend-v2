export const B  = { 50:'#f0fdf4',100:'#dcfce7',200:'#bbf7d0',300:'#86efac',400:'#4ade80',500:'#22c55e',600:'#16a34a',700:'#15803d',800:'#166534',900:'#14532d' }
export const SL = { 50:'#f8fafc',100:'#f1f5f9',200:'#e2e8f0',300:'#cbd5e1',400:'#94a3b8',500:'#64748b',600:'#475569',700:'#334155',800:'#1e293b',900:'#0f172a' }
export const R  = { red:'#dc2626',redL:'#fef2f2',redB:'#fecaca', ora:'#ea580c',oraL:'#fff7ed',oraB:'#fed7aa', amb:'#d97706',ambL:'#fffbeb',ambB:'#fde68a', blu:'#2563eb',bluL:'#eff6ff',bluB:'#bfdbfe', pur:'#7c3aed',purL:'#f5f3ff',purB:'#ddd6fe', tea:'#0d9488',teaL:'#f0fdfa',teaB:'#99f6e4' }

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
