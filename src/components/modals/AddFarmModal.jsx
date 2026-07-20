import { animateClose } from '../../utils/modalUtils'
import './modals.css'

export default function AddFarmModal({
  show, modalRef, animatedRefs,
  editingFarm, farmName, farmLocation, farmError,
  setShowAddFarmModal, setFarmName, setFarmLocation, setFarmError,
  handleCreateFarm,
}) {
  const close = () => animateClose(modalRef, () => setShowAddFarmModal(false), animatedRefs)
  return (
    <div className={`context-overlay ${show ? 'open' : ''}`} style={{ zIndex: 310 }} onClick={close}>
      <div className="context-modal" ref={modalRef} style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
        <div className="drag-handle" />
        <header className="context-modal-header px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ background: 'linear-gradient(135deg,#16a34a 0%,#15803d 100%)' }}>
                <svg className="w-5 h-5" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M15 22a1 1 0 0 1-1-1v-4a1 1 0 0 1 .445-.832l3-2a1 1 0 0 1 1.11 0l3 2A1 1 0 0 1 22 17v4a1 1 0 0 1-1 1z" /><path d="M18 10a8 8 0 0 0-16 0c0 4.993 5.539 10.193 7.399 11.799a1 1 0 0 0 .601.2" /><path d="M18 22v-3" /><circle cx="10" cy="10" r="3" />
                </svg>
              </div>
              <div>
                <span className="context-badge">{editingFarm ? 'Editar corporación agrícola' : 'Nueva corporación agrícola'}</span>
                <h3 className="font-cormorant text-2xl sm:text-3xl font-semibold text-gray-900 mt-1 leading-tight">{editingFarm ? 'Editar corporación agrícola' : 'Registrar corporación agrícola'}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{editingFarm ? 'Actualiza el nombre o la ubicación.' : 'Después podrás agregar parcelas.'}</p>
              </div>
            </div>
            <button onClick={close} className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 transition flex items-center justify-center text-gray-500 flex-shrink-0" style={{ border: 'none', cursor: 'pointer' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        </header>
        <div className="context-modal-body px-5 sm:px-7 py-6">
          <div className="context-section space-y-4">
            <p className="context-section-title">Datos de la corporación agrícola</p>
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-2">Nombre de la corporación agrícola <span className="text-red-400">*</span></span>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 22a1 1 0 0 1-1-1v-4a1 1 0 0 1 .445-.832l3-2a1 1 0 0 1 1.11 0l3 2A1 1 0 0 1 22 17v4a1 1 0 0 1-1 1z" /><path d="M18 10a8 8 0 0 0-16 0c0 4.993 5.539 10.193 7.399 11.799a1 1 0 0 0 .601.2" /><circle cx="10" cy="10" r="3" /></svg>
                </span>
                <input type="text" className="context-input ctx-icon-input" placeholder="Ej: Corporación agrícola El Paraíso" value={farmName}
                  onChange={e => { setFarmName(e.target.value); if (farmError) setFarmError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleCreateFarm()} />
              </div>
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-2">Ubicación / Sector</span>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" /><circle cx="12" cy="10" r="3" /></svg>
                </span>
                <input type="text" className="context-input ctx-icon-input" placeholder="Ej: Machala, El Oro, Ecuador" value={farmLocation}
                  onChange={e => setFarmLocation(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateFarm()} />
              </div>
            </label>
            {farmError && (
              <p className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                {farmError}
              </p>
            )}
            <div className="flex items-start gap-2.5 bg-brand-50 border border-brand-100 rounded-2xl px-4 py-3">
              <svg className="w-4 h-4 text-brand-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
              <p className="text-xs text-brand-700 leading-relaxed">Al crear la corporación agrícola, podrás agregar parcelas de inmediato. Necesitas al menos una parcela para iniciar un análisis.</p>
            </div>
          </div>
        </div>
        <div className="px-5 sm:px-7 py-5 border-t border-gray-100 modal-footer-btns">
          <button onClick={close} className="modal-secondary-btn">Cancelar</button>
          <button onClick={handleCreateFarm} className="modal-save-btn flex items-center justify-center gap-2">
            {editingFarm ? 'Guardar cambios' : 'Crear corporación agrícola y agregar parcela'}
          </button>
        </div>
      </div>
    </div>
  )
}
