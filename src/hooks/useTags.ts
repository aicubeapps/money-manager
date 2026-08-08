import { useState, useEffect } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Tag } from '../types';
import { useAuth } from './useAuth';
import { subscribeWithRetry } from '../utils/firestoreRetry';

export const useTags = (refreshKey = 0) => {
  const { currentUser } = useAuth();
  const [tags, setTags] = useState<Tag[]>([]);
  // Tracks whose data `tags` currently holds — see useAccounts.ts for why.
  const [tagsOwnerId, setTagsOwnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'tags'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = subscribeWithRetry(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => {
          const docData = doc.data();
          return { id: doc.id, ...docData, excludeFromBudget: docData.excludeFromBudget ?? false };
        }) as Tag[];
        setTags(data);
        setTagsOwnerId(currentUser.uid);
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
  }, [currentUser, refreshKey]);

  return {
    tags: currentUser && tagsOwnerId === currentUser.uid ? tags : [],
    loading: currentUser ? loading : false,
    error: currentUser ? error : null,
  };
};
