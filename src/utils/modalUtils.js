// `animatedRefs` es opcional: si el modal usa setupDragToDismiss() para
// prevenir que la animación de entrada se repita, hay que pasar aquí el
// mismo Set para que también se libere al cerrar por el botón X / overlay.
export function animateClose(modalRef, closeFn, animatedRefs) {
  if (window.innerWidth >= 640 || !modalRef.current) { closeFn(); return }
  const m = modalRef.current
  m.style.transition = 'transform 0.32s cubic-bezier(0.32,0.72,0,1)'
  m.style.transform = 'translateY(110%)'
  setTimeout(() => {
    m.style.transform = ''
    m.style.transition = ''
    animatedRefs?.current?.delete(modalRef)
    closeFn()
  }, 340)
}

export function setupDragToDismiss({ modalRef, isOpen, onClose, handleClass = '.drag-handle', animatedRefs }) {
  if (window.innerWidth >= 640) return () => {}
  if (!isOpen || !modalRef.current) return () => {}
  const modal = modalRef.current
  const handle = modal.querySelector(handleClass)
  if (!handle) return () => {}

  if (!animatedRefs.current.has(modalRef)) {
    animatedRefs.current.add(modalRef)
    modal.style.transition = 'none'
    modal.style.transform = 'translateY(100%)'
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        modal.style.transition = 'transform 0.38s cubic-bezier(0.32,0.72,0,1)'
        modal.style.transform = 'translateY(0)'
      })
    })
  }

  let sy = 0, dy = 0
  const onStart = e => { sy = e.touches[0].clientY; dy = 0; modal.style.transition = 'none' }
  const onMove = e => { dy = Math.max(0, e.touches[0].clientY - sy); modal.style.transform = `translateY(${dy}px)` }
  const onEnd = () => {
    if (dy > 80) {
      modal.style.transition = 'transform 0.32s cubic-bezier(0.32,0.72,0,1)'
      modal.style.transform = 'translateY(110%)'
      setTimeout(() => { modal.style.transform = ''; modal.style.transition = ''; animatedRefs.current.delete(modalRef); onClose() }, 340)
    } else {
      modal.style.transition = 'transform 0.3s cubic-bezier(0.32,0.72,0,1)'
      modal.style.transform = 'translateY(0)'
      setTimeout(() => { modal.style.transition = '' }, 320)
    }
  }
  handle.addEventListener('touchstart', onStart, { passive: true })
  handle.addEventListener('touchmove', onMove, { passive: true })
  handle.addEventListener('touchend', onEnd, { passive: true })
  return () => {
    handle.removeEventListener('touchstart', onStart)
    handle.removeEventListener('touchmove', onMove)
    handle.removeEventListener('touchend', onEnd)
  }
}
