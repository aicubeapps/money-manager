import { onSnapshot } from 'firebase/firestore';
import type { Query, QuerySnapshot, DocumentData, Unsubscribe, FirestoreError } from 'firebase/firestore';

const RETRY_DELAYS_MS = [1000, 2000, 4000];

/**
 * Like onSnapshot, but retries with backoff (1s, 2s, 4s) instead of dying
 * permanently on the first error. Firestore listeners normally tear
 * themselves down after their error callback fires, so a single transient
 * failure right after a cold IndexedDB/auth handshake (e.g. post cache-clear,
 * when every listener in the app attaches at once) would otherwise leave the
 * hook stuck empty until something else forces a remount. Only surfaces
 * onError to the caller after retries are exhausted.
 */
export function subscribeWithRetry<T = DocumentData>(
  query: Query<T>,
  onNext: (snapshot: QuerySnapshot<T>) => void,
  onError: (error: FirestoreError) => void
): Unsubscribe {
  let attempt = 0;
  let unsubscribe: Unsubscribe | null = null;
  let retryTimeout: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const attach = () => {
    unsubscribe = onSnapshot(
      query,
      (snapshot) => {
        attempt = 0;
        onNext(snapshot);
      },
      (err) => {
        if (stopped) return;
        if (attempt < RETRY_DELAYS_MS.length) {
          const delay = RETRY_DELAYS_MS[attempt];
          attempt += 1;
          retryTimeout = setTimeout(() => {
            if (stopped) return;
            unsubscribe?.();
            attach();
          }, delay);
        } else {
          onError(err);
        }
      }
    );
  };

  attach();

  return () => {
    stopped = true;
    if (retryTimeout) clearTimeout(retryTimeout);
    unsubscribe?.();
  };
}
