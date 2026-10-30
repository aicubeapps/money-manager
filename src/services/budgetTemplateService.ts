import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { BudgetAllocation } from '../types';
import type { BudgetTemplate } from '../types/budgetTemplate';

const COLLECTION = 'budgetTemplates';

interface TemplateData {
  name: string;
  amount: number;
  allocations: BudgetAllocation[];
}

export const createBudgetTemplate = async (userId: string, data: TemplateData) => {
  const now = new Date();
  const templateData = { ...data, userId, createdAt: now, updatedAt: now };
  const docRef = await addDoc(collection(db, COLLECTION), templateData);
  return { id: docRef.id, ...templateData } as BudgetTemplate;
};

export const updateBudgetTemplate = async (templateId: string, data: TemplateData) => {
  await updateDoc(doc(db, COLLECTION, templateId), { ...data, updatedAt: new Date() });
};

export const deleteBudgetTemplate = async (templateId: string) => {
  await deleteDoc(doc(db, COLLECTION, templateId));
};
