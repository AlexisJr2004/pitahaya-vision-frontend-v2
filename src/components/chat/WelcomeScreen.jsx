export default function WelcomeScreen({ displayName, farms, openAddFarmModal, suggest }) {
  return (
    <div id="welcome" className="flex flex-col items-center justify-center min-h-full text-center px-3">
      <svg className="absolute bottom-0 left-0 w-40 sm:w-52 opacity-[0.06] pointer-events-none" viewBox="0 0 220 280"><path d="M40 270 C 40 190, 80 160, 65 70" stroke="#16a34a" strokeWidth="2" fill="none" strokeLinecap="round" /><path d="M65 70 C 65 70, 20 50, 8 15" stroke="#16a34a" strokeWidth="1.2" fill="none" strokeLinecap="round" /><path d="M65 70 C 65 70, 115 45, 130 8" stroke="#16a34a" strokeWidth="1.2" fill="none" strokeLinecap="round" /><path d="M52 155 C 52 155, 8 142, -8 122" stroke="#16a34a" strokeWidth="1" fill="none" strokeLinecap="round" /><path d="M52 155 C 52 155, 96 130, 120 112" stroke="#16a34a" strokeWidth="1" fill="none" strokeLinecap="round" /><ellipse cx="130" cy="8" rx="13" ry="7.5" fill="#16a34a" opacity=".55" transform="rotate(-30 130 8)" /><ellipse cx="-8" cy="122" rx="11" ry="6" fill="#16a34a" opacity=".55" transform="rotate(20 -8 122)" /><ellipse cx="120" cy="112" rx="12" ry="6.5" fill="#16a34a" opacity=".55" transform="rotate(-15 120 112)" /></svg>
      <svg className="absolute bottom-0 right-0 w-40 sm:w-52 opacity-[0.06] pointer-events-none scale-x-[-1]" viewBox="0 0 220 280"><path d="M40 270 C 40 190, 80 160, 65 70" stroke="#16a34a" strokeWidth="2" fill="none" strokeLinecap="round" /><path d="M65 70 C 65 70, 20 50, 8 15" stroke="#16a34a" strokeWidth="1.2" fill="none" strokeLinecap="round" /><path d="M65 70 C 65 70, 115 45, 130 8" stroke="#16a34a" strokeWidth="1.2" fill="none" strokeLinecap="round" /><path d="M52 155 C 52 155, 8 142, -8 122" stroke="#16a34a" strokeWidth="1" fill="none" strokeLinecap="round" /><path d="M52 155 C 52 155, 96 130, 120 112" stroke="#16a34a" strokeWidth="1" fill="none" strokeLinecap="round" /><ellipse cx="130" cy="8" rx="13" ry="7.5" fill="#16a34a" opacity=".55" transform="rotate(-30 130 8)" /><ellipse cx="-8" cy="122" rx="11" ry="6" fill="#16a34a" opacity=".55" transform="rotate(20 -8 122)" /><ellipse cx="120" cy="112" rx="12" ry="6.5" fill="#16a34a" opacity=".55" transform="rotate(-15 120 112)" /></svg>

      {farms.length === 0 ? (
        <div className="w-full max-w-sm animate-fade-up">
          <div className="brand-avatar w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shadow-green-600/20 mb-4 mx-auto">
            <svg className="w-7 h-7 fill-white" viewBox="0 0 24 24"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-8 2 4-4 8.5-4 8.5-4-8 3.5-9 6-9 6A8 8 0 0 1 17 8z" /></svg>
          </div>
          <p className="text-[0.65rem] font-bold uppercase tracking-widest text-brand-600 mb-2">Bienvenido al sistema</p>
          <h2 className="font-cormorant text-3xl font-medium text-gray-900 mb-2 leading-tight">¡Hola, {displayName.split(' ')[0]}!<br /><em className="text-brand-600">Comencemos</em></h2>
          <p className="text-gray-400 text-sm mb-7 font-light leading-relaxed">Para analizar tu cultivo primero necesitas<br />registrar tu corporación agrícola y una parcela.</p>
          <div className="space-y-2.5 mb-7 text-left">
            <div className="onboard-step active">
              <div className="onboard-num active">1</div>
              <div><p className="text-sm font-semibold text-gray-800 leading-tight">Registra tu corporación agrícola</p><p className="text-xs text-gray-500 mt-0.5">Nombre y ubicación de tu propiedad</p></div>
            </div>
            <div className="onboard-step inactive">
              <div className="onboard-num inactive">2</div>
              <div><p className="text-sm font-semibold text-gray-700 leading-tight">Agrega una parcela</p><p className="text-xs text-gray-400 mt-0.5">Zona, hileras y coordenadas GPS</p></div>
            </div>
            <div className="onboard-step inactive">
              <div className="onboard-num inactive">3</div>
              <div><p className="text-sm font-semibold text-gray-700 leading-tight">Sube una foto y analiza</p><p className="text-xs text-gray-400 mt-0.5">Diagnóstico inteligente en segundos</p></div>
            </div>
          </div>
          <button onClick={() => openAddFarmModal()} className="context-save-btn w-full">
            Registrar mi primera corporación agrícola
          </button>
        </div>
      ) : (
        <>
          <div className="brand-avatar w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-lg shadow-green-600/20 mb-4">
            <svg className="w-7 h-7 sm:w-8 sm:h-8 fill-white" viewBox="0 0 24 24"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-8 2 4-4 8.5-4 8.5-4-8 3.5-9 6-9 6A8 8 0 0 1 17 8z" /></svg>
          </div>
          <p className="text-[0.65rem] font-bold uppercase tracking-widest text-brand-600 mb-2">Sistema de diagnostico inteligente</p>
          <h2 className="font-cormorant text-3xl sm:text-4xl font-medium leading-tight text-gray-900 mb-1">Hola, ¿como puedo<br /><em className="italic text-brand-600">ayudarte hoy?</em></h2>
          <p className="text-gray-400 text-sm mt-2 mb-6 font-light">Escribe, habla o envia una imagen de tu cultivo.</p>
          <div className="chips-grid w-full max-w-md">
            <button onClick={() => suggest('¿Cuales son las enfermedades mas comunes de la pitahaya?')} className="chip text-left px-3 sm:px-4 py-3 rounded-2xl border border-gray-200 bg-white transition-all text-sm hover:shadow-sm active:scale-[.97]">
              <div className="text-lg sm:text-xl mb-1">🌵</div><div className="font-medium text-gray-800 text-xs">Enfermedades comunes</div><div className="text-gray-400 text-xs mt-0.5">Diagnostico de cultivos</div>
            </button>
            <button onClick={() => suggest('¿Como puedo mejorar el rendimiento de mi cultivo de pitahaya?')} className="chip text-left px-3 sm:px-4 py-3 rounded-2xl border border-gray-200 bg-white transition-all text-sm hover:shadow-sm active:scale-[.97]">
              <div className="text-lg sm:text-xl mb-1">📈</div><div className="font-medium text-gray-800 text-xs">Mejorar rendimiento</div><div className="text-gray-400 text-xs mt-0.5">Optimizacion agricola</div>
            </button>
            <button onClick={() => suggest('¿Que plagas afectan a la pitahaya y como controlarlas?')} className="chip text-left px-3 sm:px-4 py-3 rounded-2xl border border-gray-200 bg-white transition-all text-sm hover:shadow-sm active:scale-[.97]">
              <div className="text-lg sm:text-xl mb-1">🐛</div><div className="font-medium text-gray-800 text-xs">Control de plagas</div><div className="text-gray-400 text-xs mt-0.5">Proteccion del cultivo</div>
            </button>
            <button onClick={() => suggest('¿Cual es el mejor sistema de riego para pitahaya?')} className="chip text-left px-3 sm:px-4 py-3 rounded-2xl border border-gray-200 bg-white transition-all text-sm hover:shadow-sm active:scale-[.97]">
              <div className="text-lg sm:text-xl mb-1">💧</div><div className="font-medium text-gray-800 text-xs">Sistema de riego</div><div className="text-gray-400 text-xs mt-0.5">Gestion del agua</div>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
