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
import type { Tag, Transaction } from '../types';

const TAGS_COLLECTION = 'tags';

// --- Tags ---

export const createTag = async (
  userId: string,
  data: Omit<Tag, 'id' | 'userId' | 'createdAt' | 'excludeFromBudget'> & { excludeFromBudget?: boolean }
) => {
  const now = new Date();
  const excludeFromBudget = data.excludeFromBudget ?? false;
  const docRef = await addDoc(collection(db, TAGS_COLLECTION), {
    ...data,
    excludeFromBudget,
    userId,
    createdAt: now,
  });
  return { id: docRef.id, ...data, excludeFromBudget, userId, createdAt: now } as Tag;
};

export const updateTag = async (
  tagId: string,
  data: Partial<Omit<Tag, 'id' | 'userId' | 'createdAt'>>
) => {
  const docRef = doc(db, TAGS_COLLECTION, tagId);
  await updateDoc(docRef, { ...data });
};

export const deleteTag = async (tagId: string) => {
  const docRef = doc(db, TAGS_COLLECTION, tagId);
  await deleteDoc(docRef);
};

export const getTags = async (userId: string) => {
  const q = query(collection(db, TAGS_COLLECTION), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return { id: doc.id, ...data, excludeFromBudget: data.excludeFromBudget ?? false };
  }) as Tag[];
};

export const getTopUsedTags = (
  tags: Tag[],
  transactions: Transaction[],
  limit = 5
): Tag[] => {
  const counts = new Map<string, number>();
  const lastUsed = new Map<string, number>();

  for (const transaction of transactions) {
    for (const tagId of transaction.tags || []) {
      counts.set(tagId, (counts.get(tagId) || 0) + 1);
      const usedAt = transaction.date.getTime();
      if (!lastUsed.has(tagId) || usedAt > lastUsed.get(tagId)!) {
        lastUsed.set(tagId, usedAt);
      }
    }
  }

  return tags
    .filter((tag) => counts.has(tag.id))
    .sort((a, b) => {
      const countDiff = (counts.get(b.id) || 0) - (counts.get(a.id) || 0);
      if (countDiff !== 0) return countDiff;
      return (lastUsed.get(b.id) || 0) - (lastUsed.get(a.id) || 0);
    })
    .slice(0, limit);
};

export const matchTagByKeywords = (description: string, tags: Tag[]): Tag | undefined => {
  const haystack = description.toLowerCase();
  return tags.find((tag) =>
    (tag.importKeywords || []).some((keyword) => haystack.includes(keyword.toLowerCase()))
  );
};
