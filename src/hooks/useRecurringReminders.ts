import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { RecurringRule } from '../types';
import { isDue } from '../utils/recurringDates';
import { useAuth } from './useAuth';

export const useRecurringReminders = () => {
  const { currentUser } = useAuth();
  const [dueRules, setDueRules] = useState<RecurringRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setDueRules([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'recurringRules'),
      where('userId', '==', currentUser.uid),
      where('isActive', '==', true)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const rules = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as RecurringRule[];
        setDueRules(rules.filter(isDue));
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching recurring reminders:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  return { dueRules, loading, error };
};
