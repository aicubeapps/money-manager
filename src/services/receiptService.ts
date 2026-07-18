// Receipt image storage on Google Drive — mirrors backupService.ts's
// find-or-create-folder pattern, kept in its own file since receipts are a
// distinct feature from backups (different folder, image files not JSON).
import { findOrCreateFolder, uploadImageFile, downloadFileBlob, deleteFile } from './googleDriveService';

const RECEIPTS_FOLDER_NAME = 'ExpenseTracker Receipts';
export const MAX_RECEIPT_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

// In-memory only — object URLs are per-tab and revoked on eviction, never
// persisted (the underlying Drive access token is in-memory only too).
const objectUrlCache = new Map<string, string>();

export const validateReceiptFile = (file: File): string | null => {
  if (!file.type.startsWith('image/')) return 'Please select an image file.';
  if (file.size > MAX_RECEIPT_SIZE_BYTES) return 'Image is too large (max 10MB).';
  return null;
};

/** Uploads a receipt image to the dedicated Drive folder and returns its file ID. */
export const uploadReceiptImage = async (file: File): Promise<string> => {
  const folderId = await findOrCreateFolder(RECEIPTS_FOLDER_NAME);
  const uploaded = await uploadImageFile(file, folderId);
  return uploaded.id;
};

export const deleteReceiptImage = async (fileId: string): Promise<void> => {
  const cached = objectUrlCache.get(fileId);
  if (cached) {
    URL.revokeObjectURL(cached);
    objectUrlCache.delete(fileId);
  }
  await deleteFile(fileId);
};

/** Fetches (and caches for this tab) a displayable object URL for a receipt image. */
export const getReceiptImageUrl = async (fileId: string): Promise<string> => {
  const cached = objectUrlCache.get(fileId);
  if (cached) return cached;
  const blob = await downloadFileBlob(fileId);
  const url = URL.createObjectURL(blob);
  objectUrlCache.set(fileId, url);
  return url;
};
