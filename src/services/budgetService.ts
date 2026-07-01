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
  data: Omit<Budget, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'spent'>
) => {
  const now = new Date();
  const budgetData = {
    ...data,
    userId,
    spent: 0,
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
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Budget[];
};

// Calculate spent amount for a category in a given month
export const calculateCategorySpent = async (
  userId: string,
  categoryId: string,
  month: number,
  year: number
) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  const q = query(
    collection(db, 'transactions'),
    where('userId', '==', userId),
    where('categoryId', '==', categoryId),
    where('type', '==', 'expense')
  );
  const snapshot = await getDocs(q);
  let total = 0;
  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    const txDate = data.date.toDate ? data.date.toDate() : new Date(data.date);
    if (txDate >= startDate && txDate <= endDate) {
      total += data.amount;
    }
  });
  return total;
};

export const updateBudgetSpent = async (
  userId: string,
  categoryId: string,
  month: number,
  year: number
) => {
  const spent = await calculateCategorySpent(userId, categoryId, month, year);
  
  const budgetsRef = collection(db, 'budgets');
  const q = query(
    budgetsRef,
    where('userId', '==', userId),
    where('categoryId', '==', categoryId),
    where('month', '==', month),
    where('year', '==', year)
  );
  const snapshot = await getDocs(q);
  const updatePromises = snapshot.docs.map(async (budgetDoc) => {
    const docRef = doc(db, 'budgets', budgetDoc.id);
    await updateDoc(docRef, { spent, updatedAt: new Date() });
  });
  await Promise.all(updatePromises);
};