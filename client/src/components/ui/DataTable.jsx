import React from 'react';
import LoadingSpinner from './LoadingSpinner';

const DataTable = ({ columns, data, loading = false, emptyMessage = 'No data available', onRowClick }) => {
  if (loading) {
    return <div className="py-10 flex justify-center"><LoadingSpinner /></div>;
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-10 bg-gray-50 rounded-lg border border-gray-200 border-dashed">
        <p className="text-sm text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className={col.className || ''}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => (
            <tr 
              key={row.id || rowIdx} 
              onClick={() => onRowClick && onRowClick(row)}
              className={onRowClick ? 'cursor-pointer' : ''}
            >
              {columns.map((col, colIdx) => (
                <td key={colIdx} className={col.className || ''}>
                  {typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
