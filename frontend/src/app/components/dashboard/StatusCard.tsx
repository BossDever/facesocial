import React from 'react';

interface StatusCardProps {
  name: string;
  status: 'active' | 'degraded' | 'down';
  details?: string;
  lastChecked?: string;
}

const StatusCard: React.FC<StatusCardProps> = ({
  name,
  status,
  details,
  lastChecked,
}) => {
  const statusColors = {
    active: 'bg-green-100 text-green-800',
    degraded: 'bg-yellow-100 text-yellow-800',
    down: 'bg-red-100 text-red-800',
  };
  
  const statusLabels = {
    active: 'พร้อมใช้งาน',
    degraded: 'ประสิทธิภาพลดลง',
    down: 'หยุดทำงาน',
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
      <div className="flex justify-between items-center">
        <h3 className="font-medium text-gray-800 dark:text-gray-200">{name}</h3>
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[status]}`}>
          {statusLabels[status]}
        </span>
      </div>
      
      {details && (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{details}</p>
      )}
      
      {lastChecked && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          ตรวจสอบล่าสุด: {lastChecked}
        </p>
      )}
    </div>
  );
};

export default StatusCard;