import { useState, useEffect, useRef } from 'react'
import L from 'leaflet'
import { animateClose } from '../../utils/modalUtils'

export default function AddPlotModal({
  show, modalRef,
  selectedFarmForPlot, editingPlot,
  plotName, plotGps, plotGpsCoords, plotHectares, plotZone, plotRows, plotError,
  setShowAddPlotModal, setPlotName, setPlotGps, setPlotGpsCoords, setPlotHectares, setPlotZone, setPlotRows, setPlotError,
  handleCreatePlot,
}) {
  const [geoLoading, setGeoLoading] = useState(false)
  const mapContainerRef = useRef(null)
  const leafletMapRef = useRef(null)
  const mapMarkerRef = useRef(null)

  const handleGetLocation = () => {
    if (!navigator.geolocation) { alert('Tu navegador no soporta geolocalización.'); return }
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const lat = coords.latitude.toFixed(6)
        const lng = coords.longitude.toFixed(6)
        setPlotGps(`${lat}, ${lng}`)
        setPlotGpsCoords({ lat, lng })
        if (leafletMapRef.current) {
          leafletMapRef.current.setView([parseFloat(lat), parseFloat(lng)], 15)
          const geoIcon = L.divIcon({
            html: `<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 3px 6px rgba(0,0,0,.35))">
              <div style="width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,#16a34a,#22c55e);border:3px solid #fff"></div>
              <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:8px solid #16a34a;margin-top:-2px"></div>
            </div>`,
            iconSize: [22, 30], iconAnchor: [11, 30], className: '',
          })
          if (mapMarkerRef.current) {
            mapMarkerRef.current.setLatLng([parseFloat(lat), parseFloat(lng)])
          } else {
            mapMarkerRef.current = L.marker([parseFloat(lat), parseFloat(lng)], { icon: geoIcon }).addTo(leafletMapRef.current)
          }
        }
        setGeoLoading(false)
      },
      () => { setGeoLoading(false); alert('No se pudo obtener la ubicación. Verifica los permisos del navegador.') },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  useEffect(() => {
    if (!show) {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
        mapMarkerRef.current = null
      }
      return
    }

    const TILE_CFGS = {
      street:    { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',    attribution: '© OpenStreetMap contributors', subdomains: 'abc',  maxNativeZoom: 19, maxZoom: 21 },
      satellite: { url: 'https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', attribution: '© Google',                     subdomains: '0123', maxNativeZoom: 20, maxZoom: 21 },
      terrain:   { url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',      attribution: '© OpenTopoMap contributors',   subdomains: 'abc',  maxNativeZoom: 17, maxZoom: 21 },
    }

    const mkIcon = () => L.divIcon({
      html: `<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 3px 6px rgba(0,0,0,.35))">
        <div style="width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,#16a34a,#22c55e);border:3px solid #fff"></div>
        <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:8px solid #16a34a;margin-top:-2px"></div>
      </div>`,
      iconSize: [22, 30], iconAnchor: [11, 30], className: '',
    })

    const parts = plotGps ? plotGps.split(',').map(s => parseFloat(s.trim())) : []
    const hasExisting = parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])

    const timer = setTimeout(() => {
      if (!mapContainerRef.current || leafletMapRef.current) return

      const initLat  = hasExisting ? parts[0] : -2.0
      const initLng  = hasExisting ? parts[1] : -79.0
      const initZoom = hasExisting ? 15 : 7

      const map = L.map(mapContainerRef.current, { center: [initLat, initLng], zoom: initZoom, zoomControl: true, maxZoom: 21 })
      map.getContainer().style.background = '#e8f4ea'

      const tileLayers = {}
      Object.entries(TILE_CFGS).forEach(([key, cfg]) => {
        tileLayers[key] = L.tileLayer(cfg.url, {
          attribution: cfg.attribution,
          subdomains:  cfg.subdomains,
          maxNativeZoom: cfg.maxNativeZoom,
          maxZoom:       cfg.maxZoom,
        })
      })
      tileLayers.street.addTo(map)

      const LayerSwitcher = L.Control.extend({
        onAdd() {
          const wrap = L.DomUtil.create('div', '')
          wrap.style.cssText = 'display:flex;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.1);'
          L.DomEvent.disableClickPropagation(wrap)
          L.DomEvent.disableScrollPropagation(wrap)
          const items = [['street', 'Mapa'], ['satellite', 'Satélite'], ['terrain', 'Terreno']]
          const btns = {}
          const activate = (activeKey) => {
            items.forEach(([k]) => {
              if (!btns[k]) return
              btns[k].style.background = k === activeKey ? '#16a34a' : '#fff'
              btns[k].style.color      = k === activeKey ? '#fff'    : '#64748b'
            })
          }
          items.forEach(([key, label], idx) => {
            const btn = L.DomUtil.create('button', '', wrap)
            btn.textContent = label
            btn.style.cssText = `padding:0.3rem 0.75rem;font-size:0.68rem;font-weight:600;border:none;cursor:pointer;font-family:Inter,sans-serif;transition:all .15s;${idx < items.length - 1 ? 'border-right:1px solid #e2e8f0;' : ''}`
            btns[key] = btn
            L.DomEvent.on(btn, 'click', () => {
              Object.values(tileLayers).forEach(l => { if (map.hasLayer(l)) map.removeLayer(l) })
              tileLayers[key].addTo(map)
              activate(key)
            })
          })
          activate('street')
          return wrap
        },
        onRemove() {},
      })
      new LayerSwitcher({ position: 'topleft' }).addTo(map)

      L.control.scale({ metric: true, imperial: false, position: 'bottomleft' }).addTo(map)

      if (hasExisting) {
        mapMarkerRef.current = L.marker([initLat, initLng], { icon: mkIcon() }).addTo(map)
      }

      map.on('click', e => {
        const clat = e.latlng.lat.toFixed(6)
        const clng = e.latlng.lng.toFixed(6)
        setPlotGps(`${clat}, ${clng}`)
        setPlotGpsCoords({ lat: clat, lng: clng })
        if (mapMarkerRef.current) {
          mapMarkerRef.current.setLatLng([parseFloat(clat), parseFloat(clng)])
        } else {
          mapMarkerRef.current = L.marker([parseFloat(clat), parseFloat(clng)], { icon: mkIcon() }).addTo(map)
        }
      })

      leafletMapRef.current = map
      setTimeout(() => map.invalidateSize(), 100)
    }, 200)
    return () => clearTimeout(timer)
  }, [show, plotGps])

  return (
    <div className={`context-overlay ${show ? 'open' : ''}`} style={{ zIndex: 310 }} onClick={() => animateClose(modalRef, () => setShowAddPlotModal(false))}>
      <div className="context-modal" ref={modalRef} style={{ maxWidth: '960px' }} onClick={e => e.stopPropagation()}>
        <div className="drag-handle" />
        <header className="context-modal-header px-5 py-4 sm:px-7 sm:py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ background: 'linear-gradient(135deg,#16a34a 0%,#15803d 100%)' }}>
                <svg className="w-5 h-5" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M12 2a9.5 9.5 0 0 0 0 19c1.6 0 3-.4 4.2-1" /><path d="M12 2c2 4 4 6 4 9a4 4 0 0 1-8 0c0-3 2-5 4-9z" />
                </svg>
              </div>
              <div>
                <span className="context-badge">{editingPlot ? 'Editar parcela' : 'Nueva parcela'}</span>
                <h3 className="font-cormorant text-2xl sm:text-3xl font-semibold text-gray-900 mt-1 leading-tight">
                  {editingPlot ? 'Editar parcela' : 'Registrar parcela'}
                  {selectedFarmForPlot && <span className="font-cormorant text-brand-600"> — {selectedFarmForPlot.name}</span>}
                </h3>
              </div>
            </div>
            <button onClick={() => animateClose(modalRef, () => setShowAddPlotModal(false))} className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 transition flex items-center justify-center text-gray-500 flex-shrink-0" style={{ border: 'none', cursor: 'pointer' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        </header>

        <div className="plot-modal-body">
          <div className="context-section plot-col">
            <p className="context-section-title mb-4">Datos de la parcela</p>
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-2">Nombre <span className="text-red-400">*</span></span>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>
                </span>
                <input type="text" className="context-input ctx-icon-input" placeholder="Ej: Parcela A, Hilera 1-5" value={plotName}
                  onChange={e => { setPlotName(e.target.value); if (plotError) setPlotError('') }} />
              </div>
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-2">Zona</span>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="m12 16 .01 0" /></svg>
                </span>
                <input type="text" className="context-input ctx-icon-input" placeholder="Ej: Zona norte" value={plotZone} onChange={e => setPlotZone(e.target.value)} />
              </div>
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-2">Hileras</span>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
                </span>
                <input type="text" className="context-input ctx-icon-input" placeholder="Ej: 1-10" value={plotRows} onChange={e => setPlotRows(e.target.value)} />
              </div>
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-2">Hectáreas</span>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 3H3" /><path d="M21 21H3" /><path d="M3 3v18" /><path d="M21 3v18" /><path d="m3 12 5-5 4 4 5-6 4 5" /></svg>
                </span>
                <input type="number" className="context-input ctx-icon-input" placeholder="Ej: 2.5" step="0.1" min="0" value={plotHectares} onChange={e => setPlotHectares(e.target.value)} />
              </div>
            </label>
            {plotError && (
              <p className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                {plotError}
              </p>
            )}
            <div className="mt-auto pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                Solo el nombre es obligatorio. Puedes editar los demás datos después.
              </p>
            </div>
          </div>

          <div className="context-section plot-map-col">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <div>
                <p className="context-section-title">Ubicación GPS</p>
                <p className="text-xs text-gray-500 mt-0.5">Toca el mapa o ingresa coordenadas manualmente</p>
              </div>
              <button onClick={handleGetLocation} disabled={geoLoading} className="geo-btn">
                {geoLoading
                  ? <><svg className="w-4 h-4 text-brand-500 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg><span>Obteniendo...</span></>
                  : <><svg className="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><path d="M12 5a7 7 0 1 0 7 7" /></svg><span>Mi ubicación</span></>
                }
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <label className="block">
                <span className="block text-xs font-semibold text-slate-600 mb-1.5">Latitud</span>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10"><svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2v20M5 9l7-7 7 7M5 15l7 7 7-7" /></svg></span>
                  <input type="number" step="any" className="context-input ctx-icon-input text-sm" placeholder="-2.123456"
                    value={plotGpsCoords.lat}
                    onChange={e => {
                      const lat = e.target.value
                      setPlotGpsCoords(p => ({ ...p, lat }))
                      if (lat && plotGpsCoords.lng) {
                        setPlotGps(`${lat}, ${plotGpsCoords.lng}`)
                        if (leafletMapRef.current) {
                          leafletMapRef.current.setView([parseFloat(lat), parseFloat(plotGpsCoords.lng)], 14)
                          const mkIcon = L.divIcon({ html:'<div style="width:20px;height:20px;border-radius:50%;background:#16a34a;border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.45)"></div>', iconSize:[20,20], iconAnchor:[10,10], className:'' })
                          if (mapMarkerRef.current) mapMarkerRef.current.setLatLng([parseFloat(lat), parseFloat(plotGpsCoords.lng)])
                          else mapMarkerRef.current = L.marker([parseFloat(lat), parseFloat(plotGpsCoords.lng)], { icon: mkIcon }).addTo(leafletMapRef.current)
                        }
                      }
                    }}
                  />
                </div>
              </label>
              <label className="block">
                <span className="block text-xs font-semibold text-slate-600 mb-1.5">Longitud</span>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10"><svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M2 12h20M9 5l-7 7 7 7M15 5l7 7-7 7" /></svg></span>
                  <input type="number" step="any" className="context-input ctx-icon-input text-sm" placeholder="-79.123456"
                    value={plotGpsCoords.lng}
                    onChange={e => {
                      const lng = e.target.value
                      setPlotGpsCoords(p => ({ ...p, lng }))
                      if (plotGpsCoords.lat && lng) {
                        setPlotGps(`${plotGpsCoords.lat}, ${lng}`)
                        if (leafletMapRef.current) {
                          leafletMapRef.current.setView([parseFloat(plotGpsCoords.lat), parseFloat(lng)], 14)
                          const mkIcon = L.divIcon({ html:'<div style="width:20px;height:20px;border-radius:50%;background:#16a34a;border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.45)"></div>', iconSize:[20,20], iconAnchor:[10,10], className:'' })
                          if (mapMarkerRef.current) mapMarkerRef.current.setLatLng([parseFloat(plotGpsCoords.lat), parseFloat(lng)])
                          else mapMarkerRef.current = L.marker([parseFloat(plotGpsCoords.lat), parseFloat(lng)], { icon: mkIcon }).addTo(leafletMapRef.current)
                        }
                      }
                    }}
                  />
                </div>
              </label>
            </div>

            {plotGps
              ? <div className="gps-badge mb-3">
                  <svg className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" /><circle cx="12" cy="10" r="3" /></svg>
                  <span className="truncate text-xs"><strong>{plotGps}</strong></span>
                  <button onClick={() => { setPlotGps(''); setPlotGpsCoords({ lat:'', lng:'' }); if (mapMarkerRef.current && leafletMapRef.current) { mapMarkerRef.current.remove(); mapMarkerRef.current = null } }} className="ml-auto flex-shrink-0 text-slate-400 hover:text-red-400 transition" style={{ background:'none', border:'none', cursor:'pointer' }}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>
              : <div className="mb-3 text-xs text-gray-400 flex items-center gap-1.5" style={{ height: '2rem' }}>
                  <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" /></svg>
                  Haz clic en el mapa para fijar la ubicación exacta
                </div>
            }

            <div className="plot-map-fill">
              <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }}></div>
            </div>
          </div>
        </div>

        <div className="px-5 sm:px-7 py-4 border-t border-gray-100 modal-footer-btns">
          <button onClick={() => animateClose(modalRef, () => setShowAddPlotModal(false))} className="context-secondary-btn">Cancelar</button>
          <button onClick={handleCreatePlot} className="context-save-btn flex items-center justify-center gap-2">
            {editingPlot ? 'Guardar cambios' : 'Guardar parcela'}
          </button>
        </div>
      </div>
    </div>
  )
}
