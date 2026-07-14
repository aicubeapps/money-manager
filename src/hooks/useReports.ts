import { useState, useEffect } from 'react';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Report } from '../types';
import { useAuth } from './useAuth';
import { subscribeWithRetry } from '../utils/firestoreRetry';

export const useReports = () => {
  const { currentUser } = useAuth();
  const [savedReports, setSavedReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setSavedReports([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'reports'),
      where('userId', '==', currentUser.uid),
      orderBy('generatedAt', 'desc')
    );

    const unsubscribe = subscribeWithRetry(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => {
          const raw = doc.data();
          return {
            id: doc.id,
            ...raw,
            startDate: raw.startDate?.toDate ? raw.startDate.toDate() : new Date(raw.startDate),
            endDate: raw.endDate?.toDate ? raw.endDate.toDate() : new Date(raw.endDate),
            generatedAt: raw.generatedAt?.toDate ? raw.generatedAt.toDate() : new Date(raw.generatedAt),
          } as Report;
        });
        setSavedReports(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching reports:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  return { savedReports, loading, error };
};