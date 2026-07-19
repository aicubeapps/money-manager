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
import { db } from '../../firebase/config';
import type { RecurringRule, RecurringFrequency } from '../../types';

const COLLECTION = 'recurringRules';

type RecurringRuleCreateInput = {
  templateTransaction: RecurringRule['templateTransaction'];
  frequency: RecurringFrequency;
  dayOfMonth?: number;
  dayOfWeek?: number;
  startDate: string;
  nextDueDate: string;
  isActive?: boolean;
};

type RecurringRuleUpdateInput = Partial<
  Omit<RecurringRule, 'id' | 'userId' | 'createdAt'>
>;

const sanitizeFirestoreData = (data: Record<string, unknown>) => {
  const cleaned: Record<string, unknown> = {};

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  });

  return cleaned;
};

// Create a new recurring rule
export const createRecurringRule = async (
  userId: string,
  data: RecurringRuleCreateInput
) => {
  const ruleData = sanitizeFirestoreData({
    ...data,
    userId,
    isActive: data.isActive ?? true,
    createdAt: new Date().toISOString(),
  });

  const docRef = await addDoc(collection(db, COLLECTION), ruleData);

  return {
    id: docRef.id,
    ...ruleData,
  } as RecurringRule;
};

// Update an existing recurring rule
export const updateRecurringRule = async (
  ruleId: string,
  data: RecurringRuleUpdateInput
) => {
  const docRef = doc(db, COLLECTION, ruleId);
  await updateDoc(docRef, sanitizeFirestoreData({ ...data }));
};

// Permanently delete a recurring rule
export const deleteRecurringRule = async (ruleId: string) => {
  const docRef = doc(db, COLLECTION, ruleId);
  await deleteDoc(docRef);
};

// Fetch all active recurring rules for a user
export const getActiveRecurringRules = async (userId: string) => {
  const q = query(
    collection(db, COLLECTION),
    where('userId', '==', userId),
    where('isActive', '==', true)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as RecurringRule[];
};

// Fetch all recurring rules (active and inactive) for a user
export const getAllRecurringRules = async (userId: string) => {
  const q = query(collection(db, COLLECTION), where('userId', '==', userId));

  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as RecurringRule[];
};
