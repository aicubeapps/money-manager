import { useCallback, useEffect, useState } from 'react';
import { getActiveRecurringRules } from '../services/firestore/recurringRules';
import { isDue } from '../utils/recurringDates';
import type { RecurringRule } from '../types';
import { useAuth } from './useAuth';

export const useRecurringReminders = () => {
  const { currentUser } = useAuth();
  const [dueRules, setDueRules] = useState<RecurringRule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDueRules = useCallback(async () => {
    if (!currentUser) {
      setDueRules([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const rules = await getActiveRecurringRules(currentUser.uid);
      setDueRules(rules.filter(isDue));
    } catch (err) {
      console.error('Error fetching recurring reminders:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchDueRules();
  }, [fetchDueRules]);

  return { dueRules, loading, refetch: fetchDueRules };
};
