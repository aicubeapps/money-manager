import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { BudgetTemplate } from '../types/budgetTemplate';
import { useAuth } from './useAuth';

export const useBudgetTemplates = () => {
  const { currentUser } = useAuth();
  const [templates, setTemplates] = useState<BudgetTemplate[]>([]);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(collection(db, 'budgetTemplates'), where('userId', '==', currentUser.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as BudgetTemplate[];
        data.sort((a, b) => a.name.localeCompare(b.name));
        setTemplates(data);
      },
      (err) => console.error('Error fetching budget templates:', err)
    );

    return () => unsubscribe();
  }, [currentUser]);

  return { templates };
};
