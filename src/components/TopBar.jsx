import AppLogo from './AppLogo'

/**
 * Barra superior — visible solo en móvil (md:hidden), donde el Sidebar
 * queda oculto tras un drawer. title/subtitle/rightAction los define cada
 * página para reflejar en qué sección está el usuario.
 */
export default function TopBar({ title = 'Pitahaya Vision', subtitle, onOpenSidebar, rightAction }) {
  return (
    <header className="md:hidden flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 bg-white flex-shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={onOpenSidebar} aria-label="Abrir menú"
          className="p-2 -ml-1 rounded-xl hover:bg-brand-50 active:bg-brand-100 transition text-gray-500 flex-shrink-0"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#16a34a,#22c55e,#4ade80)' }}>
          <AppLogo className="w-4 h-4 fill-white" />
        </div>
        <div className="min-w-0">
          <h1 className="font-cormorant text-base font-semibold text-gray-900 leading-none truncate">{title}</h1>
          {subtitle && (
            <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-brand-600 leading-none mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {rightAction && <div className="flex-shrink-0">{rightAction}</div>}
    </header>
  )
}
