import { useState, useEffect } from 'react';
import { collection, query, where } from 'firebase/firestore';
import type { QueryConstraint } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Budget } from '../types';
import { useAuth } from './useAuth';
import { subscribeWithRetry } from '../utils/firestoreRetry';

export const useBudgets = (month?: number, year?: number, refreshKey = 0) => {
  const { currentUser } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  // Tracks whose data `budgets` currently holds — see useAccounts.ts for why.
  const [budgetsOwnerId, setBudgetsOwnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    const conditions: QueryConstraint[] = [where('userId', '==', currentUser.uid)];
    if (month !== undefined && year !== undefined) {
      conditions.push(where('month', '==', month));
      conditions.push(where('year', '==', year));
    }

    const q = query(collection(db, 'budgets'), ...conditions);

    const unsubscribe = subscribeWithRetry(
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
        setBudgetsOwnerId(currentUser.uid);
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

  return {
    budgets: currentUser && budgetsOwnerId === currentUser.uid ? budgets : [],
    loading: currentUser ? loading : false,
    error: currentUser ? error : null,
  };
};