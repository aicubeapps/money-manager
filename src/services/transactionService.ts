import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  query,
  where,
  getDocs,
  orderBy,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Transaction, TransactionType } from '../types';
import { updateBudgetSpent } from './budgetService';

const COLLECTION = 'transactions';

// Normalize a value that could be a JS Date, a Firestore Timestamp, or a string into a JS Date
const toJsDate = (date: any): Date => (date?.toDate ? date.toDate() : new Date(date));

// Helper to get month/year from a Date (or Timestamp/string, normalized internally)
const getMonthYear = (date: any) => {
  const jsDate = toJsDate(date);
  return {
    month: jsDate.getMonth() + 1,
    year: jsDate.getFullYear(),
  };
};

// Create a new transaction
export const createTransaction = async (
  userId: string,
  data: Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
) => {
  const now = new Date();
  const transactionData = {
    ...data,
    userId,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(collection(db, COLLECTION), transactionData);

  // If it's an expense with a category, update budget spent
  if (data.type === 'expense' && data.categoryId) {
    const { month, year } = getMonthYear(data.date);
    await updateBudgetSpent(userId, data.categoryId, month, year);
  }

  return { id: docRef.id, ...transactionData } as Transaction;
};

// Create many transactions at once (e.g. CSV import). Uses a batched write for
// larger imports (chunked to Firestore's 500-writes-per-batch limit), and falls
// back to createTransaction in a loop for small imports so normal single-create
// validation/normalization still applies.
export const bulkCreateTransactions = async (
  userId: string,
  transactions: Array<Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
) => {
  const now = new Date();
  const importBatchId = `import-${now.getTime()}`;
  let created: Transaction[] = [];

  if (transactions.length > 10) {
    const BATCH_LIMIT = 500;
    for (let i = 0; i < transactions.length; i += BATCH_LIMIT) {
      const chunk = transactions.slice(i, i + BATCH_LIMIT);
      const batch = writeBatch(db);
      const entries = chunk.map((data) => {
        const ref = doc(collection(db, COLLECTION));
        const transactionData = { ...data, userId, importBatchId, createdAt: now, updatedAt: now };
        batch.set(ref, transactionData);
        return { id: ref.id, ...transactionData } as Transaction;
      });
      await batch.commit();
      created = created.concat(entries);
    }
  } else {
    for (const data of transactions) {
      const tx = await createTransaction(userId, { ...data, importBatchId } as any);
      created.push(tx);
    }
  }

  // Refresh budgets once per affected category/month/year, rather than per row
  const budgetKeys = new Set<string>();
  for (const tx of created) {
    if (tx.type === 'expense' && tx.categoryId) {
      const { month, year } = getMonthYear(tx.date);
      budgetKeys.add(`${tx.categoryId}|${month}|${year}`);
    }
  }
  await Promise.all(
    Array.from(budgetKeys).map((key) => {
      const [categoryId, month, year] = key.split('|');
      return updateBudgetSpent(userId, categoryId, Number(month), Number(year));
    })
  );

  return created;
};

// Update a transaction
export const updateTransaction = async (
  transactionId: string,
  data: Partial<Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
) => {
  const docRef = doc(db, COLLECTION, transactionId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: new Date(),
  });

  // If we updated the transaction, we need to refresh budgets for affected categories
  // We'll do a simplified approach: fetch the updated transaction and trigger budget updates
  const updatedDoc = await getDoc(docRef);
  if (updatedDoc.exists()) {
    const tx = updatedDoc.data() as Transaction;
    tx.date = toJsDate(tx.date);
    if (tx.type === 'expense' && tx.categoryId) {
      const { month, year } = getMonthYear(tx.date);
      await updateBudgetSpent(tx.userId, tx.categoryId, month, year);
    }
    // If the original had a category that changed, we'd also need to update old category
    // This is simplified; for production you'd track previous state
  }
};

// Delete a transaction
export const deleteTransaction = async (transactionId: string) => {
  // First, fetch the transaction to know its category and user
  const docRef = doc(db, COLLECTION, transactionId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const tx = docSnap.data() as Transaction;
    tx.date = toJsDate(tx.date);
    await deleteDoc(docRef);
    // If it was an expense with a category, update budget spent
    if (tx.type === 'expense' && tx.categoryId) {
      const { month, year } = getMonthYear(tx.date);
      await updateBudgetSpent(tx.userId, tx.categoryId, month, year);
    }
  } else {
    throw new Error('Transaction not found');
  }
};

// Fetch transactions with optional filters
export const fetchTransactions = async (
  userId: string,
  _filters?: {
    startDate?: Date;
    endDate?: Date;
    type?: TransactionType;
    accountId?: string;
    categoryId?: string;
  }
) => {
  const q = query(
    collection(db, COLLECTION),
    where('userId', '==', userId),
    orderBy('date', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    // Convert Firestore Timestamp to Date
    return {
      id: doc.id,
      ...data,
      date: data.date.toDate ? data.date.toDate() : new Date(data.date),
      createdAt: data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
      updatedAt: data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
    } as Transaction;
  });
};
