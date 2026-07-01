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
import type { Category, CategoryType } from '../types';

const COLLECTION = 'categories';

// Create
export const createCategory = async (
  userId: string,
  data: Omit<Category, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
) => {
  const now = new Date();
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    userId,
    active: true,
    createdAt: now,
    updatedAt: now,
  });
  return { id: docRef.id, ...data, userId, active: true, createdAt: now, updatedAt: now } as Category;
};

// Update
export const updateCategory = async (
  categoryId: string,
  data: Partial<Omit<Category, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
) => {
  const docRef = doc(db, COLLECTION, categoryId);
  await updateDoc(docRef, { ...data, updatedAt: new Date() });
};

// Disable (set active = false)
export const disableCategory = async (categoryId: string) => {
  const docRef = doc(db, COLLECTION, categoryId);
  await updateDoc(docRef, { active: false, updatedAt: new Date() });
};

// Enable
export const enableCategory = async (categoryId: string) => {
  const docRef = doc(db, COLLECTION, categoryId);
  await updateDoc(docRef, { active: true, updatedAt: new Date() });
};

// Delete permanently
export const deleteCategory = async (categoryId: string) => {
  const docRef = doc(db, COLLECTION, categoryId);
  await deleteDoc(docRef);
};

// Fetch all (used for seeding)
export const fetchCategories = async (userId: string) => {
  const q = query(collection(db, COLLECTION), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Category[];
};

import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../constants/defaultCategories';

export const seedDefaultCategories = async (userId: string) => {
  const existing = await fetchCategories(userId);
  if (existing.length > 0) return; // already seeded

  const allDefaults = [
    ...DEFAULT_EXPENSE_CATEGORIES.map((c) => ({ ...c, type: 'expense' as CategoryType })),
    ...DEFAULT_INCOME_CATEGORIES.map((c) => ({ ...c, type: 'income' as CategoryType })),
  ];

  for (const cat of allDefaults) {
    await createCategory(userId, {
      name: cat.name,
      type: cat.type as CategoryType,
      icon: cat.icon,
      color: cat.color,
      active: true,
    });
  }
};