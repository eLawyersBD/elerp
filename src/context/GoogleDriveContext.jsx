/**
 * GoogleDriveContext.jsx
 * React context that manages the Google Drive connection state globally.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  initGoogleDriveService,
  requestDriveAccess,
  silentReconnect,
  disconnectDrive,
  isConnected,
  getAccessToken,
  createDriveFolder,
  renameDriveFolder,
  PARENT_FOLDER_URL,
  getStoredHint,
} from '../utils/driveService';

const GoogleDriveContext = createContext({
  driveConnected: false,
  driveConnecting: false,
  driveAutoConnecting: false,
  driveWasConnected: false,
  connectDrive: () => {},
  reconnectDrive: () => {},
  disconnectFromDrive: () => {},
  createClientFolder: async () => null,
  renameDriveFolder: async () => {},
  accessToken: null,
});

export const useGoogleDrive = () => useContext(GoogleDriveContext);

export const GoogleDriveProvider = ({ children }) => {
  const [driveConnected, setDriveConnected]         = useState(false);
  const [driveConnecting, setDriveConnecting]       = useState(false);
  const [driveAutoConnecting, setDriveAutoConnecting] = useState(false);
  const [driveWasConnected, setDriveWasConnected]   = useState(
    () => localStorage.getItem('drive_connected') === '1'
  );
  const [accessToken, setAccessToken]               = useState(null);

  const initialized     = useRef(false);
  const autoReconnectTimeoutRef = useRef(null);

  // ── Shared handler called whenever a token is successfully obtained ──────────
  const handleConnected = useCallback((token) => {
    // Clear the safety timeout for auto-reconnect
    if (autoReconnectTimeoutRef.current) {
      clearTimeout(autoReconnectTimeoutRef.current);
      autoReconnectTimeoutRef.current = null;
    }
    setAccessToken(token);
    setDriveConnected(true);
    setDriveConnecting(false);
    setDriveAutoConnecting(false);
    setDriveWasConnected(true);
    localStorage.setItem('drive_connected', '1');
  }, []);

  // ── Shared handler called on auth errors ─────────────────────────────────────
  const handleError = useCallback((err) => {
    if (autoReconnectTimeoutRef.current) {
      clearTimeout(autoReconnectTimeoutRef.current);
      autoReconnectTimeoutRef.current = null;
    }
    if (err !== 'session_expired') {
      console.error('Drive auth error:', err);
    }
    setDriveConnecting(false);
    setDriveAutoConnecting(false);
    setDriveConnected(false);
    if (err === 'session_expired') {
      localStorage.removeItem('drive_connected');
    }
  }, []);

  // ── Initialize on mount, then attempt silent reconnect if flag is set ────────
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    initGoogleDriveService(handleConnected, handleError).then(() => {
      if (localStorage.getItem('drive_connected') === '1') {
        setDriveAutoConnecting(true);

        const ready = silentReconnect();

        if (ready) {
          autoReconnectTimeoutRef.current = setTimeout(() => {
            setDriveAutoConnecting(false);
          }, 15000);
        } else {
          setDriveAutoConnecting(false);
        }
      }
    });

    return () => {
      if (autoReconnectTimeoutRef.current) {
        clearTimeout(autoReconnectTimeoutRef.current);
      }
    };
  }, [handleConnected, handleError]);

  // ── Manual connect (shows Google account picker) ─────────────────────────────────
  const connectDrive = useCallback(() => {
    setDriveConnecting(true);
    try {
      requestDriveAccess('consent');
    } catch (e) {
      setDriveConnecting(false);
    }
  }, []);

  // ── 1-click reconnect using stored login_hint (no account picker) ───────────────
  const reconnectDrive = useCallback(() => {
    setDriveConnecting(true);
    try {
      requestDriveAccess('');
    } catch (e) {
      setDriveConnecting(false);
    }
  }, []);

  // ── Disconnect ───────────────────────────────────────────────────────────────────────
  const disconnectFromDrive = useCallback(() => {
    disconnectDrive();
    setDriveConnected(false);
    setAccessToken(null);
    setDriveAutoConnecting(false);
    setDriveWasConnected(false);
    localStorage.removeItem('drive_connected');
  }, []);

  // ── Create a folder in Drive ─────────────────────────────────────────────────
  const createClientFolderFn = useCallback(async (folderName) => {
    if (!isConnected()) return null;
    try {
      return await createDriveFolder(folderName);
    } catch (err) {
      if (err.message === 'UNAUTHORIZED_DRIVE_ACCESS') {
        handleError('session_expired');
      }
      console.error('Failed to create Drive folder:', err);
      throw err;
    }
  }, [handleError]);

  const renameDriveFolderFn = useCallback(async (folderId, newName) => {
    if (!isConnected()) return;
    try {
      await renameDriveFolder(folderId, newName);
    } catch (err) {
      if (err.message === 'UNAUTHORIZED_DRIVE_ACCESS') {
        handleError('session_expired');
      }
      console.error('Failed to rename Drive folder:', err);
      throw err;
    }
  }, [handleError]);

  return (
    <GoogleDriveContext.Provider
      value={{
        driveConnected,
        driveConnecting,
        driveAutoConnecting,
        driveWasConnected,
        connectDrive,
        reconnectDrive,
        disconnectFromDrive,
        createClientFolder: createClientFolderFn,
        renameDriveFolder: renameDriveFolderFn,
        accessToken,
      }}
    >
      {children}
    </GoogleDriveContext.Provider>
  );
};

export default GoogleDriveContext;
