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

const COLLECTION = 'transactions';

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
};

// Delete a transaction
export const deleteTransaction = async (transactionId: string) => {
  // First, fetch the transaction to know its category and user
  const docRef = doc(db, COLLECTION, transactionId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    await deleteDoc(docRef);
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
