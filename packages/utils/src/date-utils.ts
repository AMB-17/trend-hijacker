export function daysSince(date: Date): number {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export function hoursSince(date: Date): number {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
  return diffHours;
}

export function minutesSince(date: Date): number {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffMinutes = Math.floor(diffTime / (1000 * 60));
  return diffMinutes;
}

export function formatRelativeTime(date: Date): string {
  const minutes = minutesSince(date);
  const hours = hoursSince(date);
  const days = daysSince(date);

  if (minutes < 60) {
    return `${minutes}m ago`;
  } else if (hours < 24) {
    return `${hours}h ago`;
  } else if (days < 7) {
    return `${days}d ago`;
  } else if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks}w ago`;
  } else if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  } else {
    const years = Math.floor(days / 365);
    return `${years}y ago`;
  }
}

export function isWithinTimeWindow(date: Date, windowHours: number): boolean {
  const hours = hoursSince(date);
  return hours <= windowHours;
}

export function getTimeWindowBounds(windowHours: number): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date(end.getTime() - windowHours * 60 * 60 * 1000);
  return { start, end };
}

export function formatDate(date: Date, format: "short" | "long" = "short"): string {
  if (format === "short") {
    return date.toLocaleDateString();
  }
  return date.toLocaleString();
}
