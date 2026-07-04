interface ErrorStateProps {
  /** Human-readable reason (already formatted by the data layer). */
  message?: string;
  onRetry?: () => void;
  title?: string;
}

/**
 * Distinct failed-fetch state — never reuse EmptyState for errors: an empty
 * queue and a failed fetch must not look the same in a clinic (UX-ERR-1).
 */
export function ErrorState({ message, onRetry, title = "Couldn't load this data" }: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center py-14 px-4 text-center bg-red-50/60 border border-red-100 rounded-xl">
      <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <h3 className="text-sm font-medium text-gray-900 mb-1">{title}</h3>
      {message && <p className="text-sm text-gray-500 max-w-xs">{message}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}
