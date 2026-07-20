import AppLogo from '../../../components/AppLogo'

export default function SuggestedQuestions({ questions, onSelect }) {
  if (!questions?.length) return null
  return (
    <div className="flex gap-2 sm:gap-3 items-start animate-fade-up mt-1">
      <div className="brand-avatar w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
        <AppLogo className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="suggested-label">Preguntas sugeridas:</p>
        <div className="flex flex-col gap-1.5">
          {questions.map((q, qi) => (
            <button key={qi} onClick={() => onSelect(q)} className="suggested-q">{q}</button>
          ))}
        </div>
      </div>
    </div>
  )
}
