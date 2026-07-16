import { animateClose } from '../../utils/modalUtils'
import WeatherWidget from '../WeatherWidget'

export default function ContextModal({
  show, modalRef,
  farms,
  contextSelectedFarmId, contextSelectedZone, contextSelectedPlotId,
  weatherData, weatherLoading, weatherCondition,
  contextDatetimeRef, contextLotRef, contextZoneRef, contextRowsRef,
  contextPlantRef, contextLocationRef, contextSymptomRef, contextPartRef,
  contextStageRef, contextSeverityRef, contextIrrigationRef, contextPhytoRef, contextNotesRef,
  setShowContextModal,
  setContextSelectedFarmId, setContextSelectedZone, setContextSelectedPlotId,
  setWeatherData, setWeatherCondition,
  openParcelasModal, handleSaveContext, fileInputRef,
}) {
  return (
    <div className={`context-overlay ${show ? 'open' : ''}`} onClick={() => animateClose(modalRef, () => setShowContextModal(false))}>
      <div className="context-modal" ref={modalRef} onClick={e => e.stopPropagation()}>
        <div className="drag-handle" />
        <header className="context-modal-header px-5 py-5 sm:px-8 sm:py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="context-badge">Contexto de conversacion</span>
              <h3 className="font-cormorant text-2xl sm:text-3xl font-semibold text-gray-900 mt-3 leading-tight">Registrar datos de la planta antes del escaneo</h3>
              <p className="text-sm text-gray-500 mt-2 max-w-2xl leading-relaxed">Guarda solo lo que ayuda a entender la planta enferma y a tomar decisiones futuras en el cultivo.</p>
            </div>
            <button onClick={() => animateClose(modalRef, () => setShowContextModal(false))} className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 transition flex items-center justify-center text-gray-500 flex-shrink-0" style={{ border: 'none', cursor: 'pointer' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="context-summary mt-5 grid gap-2 sm:grid-cols-2">
            <div><p className="text-[0.65rem] uppercase tracking-[0.18em] text-gray-400">Uso</p><p className="text-sm text-gray-700 mt-1">Conectar diagnostico, contexto del lote y resultado final.</p></div>
            <div><p className="text-[0.65rem] uppercase tracking-[0.18em] text-gray-400">Salida</p><p className="text-sm text-gray-700 mt-1">Datos listos para analisis historico de la planta.</p></div>
          </div>
        </header>
        <div className="context-modal-body px-4 sm:px-6 py-5">
          <form className="space-y-4" onSubmit={e => e.preventDefault()}>
            <div className="context-section">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <p className="context-section-title">Identificacion de la planta</p>
                  <p className="text-sm text-slate-500 mt-1">Ubica con precision la planta afectada.</p>
                </div>
                <button type="button" onClick={() => { setShowContextModal(false); openParcelasModal() }} className="text-[0.7rem] font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 transition px-3 py-1.5 rounded-full flex items-center gap-1.5 flex-shrink-0 cursor-pointer" style={{ border: 'none' }}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>Mis parcelas
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className="block"><span className="block text-sm font-medium text-slate-700 mb-2">Fecha y hora</span><input type="datetime-local" ref={contextDatetimeRef} className="context-input" /></label>
                <label className="block"><span className="block text-sm font-medium text-slate-700 mb-2">ID del lote o sector</span>
                  <select ref={contextLotRef} className="context-select" value={contextSelectedFarmId} onChange={e => { setContextSelectedFarmId(e.target.value); setContextSelectedZone('') }}>
                    <option value="">Seleccionar lote</option>
                    {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </label>
                <label className="block"><span className="block text-sm font-medium text-slate-700 mb-2">Zona</span>
                  <select ref={contextZoneRef} className="context-select" value={contextSelectedZone} onChange={e => setContextSelectedZone(e.target.value)}>
                    <option value="">Seleccionar zona</option>
                    {farms.filter(f => String(f.id) === String(contextSelectedFarmId)).flatMap(f => (f.plots || []).filter((p, i, arr) => arr.findIndex(x => x.zone === p.zone) === i).map(p => <option key={p.zone} value={p.zone}>{p.zone || 'Sin zona'}</option>))}
                  </select>
                </label>
                <label className="block"><span className="block text-sm font-medium text-slate-700 mb-2">Parcela e hileras</span>
                  <select ref={contextRowsRef} className="context-select" onChange={e => setContextSelectedPlotId(e.target.value)}>
                    <option value="">Seleccionar parcela</option>
                    {farms.filter(f => String(f.id) === String(contextSelectedFarmId)).flatMap(f => (f.plots || []).filter(p => !contextSelectedZone || p.zone === contextSelectedZone).map(p => <option key={p.id} value={p.id}>{p.name}{p.rows ? ` (${p.rows})` : ''}</option>))}
                  </select>
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-4">
                <label className="block"><span className="block text-sm font-medium text-slate-700 mb-2">Planta / unidad</span><input type="text" ref={contextPlantRef} className="context-input" placeholder="Ej: Planta 0147, Unidad 12" /></label>
                <label className="block lg:col-span-2"><span className="block text-sm font-medium text-slate-700 mb-2">GPS o ubicacion exacta</span><input type="text" ref={contextLocationRef} className="context-input" placeholder="Lat. -1.234567, Lon. -79.123456 o referencia en campo" /></label>
              </div>
              <div className="mt-4">
                <span className="block text-sm font-medium text-slate-700 mb-2">Condiciones climaticas recientes</span>
                <WeatherWidget
                  data={weatherData}
                  loading={weatherLoading}
                  variant="panel"
                  pastDaysLimit={3}
                  conditionValue={weatherCondition}
                  onConditionChange={v => setWeatherCondition(v)}
                  fallback={
                    <select value={weatherCondition} onChange={e => setWeatherCondition(e.target.value)} className="context-select">
                      <option value="">Seleccionar condición</option>
                      <option value="Lluvioso">Lluvioso (últimos 3-5 días)</option>
                      <option value="Húmedo sin lluvia">Húmedo sin lluvia</option>
                      <option value="Normal para la época">Normal para la época</option>
                      <option value="Período seco">Período seco</option>
                    </select>
                  }
                />
              </div>
            </div>
            <div className="context-section">
              <div className="mb-4">
                <p className="context-section-title">Estado sanitario de la planta</p>
                <p className="text-sm text-slate-500 mt-1">Describe lo mas importante que ves antes de escanear la imagen.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="block lg:col-span-2"><span className="block text-sm font-medium text-slate-700 mb-2">Sintoma principal</span><input type="text" ref={contextSymptomRef} className="context-input" placeholder="Manchas, clorosis, pudricion, marchitez, dano en tallo..." /></label>
                <label className="block"><span className="block text-sm font-medium text-slate-700 mb-2">Organo afectado</span>
                  <select ref={contextPartRef} className="context-select"><option value="">Seleccionar</option><option>Cladodio / brazo</option><option>Fruto</option><option>Tallo principal</option><option>Raíz</option><option>Ramita / brote joven</option><option>Flor</option></select>
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 mt-4">
                <label className="block"><span className="block text-sm font-medium text-slate-700 mb-2">Fase fenologica</span>
                  <select ref={contextStageRef} className="context-select"><option value="">Seleccionar</option><option>Vegetativo / Crecimiento</option><option>Brotacion floral</option><option>Antesis (Floracion)</option><option>Amarre o Cuajado</option><option>Madurez y Cosecha</option><option>Post-cosecha</option></select>
                </label>
                <label className="block"><span className="block text-sm font-medium text-slate-700 mb-2">Severidad observada</span>
                  <select ref={contextSeverityRef} className="context-select"><option value="">Seleccionar</option><option>Ninguna</option><option>Baja</option><option>Moderada</option><option>Alta</option><option>Critica</option></select>
                </label>
              </div>
              <div className="mt-4">
                <label className="block"><span className="block text-sm font-medium text-slate-700 mb-2">Notas de campo</span><textarea ref={contextNotesRef} className="context-textarea" placeholder="Ejemplo: inicio despues del riego, la planta esta en borde del lote, hay humedad acumulada, se observo olor raro..."></textarea></label>
              </div>
            </div>
            <div className="context-section">
              <div className="mb-4">
                <p className="context-section-title">Antecedentes minimos</p>
                <p className="text-sm text-slate-500 mt-1">Solo lo necesario para explicar el estado actual de la planta.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block"><span className="block text-sm font-medium text-slate-700 mb-2">Riego reciente</span><input type="text" ref={contextIrrigationRef} className="context-input" placeholder="Frecuencia, volumen o cambio reciente" /></label>
                <label className="block"><span className="block text-sm font-medium text-slate-700 mb-2">Aplicacion fitosanitaria</span><input type="text" ref={contextPhytoRef} className="context-input" placeholder="Producto, fecha y motivo" /></label>
              </div>
            </div>
            <div className="context-section">
              <div className="flex flex-wrap gap-3 justify-end">
                <button type="button" className="context-secondary-btn" onClick={() => {
                  [contextDatetimeRef, contextLotRef, contextZoneRef, contextRowsRef, contextPlantRef, contextLocationRef, contextSymptomRef, contextPartRef, contextStageRef, contextSeverityRef, contextIrrigationRef, contextPhytoRef, contextNotesRef].forEach(ref => { if (ref.current) ref.current.value = '' })
                  setWeatherData(null); setWeatherCondition('')
                }}>Limpiar</button>
                <button type="button" className="context-secondary-btn" onClick={async () => { await handleSaveContext(); setShowContextModal(false) }}>Guardar</button>
                <button type="button" className="context-save-btn" onClick={async () => { await handleSaveContext(); setShowContextModal(false); setTimeout(() => fileInputRef.current?.click(), 300) }}>Guardar y cargar imagen</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
