export default function DataTable({ rows, columns, idKey, actions, empty = 'No records yet. Add your first one using the form.' }) {
  if (!rows.length) return <div className="empty-state"><span>✧</span><p>{empty}</p></div>;
  return <div className="table-scroll"><table><thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}{actions && <th className="actions-heading">Actions</th>}</tr></thead><tbody>{rows.map((row) => <tr key={row[idKey]}>{columns.map((column) => <td key={column.key}>{column.render ? column.render(row[column.key], row) : (row[column.key] ?? '—')}</td>)}{actions && <td><div className="row-actions">{actions(row)}</div></td>}</tr>)}</tbody></table></div>;
}
