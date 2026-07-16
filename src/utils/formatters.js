export function escapeHtml(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function formatDateShort(s) {
  if (!s) return '—'
  try {
    return new Date(s).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })
  } catch { return '—' }
}

export function formatDateLong(s) {
  if (!s) return '—'
  try {
    return new Date(s).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return '—' }
}

export function formatDateWithTime(s) {
  if (!s) return '—'
  try {
    return new Date(s).toLocaleDateString('es-EC', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  } catch { return '—' }
}

export function formatDateLongWithTime(s) {
  if (!s) return 'Sin fecha'
  const d = new Date(s)
  if (isNaN(d)) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-EC', { dateStyle: 'long', timeStyle: 'short' }).format(d)
}

export function formatDateMediumWithTime(s) {
  if (!s) return 'Sin fecha'
  const d = new Date(s)
  if (isNaN(d)) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short' }).format(d)
}

export function extractConfidence(a) {
  return Math.min(100, parseFloat(
    a.confidence_percent ?? (a.confidence > 1 ? a.confidence : (a.confidence || 0) * 100)
  ) || 0)
}
