export function DataTable({ columns, rows, getRowClass, emptyText = 'Chưa có dữ liệu.' }) {
  return (
    <section className="table-panel">
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {columns.map((column) => <th key={column.key}>{column.header}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((row) => (
              <tr key={row.id} className={getRowClass?.(row) ?? undefined}>
                {columns.map((column) => (
                  <td key={column.key}>
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
              </tr>
            )) : (
              <tr>
                <td className="empty-cell" colSpan={columns.length}>{emptyText}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
