'use client';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalCount?: number;
  pageSize?: number;
}

export function Pagination({ page, totalPages, onPageChange, totalCount, pageSize }: PaginationProps) {
  if (totalPages <= 1) return null;

  const from = totalCount && pageSize ? (page - 1) * pageSize + 1 : null;
  const to = totalCount && pageSize ? Math.min(page * pageSize, totalCount) : null;

  // Show at most 5 page buttons centred around current page
  const pages: (number | '…')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('…');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('…');
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between px-1 py-3">
      {from && to && totalCount ? (
        <p className="text-xs text-text-soft font-medium">
          {from}–{to} of {totalCount}
        </p>
      ) : (
        <span />
      )}

      <div className="flex items-center gap-1">
        <PageBtn onClick={() => onPageChange(page - 1)} disabled={page === 1} label="Previous">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </PageBtn>

        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="w-8 text-center text-text-soft text-xs">…</span>
          ) : (
            <PageBtn
              key={p}
              onClick={() => onPageChange(p)}
              active={p === page}
              label={`Page ${p}`}
            >
              {p}
            </PageBtn>
          ),
        )}

        <PageBtn onClick={() => onPageChange(page + 1)} disabled={page === totalPages} label="Next">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </PageBtn>
      </div>
    </div>
  );
}

function PageBtn({
  children,
  onClick,
  disabled,
  active,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`w-8 h-8 flex items-center justify-center rounded-lg border text-xs font-semibold transition-colors
        ${active ? 'bg-primary border-primary text-white' : 'bg-white border-border text-text-mid hover:border-primary hover:text-primary'}
        ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
}