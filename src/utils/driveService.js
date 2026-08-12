/**
 * driveService.js
 * Full Google Drive API integration using Google Identity Services (GIS).
 * No backend required — runs entirely in the browser using OAuth 2.0 implicit flow.
 */

export const GOOGLE_CLIENT_ID = '818452280599-usc3fru4ebrcis7itffonmovrolppe2l.apps.googleusercontent.com';
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
export const PARENT_FOLDER_ID = '1iQ_Gtp9GVtVztln4wKaRC_n_FSixfiEL';
export const PARENT_FOLDER_URL = `https://drive.google.com/drive/folders/${PARENT_FOLDER_ID}`;

// ─── Token management ─────────────────────────────────────────────────────────
let _accessToken = null;
let _tokenClient = null;
let _tokenExpiry = 0;
let _refreshTimer = null;

// ─── Stored hint (Google account email) for silent reconnect ──────────────────
export const getStoredHint = () => localStorage.getItem('drive_hint');
export const setStoredHint = (email) => localStorage.setItem('drive_hint', email);
export const clearStoredHint = () => localStorage.removeItem('drive_hint');

export const getAccessToken = () => {
  if (_accessToken && Date.now() < _tokenExpiry) return _accessToken;
  return null;
};

export const isConnected = () => !!getAccessToken();

// ─── Schedule automatic token refresh before it expires ───────────────────────
export const scheduleTokenRefresh = (expiresIn) => {
  if (_refreshTimer) clearTimeout(_refreshTimer);
  // Refresh 5 minutes before token expires (so employees never notice a drop)
  const refreshIn = Math.max((expiresIn - 300) * 1000, 10_000);
  _refreshTimer = setTimeout(() => {
    if (_tokenClient) {
      // Silent refresh — no popup, reuses existing Google session
      _tokenClient.requestAccessToken({ prompt: '' });
    }
  }, refreshIn);
};

// ─── Initialize Google Identity Services ──────────────────────────────────────
export const initGoogleDriveService = (
  onConnected,
  onError
) => {
  return new Promise((resolve) => {
    const waitForGoogle = (retries = 20) => {
      const gis = window.google?.accounts?.oauth2;
      if (gis) {
        _tokenClient = gis.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: DRIVE_SCOPE,
          callback: (response) => {
            if (response.error) {
              if (response.error === 'interaction_required' ||
                  response.error === 'access_denied') {
                localStorage.removeItem('drive_connected');
                onError?.('session_expired');
              } else {
                onError?.(response.error);
              }
              return;
            }
            _accessToken = response.access_token;
            _tokenExpiry = Date.now() + (response.expires_in - 300) * 1000;
            scheduleTokenRefresh(response.expires_in);
            _fetchAndStoreUserEmail(response.access_token);
            onConnected(response.access_token);
          },
        });
        resolve();
      } else if (retries > 0) {
        setTimeout(() => waitForGoogle(retries - 1), 300);
      } else {
        onError?.('Google Identity Services failed to load.');
        resolve();
      }
    };
    waitForGoogle();
  });
};

// ─── Fetch and store user email after successful token ────────────────────────
const _fetchAndStoreUserEmail = async (token) => {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const info = await res.json();
      if (info.email) setStoredHint(info.email);
    }
  } catch {
    // Non-critical: ignore failures
  }
};

// ─── Trigger OAuth popup ───────────────────────────────────────────────────────
export const requestDriveAccess = (prompt = '') => {
  if (!_tokenClient) throw new Error('Drive service not initialized');
  const hint = getStoredHint();
  _tokenClient.requestAccessToken({ prompt, ...(hint ? { login_hint: hint } : {}) });
};

// ─── Attempt silent reconnect (no popup) ──────────────────────────────────────
export const silentReconnect = () => {
  if (!_tokenClient) return false;
  const hint = getStoredHint();
  _tokenClient.requestAccessToken({ prompt: '', ...(hint ? { login_hint: hint } : {}) });
  return true;
};

export const disconnectDrive = () => {
  if (_refreshTimer) clearTimeout(_refreshTimer);
  if (_accessToken) {
    window.google?.accounts?.oauth2?.revoke(_accessToken, () => {});
  }
  _accessToken = null;
  _tokenExpiry = 0;
  _refreshTimer = null;
  clearStoredHint();
};

// ─── Drive REST API helpers ────────────────────────────────────────────────────
const driveAPI = async (
  path,
  options = {},
  token
) => {
  const t = token || getAccessToken();
  if (!t) throw new Error('Not connected to Google Drive. Please connect first.');
  const res = await fetch(`https://www.googleapis.com/drive/v3/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${t}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('UNAUTHORIZED_DRIVE_ACCESS');
    }
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(err.error?.message || `Drive API error ${res.status}`);
  }
  return res.json();
};

// ─── Find existing folder by name inside parent ────────────────────────────────
export const findFolder = async (folderName) => {
  const q = `name='${folderName.replace(/'/g, "\\'")}' and '${PARENT_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const data = await driveAPI(`files?q=${encodeURIComponent(q)}&fields=files(id,name,webViewLink)`);
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
};

// ─── Create a new folder inside the parent ─────────────────────────────────────
export const createDriveFolder = async (
  folderName
) => {
  const existingId = await findFolder(folderName);
  if (existingId) {
    const existing = await driveAPI(`files/${existingId}?fields=id,webViewLink`);
    return { id: existing.id, webViewLink: existing.webViewLink };
  }

  const data = await driveAPI('files?fields=id,webViewLink', {
    method: 'POST',
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [PARENT_FOLDER_ID],
    }),
  });

  return { id: data.id, webViewLink: data.webViewLink };
};

// ─── Rename an existing folder ───────────────────────────────────────────────
export const renameDriveFolder = async (
  folderId,
  newFolderName
) => {
  await driveAPI(`files/${folderId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      name: newFolderName,
    }),
  });
};

// ─── Build folder name from client data ───────────────────────────────────────
export const buildFolderName = (clientId, clientName, company) => {
  const idNum = parseInt(clientId.replace(/\D/g, '')) || 0;
  const namePart = (clientName || '').trim();
  const companyPart = (company || '').trim();
  
  let newName = `${idNum}+`;
  if (namePart) newName += namePart;
  if (companyPart) newName += `+${companyPart}`;
  return newName;
};
