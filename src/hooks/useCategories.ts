import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Category } from '../types';
import { useAuth } from './useAuth';

export const useCategories = () => {
  const { currentUser } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setCategories([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'categories'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Category[];
        setCategories(data);
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
  }, [currentUser]);

  return { categories, loading, error };
};