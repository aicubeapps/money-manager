import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Report, Transaction, Category } from '../types';

const COLLECTION = 'reports';

// Generate a report from transactions
export const generateReport = (
  transactions: Transaction[],
  categories: Category[],
  period: 'weekly' | 'monthly' | 'quarterly' | 'yearly',
  startDate: Date,
  endDate: Date
) => {
  // Filter transactions within date range
  const periodTransactions = transactions.filter((t) => {
    const txDate = new Date(t.date);
    return txDate >= startDate && txDate <= endDate;
  });

  // Calculate totals
  let income = 0;
  let expenses = 0;
  const categoryMap = new Map<string, number>();

  periodTransactions.forEach((t) => {
    if (t.type === 'income') {
      income += t.amount;
    } else if (t.type === 'expense') {
      expenses += t.amount;
      if (t.categoryId) {
        categoryMap.set(t.categoryId, (categoryMap.get(t.categoryId) || 0) + t.amount);
      }
    }
  });

  const savings = income - expenses;

  // Category breakdown
  const categoryBreakdown: Record<string, number> = {};
  const categoryNames: Record<string, string> = {};
  categories.forEach((c) => {
    categoryNames[c.id] = c.name;
  });

  categoryMap.forEach((amount, catId) => {
    const name = categoryNames[catId] || 'Unknown';
    categoryBreakdown[name] = amount;
  });

  // Top spending categories (sorted by amount)
  const topCategories = Array.from(categoryMap.entries())
    .map(([catId, amount]) => ({
      category: categoryNames[catId] || 'Unknown',
      amount,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return {
    period,
    startDate,
    endDate,
    data: {
      income,
      expenses,
      savings,
      categoryBreakdown,
      topCategories,
    },
  };
};

// Save report to Firestore
export const saveReport = async (
  userId: string,
  reportData: Omit<Report, 'id' | 'userId' | 'generatedAt'>
) => {
  const now = new Date();
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...reportData,
    userId,
    generatedAt: now,
  });
  return { id: docRef.id, ...reportData, userId, generatedAt: now } as Report;
};

// Get saved reports
export const getSavedReports = async (userId: string) => {
  const q = query(
    collection(db, COLLECTION),
    where('userId', '==', userId),
    orderBy('generatedAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      startDate: data.startDate.toDate ? data.startDate.toDate() : new Date(data.startDate),
      endDate: data.endDate.toDate ? data.endDate.toDate() : new Date(data.endDate),
      generatedAt: data.generatedAt.toDate ? data.generatedAt.toDate() : new Date(data.generatedAt),
    } as Report;
  });
};

// Delete a saved report
export const deleteSavedReport = async (reportId: string) => {
  const docRef = doc(db, COLLECTION, reportId);
  await deleteDoc(docRef);
};