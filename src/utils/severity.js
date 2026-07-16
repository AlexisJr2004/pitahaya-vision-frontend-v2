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

export function computeSeverityStr(analysis) {
  return BUCKET_STR_MAP[computeSeverityBucket(analysis)] ?? 'low'
}

export function computeSeverityLabel(analysis) {
  return SEVERITY_LABELS[computeSeverityBucket(analysis)] ?? '—'
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

export function sevPillClass(bucket) {
  const map = ['sev-low', 'sev-low', 'sev-medium', 'sev-high', 'sev-critical']
  return map[bucket] ?? 'sev-low'
}

export const SEVERITY_LABELS = ['Sin riesgo', 'Baja', 'Moderada', 'Alta', 'Crítica']
export const SEVERITY_COLORS = ['#16a34a', '#84cc16', '#d97706', '#ea580c', '#dc2626']
export const SEVERITY_BG = ['#f0fdf4', '#f7fee7', '#fff7ed', '#fff7ed', '#fef2f2']
export const BUCKET_STR_MAP = ['low', 'low', 'medium', 'high', 'critical']

export function sevLabel(bucket) { return SEVERITY_LABELS[bucket] ?? '—' }
export function sevColor(bucket) { return SEVERITY_COLORS[bucket] ?? '#94a3b8' }
export function sevBg(bucket) { return SEVERITY_BG[bucket] ?? '#f8fafc' }

export function computeSev(analysis) {
  const bucketNum = computeSeverityBucket(analysis)
  const bucketStr = BUCKET_STR_MAP[bucketNum]
  const legacyLabels = { low: 'Baja', medium: 'Media', high: 'Alta', critical: 'Crítica' }
  return { bucket: bucketStr, label: legacyLabels[bucketStr] ?? '—' }
}

export function sevPillClassDALegacy(bucket) {
  if (bucket === 'critical') return 'da-sev-critical'
  if (bucket === 'high') return 'da-sev-high'
  if (bucket === 'medium') return 'da-sev-medium'
  return 'da-sev-low'
}

export function riskColor(rate) {
  if (rate >= 0.7) return '#dc2626'
  if (rate >= 0.4) return '#ea580c'
  if (rate >= 0.15) return '#d97706'
  return '#16a34a'
}

export function riskLabel(rate) {
  if (rate >= 0.7) return 'Crítica'
  if (rate >= 0.4) return 'Alta'
  if (rate >= 0.15) return 'Media'
  return 'Baja'
}

export function riskPillBg(rate) {
  if (rate >= 0.7) return '#fef2f2'
  if (rate >= 0.4) return '#fff7ed'
  if (rate >= 0.15) return '#fefce8'
  return '#ecfdf5'
}
