import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DataTable, type DataTableColumn } from './DataTable';

interface Row {
  id: number;
  name: string;
}

const rows: Row[] = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
const columns: DataTableColumn<Row>[] = [
  { key: 'name', header: 'Name', render: (r) => r.name, sortable: true },
];

function renderTable(props: Partial<React.ComponentProps<typeof DataTable<Row>>> = {}) {
  return render(
    <DataTable
      columns={columns}
      data={rows}
      getRowKey={(r) => r.id}
      {...props}
    />,
  );
}

describe('DataTable — branch precedence', () => {
  it('shows the error state when error is set, even if also loading with data present', () => {
    renderTable({ error: 'Could not load', loading: true, data: rows });
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    expect(screen.queryByText('Nothing here yet')).not.toBeInTheDocument();
  });

  it('shows the loading shimmer when loading and no error, even with data present', () => {
    const { container } = renderTable({ loading: true, data: rows });
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
  });

  it('shows the empty state when not loading, no error, and data is empty', () => {
    renderTable({ data: [], emptyTitle: 'No rows' });
    expect(screen.getByText('No rows')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders the table when data is present and there is no error or loading', () => {
    renderTable();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });
});

describe('DataTable — pagination', () => {
  it('does not render pagination controls when totalPages is 1', () => {
    renderTable({ page: 1, totalPages: 1, onPageChange: vi.fn(), totalCount: 2 });
    expect(screen.queryByLabelText('Next')).not.toBeInTheDocument();
  });

  it('renders pagination controls when totalPages is greater than 1', () => {
    renderTable({ page: 1, totalPages: 3, onPageChange: vi.fn(), totalCount: 30 });
    expect(screen.getByLabelText('Next')).toBeInTheDocument();
  });
});

describe('DataTable — sortable headers', () => {
  it('marks a sortable column with scope=col and aria-sort=none when not the active sort', () => {
    renderTable({ onSort: vi.fn() });
    const th = screen.getByRole('columnheader', { name: 'Name' });
    expect(th).toHaveAttribute('scope', 'col');
    expect(th).toHaveAttribute('aria-sort', 'none');
    expect(within(th).getByRole('button')).toBeInTheDocument();
  });

  it('marks the active sort column with aria-sort=ascending/descending', () => {
    const { rerender } = renderTable({ onSort: vi.fn(), sortKey: 'name', sortDirection: 'asc' });
    expect(screen.getByRole('columnheader', { name: /Name/ })).toHaveAttribute('aria-sort', 'ascending');

    rerender(
      <DataTable
        columns={columns}
        data={rows}
        getRowKey={(r) => r.id}
        onSort={vi.fn()}
        sortKey="name"
        sortDirection="desc"
      />,
    );
    expect(screen.getByRole('columnheader', { name: /Name/ })).toHaveAttribute('aria-sort', 'descending');
  });

  it('does not render a sort button when the column is sortable but no onSort is passed', () => {
    renderTable();
    const th = screen.getByRole('columnheader', { name: 'Name' });
    expect(within(th).queryByRole('button')).not.toBeInTheDocument();
    expect(th).not.toHaveAttribute('aria-sort');
  });
});
