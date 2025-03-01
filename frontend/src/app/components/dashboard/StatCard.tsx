import React from 'react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon?: React.ReactNode;
  change?: number;
  changeLabel?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  change,
  changeLabel = 'จากเดือนที่แล้ว',
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-5">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-sm font-medium text-gray-500">{title}</h3>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
        </div>
        {icon && (
          <div className="p-2 rounded-full bg-gray-100">
            {icon}
          </div>
        )}
      </div>
      
      {change !== undefined && (
        <div className="mt-2">
          <span className={`text-xs font-medium ${
            change >= 0 
              ? 'text-green-600' 
              : 'text-red-600'
          }`}>
            {change >= 0 ? '+' : ''}{change}%
          </span>
          <span className="text-xs text-gray-500"> {changeLabel}</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;