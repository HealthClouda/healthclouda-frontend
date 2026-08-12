'use client';

import type { ReactNode } from 'react';
import { Pagination } from './Pagination';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { ShimmerRows } from './Shimmer';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortable?: boolean;
  /** e.g. width or alignment overrides for both th and td */
  className?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowKey: (row: T) => string | number;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Search/filter row rendered above the table, below the border. */
  toolbar?: ReactNode;
  rowClassName?: (row: T) => string;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  totalCount?: number;
  pageSize?: number;
}

/**
 * Shared table shell (DASH-1) — toolbar + thead/tbody to spec, composing the
 * existing ErrorState/EmptyState/Pagination primitives (UX-ERR-1, PERF-1)
 * rather than reimplementing them per dashboard.
 */
export function DataTable<T>({
  columns, data, getRowKey, loading, error, onRetry,
  emptyTitle = 'Nothing here yet', emptyDescription, toolbar, rowClassName,
  sortKey, sortDirection, onSort,
  page, totalPages, onPageChange, totalCount, pageSize,
}: DataTableProps<T>) {
  return (
    <div className="bg-white rounded-card border border-border shadow-dash-card overflow-hidden">
      {toolbar && (
        <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-border">
          {toolbar}
        </div>
      )}

      {error ? (
        <div className="p-5">
          <ErrorState message={error} onRetry={onRetry} />
        </div>
      ) : loading ? (
        <div className="p-5">
          <ShimmerRows count={5} cols={columns.length} />
        </div>
      ) : data.length === 0 ? (
        <div className="p-5">
          <EmptyState title={emptyTitle} description={emptyDescription} />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-5 py-2.5 text-left bg-page border-b border-border whitespace-nowrap ${col.className ?? ''}`}
                  >
                    {col.sortable ? (
                      <button
                        onClick={() => onSort?.(col.key)}
                        className="flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider text-text-soft hover:text-primary"
                      >
                        {col.header}
                        {sortKey === col.key && (
                          <span className="text-[10px]">{sortDirection === 'desc' ? '↓' : '↑'}</span>
                        )}
                      </button>
                    ) : (
                      <span className="text-[10.5px] font-bold uppercase tracking-wider text-text-soft">
                        {col.header}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={getRowKey(row)} className={rowClassName?.(row)}>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-5 py-[13px] border-b border-row-hairline text-[12.5px] text-text-mid ${col.className ?? ''}`}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!error && !loading && data.length > 0 && page != null && totalPages != null && totalPages > 1 && onPageChange && (
        <div className="px-5 py-[13px] border-t border-border bg-page">
          <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} totalCount={totalCount} pageSize={pageSize} />
        </div>
      )}
    </div>
  );
}
