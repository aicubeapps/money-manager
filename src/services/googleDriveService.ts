// Google Identity Services (GIS) token client for Drive access — the current
// recommended client-side OAuth flow for SPAs. Deliberately NOT gapi.auth2
// (deprecated). The access token lives in memory only for the lifetime of
// the tab; it is never written to localStorage. The only thing persisted is
// a boolean "the user has connected before" flag, which lets a later visit
// attempt a *silent* token re-acquisition (prompt: '', no popup, standard
// GIS behavior for a user who already granted consent) for the automated
// weekly backup check — that's different from prompting a user who never
// connected, which only ever happens from the explicit "Connect" button.

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponse) => void;
            error_callback?: (error: { type: string }) => void;
          }) => TokenClient;
          revoke: (token: string, callback?: () => void) => void;
        };
      };
    };
  }
}

interface TokenResponse {
  access_token?: string;
  /** Seconds until expiry, per the GIS token response — typically ~3599 (1hr). */
  expires_in?: number;
  error?: string;
}

interface TokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const CONNECTED_FLAG_KEY = 'driveBackupConnected';
const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
// Treat a token as expired this long before its real expiry, so a Drive call
// that's about to be made doesn't race a token that dies mid-request.
const EXPIRY_SAFETY_MARGIN_MS = 60_000;
// Fallback when a token response omits expires_in (shouldn't normally happen).
const DEFAULT_TOKEN_LIFETIME_SEC = 3600;

interface TokenState {
  value: string;
  expiresAt: number; // epoch ms
}

// Module-level singleton — every importer (backupService, receiptService, ...)
// shares this exact state via the same ES module instance, so a token
// obtained for one feature is immediately usable by the other with no
// separate re-auth. (Verified: not duplicated anywhere in this codebase.)
let tokenState: TokenState | null = null;
let tokenClient: TokenClient | null = null;
let gisScriptPromise: Promise<void> | null = null;
// Serializes concurrent requestToken() calls. GIS's token client instance
// supports exactly one callback/error_callback pair at a time — a second
// requestAccessToken() call before the first's callback fires overwrites
// those handlers, so the first call's Promise would otherwise never
// resolve (silently hanging rather than failing fast).
let inFlightRequest: Promise<boolean> | null = null;

const loadGisScript = (): Promise<void> => {
  if (gisScriptPromise) return gisScriptPromise;
  gisScriptPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services')));
      return;
    }
    const script = document.createElement('script');
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
  return gisScriptPromise;
};

const getTokenClient = async (): Promise<TokenClient> => {
  if (tokenClient) return tokenClient;
  if (!CLIENT_ID) {
    throw new Error('VITE_GOOGLE_CLIENT_ID is not set — Drive backup is unavailable.');
  }
  await loadGisScript();
  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google Identity Services failed to initialize.');
  }
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: DRIVE_SCOPE,
    callback: () => {}, // overridden per-request below
    error_callback: () => {}, // overridden per-request below
  });
  return tokenClient;
};

const requestTokenUnserialized = (prompt: string): Promise<boolean> =>
  getTokenClient().then(
    (client) =>
      new Promise<boolean>((resolve) => {
        let settled = false;
        const finish = (ok: boolean) => {
          if (settled) return;
          settled = true;
          resolve(ok);
        };
        // Re-wrap both handlers per call since GIS only supports one
        // callback/error_callback pair per client instance, not per
        // requestAccessToken() call.
        (client as unknown as { callback: (r: TokenResponse) => void }).callback = (response: TokenResponse) => {
          if (response.access_token) {
            const lifetimeSec = response.expires_in ?? DEFAULT_TOKEN_LIFETIME_SEC;
            tokenState = { value: response.access_token, expiresAt: Date.now() + lifetimeSec * 1000 };
            finish(true);
          } else {
            finish(false);
          }
        };
        // Without this, a silent (prompt: '') failure — e.g. no valid Google
        // session, or the browser blocking the third-party-cookie-dependent
        // silent-issuance mechanism GIS uses outside a user gesture — never
        // calls `callback`, so the Promise above would hang forever instead
        // of resolving false and letting the caller fall back to an explicit
        // "Connect" button.
        (client as unknown as { error_callback: (e: { type: string }) => void }).error_callback = () => {
          finish(false);
        };
        try {
          client.requestAccessToken({ prompt });
        } catch {
          finish(false);
        }
      })
  ).catch(() => false);

const requestToken = (prompt: string): Promise<boolean> => {
  if (inFlightRequest) return inFlightRequest;
  inFlightRequest = requestTokenUnserialized(prompt).finally(() => {
    inFlightRequest = null;
  });
  return inFlightRequest;
};

const isTokenLive = (): boolean =>
  tokenState !== null && Date.now() < tokenState.expiresAt - EXPIRY_SAFETY_MARGIN_MS;

/** Explicit, user-initiated connect — call only from a "Connect Google Drive" click. */
export const connectDrive = async (): Promise<boolean> => {
  if (isTokenLive()) return true;
  const ok = await requestToken('consent');
  if (ok) localStorage.setItem(CONNECTED_FLAG_KEY, 'true');
  return ok;
};

/** Silent re-acquisition for a user who connected in a previous session — no popup shown. */
export const reconnectDriveSilently = async (): Promise<boolean> => {
  if (isTokenLive()) return true;
  if (!hasConnectedBefore()) return false;
  return requestToken('');
};

/** True only if we currently hold a live, unexpired access token in this tab. */
export const isDriveConnected = (): boolean => isTokenLive();

/** True if the user has ever completed the explicit connect flow (persisted flag, not the token). */
export const hasConnectedBefore = (): boolean => localStorage.getItem(CONNECTED_FLAG_KEY) === 'true';

export const disconnectDrive = (): void => {
  if (tokenState && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(tokenState.value, () => {});
  }
  tokenState = null;
  localStorage.removeItem(CONNECTED_FLAG_KEY);
};

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

const authHeader = (): HeadersInit => {
  if (!tokenState) throw new Error('Not connected to Google Drive.');
  return { Authorization: `Bearer ${tokenState.value}` };
};

/** Wraps a Drive call, retrying once via silent re-auth on a 401 (expired token). */
const withReauth = async <T>(call: () => Promise<Response>): Promise<T> => {
  let res = await call();
  if (res.status === 401) {
    const reauthed = await reconnectDriveSilently();
    if (!reauthed) throw new Error('Google Drive session expired — please reconnect.');
    res = await call();
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Google Drive API error (${res.status}): ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
};

export interface DriveFile {
  id: string;
  name: string;
  createdTime: string;
}

/** Finds a folder by exact name (not in trash), or creates it if missing. Returns the folder id. */
export const findOrCreateFolder = async (name: string): Promise<string> => {
  const q = encodeURIComponent(
    `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  const list = await withReauth<{ files: DriveFile[] }>(() =>
    fetch(`${DRIVE_API}/files?q=${q}&fields=files(id,name,createdTime)&spaces=drive`, { headers: authHeader() })
  );
  if (list.files.length > 0) return list.files[0].id;

  const created = await withReauth<{ id: string }>(() =>
    fetch(`${DRIVE_API}/files`, {
      method: 'POST',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder' }),
    })
  );
  return created.id;
};

export const listFilesInFolder = async (folderId: string): Promise<DriveFile[]> => {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
  const result = await withReauth<{ files: DriveFile[] }>(() =>
    fetch(`${DRIVE_API}/files?q=${q}&fields=files(id,name,createdTime)&orderBy=createdTime desc&spaces=drive`, {
      headers: authHeader(),
    })
  );
  return result.files;
};

/** Uploads a JSON string as a new file into the given folder (multipart upload). */
export const uploadJsonFile = async (name: string, folderId: string, content: string): Promise<DriveFile> => {
  const metadata = { name, parents: [folderId], mimeType: 'application/json' };
  const boundary = `expensetracker-${Date.now()}`;
  const body =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    'Content-Type: application/json\r\n\r\n' +
    `${content}\r\n` +
    `--${boundary}--`;

  return withReauth<DriveFile>(() =>
    fetch(`${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id,name,createdTime`, {
      method: 'POST',
      headers: { ...authHeader(), 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    })
  );
};

/** Uploads a binary image file as a new Drive file in the given folder (multipart upload). */
export const uploadImageFile = async (file: File, folderId: string): Promise<DriveFile> => {
  const metadata = {
    name: file.name || `receipt-${Date.now()}`,
    parents: [folderId],
    mimeType: file.type || 'image/jpeg',
  };
  const boundary = `expensetracker-${Date.now()}`;
  // Built as a Blob (not a plain string) so the binary image bytes aren't
  // mangled by JS string/UTF-16 handling the way the JSON upload above can
  // safely use a string body.
  const body = new Blob([
    `--${boundary}\r\n`,
    'Content-Type: application/json; charset=UTF-8\r\n\r\n',
    JSON.stringify(metadata),
    `\r\n--${boundary}\r\n`,
    `Content-Type: ${metadata.mimeType}\r\n\r\n`,
    file,
    `\r\n--${boundary}--`,
  ]);

  return withReauth<DriveFile>(() =>
    fetch(`${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id,name,createdTime`, {
      method: 'POST',
      headers: { ...authHeader(), 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    })
  );
};

/** Downloads a file's raw bytes (for images — pair with URL.createObjectURL for display). */
export const downloadFileBlob = async (fileId: string): Promise<Blob> => {
  let res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, { headers: authHeader() });
  if (res.status === 401) {
    const reauthed = await reconnectDriveSilently();
    if (!reauthed) throw new Error('Google Drive session expired — please reconnect.');
    res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, { headers: authHeader() });
  }
  if (!res.ok) throw new Error(`Failed to download file (${res.status}).`);
  return res.blob();
};

export const downloadFileContent = async (fileId: string): Promise<string> => {
  let res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, { headers: authHeader() });
  if (res.status === 401) {
    const reauthed = await reconnectDriveSilently();
    if (!reauthed) throw new Error('Google Drive session expired — please reconnect.');
    res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, { headers: authHeader() });
  }
  if (!res.ok) throw new Error(`Failed to download backup (${res.status}).`);
  return res.text();
};

export const deleteFile = async (fileId: string): Promise<void> => {
  const call = () => fetch(`${DRIVE_API}/files/${fileId}`, { method: 'DELETE', headers: authHeader() });
  let res = await call();
  if (res.status === 401) {
    const reauthed = await reconnectDriveSilently();
    if (!reauthed) throw new Error('Google Drive session expired — please reconnect.');
    res = await call();
  }
  // DELETE returns 204 with no body — do not attempt to parse JSON.
  if (!res.ok && res.status !== 204) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to delete Drive file (${res.status}): ${text || res.statusText}`);
  }
};
