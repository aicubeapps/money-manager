import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Account, AccountGroup, AccountType } from '../types';

const COLLECTION = 'accounts';

type AccountCreateInput = {
  name: string;
  type: AccountType;
  accountGroup: AccountGroup;
  openingBalance: number;
  openingDate: Date;
  active?: boolean;
  creditLimit?: number;
  statementDate?: number;
  dueDate?: number;
};

type AccountUpdateInput = Partial<AccountCreateInput>;

const getAccountGroupFromType = (type: AccountType): AccountGroup => {
  return type === 'credit' ? 'liability' : 'asset';
};

const sanitizeFirestoreData = (data: Record<string, unknown>) => {
  const cleaned: Record<string, unknown> = {};

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  });

  return cleaned;
};

const normalizeAccountData = (
  data: AccountCreateInput | AccountUpdateInput
): Record<string, unknown> => {
  const normalized: Record<string, unknown> = {
    ...data,
  };

  if (data.type) {
    normalized.accountGroup = getAccountGroupFromType(data.type);
  } else if (data.accountGroup) {
    normalized.accountGroup = data.accountGroup;
  }

  if (data.type === 'credit') {
    if (data.creditLimit !== undefined) normalized.creditLimit = data.creditLimit;
    if (data.statementDate !== undefined) normalized.statementDate = data.statementDate;
    if (data.dueDate !== undefined) normalized.dueDate = data.dueDate;
  } else if (data.type) {
    // When changing from credit -> non-credit, overwrite old credit fields with null
    normalized.creditLimit = null;
    normalized.statementDate = null;
    normalized.dueDate = null;
  }

  return sanitizeFirestoreData(normalized);
};

const normalizeDate = (value: unknown): Date => {
  if (!value) return new Date();

  if (value instanceof Date) return value;

  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }

  const parsed = new Date(value as string | number | Date);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

// Create a new account
export const createAccount = async (
  userId: string,
  data: AccountCreateInput
) => {
  const now = new Date();

  const accountData = sanitizeFirestoreData({
    ...normalizeAccountData(data),
    userId,
    createdAt: now,
    updatedAt: now,
    openingDate: data.openingDate || now,
    active: data.active ?? true,
  });

  const docRef = await addDoc(collection(db, COLLECTION), accountData);

  return {
    id: docRef.id,
    ...accountData,
  } as Account;
};

// Update an existing account
export const updateAccount = async (
  accountId: string,
  data: AccountUpdateInput
) => {
  const docRef = doc(db, COLLECTION, accountId);

  await updateDoc(
    docRef,
    sanitizeFirestoreData({
      ...normalizeAccountData(data),
      updatedAt: new Date(),
    })
  );
};

// Archive (soft delete) – set active = false
export const archiveAccount = async (accountId: string) => {
  const docRef = doc(db, COLLECTION, accountId);

  await updateDoc(docRef, {
    active: false,
    updatedAt: new Date(),
  });
};

// Reactivate an archived account
export const reactivateAccount = async (accountId: string) => {
  const docRef = doc(db, COLLECTION, accountId);

  await updateDoc(docRef, {
    active: true,
    updatedAt: new Date(),
  });
};

// Permanently delete an account (use with caution)
export const deleteAccount = async (accountId: string) => {
  const docRef = doc(db, COLLECTION, accountId);
  await deleteDoc(docRef);
};

// Fetch all accounts for a user
export const fetchAccounts = async (userId: string) => {
  const q = query(
    collection(db, COLLECTION),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();

    const type = (data.type as AccountType) || 'savings';

    return {
      id: docSnap.id,
      ...data,
      type,
      accountGroup: data.accountGroup ?? getAccountGroupFromType(type),
      openingDate: normalizeDate(data.openingDate),
      createdAt: normalizeDate(data.createdAt),
      updatedAt: normalizeDate(data.updatedAt),
      creditLimit:
        typeof data.creditLimit === 'number' ? data.creditLimit : undefined,
      statementDate:
        typeof data.statementDate === 'number' ? data.statementDate : undefined,
      dueDate:
        typeof data.dueDate === 'number' ? data.dueDate : undefined,
    } as Account;
  });
};
