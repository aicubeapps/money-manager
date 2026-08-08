import { useState, useEffect } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Account } from '../types';
import { useAuth } from './useAuth';
import { subscribeWithRetry } from '../utils/firestoreRetry';

export const useAccounts = (refreshKey = 0) => {
  const { currentUser } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  // Tracks whose data `accounts` currently holds, so a stale previous user's
  // rows are never shown for a currentUser they don't belong to (the effect
  // only clears data reactively once the new subscription's first snapshot
  // arrives, not synchronously on user change).
  const [accountsOwnerId, setAccountsOwnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'accounts'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = subscribeWithRetry(
      q,
      (snapshot) => {
        const accountsData = snapshot.docs.map((doc) => {
          const data = doc.data();
          // Convert Firestore Timestamps to JavaScript Date
          return {
            id: doc.id,
            ...data,
            openingDate: data.openingDate?.toDate ? data.openingDate.toDate() : new Date(data.openingDate),
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
          } as Account;
        });
        setAccounts(accountsData);
        setAccountsOwnerId(currentUser.uid);
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
  }, [currentUser, refreshKey]);

  return {
    accounts: currentUser && accountsOwnerId === currentUser.uid ? accounts : [],
    loading: currentUser ? loading : false,
    error: currentUser ? error : null,
  };
};