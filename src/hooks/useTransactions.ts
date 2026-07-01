import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Transaction } from '../types';
import { useAuth } from './useAuth';

export const useTransactions = (filters?: {
  accountId?: string;
  categoryId?: string;
  type?: 'expense' | 'income' | 'transfer';
}) => {
  const { currentUser } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    // Build query
    let conditions: any[] = [where('userId', '==', currentUser.uid)];
    if (filters?.accountId) conditions.push(where('accountId', '==', filters.accountId));
    if (filters?.categoryId) conditions.push(where('categoryId', '==', filters.categoryId));
    if (filters?.type) conditions.push(where('type', '==', filters.type));

    const q = query(
      collection(db, 'transactions'),
      ...conditions,
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => {
          const raw = doc.data();
          // Convert Firestore Timestamps to JavaScript Date
          return {
            id: doc.id,
            ...raw,
            date: raw.date?.toDate ? raw.date.toDate() : new Date(raw.date),
            createdAt: raw.createdAt?.toDate ? raw.createdAt.toDate() : new Date(raw.createdAt),
            updatedAt: raw.updatedAt?.toDate ? raw.updatedAt.toDate() : new Date(raw.updatedAt),
          } as Transaction;
        });
        setTransactions(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching transactions:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser, filters?.accountId, filters?.categoryId, filters?.type]);

  return { transactions, loading, error };
};