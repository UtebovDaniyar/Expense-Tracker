// Date formatting and manipulation utilities

export function formatDate(date: Date, format: string): string {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = date.getMinutes();

  const pad = (num: number) => num.toString().padStart(2, '0');

  return format
    .replace('DD', pad(day))
    .replace('MM', pad(month))
    .replace('YYYY', year.toString())
    .replace('HH', pad(hours))
    .replace('mm', pad(minutes));
}

export function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function getEndOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function getDaysRemainingInMonth(date: Date): number {
  const daysInMonth = getDaysInMonth(date);
  const currentDay = date.getDate();
  return daysInMonth - currentDay + 1;
}

export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

export function isYesterday(date: Date): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  );
}

export function getDateRangeLabel(startDate: Date, endDate: Date): string {
  const start = formatDate(startDate, 'DD/MM/YYYY');
  const end = formatDate(endDate, 'DD/MM/YYYY');
  return `${start} - ${end}`;
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
