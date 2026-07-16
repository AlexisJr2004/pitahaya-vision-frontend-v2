import { useState, useEffect } from 'react'

const SUGGESTIONS = [
  {
    icon: 'fa-leaf',
    gradient: 'from-emerald-400 to-green-600',
    label: 'Enfermedades',
    desc: 'Diagnóstico de cultivos',
    msg: '¿Cuales son las enfermedades mas comunes de la pitahaya?',
  },
  {
    icon: 'fa-chart-line',
    gradient: 'from-blue-400 to-indigo-600',
    label: 'Rendimiento',
    desc: 'Optimización agrícola',
    msg: '¿Como puedo mejorar el rendimiento de mi cultivo de pitahaya?',
  },
  {
    icon: 'fa-bug',
    gradient: 'from-amber-400 to-orange-600',
    label: 'Control de plagas',
    desc: 'Protección del cultivo',
    msg: '¿Que plagas afectan a la pitahaya y como controlarlas?',
  },
  {
    icon: 'fa-droplet',
    gradient: 'from-sky-400 to-cyan-600',
    label: 'Riego',
    desc: 'Gestión del agua',
    msg: '¿Cual es el mejor sistema de riego para pitahaya?',
  },
]

const WELCOME_VARIANTS = [
  (name) => <>¿En qué puedo <span className="text-brand-600 font-cormorant">ayudarte</span>, {name}?</>,
  (name) => <>¿Qué <span className="text-brand-600 font-cormorant">cultivas</span> hoy, {name}?</>,
  (name) => <>Hola, {name}. ¿Necesitas <span className="text-brand-600 font-cormorant">asistencia</span>?</>,
  (name) => <>¿Listo para <span className="text-brand-600 font-cormorant">analizar</span>, {name}?</>,
  (name) => <>Bienvenido, {name}. ¿<span className="text-brand-600 font-cormorant">Diagnosticamos</span> algo?</>,
  (name) => <>¿Qué tal, {name}? ¿<span className="text-brand-600 font-cormorant">Revisamos</span> tu cultivo?</>,
  (name) => <>Hola de nuevo, {name}. ¿<span className="text-brand-600 font-cormorant">Empezamos</span>?</>,
  (name) => <>Cuéntame, {name}. ¿<span className="text-brand-600 font-cormorant">Cómo</span> va tu cultivo?</>,
]

export default function WelcomeScreen({ displayName, farms, openAddFarmModal, suggest }) {
  const [variant, setVariant] = useState(0)

  useEffect(() => {
    setVariant(Math.floor(Math.random() * WELCOME_VARIANTS.length))
  }, [])

  const first = displayName?.split(' ')[0] || ''

  return (
    <div id="welcome" className="flex flex-col items-center justify-center min-h-full text-center px-3">
      {farms.length === 0 ? (
        <div className="w-full max-w-sm animate-fade-up">
          <div className="brand-avatar w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shadow-green-600/20 mb-4 mx-auto">
            <svg className="w-7 h-7 fill-white" viewBox="0 0 24 24"><path d="M12 21C6 21 3 16.5 3 12S6 3 12 3s9 4.5 9 9-3 9-9 9zM11 3V1h2v2M7 6.5L5 4.5l3.5 2.5M17 6.5l2-2-3.5 2.5M4 11.5l-2-1L4.5 13M20 11.5l2-1-2.5 2.5M7 17.5l-2 2 3.5-2M17 17.5l2 2-3.5-2" /></svg>
          </div>
          <p className="text-[0.65rem] font-bold uppercase tracking-widest text-brand-600 mb-2">Bienvenido al sistema</p>
          <h2 className="font-cormorant text-3xl font-medium text-gray-900 mb-2 leading-tight">¡Hola, {first}!<br /><span className="text-brand-600 cormorant">Comencemos</span></h2>
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
          <div className="brand-avatar w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-lg shadow-green-600/20 mb-5">
            <svg className="w-7 h-7 sm:w-8 sm:h-8 fill-white" viewBox="0 0 24 24"><path d="M12 21C6 21 3 16.5 3 12S6 3 12 3s9 4.5 9 9-3 9-9 9zM11 3V1h2v2M7 6.5L5 4.5l3.5 2.5M17 6.5l2-2-3.5 2.5M4 11.5l-2-1L4.5 13M20 11.5l2-1-2.5 2.5M7 17.5l-2 2 3.5-2M17 17.5l2 2-3.5-2" /></svg>
          </div>
          <h2 className="font-cormorant text-3xl sm:text-4xl font-semibold leading-tight text-gray-900 mb-1">
            {WELCOME_VARIANTS[variant](first)}
          </h2>
          <p className="text-gray-400 text-sm mt-2 mb-7 font-light">Escribe, habla o envía una imagen de tu cultivo.</p>
          <div className="chips-grid w-full max-w-lg">
            {SUGGESTIONS.map((s, i) => (
              <button key={i} onClick={() => suggest(s.msg)} className="chip">
                <div className={`chip-icon bg-gradient-to-br ${s.gradient} text-white`}>
                  <i className={`fas ${s.icon} text-sm`}></i>
                </div>
                <div className="font-semibold text-gray-800 text-[0.75rem] leading-snug">{s.label}</div>
                <div className="text-gray-400 text-[0.6rem] leading-tight">{s.desc}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}