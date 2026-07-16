import AppLogo from '../../../components/AppLogo'

function esc(text) {
  const div = document.createElement('div')
  div.textContent = text || ''
  return div.innerHTML
}

export function UserBubble({ content, imagePath }) {
  return (
    <div className="flex justify-end animate-fade-up">
      <div className="text-right">
        {imagePath && <img src={imagePath} alt="Preview" className="max-w-[75vw] sm:max-w-xs w-full rounded-2xl mb-2 block ml-auto shadow-sm" style={{ maxHeight: '200px', objectFit: 'cover' }} />}
        {content && <div className="user-bubble text-white text-sm px-4 py-3 rounded-3xl rounded-tr-md leading-relaxed shadow-sm max-w-[80vw] sm:max-w-sm">{esc(content)}</div>}
      </div>
    </div>
  )
}

export function AssistantBubble({ content, msgId, streamDoneIds, copiedIndex, index, onCopy, onFormatBotText }) {
  const isStreaming = String(msgId ?? '').startsWith('stream-')
  const isDone = streamDoneIds?.has(msgId)
  return content ? (
    <div className="flex gap-2 sm:gap-3 items-start animate-fade-up">
      <div className="brand-avatar w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
        <AppLogo className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="bot-text text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: onFormatBotText(content) }}></div>
        {(!isStreaming || isDone) && (
          <div className="flex gap-1 mt-2">
            <button onClick={() => onCopy(content, index)} className="action-btn p-1.5 rounded-lg transition text-gray-400" title="Copiar" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              {copiedIndex === index ? (
                <svg className="w-3.5 h-3.5 text-brand-600" fill="none" stroke="#16a34a" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
              )}
            </button>
            <button className="action-btn p-1.5 rounded-lg transition text-gray-400" title="Util" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3z"/><path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>
            </button>
            <button className="action-btn p-1.5 rounded-lg transition text-gray-400" title="No util" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3z"/><path d="M17 2h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17"/></svg>
            </button>
          </div>
        )}
      </div>
    </div>
  ) : null
}

export function LoadingDots() {
  return (
    <div className="flex gap-2 sm:gap-3 items-start animate-fade-up">
      <div className="brand-avatar w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
        <AppLogo className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white" />
      </div>
      <div className="flex items-center gap-1.5 bg-brand-50 border border-brand-100 px-4 py-3 rounded-3xl rounded-tl-md h-10">
        <div className="w-[7px] h-[7px] rounded-full bg-brand-500 animate-dot"></div>
        <div className="w-[7px] h-[7px] rounded-full bg-brand-500 animate-dot-2"></div>
        <div className="w-[7px] h-[7px] rounded-full bg-brand-500 animate-dot-3"></div>
      </div>
    </div>
  )
}
