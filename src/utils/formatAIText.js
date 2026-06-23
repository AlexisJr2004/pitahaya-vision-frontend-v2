export default function formatAIText(text) {
  if (!text) return ''
  let escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const inline = (t) =>
    t
      .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight:600">$1</strong>')
      .replace(/\*([^*\n]+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code style="background:#f3f4f6;padding:1px 5px;border-radius:4px;font-size:0.82em;font-family:monospace">$1</code>')
  const lines = escaped.split('\n')
  const out = []
  let inUl = false, inOl = false, olCounter = 0
  const closeList = () => {
    if (inUl) { out.push('</ul>'); inUl = false }
    if (inOl) { out.push('</ol>'); inOl = false; olCounter = 0 }
  }
  for (const line of lines) {
    const t = line.trim()
    if (/^### (.+)/.test(t)) { closeList(); out.push(`<p style="font-weight:700;font-size:0.85em;color:#1f2937;margin:8px 0 2px">${inline(t.slice(4))}</p>`); continue }
    if (/^## (.+)/.test(t))  { closeList(); out.push(`<p style="font-weight:700;font-size:0.9em;color:#111827;margin:10px 0 3px">${inline(t.slice(3))}</p>`); continue }
    if (/^# (.+)/.test(t))   { closeList(); out.push(`<p style="font-weight:800;font-size:0.95em;color:#111827;margin:12px 0 4px">${inline(t.slice(2))}</p>`); continue }
    if (/^---+$/.test(t))    { closeList(); out.push('<hr style="border:none;border-top:1px solid #e5e7eb;margin:8px 0">'); continue }
    if (/^[-*] /.test(line)) {
      if (!inUl) { closeList(); out.push('<ul style="padding-left:1.1rem;margin:3px 0;list-style:disc">'); inUl = true }
      out.push(`<li style="margin:2px 0;color:#374151;line-height:1.5">${inline(line.replace(/^[-*] /, ''))}</li>`)
      continue
    }
    if (/^\d+\. /.test(line)) {
      if (!inOl) { closeList(); out.push('<ol style="padding-left:0;margin:3px 0;list-style:none">'); inOl = true; olCounter = 0 }
      olCounter++
      out.push(`<li style="margin:2px 0;color:#374151;line-height:1.5;display:flex;gap:0.4em;align-items:flex-start"><span style="flex-shrink:0;font-weight:600;color:#4b5563;min-width:1.3em">${olCounter}.</span><span>${inline(line.replace(/^\d+\. /, ''))}</span></li>`)
      continue
    }
    if (t === '') { closeList(); out.push('<div style="height:4px"></div>'); continue }
    closeList()
    out.push(`<span style="display:block;line-height:1.55;color:#374151">${inline(line)}</span>`)
  }
  closeList()
  return out.join('')
}
