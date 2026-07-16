import { animateClose } from '../../utils/modalUtils'

export default function ParcelasModal({
  show, modalRef,
  farms,
  onClose, openAddFarmModal, openAddPlotModal,
  openEditFarmModal, openEditPlotModal,
  handleDeleteFarm, handleDeletePlot,
  handleSelectPlot,
}) {
  return (
    <div className={`context-overlay ${show ? 'open' : ''}`} onClick={() => animateClose(modalRef, onClose)}>
      <div className="context-modal" ref={modalRef} onClick={e => e.stopPropagation()}>
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
                <span className="context-badge">Gestión de propiedades</span>
                <h3 className="font-cormorant text-2xl sm:text-3xl font-semibold text-gray-900 mt-1 leading-tight">Mis Parcelas</h3>
                <p className="text-xs text-gray-400 mt-0.5">Administra tus corporaciones agrícolas y asocia parcelas al análisis.</p>
              </div>
            </div>
            <button onClick={() => animateClose(modalRef, onClose)} className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 transition flex items-center justify-center text-gray-500 flex-shrink-0" style={{ border: 'none', cursor: 'pointer' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        </header>
        <div className="context-modal-body px-5 sm:px-7 py-5">
          <button onClick={openAddFarmModal} className="w-full mb-5 flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 border-dashed border-gray-200 hover:border-brand-400 hover:bg-brand-50 transition-all group cursor-pointer" style={{ background: 'none' }}>
            <span className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 group-hover:bg-brand-100 transition flex-shrink-0">
              <svg className="w-4 h-4 text-gray-500 group-hover:text-brand-600 transition" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </span>
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-600 group-hover:text-brand-700 transition">Agregar nueva corporación agrícola</p>
              <p className="text-xs text-gray-400 group-hover:text-brand-500 transition">Registra una propiedad agrícola</p>
            </div>
          </button>
          <div id="parcelasFarmsList" className="space-y-3">
            {farms.length === 0 ? (
              <div className="parcelas-empty-state">
                <span className="inline-flex w-14 h-14 rounded-2xl items-center justify-center mb-3" style={{ background: 'linear-gradient(135deg,#dcfce7,#bbf7d0)' }}>
                  <svg className="w-7 h-7 text-brand-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 22a1 1 0 0 1-1-1v-4a1 1 0 0 1 .445-.832l3-2a1 1 0 0 1 1.11 0l3 2A1 1 0 0 1 22 17v4a1 1 0 0 1-1 1z" /><path strokeLinecap="round" strokeLinejoin="round" d="M18 10a8 8 0 0 0-16 0c0 4.993 5.539 10.193 7.399 11.799a1 1 0 0 0 .601.2" /><path strokeLinecap="round" strokeLinejoin="round" d="M18 22v-3" /><circle cx="10" cy="10" r="3" /></svg>
                </span>
                <p className="font-medium text-gray-600">Aún no tienes corporaciones agrícolas registradas</p>
                <p className="text-xs mt-1 text-gray-400">Crea tu primera corporación agrícola para administrar tus parcelas.</p>
              </div>
            ) : (
              farms.map(farm => (
                <div key={farm.id} className="parcelas-farm-card">
                  <div className="parcelas-farm-header">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#dcfce7,#bbf7d0)' }}>
                        <svg className="w-3.5 h-3.5 text-brand-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 22a1 1 0 0 1-1-1v-4a1 1 0 0 1 .445-.832l3-2a1 1 0 0 1 1.11 0l3 2A1 1 0 0 1 22 17v4a1 1 0 0 1-1 1z" /><path d="M18 10a8 8 0 0 0-16 0c0 4.993 5.539 10.193 7.399 11.799a1 1 0 0 0 .601.2" /><circle cx="10" cy="10" r="3" /></svg>
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{farm.name}</p>
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" /><circle cx="12" cy="10" r="3" /></svg>
                          {farm.location || 'Sin ubicación'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => openAddPlotModal(farm)} className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 transition px-3 py-1.5 rounded-xl cursor-pointer" style={{ border: 'none' }}>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        Parcela
                      </button>
                      <button onClick={() => openEditFarmModal(farm)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition cursor-pointer" style={{ background: 'none', border: 'none' }} title="Editar corporación agrícola">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      </button>
                      <button onClick={() => handleDeleteFarm(farm.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition cursor-pointer" style={{ background: 'none', border: 'none' }} title="Eliminar corporación agrícola">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
                      </button>
                    </div>
                  </div>
                  {farm.plots && farm.plots.length > 0 ? (
                    <div className="parcelas-farm-body">
                      <table className="parcelas-plots-table">
                        <thead>
                          <tr>
                            <th>Parcela</th><th>Zona</th><th>Hilera</th><th>GPS</th><th>Ha.</th><th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {farm.plots.map(plot => (
                            <tr key={plot.id}>
                              <td className="font-medium">{plot.name}</td>
                              <td>{plot.zone || '—'}</td>
                              <td>{plot.rows || '—'}</td>
                              <td className="text-xs">{plot.gps_location || '—'}</td>
                              <td>{plot.hectares || '—'}</td>
                              <td>
                                <div className="flex items-center gap-1">
                                  <button onClick={() => handleSelectPlot(plot, farm)} className="w-7 h-7 flex items-center justify-center rounded-lg text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 transition cursor-pointer" style={{ border: 'none' }} title="Seleccionar parcela">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                                  </button>
                                  <button onClick={() => openEditPlotModal(plot, farm)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition cursor-pointer" style={{ background: 'none', border: 'none' }} title="Editar parcela">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                  </button>
                                  <button onClick={() => handleDeletePlot(plot.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition cursor-pointer" style={{ background: 'none', border: 'none' }} title="Eliminar parcela">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="px-4 py-3 flex items-center gap-2 text-xs text-gray-400 border-t border-gray-100">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                      Sin parcelas. Añade una para iniciar análisis.
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
