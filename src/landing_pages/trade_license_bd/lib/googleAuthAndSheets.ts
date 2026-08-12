/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { ConsultationRequest } from '../types';

// Reuse existing app or initialize
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Add required Google Workspace scopes for Sheets & Drive
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/drive.readonly');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

/**
 * Initialize Firebase Auth listener. Caches token in memory safely.
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Trigger Google Sign In with Popup
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google Auth');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const code = (error as { code: string }).code;
      if (
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request' ||
        code === 'auth/popup-blocked'
      ) {
        console.info('Google Sign-in popup was closed or cancelled by the user.');
        return null;
      }
    }
    console.error('Google Sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

// --- GOOGLE SHEETS API IMPLEMENTATION ---

export const ELAWYERS_SHEET_TITLE = "E-Lawyers Trade License Applications (Bangladesh)";

export interface SheetsSyncResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  rowsAdded: number;
}

const SHEET_HEADERS = [
  'Application ID',
  'Submitted Date',
  'Full Name',
  'Mobile Number',
  'Email',
  'Business Name',
  'Business Type',
  'Location Authority',
  'Business Address',
  'Nature of Business',
  'Requested Service',
  'Preferred Contact',
  'Current Status',
  'Step #',
  'Notes / Details'
];

/**
 * Converts a ConsultationRequest into a row array matching SHEET_HEADERS
 */
export const requestToRow = (req: ConsultationRequest): (string | number)[] => {
  return [
    req.id || '',
    req.submittedAt || new Date().toLocaleString('en-US'),
    req.fullName || '',
    req.mobileNumber || '',
    req.email || '',
    req.businessName || 'N/A',
    req.businessType || 'N/A',
    req.businessLocation || '',
    req.businessAddress || '',
    req.natureOfBusiness || '',
    req.requestedService || '',
    req.preferredContactMethod || 'Mobile',
    req.status || 'Received',
    req.step || 1,
    req.notes || ''
  ];
};

/**
 * Find an existing E-Lawyers spreadsheet or create a brand new one
 */
export const getOrCreateELawyersSpreadsheet = async (token: string): Promise<{ id: string; url: string }> => {
  // 1. Search drive for existing spreadsheet with title
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(ELAWYERS_SHEET_TITLE)}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false&fields=files(id,name,webViewLink)`;
  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return {
        id: searchData.files[0].id,
        url: searchData.files[0].webViewLink || `https://docs.google.com/spreadsheets/d/${searchData.files[0].id}`
      };
    }
  }

  // 2. Create new spreadsheet if not found
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: ELAWYERS_SHEET_TITLE
      },
      sheets: [
        {
          properties: {
            title: 'Trade License Requests',
            gridProperties: {
              frozenRowCount: 1
            }
          }
        }
      ]
    })
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create Google Sheet: ${errText}`);
  }

  const newSheet = await createRes.json();
  const spreadsheetId = newSheet.spreadsheetId;
  const spreadsheetUrl = newSheet.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

  // Add Header Row with formatting
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:O1?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: [SHEET_HEADERS]
    })
  });

  return { id: spreadsheetId, url: spreadsheetUrl };
};

/**
 * Append one or multiple requests to the Google Sheet
 */
export const appendRequestsToGoogleSheet = async (
  requests: ConsultationRequest[],
  token: string,
  targetSpreadsheetId?: string
): Promise<SheetsSyncResult> => {
  if (requests.length === 0) {
    throw new Error('No requests to export');
  }

  let sheetInfo: { id: string; url: string };
  if (targetSpreadsheetId) {
    sheetInfo = {
      id: targetSpreadsheetId,
      url: `https://docs.google.com/spreadsheets/d/${targetSpreadsheetId}`
    };
  } else {
    sheetInfo = await getOrCreateELawyersSpreadsheet(token);
  }

  const rows = requests.map(requestToRow);

  const appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetInfo.id}/values/'Trade License Requests'!A1:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: rows
      })
    }
  );

  // Fallback to sheet A1 if named tab fails
  if (!appendRes.ok) {
    const retryRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetInfo.id}/values/A1:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: rows
        })
      }
    );

    if (!retryRes.ok) {
      const errTxt = await retryRes.text();
      throw new Error(`Failed to append rows to Google Sheet: ${errTxt}`);
    }
  }

  return {
    spreadsheetId: sheetInfo.id,
    spreadsheetUrl: sheetInfo.url,
    rowsAdded: requests.length
  };
};

/**
 * Fetch rows from Google Sheet
 */
export const fetchRowsFromGoogleSheet = async (
  spreadsheetId: string,
  token: string
): Promise<string[][]> => {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:Z500`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (!res.ok) {
    throw new Error('Could not read rows from Google Sheet');
  }

  const data = await res.json();
  return data.values || [];
};

/**
 * Clear or overwrite sheet data (Destructive operation)
 */
export const clearGoogleSheetRows = async (
  spreadsheetId: string,
  token: string
): Promise<boolean> => {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A2:Z500:clear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return res.ok;
};
