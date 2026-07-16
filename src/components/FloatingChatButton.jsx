import { useNavigate } from 'react-router-dom'

export default function FloatingChatButton() {
  const navigate = useNavigate()

  return (
    <button onClick={() => navigate('/chatbot')}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl text-sm font-bold text-white shadow-lg shadow-green-600/30 hover:shadow-xl hover:shadow-green-600/40 active:scale-95 transition-all duration-200"
      style={{
        background: 'linear-gradient(135deg, #16a34a, #22c55e)',
        border: 'none',
        cursor: 'pointer',
      }}>
      <i className="fas fa-comments text-sm"></i>
      <span>Ir al chat</span>
    </button>
  )
}
