import type { OrderStatus } from '../../shared/types';
import { STATUS_LABELS } from '../../shared/types';

interface StatusBadgeProps {
  status: OrderStatus;
  isOverdue?: boolean;
}

const statusStyles: Record<OrderStatus, string> = {
  pending: 'bg-orange-100 text-orange-700 border-orange-200',
  assigned: 'bg-blue-100 text-blue-700 border-blue-200',
  repairing: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
};

const overdueStyle = 'bg-red-100 text-red-700 border-red-300 animate-pulse';

export function StatusBadge({ status, isOverdue }: StatusBadgeProps) {
  const showOverdue = isOverdue && status !== 'completed';
  const style = showOverdue ? overdueStyle : statusStyles[status];
  const label = showOverdue ? '已超时' : STATUS_LABELS[status];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${style} transition-all duration-300`}
    >
      {showOverdue && (
        <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1.5 animate-ping" />
      )}
      {label}
    </span>
  );
}
