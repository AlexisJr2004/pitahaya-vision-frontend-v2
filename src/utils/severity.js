export function normalizeSeverity(val) {
  return String(val || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function computeSeverityBucket(analysis) {
  const sev = normalizeSeverity(analysis.severity)
  const disease = normalizeSeverity(analysis.disease_name_predicted || '')
  if (sev === 'sana' || disease.includes('sana')) return 0
  if (disease.includes('pudric')) return 4
  if (disease.includes('cancro') || disease.includes('tiz') || disease.includes('antrac')) return 3
  if (disease.includes('mancha')) return 2
  if (sev === 'enferma') return 2
  const conf = analysis.confidence_percent ?? 0
  if (conf >= 75) return 3
  return 2
}

export function computeSeverityLabel(analysis) {
  return sevLabel(computeSeverityBucket(analysis))
}

export function severityBucket(val) {
  const s = normalizeSeverity(val)
  if (s.includes('crit') || s.includes('extrem') || s.includes('muy alta') || s.includes('muy grav')) return 'critical'
  if (s.includes('alta') || s.includes('high') || s.includes('grav') || s.includes('sever') || s.includes('seria')) return 'high'
  if (s.includes('moder') || s.includes('media') || s.includes('inter') || s.includes('parcial')) return 'medium'
  return 'low'
}

export function severityLevel(val) {
  const s = normalizeSeverity(val)
  if (s.includes('crit') || s.includes('extrem') || s.includes('muy alta') || s.includes('muy grav')) return 3
  if (s.includes('alta') || s.includes('high') || s.includes('grav') || s.includes('sever') || s.includes('seria')) return 2
  if (s.includes('moder') || s.includes('media') || s.includes('med') || s.includes('inter') || s.includes('parcial')) return 1
  if (s.includes('baja') || s.includes('leve') || s.includes('low') || s.includes('liger') || s.includes('inici') || s.includes('min')) return 0
  return -1
}

export function isRisk(analysisOrBucket) {
  const b = typeof analysisOrBucket === 'number'
    ? analysisOrBucket
    : computeSeverityBucket(analysisOrBucket)
  return b >= 2
}

// ─── Paleta canónica única (fuente de verdad para colores/etiquetas) ───
// Índice 0-4: Sin riesgo, Baja, Moderada, Alta, Crítica.
export const SEVERITY_LABELS = ['Sin riesgo', 'Baja', 'Moderada', 'Alta', 'Crítica']
export const SEVERITY_COLORS = ['#16a34a', '#84cc16', '#d97706', '#ea580c', '#dc2626']
export const SEVERITY_BG     = ['#f0fdf4', '#f7fee7', '#fff7ed', '#fff7ed', '#fef2f2']

// Puente para el mundo de bucket-string ('low'|'medium'|'high'|'critical'),
// usado por las vistas de administración que trabajan con datos agregados.
const STRING_BUCKET_TO_NUM = { low: 1, medium: 2, high: 3, critical: 4 }

function toNumericBucket(bucket) {
  return typeof bucket === 'number' ? bucket : (STRING_BUCKET_TO_NUM[bucket] ?? 1)
}

// Acepta bucket numérico (0-4) o string ('low'|'medium'|'high'|'critical').
export function sevLabel(bucket) { return SEVERITY_LABELS[toNumericBucket(bucket)] ?? '—' }
export function sevColor(bucket) { return SEVERITY_COLORS[toNumericBucket(bucket)] ?? '#94a3b8' }
export function sevBg(bucket)    { return SEVERITY_BG[toNumericBucket(bucket)] ?? '#f8fafc' }

// Nombre de clase CSS compartido ('sev-low' | 'sev-medium' | 'sev-high' | 'sev-critical').
const NUM_BUCKET_TO_CLASS = ['sev-low', 'sev-low', 'sev-medium', 'sev-high', 'sev-critical']
export function sevPillClass(bucket) {
  if (typeof bucket === 'number') return NUM_BUCKET_TO_CLASS[bucket] ?? 'sev-low'
  return `sev-${bucket === 'medium' || bucket === 'high' || bucket === 'critical' ? bucket : 'low'}`
}

// Resumen {bucket, label} en el mundo de bucket-string, usado por vistas
// de administración que agregan analisis por severidad.
export function computeSev(analysis) {
  const bucketNum = computeSeverityBucket(analysis)
  const bucketStr = bucketNum <= 1 ? 'low' : bucketNum === 2 ? 'medium' : bucketNum === 3 ? 'high' : 'critical'
  return { bucket: bucketStr, label: sevLabel(bucketStr) }
}

// ─── Clasificación por tasa de riesgo (0-1), p. ej. % de análisis en riesgo ───
function rateToBucket(rate) {
  if (rate >= 0.7) return 4
  if (rate >= 0.4) return 3
  if (rate >= 0.15) return 2
  return 1
}
export function riskColor(rate)  { return sevColor(rateToBucket(rate)) }
export function riskLabel(rate)  { return sevLabel(rateToBucket(rate)) }
export function riskPillBg(rate) { return sevBg(rateToBucket(rate)) }
