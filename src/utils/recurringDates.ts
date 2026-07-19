import { addDays, addMonths, addYears, lastDayOfMonth, setDate, startOfMonth, format, parseISO, nextDay } from 'date-fns';
import type { Day } from 'date-fns';
import type { RecurringFrequency, RecurringRule, MonthlyWeekPosition } from '../types';

const ISO_DATE_FORMAT = 'yyyy-MM-dd';

// Advances to the target month/year first, then re-applies the rule's configured
// dayOfMonth and clamps it to that month's actual last day. Re-applying dayOfMonth
// (rather than just carrying forward the previous due date's day) matters: without
// it, a rule anchored on the 31st would get stuck at the 28th/30th forever after
// its first short month, instead of returning to the 31st once the month allows it.
const clampToMonthEnd = (date: Date, dayOfMonth: number): Date => {
  const lastDay = lastDayOfMonth(date).getDate();
  return setDate(date, Math.min(dayOfMonth, lastDay));
};

export const calculateNextDueDate = (
  currentDueDate: string,
  frequency: RecurringFrequency,
  dayOfMonth?: number,
  // 0-6, Sunday-Saturday — matches date-fns/native Date.getDay(). Dual-use:
  // for 'weekly' = recur on this weekday; for 'monthly' + weekOfMonth = Nth
  // occurrence of this weekday in the month.
  dayOfWeek?: number,
  weekOfMonth?: MonthlyWeekPosition
): string => {
  const current = parseISO(currentDueDate);
  let next: Date;

  switch (frequency) {
    case 'daily':
      next = addDays(current, 1);
      break;
    case 'weekly':
      // Older rules created before dayOfWeek existed have it undefined —
      // fall back to the original blind +7-days behavior so they keep
      // recurring on whatever weekday they already landed on, unchanged.
      next = typeof dayOfWeek === 'number' ? nextDay(current, dayOfWeek as Day) : addDays(current, 7);
      break;
    case 'monthly':
      if (weekOfMonth !== undefined && typeof dayOfWeek === 'number') {
        // "Nth weekday of next month" sub-mode (e.g. third Wednesday, last Friday).
        const nextMonthDate = addMonths(current, 1);
        const som = startOfMonth(nextMonthDate);
        // Distance from the 1st to the first occurrence of the target weekday.
        const diff = (dayOfWeek - som.getDay() + 7) % 7;
        const firstOccurrence = addDays(som, diff);

        if (weekOfMonth === 'last') {
          // Walk backwards from end of month to the target weekday.
          const eom = lastDayOfMonth(nextMonthDate);
          const backDiff = (eom.getDay() - dayOfWeek + 7) % 7;
          next = addDays(eom, -backDiff);
        } else {
          const weekOffset = { first: 0, second: 1, third: 2, fourth: 3 }[weekOfMonth];
          next = addDays(firstOccurrence, weekOffset * 7);
        }
      } else if (dayOfMonth) {
        next = clampToMonthEnd(addMonths(current, 1), dayOfMonth);
      } else {
        next = addMonths(current, 1);
      }
      break;
    case 'yearly':
      // Same month-end clamping applies here, e.g. a Feb 29 rule on a non-leap year.
      next = dayOfMonth
        ? clampToMonthEnd(addYears(current, 1), dayOfMonth)
        : addYears(current, 1);
      break;
  }

  return format(next, ISO_DATE_FORMAT);
};

export const isDue = (rule: RecurringRule): boolean => {
  const today = format(new Date(), ISO_DATE_FORMAT);
  return rule.nextDueDate <= today;
};
