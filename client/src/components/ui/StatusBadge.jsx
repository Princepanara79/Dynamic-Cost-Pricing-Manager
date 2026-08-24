import React from 'react';

const StatusBadge = ({ status, type = 'active' }) => {
  const typeStyles = {
    active: 'bg-green-100 text-green-800',
    archived: 'bg-gray-100 text-gray-800',
    draft: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800'
  };

  const currentStyle = typeStyles[type] || typeStyles.active;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${currentStyle}`}>
      {status}
    </span>
  );
};

export default StatusBadge;
