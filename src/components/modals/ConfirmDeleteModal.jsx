export default function ConfirmDeleteModal({ isOpen, onClose, title, message, onConfirm, confirmLabel = 'Eliminar' }) {
  return (
    <div className={`delete-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <div className="delete-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="px-6 pt-6 pb-4">
          <h3 className="delete-modal-title">{title}</h3>
          <p className="delete-modal-text mt-3">{message}</p>
        </div>
        <div className="px-6 pb-6">
          <div className="delete-modal-actions">
            <button className="delete-btn delete-btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="delete-btn delete-btn-danger" onClick={onConfirm}>{confirmLabel}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
