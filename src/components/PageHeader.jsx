const TONES = {
  brand:   { value: 'text-slate-900',   icon: 'text-brand-600',   bg: 'bg-brand-50',   border: 'border-brand-100',   rgb: '34,197,94'  },
  red:     { value: 'text-red-700',     icon: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-100',     rgb: '239,68,68'  },
  emerald: { value: 'text-emerald-700', icon: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', rgb: '16,185,129' },
  sky:     { value: 'text-sky-700',     icon: 'text-sky-600',     bg: 'bg-sky-50',     border: 'border-sky-100',     rgb: '14,165,233' },
  amber:   { value: 'text-slate-900',   icon: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-100',   rgb: '234,179,8'  },
}

/**
 * Encabezado de sección tipo panel — usado por Dashboard/Historial, tanto en
 * la vista de administrador como en la del productor. Cada página solo pasa
 * sus propios datos (título, tarjeta de contexto, métricas); el diseño
 * (tipografía, tarjetas, colores) queda centralizado acá.
 *
 * kpis: [{ label, value, note, icon, tone?, small? }]
 *   - tone: 'brand' | 'red' | 'emerald' | 'sky' | 'amber' (default 'brand')
 *   - small: usar cuando value es texto largo (ej. nombre de enfermedad) en vez de un número
 */
export default function PageHeader({ eyebrow, title, description, info, action, kpis = [] }) {
  const kpiColsClass = kpis.length >= 4 ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'

  return (
    <section className="mb-10 fade-in-up space-y-6">
      <header className="flex items-start justify-between flex-wrap gap-4">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-600 mb-2">{eyebrow}</p>
          <h2 className="panel-title text-3xl md:text-4xl font-semibold text-slate-900 leading-tight">{title}</h2>
          {description && (
            <p className="mt-3 text-sm md:text-base text-slate-500 leading-7">{description}</p>
          )}
        </div>

        {info && (action ? (
          <div className="flex flex-col gap-3">
            <InfoCard {...info} />
            {action}
          </div>
        ) : (
          <InfoCard {...info} />
        ))}
      </header>

      {kpis.length > 0 && (
        <section className={`grid ${kpiColsClass} gap-5`}>
          {kpis.map((kpi, i) => <KpiCard key={i} {...kpi} />)}
        </section>
      )}
    </section>
  )
}

function InfoCard({ label, value, note }) {
  return (
    <div className="info-card px-4 py-3 min-w-[240px]">
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-1 text-base font-semibold text-slate-900">{value}</p>
      {note && <p className="mt-1 text-sm text-slate-500">{note}</p>}
    </div>
  )
}

function KpiCard({ label, value, note, icon, tone = 'brand', small = false }) {
  const t = TONES[tone] || TONES.brand
  return (
    <article className="kpi-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className={small ? 'min-w-0' : undefined}>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</p>
          <p className={`mt-2 font-bold ${small ? 'text-lg truncate' : 'text-4xl'} ${t.value}`}>{value}</p>
          {note && <p className={`mt-2 text-sm text-slate-500 ${small ? 'truncate' : ''}`}>{note}</p>}
        </div>
        <div className={`w-12 h-12 rounded-2xl ${t.bg} flex items-center justify-center border ${t.border} flex-shrink-0`}>
          <i className={`fas ${icon} ${t.icon} text-xl`}></i>
        </div>
      </div>
      <div className="mt-5 kpi-sparkline" style={{ background: `linear-gradient(90deg,rgba(${t.rgb},.1),rgba(${t.rgb},.45))` }}></div>
    </article>
  )
}
