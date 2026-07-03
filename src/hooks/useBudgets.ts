import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Budget } from '../types';
import { useAuth } from './useAuth';

export const useBudgets = (month?: number, year?: number, refreshKey = 0) => {
  const { currentUser } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setBudgets([]);
      setLoading(false);
      return;
    }

    let conditions: any[] = [where('userId', '==', currentUser.uid)];
    if (month !== undefined && year !== undefined) {
      conditions.push(where('month', '==', month));
      conditions.push(where('year', '==', year));
    }

    const q = query(collection(db, 'budgets'), ...conditions);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => {
          const docData = doc.data();
          return {
            id: doc.id,
            ...docData,
            allocations: docData.allocations || [],
          };
        }) as Budget[];
        setBudgets(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching budgets:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser, month, year, refreshKey]);

  return { budgets, loading, error };
};