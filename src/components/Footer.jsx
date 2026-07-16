export default function Footer({ className = '' }) {
  return (
    <footer className={`hidden md:flex flex-shrink-0 items-center justify-center px-6 py-3 border-t border-gray-100 text-sm text-slate-400 ${className}`}>
      Pitahaya Vision © 2026. Todos los derechos reservados.
    </footer>
  )
}
