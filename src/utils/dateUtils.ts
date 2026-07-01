import { 
  startOfDay, endOfDay, 
  startOfWeek, endOfWeek, 
  startOfMonth, endOfMonth, 
  startOfQuarter, endOfQuarter, 
  startOfYear, endOfYear, 
  subDays, subWeeks, subMonths, subQuarters, subYears,
} from 'date-fns';

export type TimeView = 'today' | 'week' | 'month' | 'quarter' | 'year';

export const getDateRange = (view: TimeView, referenceDate: Date = new Date()) => {
  let start: Date;
  let end: Date;

  switch (view) {
    case 'today':
      start = startOfDay(referenceDate);
      end = endOfDay(referenceDate);
      break;
    case 'week':
      start = startOfWeek(referenceDate, { weekStartsOn: 1 });
      end = endOfWeek(referenceDate, { weekStartsOn: 1 });
      break;
    case 'month':
      start = startOfMonth(referenceDate);
      end = endOfMonth(referenceDate);
      break;
    case 'quarter':
      start = startOfQuarter(referenceDate);
      end = endOfQuarter(referenceDate);
      break;
    case 'year':
      start = startOfYear(referenceDate);
      end = endOfYear(referenceDate);
      break;
    default:
      start = startOfDay(referenceDate);
      end = endOfDay(referenceDate);
  }

  return { start, end };
};

export const getPreviousPeriod = (view: TimeView, referenceDate: Date = new Date()) => {
  switch (view) {
    case 'today':
      return { start: startOfDay(subDays(referenceDate, 1)), end: endOfDay(subDays(referenceDate, 1)) };
    case 'week':
      return { start: startOfWeek(subWeeks(referenceDate, 1), { weekStartsOn: 1 }), end: endOfWeek(subWeeks(referenceDate, 1), { weekStartsOn: 1 }) };
    case 'month':
      return { start: startOfMonth(subMonths(referenceDate, 1)), end: endOfMonth(subMonths(referenceDate, 1)) };
    case 'quarter':
      return { start: startOfQuarter(subQuarters(referenceDate, 1)), end: endOfQuarter(subQuarters(referenceDate, 1)) };
    case 'year':
      return { start: startOfYear(subYears(referenceDate, 1)), end: endOfYear(subYears(referenceDate, 1)) };
    default:
      return getDateRange(view, referenceDate);
  }
};

export const formatDateRange = (start: Date, end: Date) => {
  return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
};