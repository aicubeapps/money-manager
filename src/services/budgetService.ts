import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Budget } from '../types';

const COLLECTION = 'budgets';

// Create a new budget
export const createBudget = async (
  userId: string,
  data: Omit<Budget, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
) => {
  const now = new Date();
  const budgetData = {
    ...data,
    userId,
    createdAt: now,
    updatedAt: now,
  };
  const docRef = await addDoc(collection(db, COLLECTION), budgetData);
  return { id: docRef.id, ...budgetData } as Budget;
};

// Update a budget
export const updateBudget = async (
  budgetId: string,
  data: Partial<Omit<Budget, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
) => {
  const docRef = doc(db, COLLECTION, budgetId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: new Date(),
  });
};

// Delete a budget
export const deleteBudget = async (budgetId: string) => {
  const docRef = doc(db, COLLECTION, budgetId);
  await deleteDoc(docRef);
};

// Fetch budgets for a user
export const fetchBudgets = async (userId: string, month?: number, year?: number) => {
  let q = query(
    collection(db, COLLECTION),
    where('userId', '==', userId)
  );
  if (month !== undefined && year !== undefined) {
    q = query(q, where('month', '==', month), where('year', '==', year));
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return { id: doc.id, ...data, allocations: data.allocations || [] };
  }) as Budget[];
};
