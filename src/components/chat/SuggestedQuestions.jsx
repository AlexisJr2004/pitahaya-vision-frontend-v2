export default function SuggestedQuestions({ questions, onSelect }) {
  if (!questions?.length) return null
  return (
    <div className="flex gap-2 sm:gap-3 items-start animate-fade-up mt-1">
      <div className="brand-avatar w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white" viewBox="0 0 24 24"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-8 2 4-4 8.5-4 8.5-4-8 3.5-9 6-9 6A8 8 0 0 1 17 8z" /></svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="suggested-label" style={{ fontSize: '0.72rem', marginBottom: '6px', fontStyle: 'italic' }}>Preguntas sugeridas:</p>
        <div className="flex flex-col gap-1.5">
          {questions.map((q, qi) => (
            <button key={qi} onClick={() => onSelect(q)} className="suggested-q">{q}</button>
          ))}
        </div>
      </div>
    </div>
  )
}
