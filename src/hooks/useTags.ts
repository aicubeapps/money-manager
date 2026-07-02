import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Tag } from '../types';
import { useAuth } from './useAuth';

export const useTags = () => {
  const { currentUser } = useAuth();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setTags([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'tags'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => {
          const docData = doc.data();
          return { id: doc.id, ...docData, excludeFromBudget: docData.excludeFromBudget ?? false };
        }) as Tag[];
        setTags(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching tags:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  return { tags, loading, error };
};
