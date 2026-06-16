export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;

  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function getTimeUntilOverdue(createdAt: string): {
  isOverdue: boolean;
  remainingHours: number;
  remainingText: string;
} {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  const diffMs = now - created;
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

  if (diffMs >= TWENTY_FOUR_HOURS) {
    const overdueHours = Math.floor((diffMs - TWENTY_FOUR_HOURS) / 3600000);
    return {
      isOverdue: true,
      remainingHours: -overdueHours,
      remainingText: `已超时 ${overdueHours} 小时`,
    };
  }

  const remainingMs = TWENTY_FOUR_HOURS - diffMs;
  const remainingHours = Math.floor(remainingMs / 3600000);
  const remainingMins = Math.floor((remainingMs % 3600000) / 60000);

  if (remainingHours > 0) {
    return {
      isOverdue: false,
      remainingHours,
      remainingText: `剩余 ${remainingHours}小时${remainingMins}分钟`,
    };
  }

  return {
    isOverdue: false,
    remainingHours: 0,
    remainingText: `剩余 ${remainingMins} 分钟`,
  };
}

export function getDurationHours(start: string, end: string): string {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  const diffMs = endMs - startMs;
  const hours = Math.floor(diffMs / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);

  if (hours > 0) {
    return `${hours}小时${mins}分钟`;
  }
  return `${mins}分钟`;
}
