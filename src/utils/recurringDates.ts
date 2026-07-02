import { addDays, addMonths, addYears, lastDayOfMonth, setDate, format, parseISO } from 'date-fns';
import type { RecurringFrequency, RecurringRule } from '../types';

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
  dayOfMonth?: number
): string => {
  const current = parseISO(currentDueDate);
  let next: Date;

  switch (frequency) {
    case 'daily':
      next = addDays(current, 1);
      break;
    case 'weekly':
      next = addDays(current, 7);
      break;
    case 'monthly':
      next = dayOfMonth
        ? clampToMonthEnd(addMonths(current, 1), dayOfMonth)
        : addMonths(current, 1);
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
