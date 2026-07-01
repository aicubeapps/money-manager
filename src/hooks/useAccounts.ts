import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Account } from '../types';
import { useAuth } from './useAuth';

export const useAccounts = () => {
  const { currentUser } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setAccounts([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'accounts'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const accountsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Account[];
        setAccounts(accountsData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching accounts:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  return { accounts, loading, error };
};