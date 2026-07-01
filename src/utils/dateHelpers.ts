import { Timestamp } from 'firebase/firestore';

export const toDate = (value: any): Date => {
  if (!value) return new Date();
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'string') return new Date(value);
  return new Date(value);
};

export const toFirestoreTimestamp = (date: Date) => {
  return Timestamp.fromDate(date);
};

export const formatDate = (value: any): string => {
  const date = toDate(value);
  return date.toLocaleDateString();
};