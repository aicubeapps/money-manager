import { useState, useEffect } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Category } from '../types';
import { useAuth } from './useAuth';
import { subscribeWithRetry } from '../utils/firestoreRetry';

export const useCategories = (refreshKey = 0) => {
  const { currentUser } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  // Tracks whose data `categories` currently holds — see useAccounts.ts for why.
  const [categoriesOwnerId, setCategoriesOwnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'categories'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = subscribeWithRetry(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Category[];
        setCategories(data);
        setCategoriesOwnerId(currentUser.uid);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching categories:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser, refreshKey]);

  return {
    categories: currentUser && categoriesOwnerId === currentUser.uid ? categories : [],
    loading: currentUser ? loading : false,
    error: currentUser ? error : null,
  };
};