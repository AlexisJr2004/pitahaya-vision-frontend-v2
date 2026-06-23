import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer'

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtDate(v) {
  if (!v) return 'Sin fecha'
  const d = new Date(v)
  if (isNaN(d)) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short' }).format(d)
}

function fmtDateLong(v) {
  if (!v) return 'Sin fecha'
  const d = new Date(v)
  if (isNaN(d)) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-EC', { dateStyle: 'long' }).format(d)
}

function getSevColor(val) {
  const s = String(val || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (s.includes('crit') || s.includes('extrem') || s.includes('muy alta')) return '#ef4444'
  if (s.includes('alta') || s.includes('high') || s.includes('grav')) return '#fb923c'
  if (s.includes('moder') || s.includes('media') || s.includes('inter')) return '#f59e0b'
  if (s.includes('sana') || s.includes('baja') || s.includes('leve') || s.includes('low')) return '#22c55e'
  return '#22c55e'
}

function getSevBg(val) {
  const color = getSevColor(val)
  const map = { '#ef4444': '#fef2f2', '#fb923c': '#fff7ed', '#f59e0b': '#fffbeb', '#22c55e': '#f0fdf4' }
  return map[color] || '#f0fdf4'
}

// ── Design tokens ──────────────────────────────────────────────────────────
const C = {
  brand:      '#22c55e',
  brandDark:  '#16a34a',
  brandDeep:  '#0f172a',
  slate900:   '#0f172a',
  slate800:   '#1e293b',
  slate700:   '#334155',
  slate600:   '#475569',
  slate500:   '#64748b',
  slate400:   '#94a3b8',
  slate300:   '#cbd5e1',
  slate200:   '#e2e8f0',
  slate100:   '#f1f5f9',
  slate50:    '#f8fafc',
  white:      '#ffffff',
}

// ── Styles ─────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page: {
    fontFamily:      'Helvetica',
    fontSize:        9,
    color:           C.slate700,
    backgroundColor: C.white,
    paddingBottom:   50,
  },

  // Header band
  headerBand: {
    backgroundColor: C.brandDeep,
    paddingHorizontal: 36,
    paddingTop:      22,
    paddingBottom:   20,
  },
  headerTopRow: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'flex-start',
    marginBottom:    14,
  },
  badge: {
    backgroundColor: C.brand,
    borderRadius:    4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    color:           C.white,
    fontSize:        6.5,
    fontFamily:      'Helvetica-Bold',
    letterSpacing:   1.2,
  },
  headerDate: {
    color:           C.slate400,
    fontSize:        7.5,
    textAlign:       'right',
  },
  headerTitle: {
    color:           C.white,
    fontSize:        20,
    fontFamily:      'Helvetica-Bold',
    marginBottom:    3,
    letterSpacing:  -0.3,
  },
  headerSubtitle: {
    color:           C.slate400,
    fontSize:        8.5,
    marginBottom:    12,
  },
  headerPills: {
    flexDirection:   'row',
    flexWrap:        'wrap',
    gap:             10,
  },
  headerPill: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             5,
  },
  headerPillDot: {
    width:           5,
    height:          5,
    borderRadius:    3,
    backgroundColor: C.brand,
  },
  headerPillText: {
    color:           C.slate300,
    fontSize:        7.5,
  },

  // Green accent line
  accentLine: {
    height:          3,
    backgroundColor: C.brand,
  },

  // Body
  body: {
    paddingHorizontal: 36,
    paddingTop:      22,
  },

  // Section
  section: {
    marginBottom:    18,
  },
  sectionHead: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             7,
    paddingBottom:   7,
    marginBottom:    10,
    borderBottomWidth: 1,
    borderBottomColor: C.slate200,
  },
  sectionDot: {
    width:           6,
    height:          6,
    borderRadius:    3,
    backgroundColor: C.brand,
  },
  sectionTitle: {
    fontSize:        10.5,
    fontFamily:      'Helvetica-Bold',
    color:           C.slate900,
    letterSpacing:   0.1,
  },

  // Card grid
  cardRow: {
    flexDirection:   'row',
    flexWrap:        'wrap',
    gap:             7,
  },
  card: {
    flex:            1,
    minWidth:        95,
    backgroundColor: C.slate50,
    borderRadius:    6,
    borderWidth:     1,
    borderColor:     C.slate200,
    padding:         '8 10',
  },
  cardLabel: {
    fontSize:        6.5,
    fontFamily:      'Helvetica-Bold',
    color:           C.slate500,
    textTransform:   'uppercase',
    letterSpacing:   0.6,
    marginBottom:    4,
  },
  cardValue: {
    fontSize:        9.5,
    fontFamily:      'Helvetica-Bold',
    color:           C.slate900,
  },
  cardValueMono: {
    fontSize:        8,
    fontFamily:      'Courier',
    color:           C.slate700,
  },

  // Stat cards (highlighted)
  statRow: {
    flexDirection:   'row',
    gap:             7,
    marginBottom:    10,
  },
  statCard: {
    flex:            1,
    backgroundColor: '#f0fdf4',
    borderRadius:    8,
    borderWidth:     1,
    borderColor:     '#bbf7d0',
    padding:         '10 12',
    alignItems:      'center',
  },
  statValue: {
    fontSize:        20,
    fontFamily:      'Helvetica-Bold',
    color:           C.brandDark,
  },
  statLabel: {
    fontSize:        7,
    color:           '#166534',
    textAlign:       'center',
    marginTop:       3,
    lineHeight:      1.3,
  },

  // Severity badge
  sevBadge: {
    borderRadius:    10,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    alignSelf:       'flex-start',
  },
  sevBadgeText: {
    fontSize:        7,
    fontFamily:      'Helvetica-Bold',
    color:           C.white,
  },

  // Bar chart
  barRow: {
    flexDirection:   'row',
    alignItems:      'center',
    marginBottom:    5,
    gap:             8,
  },
  barLabel: {
    fontSize:        7.5,
    fontFamily:      'Helvetica-Bold',
    color:           C.slate700,
    width:           72,
    textAlign:       'right',
  },
  barTrack: {
    flex:            1,
    height:          11,
    backgroundColor: C.slate100,
    borderRadius:    6,
    overflow:        'hidden',
  },
  barFill: {
    height:          '100%',
    borderRadius:    6,
  },
  barStat: {
    fontSize:        7,
    fontFamily:      'Helvetica-Bold',
    color:           C.slate700,
    width:           52,
  },

  // Disease tags
  tagRow: {
    flexDirection:   'row',
    flexWrap:        'wrap',
    gap:             6,
  },
  tag: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: C.slate100,
    borderRadius:    12,
    paddingHorizontal: 9,
    paddingVertical: 4,
    gap:             5,
  },
  tagText: {
    fontSize:        8,
    fontFamily:      'Helvetica-Bold',
    color:           C.slate800,
  },
  tagBubble: {
    backgroundColor: C.white,
    borderRadius:    8,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
  },
  tagBubbleText: {
    fontSize:        6.5,
    color:           C.slate500,
  },

  // Timeline
  tlItem: {
    flexDirection:   'row',
    marginBottom:    10,
  },
  tlLeft: {
    width:           18,
    alignItems:      'center',
  },
  tlDot: {
    width:           9,
    height:          9,
    borderRadius:    5,
    marginTop:       1,
  },
  tlLine: {
    flex:            1,
    width:           1.5,
    backgroundColor: C.slate200,
    marginTop:       3,
  },
  tlBody: {
    flex:            1,
    paddingBottom:   6,
  },
  tlRow: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'flex-start',
    marginBottom:    3,
  },
  tlDisease: {
    fontSize:        9.5,
    fontFamily:      'Helvetica-Bold',
    color:           C.slate900,
    flex:            1,
    marginRight:     8,
  },
  tlRight: {
    alignItems:      'flex-end',
  },
  tlDate: {
    fontSize:        7,
    color:           C.slate500,
    marginTop:       3,
  },
  tlConf: {
    fontSize:        7,
    color:           C.slate400,
    marginBottom:    3,
  },
  tlRecBox: {
    backgroundColor: '#f0fdf4',
    borderRadius:    4,
    borderLeftWidth: 2,
    borderLeftColor: C.brand,
    padding:         '5 8',
    marginTop:       3,
  },
  tlRecText: {
    fontSize:        7.5,
    color:           '#166534',
    lineHeight:      1.4,
  },
  tlTreatBox: {
    backgroundColor: '#fffbeb',
    borderRadius:    4,
    borderLeftWidth: 2,
    borderLeftColor: '#f59e0b',
    padding:         '5 8',
    marginTop:       3,
  },
  tlTreatText: {
    fontSize:        7.5,
    color:           '#92400e',
    lineHeight:      1.4,
  },

  // Footer
  footer: {
    position:        'absolute',
    bottom:          18,
    left:            36,
    right:           36,
    paddingTop:      7,
    borderTopWidth:  1,
    borderTopColor:  C.slate200,
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'center',
  },
  footerText: {
    fontSize:        6.5,
    color:           C.slate400,
  },
  footerBrand: {
    fontSize:        6.5,
    fontFamily:      'Helvetica-Bold',
    color:           C.brand,
  },
  pageNum: {
    position:        'absolute',
    bottom:          18,
    left:            0,
    right:           0,
    fontSize:        6.5,
    color:           C.slate300,
    textAlign:       'center',
  },
})

// ── Sub-components ─────────────────────────────────────────────────────────
function Field({ label, value, mono }) {
  return (
    <View style={S.card}>
      <Text style={S.cardLabel}>{label}</Text>
      <Text style={mono ? S.cardValueMono : S.cardValue}>{value || '—'}</Text>
    </View>
  )
}

function Stat({ value, label }) {
  return (
    <View style={S.statCard}>
      <Text style={S.statValue}>{String(value ?? '—')}</Text>
      <Text style={S.statLabel}>{label}</Text>
    </View>
  )
}

function SevBadge({ label }) {
  return (
    <View style={[S.sevBadge, { backgroundColor: getSevColor(label) }]}>
      <Text style={S.sevBadgeText}>{label || '—'}</Text>
    </View>
  )
}

function SectionTitle({ children }) {
  return (
    <View style={S.sectionHead}>
      <View style={S.sectionDot} />
      <Text style={S.sectionTitle}>{children}</Text>
    </View>
  )
}

// ── PDF Document ────────────────────────────────────────────────────────────
function FichaDocument({ fichaPh, fichaAnalyses, fichaTotal, fichaDiseases, fichaTopDisease, fichaLastDate, avgSeverityLabel, severityTrend, sevDistEntries, maxSevCount, user }) {
  const now = new Date()
  const generatedAt = fmtDateLong(now) + ', ' + now.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })
  const reversedAnalyses = [...fichaAnalyses].reverse()

  const trendColor =
    severityTrend === 'Empeorando' ? '#ef4444' :
    severityTrend === 'Mejorando'  ? '#22c55e' : C.slate500

  return (
    <Document title={`Ficha Técnica${fichaPh?._plantId ? ` — Planta ${fichaPh._plantId}` : ''}`} author="Pitahaya Vision">
      <Page size="A4" style={S.page}>

        {/* ── Header ── */}
        <View style={S.headerBand}>
          <View style={S.headerTopRow}>
            <View style={S.badge}>
              <Text style={S.badgeText}>PITAHAYA VISION</Text>
            </View>
            <Text style={S.headerDate}>Generado el {generatedAt}</Text>
          </View>

          <Text style={S.headerTitle}>
            Ficha Técnica{fichaPh?._plantId ? ` — Planta ${fichaPh._plantId}` : ''}
          </Text>
          <Text style={S.headerSubtitle}>
            Reporte fitosanitario de análisis de imagen por IA
          </Text>

          <View style={S.headerPills}>
            {fichaPh?._farmName ? (
              <View style={S.headerPill}>
                <View style={S.headerPillDot} />
                <Text style={S.headerPillText}>{fichaPh._farmName}</Text>
              </View>
            ) : null}
            {fichaPh?._plotName ? (
              <View style={S.headerPill}>
                <View style={S.headerPillDot} />
                <Text style={S.headerPillText}>Parcela: {fichaPh._plotName}</Text>
              </View>
            ) : null}
            <View style={S.headerPill}>
              <View style={S.headerPillDot} />
              <Text style={S.headerPillText}>{fichaTotal} análisis registrados</Text>
            </View>
            {user?.full_name ? (
              <View style={S.headerPill}>
                <View style={S.headerPillDot} />
                <Text style={S.headerPillText}>{user.full_name}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={S.accentLine} />

        <View style={S.body}>

          {/* ── Finca y Parcela ── */}
          <View style={S.section}>
            <SectionTitle>Finca y parcela</SectionTitle>
            <View style={S.cardRow}>
              <Field label="Finca" value={fichaPh?._farmName} />
              <Field label="Parcela" value={fichaPh?._plotName} />
              <Field label="Zona" value={fichaPh?._zone} />
            </View>
            <View style={[S.cardRow, { marginTop: 7 }]}>
              <Field label="Hileras" value={fichaPh?._rows} />
              <Field label="Hectáreas" value={fichaPh?._hectares ? `${fichaPh._hectares} ha` : null} />
              <Field label="Coordenadas GPS" value={fichaPh?._gps} mono />
            </View>
          </View>

          {/* ── Contexto Clínico ── */}
          <View style={S.section}>
            <SectionTitle>Contexto clínico</SectionTitle>
            <View style={S.cardRow}>
              <Field label="ID / Número de planta" value={fichaPh?._plantId} />
              <Field label="Estado observado" value={fichaPh?._status} />
              <Field label="Síntoma principal" value={fichaPh?._mainSymptom} />
              <Field label="Órgano afectado" value={fichaPh?._affectedPart} />
            </View>
          </View>

          {/* ── Estadísticas ── */}
          <View style={S.section}>
            <SectionTitle>Estadísticas del seguimiento</SectionTitle>
            <View style={S.statRow}>
              <Stat value={fichaTotal} label="Total de análisis" />
              <Stat value={fichaDiseases.length} label="Enfermedades distintas" />
              <Stat value={avgSeverityLabel} label="Severidad promedio" />
            </View>
            <View style={S.cardRow}>
              <Field label="Diagnóstico más frecuente" value={fichaTopDisease} />
              <Field label="Último análisis" value={fichaLastDate} />
              <View style={[S.card, { flex: 1, minWidth: 95 }]}>
                <Text style={S.cardLabel}>Tendencia</Text>
                <Text style={[S.cardValue, { color: trendColor }]}>
                  {severityTrend === 'Empeorando' ? '▲ ' : severityTrend === 'Mejorando' ? '▼ ' : '— '}
                  {severityTrend}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Distribución de severidad ── */}
          {sevDistEntries.length > 0 && (
            <View style={S.section}>
              <SectionTitle>Distribución de severidad</SectionTitle>
              {sevDistEntries.map(([label, count]) => {
                const pct = fichaTotal > 0 ? Math.round((count / fichaTotal) * 100) : 0
                const barW = Math.max(4, (count / (maxSevCount || 1)) * 100)
                const color = getSevColor(label)
                return (
                  <View key={label} style={S.barRow}>
                    <Text style={S.barLabel}>{label}</Text>
                    <View style={S.barTrack}>
                      <View style={[S.barFill, { width: `${barW}%`, backgroundColor: color }]} />
                    </View>
                    <Text style={S.barStat}>{count} ({pct}%)</Text>
                  </View>
                )
              })}
            </View>
          )}

          {/* ── Diagnósticos identificados ── */}
          {fichaDiseases.length > 0 && (
            <View style={S.section}>
              <SectionTitle>Diagnósticos identificados</SectionTitle>
              <View style={S.tagRow}>
                {fichaDiseases.map((d, i) => {
                  const cnt = fichaAnalyses.filter(e => e.disease_name_predicted === d).length
                  return (
                    <View key={i} style={S.tag}>
                      <Text style={S.tagText}>{d}</Text>
                      <View style={S.tagBubble}>
                        <Text style={S.tagBubbleText}>{cnt}x</Text>
                      </View>
                    </View>
                  )
                })}
              </View>
            </View>
          )}

          {/* ── Línea de tiempo ── */}
          <View style={S.section}>
            <SectionTitle>Línea de tiempo de análisis</SectionTitle>
            {reversedAnalyses.map((e, i) => {
              const disease  = e.disease_name_predicted || '—'
              const recs     = e.recommendations_text || ''
              const treat    = e._ph?.history_treatment_applied || ''
              const sevColor = getSevColor(e.severity)
              const conf     = e.confidence > 0
                ? (e.confidence <= 1 ? (e.confidence * 100).toFixed(1) : e.confidence.toFixed(1))
                : null

              return (
                <View key={i} style={S.tlItem} wrap={false}>
                  <View style={S.tlLeft}>
                    <View style={[S.tlDot, { backgroundColor: sevColor }]} />
                    {i < reversedAnalyses.length - 1 && <View style={S.tlLine} />}
                  </View>
                  <View style={S.tlBody}>
                    <View style={S.tlRow}>
                      <Text style={S.tlDisease}>{disease}</Text>
                      <View style={S.tlRight}>
                        <SevBadge label={e.severity} />
                        <Text style={S.tlDate}>{fmtDate(e.created_at)}</Text>
                      </View>
                    </View>
                    {conf && (
                      <Text style={S.tlConf}>Confianza del modelo: {conf}%</Text>
                    )}
                    {recs ? (
                      <View style={S.tlRecBox}>
                        <Text style={S.tlRecText}>
                          <Text style={{ fontFamily: 'Helvetica-Bold' }}>Recomendación: </Text>
                          {recs}
                        </Text>
                      </View>
                    ) : null}
                    {treat ? (
                      <View style={S.tlTreatBox}>
                        <Text style={S.tlTreatText}>
                          <Text style={{ fontFamily: 'Helvetica-Bold' }}>Tratamiento aplicado: </Text>
                          {treat}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              )
            })}
          </View>

        </View>

        {/* ── Footer ── */}
        <View style={S.footer} fixed>
          <Text style={S.footerText}>
            <Text style={S.footerBrand}>Pitahaya Vision</Text>
            {'  ·  Sistema de análisis fitosanitario con IA'}
          </Text>
          <Text style={S.footerText}>{user?.full_name || ''}</Text>
        </View>

        <Text
          style={S.pageNum}
          render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  )
}

// ── Public API ──────────────────────────────────────────────────────────────
export async function downloadFichaTecnicaPDF({ fichaPh, fichaAnalyses, fichaTotal, fichaDiseases, fichaTopDisease, fichaLastDate, avgSeverityLabel, severityTrend, sevDistEntries, maxSevCount, user }) {
  const blob = await pdf(
    <FichaDocument
      fichaPh={fichaPh}
      fichaAnalyses={fichaAnalyses}
      fichaTotal={fichaTotal}
      fichaDiseases={fichaDiseases}
      fichaTopDisease={fichaTopDisease}
      fichaLastDate={fichaLastDate}
      avgSeverityLabel={avgSeverityLabel}
      severityTrend={severityTrend}
      sevDistEntries={sevDistEntries}
      maxSevCount={maxSevCount}
      user={user}
    />
  ).toBlob()

  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href    = url
  a.download = `ficha_tecnica${fichaPh?._plantId ? `_planta_${fichaPh._plantId}` : ''}_${new Date().toISOString().slice(0, 10)}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
