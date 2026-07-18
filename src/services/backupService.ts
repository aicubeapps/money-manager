import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { fetchAccounts } from './accountService';
import { fetchTransactions } from './transactionService';
import { fetchCategories } from './categoryService';
import { fetchBudgets } from './budgetService';
import { getTags } from './tagService';
import { findOrCreateFolder, listFilesInFolder, uploadJsonFile, downloadFileContent, deleteFile } from './googleDriveService';
import type { Account, Transaction, Category, Budget, Tag } from '../types';

export const BACKUP_SCHEMA_VERSION = 1;
const BACKUP_FOLDER_NAME = 'ExpenseTracker Backups';
const MAX_BACKUPS_KEPT = 8;
const LAST_BACKUP_KEY = 'driveLastBackupAt';
const AUTO_BACKUP_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

const COLLECTIONS = {
  accounts: 'accounts',
  transactions: 'transactions',
  categories: 'categories',
  budgets: 'budgets',
  tags: 'tags',
} as const;

export interface BackupPayload {
  schemaVersion: number;
  generatedAt: string;
  userId: string;
  data: {
    accounts: Account[];
    transactions: Transaction[];
    categories: Category[];
    budgets: Budget[];
    tags: Tag[];
  };
}

export interface BackupSummary {
  fileId: string;
  fileName: string;
  createdAt: string;
}

export const buildBackupPayload = async (userId: string): Promise<BackupPayload> => {
  const [accounts, transactions, categories, budgets, tags] = await Promise.all([
    fetchAccounts(userId),
    fetchTransactions(userId),
    fetchCategories(userId),
    fetchBudgets(userId),
    getTags(userId),
  ]);

  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    userId,
    data: { accounts, transactions, categories, budgets, tags },
  };
};

const backupFileName = (date = new Date()) => {
  const iso = date.toISOString().slice(0, 10); // YYYY-MM-DD
  return `expensetracker-backup-${iso}.json`;
};

export const getLastBackupAt = (): Date | null => {
  const raw = localStorage.getItem(LAST_BACKUP_KEY);
  return raw ? new Date(raw) : null;
};

const setLastBackupAt = (date: Date) => {
  localStorage.setItem(LAST_BACKUP_KEY, date.toISOString());
};

export const shouldRunAutoBackup = (): boolean => {
  const last = getLastBackupAt();
  if (!last) return true;
  return Date.now() - last.getTime() >= AUTO_BACKUP_INTERVAL_MS;
};

/** Uploads a fresh backup and prunes old ones beyond MAX_BACKUPS_KEPT. */
export const uploadBackup = async (userId: string): Promise<BackupSummary> => {
  const payload = await buildBackupPayload(userId);
  const folderId = await findOrCreateFolder(BACKUP_FOLDER_NAME);
  const file = await uploadJsonFile(backupFileName(), folderId, JSON.stringify(payload));

  const now = new Date();
  setLastBackupAt(now);

  // Prune: keep the most recent MAX_BACKUPS_KEPT, delete the rest.
  const files = await listFilesInFolder(folderId);
  const toDelete = files.slice(MAX_BACKUPS_KEPT);
  await Promise.all(toDelete.map((f) => deleteFile(f.id).catch(() => {})));

  return { fileId: file.id, fileName: file.name, createdAt: file.createdTime };
};

export const listBackups = async (): Promise<BackupSummary[]> => {
  const folderId = await findOrCreateFolder(BACKUP_FOLDER_NAME);
  const files = await listFilesInFolder(folderId);
  return files.map((f) => ({ fileId: f.id, fileName: f.name, createdAt: f.createdTime }));
};

export interface RestorePreview {
  payload: BackupPayload;
  counts: { accounts: number; transactions: number; categories: number; budgets: number; tags: number };
  schemaMismatch: boolean;
}

/** Downloads and parses a backup without writing anything — used to populate the confirm dialog. */
export const previewBackup = async (fileId: string): Promise<RestorePreview> => {
  const raw = await downloadFileContent(fileId);
  const payload = JSON.parse(raw) as BackupPayload;
  return {
    payload,
    counts: {
      accounts: payload.data?.accounts?.length ?? 0,
      transactions: payload.data?.transactions?.length ?? 0,
      categories: payload.data?.categories?.length ?? 0,
      budgets: payload.data?.budgets?.length ?? 0,
      tags: payload.data?.tags?.length ?? 0,
    },
    schemaMismatch: payload.schemaVersion !== BACKUP_SCHEMA_VERSION,
  };
};

const toFirestoreValue = (value: unknown): unknown => {
  if (value instanceof Date) return Timestamp.fromDate(value);
  return value;
};

/** Converts a backed-up entity's Date-typed fields back to Firestore Timestamps. */
const prepareForWrite = <T extends Record<string, unknown>>(entity: T): Record<string, unknown> => {
  const { id: _id, ...rest } = entity;
  const prepared: Record<string, unknown> = {};
  Object.entries(rest).forEach(([key, value]) => {
    prepared[key] = toFirestoreValue(value);
  });
  return prepared;
};

const deleteAllInCollection = async (collectionName: string, userId: string) => {
  const snapshot = await getDocs(query(collection(db, collectionName), where('userId', '==', userId)));
  const docs = snapshot.docs;
  const BATCH_LIMIT = 500;
  for (let i = 0; i < docs.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    docs.slice(i, i + BATCH_LIMIT).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
};

const restoreCollection = async <T extends { id: string }>(collectionName: string, entities: T[]) => {
  const BATCH_LIMIT = 500;
  for (let i = 0; i < entities.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    entities.slice(i, i + BATCH_LIMIT).forEach((entity) => {
      // Original document IDs are preserved (setDoc, not addDoc) — restored
      // transactions/budgets reference accountId/categoryId values that only
      // stay valid if accounts/categories keep the same IDs they had when
      // the backup was taken.
      batch.set(doc(db, collectionName, entity.id), prepareForWrite(entity as unknown as Record<string, unknown>));
    });
    await batch.commit();
  }
};

/**
 * Destructive: deletes the user's current accounts/transactions/categories/
 * budgets/tags and replaces them with the backup's contents, preserving
 * original document IDs. Does NOT attempt schema migration — call
 * previewBackup() first and block on schemaMismatch per the caller's policy
 * (this function does not check it, by design, so a caller can still force
 * a same-version restore after warning the user).
 */
export const restoreFromBackup = async (userId: string, payload: BackupPayload): Promise<void> => {
  await Promise.all([
    deleteAllInCollection(COLLECTIONS.accounts, userId),
    deleteAllInCollection(COLLECTIONS.transactions, userId),
    deleteAllInCollection(COLLECTIONS.categories, userId),
    deleteAllInCollection(COLLECTIONS.budgets, userId),
    deleteAllInCollection(COLLECTIONS.tags, userId),
  ]);

  await Promise.all([
    restoreCollection(COLLECTIONS.accounts, payload.data.accounts),
    restoreCollection(COLLECTIONS.transactions, payload.data.transactions),
    restoreCollection(COLLECTIONS.categories, payload.data.categories),
    restoreCollection(COLLECTIONS.budgets, payload.data.budgets),
    restoreCollection(COLLECTIONS.tags, payload.data.tags),
  ]);
};
