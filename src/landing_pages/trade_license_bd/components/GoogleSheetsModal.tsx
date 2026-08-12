/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from '../motion';
import { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logoutGoogle,
  getAccessToken,
  appendRequestsToGoogleSheet,
  getOrCreateELawyersSpreadsheet,
  fetchRowsFromGoogleSheet,
  clearGoogleSheetRows,
  ELAWYERS_SHEET_TITLE
} from '../lib/googleAuthAndSheets';
import { ConsultationRequest } from '../types';
import {
  FileSpreadsheet,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  LogOut,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  X,
  Table,
  Plus,
  Trash2,
  Lock,
  Database,
  Layers,
  ArrowRight
} from 'lucide-react';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requests: ConsultationRequest[];
}

export default function GoogleSheetsModal({ isOpen, onClose, requests }: GoogleSheetsModalProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(
    localStorage.getItem('elawyers_google_spreadsheet_id')
  );
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(
    localStorage.getItem('elawyers_google_spreadsheet_url')
  );
  const [autoSync, setAutoSync] = useState<boolean>(
    localStorage.getItem('elawyers_auto_sync_sheets') !== 'false'
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [sheetRows, setSheetRows] = useState<string[][]>([]);
  const [isLoadingRows, setIsLoadingRows] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setIsLoadingAuth(false);
      },
      () => {
        setUser(null);
        setToken(null);
        setIsLoadingAuth(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Save auto-sync setting
  useEffect(() => {
    localStorage.setItem('elawyers_auto_sync_sheets', autoSync ? 'true' : 'false');
  }, [autoSync]);

  // Load existing sheet URL if token is active
  useEffect(() => {
    if (token && !spreadsheetId) {
      getOrCreateELawyersSpreadsheet(token)
        .then((res) => {
          setSpreadsheetId(res.id);
          setSpreadsheetUrl(res.url);
          localStorage.setItem('elawyers_google_spreadsheet_id', res.id);
          localStorage.setItem('elawyers_google_spreadsheet_url', res.url);
        })
        .catch((err) => console.error('Error fetching sheet:', err));
    }
  }, [token, spreadsheetId]);

  const handleGoogleLogin = async () => {
    setIsSigningIn(true);
    setSyncError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        const sheet = await getOrCreateELawyersSpreadsheet(res.accessToken);
        setSpreadsheetId(sheet.id);
        setSpreadsheetUrl(sheet.url);
        localStorage.setItem('elawyers_google_spreadsheet_id', sheet.id);
        localStorage.setItem('elawyers_google_spreadsheet_url', sheet.url);
        setSyncStatus('Successfully connected Google Workspace account!');
      } else {
        setSyncError('Google sign-in popup was closed or cancelled. Please try again when ready.');
      }
    } catch (err: unknown) {
      console.error(err);
      setSyncError(err instanceof Error ? err.message : 'Google sign in failed');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogout = async () => {
    await logoutGoogle();
    setUser(null);
    setToken(null);
    setSyncStatus('Signed out from Google Workspace.');
  };

  const handleSyncDataNow = async () => {
    if (!token) {
      setSyncError('Please sign in with Google first.');
      return;
    }
    setIsSyncing(true);
    setSyncStatus(null);
    setSyncError(null);

    try {
      const currentRequests = requests.length > 0 ? requests : [];
      if (currentRequests.length === 0) {
        setSyncStatus('No local dossier applications to sync.');
        setIsSyncing(false);
        return;
      }

      const result = await appendRequestsToGoogleSheet(currentRequests, token, spreadsheetId || undefined);
      setSpreadsheetId(result.spreadsheetId);
      setSpreadsheetUrl(result.spreadsheetUrl);
      localStorage.setItem('elawyers_google_spreadsheet_id', result.spreadsheetId);
      localStorage.setItem('elawyers_google_spreadsheet_url', result.spreadsheetUrl);

      setSyncStatus(`Successfully exported ${result.rowsAdded} application(s) to Google Sheets!`);
      handleLoadRows(result.spreadsheetId, token);
    } catch (err: unknown) {
      console.error(err);
      setSyncError(err instanceof Error ? err.message : 'Failed to sync with Google Sheets');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLoadRows = async (idToUse?: string, tokenToUse?: string) => {
    const activeToken = tokenToUse || token;
    const activeId = idToUse || spreadsheetId;

    if (!activeToken || !activeId) return;

    setIsLoadingRows(true);
    try {
      const rows = await fetchRowsFromGoogleSheet(activeId, activeToken);
      setSheetRows(rows);
    } catch (err) {
      console.error('Error fetching rows:', err);
    } finally {
      setIsLoadingRows(false);
    }
  };

  const handleClearSheetConfirmed = async () => {
    if (!token || !spreadsheetId) return;
    setIsClearing(true);
    try {
      await clearGoogleSheetRows(spreadsheetId, token);
      setSyncStatus('Spreadsheet data rows cleared successfully.');
      setShowConfirmClear(false);
      handleLoadRows();
    } catch (err: unknown) {
      setSyncError(err instanceof Error ? err.message : 'Failed to clear sheet rows');
    } finally {
      setIsClearing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 rounded-xl border border-emerald-400/30 text-emerald-300">
              <FileSpreadsheet className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                  Google Workspace Integration
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500 text-slate-950 rounded-full">
                  LIVE SYNC
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mt-0.5">Google Sheets Integration</h2>
            </div>
          </div>
          <p className="text-xs text-slate-300 mt-2 font-light">
            Sync trade license dossiers, consultation requests, and client tracking logs directly to Google Sheets with real-time updates.
          </p>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Auth Card */}
          {!user ? (
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-4">
              <div className="mx-auto h-12 w-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                <Lock className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Connect Your Google Account</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Authorize E-Lawyers to automatically write application submissions and dossier details to your Google Sheets.
                </p>
              </div>

              {/* Standard Google Sign In Button */}
              <button
                onClick={handleGoogleLogin}
                disabled={isSigningIn}
                className="inline-flex items-center justify-center gap-3 px-6 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-300 shadow-md transition cursor-pointer disabled:opacity-50 active:scale-95"
              >
                <svg className="h-5 w-5" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>{isSigningIn ? 'Connecting to Google Workspace...' : 'Sign in with Google'}</span>
              </button>
            </div>
          ) : (
            <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || 'User'} className="h-10 w-10 rounded-full border-2 border-emerald-400" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center">
                    {user.displayName?.charAt(0) || user.email?.charAt(0) || 'G'}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900">{user.displayName || 'Google User'}</span>
                    <span className="px-2 py-0.2 rounded bg-emerald-200 text-emerald-900 text-[10px] font-mono font-bold">
                      Connected
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono">{user.email}</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 font-medium text-xs transition cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}

          {/* Messages */}
          {syncStatus && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{syncStatus}</span>
            </div>
          )}
          {syncError && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center gap-2 font-medium">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
              <span>{syncError}</span>
            </div>
          )}

          {/* Sync Controls */}
          {user && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Auto Sync Toggle */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-900">Auto-Sync Submissions</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Append new forms instantly</p>
                  </div>
                  <button
                    onClick={() => setAutoSync(!autoSync)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                      autoSync ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        autoSync ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Open in Google Sheets Button */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-900">Google Sheet Status</p>
                    <p className="text-[11px] text-emerald-600 font-mono font-medium truncate max-w-[140px]">
                      {spreadsheetId ? `ID: ...${spreadsheetId.slice(-6)}` : 'Ready to create'}
                    </p>
                  </div>
                  {spreadsheetUrl && (
                    <a
                      href={spreadsheetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
                    >
                      <span>Open Sheet</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={handleSyncDataNow}
                  disabled={isSyncing}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Syncing Dossiers...' : `Sync All Local Dossiers (${requests.length})`}</span>
                </button>

                {spreadsheetId && (
                  <button
                    onClick={() => handleLoadRows()}
                    disabled={isLoadingRows}
                    className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition cursor-pointer"
                  >
                    <Table className="h-4 w-4 text-emerald-600" />
                    <span>{isLoadingRows ? 'Loading...' : 'Inspect Sheet Rows'}</span>
                  </button>
                )}
              </div>

              {/* Live Table Preview */}
              {sheetRows.length > 0 && (
                <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden text-left">
                  <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 font-mono flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-emerald-600" />
                      Live Sheet Rows ({sheetRows.length} total)
                    </span>
                    <button
                      onClick={() => setShowConfirmClear(true)}
                      className="text-[11px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                      Clear Rows
                    </button>
                  </div>
                  <div className="max-h-48 overflow-x-auto overflow-y-auto">
                    <table className="w-full text-[11px] text-slate-700 border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-mono">
                          {sheetRows[0]?.slice(0, 6).map((col, idx) => (
                            <th key={idx} className="p-2 border-r border-slate-200 text-left font-bold uppercase tracking-wider">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sheetRows.slice(1, 10).map((row, rIdx) => (
                          <tr key={rIdx} className="border-b border-slate-100 hover:bg-emerald-50/50">
                            {row.slice(0, 6).map((cell, cIdx) => (
                              <th key={cIdx} className="p-2 border-r border-slate-100 font-normal truncate max-w-[120px]">
                                {cell}
                              </th>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Confirm Clear Modal (Destructive operation confirmation) */}
          {showConfirmClear && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-3 text-left">
              <div className="flex items-center gap-2 text-red-800 font-bold text-xs">
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                <span>Confirm Clear Google Sheet Rows?</span>
              </div>
              <p className="text-xs text-red-700 font-light leading-relaxed">
                Are you sure you want to clear all dossier rows from range A2:Z500 in spreadsheet <strong className="font-mono">{spreadsheetId}</strong>? Header rows will be preserved.
              </p>
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleClearSheetConfirmed}
                  disabled={isClearing}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition cursor-pointer"
                >
                  {isClearing ? 'Clearing...' : 'Yes, Clear Rows'}
                </button>
                <button
                  onClick={() => setShowConfirmClear(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1 font-mono">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>OAuth 2.0 Encrypted Pipeline</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
}
