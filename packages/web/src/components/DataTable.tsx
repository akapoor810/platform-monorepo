import { useState, useMemo } from "react";
import type { ColumnDef, SortingState } from "@tanstack/react-table";

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  pageSize?: number;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({ data, columns, pageSize = 25, onRowClick }: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [page, setPage] = useState(0);

  const paginatedData = useMemo(
    () => data.slice(page * pageSize, (page + 1) * pageSize),
    [data, page, pageSize]
  );

  return (
    <div className="data-table-container">
      <table>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={String(col.id)}>{String(col.header)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginatedData.map((row, i) => (
            <tr key={i} onClick={() => onRowClick?.(row)}>
              {columns.map((col) => (
                <td key={String(col.id)}>—</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="pagination">
        <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
          Previous
        </button>
        <span>
          Page {page + 1} of {Math.ceil(data.length / pageSize)}
        </span>
        <button
          disabled={(page + 1) * pageSize >= data.length}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
