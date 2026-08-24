import React from 'react';

const KPICard = ({ title, value, icon: Icon, color = 'primary', change, changeType }) => {
  
  const colorMap = {
    blue: 'bg-blue-500 text-blue-100',
    purple: 'bg-purple-500 text-purple-100',
    orange: 'bg-orange-500 text-orange-100',
    green: 'bg-green-500 text-green-100',
    teal: 'bg-teal-500 text-teal-100',
    indigo: 'bg-indigo-500 text-indigo-100',
    primary: 'bg-primary-500 text-primary-100',
  };

  const bgClass = colorMap[color] || colorMap.primary;

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`rounded-md p-3 ${bgClass}`}>
              <Icon className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd>
                <div className="text-2xl font-semibold text-gray-900">{value}</div>
              </dd>
            </dl>
          </div>
        </div>
      </div>
      {change && (
        <div className="bg-gray-50 px-5 py-3 border-t border-gray-100">
          <div className="text-sm">
            <span className={`font-medium ${changeType === 'increase' ? 'text-success-600' : 'text-danger-600'}`}>
              {changeType === 'increase' ? '↑ ' : '↓ '}
              {change}
            </span>
            <span className="text-gray-500 ml-2">from last month</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default KPICard;
