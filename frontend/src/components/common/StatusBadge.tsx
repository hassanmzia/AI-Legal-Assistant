import React from 'react';
import clsx from 'clsx';

interface StatusBadgeProps {
  status: string;
  variant?: 'status' | 'priority';
  className?: string;
}

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  under_review: 'bg-purple-100 text-purple-800',
  closed: 'bg-gray-100 text-gray-800',
  archived: 'bg-gray-100 text-gray-500',
  online: 'bg-green-100 text-green-800',
  offline: 'bg-gray-100 text-gray-500',
  busy: 'bg-yellow-100 text-yellow-800',
};

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, variant = 'status', className }) => {
  const colors = variant === 'priority' ? priorityColors : statusColors;
  const colorClass = colors[status] || 'bg-gray-100 text-gray-700';
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        colorClass,
        className
      )}
    >
      {label}
    </span>
  );
};

export default StatusBadge;
