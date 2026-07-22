export function escapeHtml(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Iniciales para avatares (p.ej. "Steven Nieto" -> "SN"). filter(Boolean) evita
// que espacios dobles/al final produzcan huecos al tomar la primera letra.
export function getInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  return parts.map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
}

// Motor único de formateo de fechas — las funciones de abajo son atajos
// con nombre sobre las combinaciones de opciones realmente usadas en la app.
function formatDate(s, options, fallback = '—') {
  if (!s) return fallback
  const d = new Date(s)
  if (isNaN(d)) return fallback
  try {
    return new Intl.DateTimeFormat('es-EC', options).format(d)
  } catch {
    return fallback
  }
}

export function formatDateShort(s) {
  return formatDate(s, { day: '2-digit', month: 'short' })
}

export function formatDateLong(s) {
  return formatDate(s, { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateWithTime(s) {
  return formatDate(s, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function formatDateLongWithTime(s) {
  return formatDate(s, { dateStyle: 'long', timeStyle: 'short' }, 'Sin fecha')
}

export function formatDateMediumWithTime(s) {
  return formatDate(s, { dateStyle: 'medium', timeStyle: 'short' }, 'Sin fecha')
}

export function extractConfidence(a) {
  return Math.min(100, parseFloat(
    a.confidence_percent ?? (a.confidence > 1 ? a.confidence : (a.confidence || 0) * 100)
  ) || 0)
}
