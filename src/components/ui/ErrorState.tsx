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
    <div role="alert" className="flex flex-col items-center justify-center text-center py-14 px-6 bg-danger-bg/40 border border-danger/15 rounded-card">
      <span className="text-danger [&>svg]:w-11 [&>svg]:h-11 mb-3.5">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </span>
      <h3 className="text-sm font-bold text-text-mid mb-1">{title}</h3>
      {message && <p className="text-xs text-text-soft max-w-xs">{message}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-3.5 py-2 text-[12.5px] font-semibold text-danger bg-white border border-danger/30 rounded-lg hover:bg-danger-bg transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}
