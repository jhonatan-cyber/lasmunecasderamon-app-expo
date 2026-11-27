import type { WeeklyIncomePoint } from '@/types/api';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const WEEK_IN_MS = 7 * DAY_IN_MS;

function parseDay(day: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const date = Number(match[3]);
  const timestamp = Date.UTC(year, month, date);
  const parsed = new Date(timestamp);

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month ||
    parsed.getUTCDate() !== date
  ) {
    return null;
  }

  return timestamp;
}

function mondayOfWeek(timestamp: number): number {
  const day = new Date(timestamp).getUTCDay();
  return timestamp - ((day + 6) % 7) * DAY_IN_MS;
}

export function calculateWeeklyGrowth(
  weeklyIncome: readonly WeeklyIncomePoint[] | null | undefined,
): number | null {
  const entries = (Array.isArray(weeklyIncome) ? weeklyIncome : []).flatMap((point) => {
    if (!point || typeof point.day !== 'string') return [];

    const day = parseDay(point.day);
    const total = Number(point.total);

    return day !== null && Number.isFinite(total) ? [{ day, total }] : [];
  });

  if (entries.length === 0) return null;

  const latestWeekStart = Math.max(...entries.map((entry) => mondayOfWeek(entry.day)));
  const previousWeekStart = latestWeekStart - WEEK_IN_MS;
  const latestDay = Math.max(
    ...entries
      .filter((entry) => mondayOfWeek(entry.day) === latestWeekStart)
      .map((entry) => entry.day),
  );
  const latestDayOffset = Math.floor((latestDay - latestWeekStart) / DAY_IN_MS);

  let currentTotal = 0;
  let previousTotal = 0;
  let hasPreviousWeek = false;

  for (const entry of entries) {
    const weekStart = mondayOfWeek(entry.day);
    const dayOffset = Math.floor((entry.day - weekStart) / DAY_IN_MS);

    if (weekStart === latestWeekStart && entry.day <= latestDay) {
      currentTotal += entry.total;
    } else if (weekStart === previousWeekStart && dayOffset <= latestDayOffset) {
      previousTotal += entry.total;
      hasPreviousWeek = true;
    }
  }

  if (!hasPreviousWeek || previousTotal <= 0) return null;

  return Math.round(((currentTotal - previousTotal) / previousTotal) * 1000) / 10;
}