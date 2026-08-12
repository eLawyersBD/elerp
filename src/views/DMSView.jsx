import React, { useState } from 'react';
import {
  FolderOpen, ExternalLink, RefreshCw, Maximize2, Minimize2,
  HardDrive, Info, Link2, Copy, CheckCheck, Users, Search, FolderPlus,
  Unplug, ShieldCheck, Loader2
} from 'lucide-react';
import { useGoogleDrive } from '../context/GoogleDriveContext';
import { PARENT_FOLDER_URL, PARENT_FOLDER_ID, buildFolderName } from '../utils/driveService';

const DRIVE_EMBED_LIST = `https://drive.google.com/embeddedfolderview?id=${PARENT_FOLDER_ID}#list`;
const DRIVE_EMBED_GRID = `https://drive.google.com/embeddedfolderview?id=${PARENT_FOLDER_ID}#grid`;

const DMSView = ({ customers = [], onSaveCustomer }) => {
  const { 
    driveConnected, 
    driveConnecting, 
    driveAutoConnecting, 
    driveWasConnected, 
    connectDrive, 
    reconnectDrive, 
    disconnectFromDrive, 
    createClientFolder,
    renameDriveFolder
  } = useGoogleDrive();

  const [viewMode, setViewMode] = useState('list');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('drive');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [creatingId, setCreatingId] = useState(null);
  const [isCreatingBulk, setIsCreatingBulk] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });

  const embedUrl = viewMode === 'list' ? DRIVE_EMBED_LIST : DRIVE_EMBED_GRID;

  const handleRefresh = () => setIframeKey(prev => prev + 1);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(PARENT_FOLDER_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredClients = customers.filter(c => {
    const fName = c.folderName || buildFolderName(c.id, c.name);
    return fName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.id?.toLowerCase().includes(searchTerm.toLowerCase())
  });

  const missingFolders = customers.filter(c => !c.driveFolderUrl);

  const handleCreateFolder = async (client) => {
    const folderName = client.folderName || buildFolderName(client.id, client.name);
    if (!driveConnected || !folderName) return;
    setCreatingId(client.id);
    try {
      const folderResult = await createClientFolder(folderName);
      if (folderResult && onSaveCustomer) {
        await onSaveCustomer({
          ...client,
          folderName,
          driveFolderUrl: folderResult.webViewLink,
          driveFolderName: folderName,
          driveLinkedAt: new Date().toISOString()
        }, true);
      }
    } catch (err) {
      console.error("Failed to create folder for", client.name, err);
      alert(`Failed to create folder for ${client.name}`);
    } finally {
      setCreatingId(null);
    }
  };

  const handleCreateBulkFolders = async () => {
    if (!driveConnected || missingFolders.length === 0) return;
    
    if (!window.confirm(`Are you sure you want to create ${missingFolders.length} missing folders? This might take a while depending on the number of clients.`)) return;

    setIsCreatingBulk(true);
    setBulkProgress({ current: 0, total: missingFolders.length });

    let successCount = 0;
    for (let i = 0; i < missingFolders.length; i++) {
      const client = missingFolders[i];
      const folderName = client.folderName || buildFolderName(client.id, client.name);
      setBulkProgress({ current: i + 1, total: missingFolders.length });
      
      try {
        const folderResult = await createClientFolder(folderName);
        if (folderResult && onSaveCustomer) {
          await onSaveCustomer({
            ...client,
            folderName,
            driveFolderUrl: folderResult.webViewLink,
            driveFolderName: folderName,
            driveLinkedAt: new Date().toISOString()
          }, true);
          successCount++;
        }
      } catch (err) {
        console.error("Failed to create folder for", client.name, err);
      }
      
      // Small delay to prevent API rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsCreatingBulk(false);
    alert(`Finished creating folders! Successfully created ${successCount} out of ${missingFolders.length} folders.`);
  };

  const handleSyncExistingFolders = async () => {
    if (!window.confirm(`This will update all client folder names in the database to the new format (sl no + name) and rename them in Google Drive if connected. Continue?`)) return;

    setIsSyncing(true);
    setSyncProgress({ current: 0, total: customers.length });

    let updatedCount = 0;
    for (let i = 0; i < customers.length; i++) {
      const client = customers[i];
      setSyncProgress({ current: i + 1, total: customers.length });

      const newName = buildFolderName(client.id, client.name);
      
      if (client.folderName !== newName) {
        try {
          // 1. Rename in Drive if linked and connected
          if (driveConnected && client.driveFolderUrl) {
            const folderId = client.driveFolderUrl.split('/').pop();
            if (folderId) {
              await renameDriveFolder(folderId, newName);
            }
          }

          // 2. Update in Database
          if (onSaveCustomer) {
            await onSaveCustomer({
              ...client,
              folderName: newName,
              ...(driveConnected && client.driveFolderUrl ? { driveFolderName: newName } : {})
            }, true);
            updatedCount++;
          }
        } catch (err) {
          console.error(`Failed to sync folder for ${client.name}:`, err);
        }
      }
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setIsSyncing(false);
    alert(`Finished syncing! Successfully updated ${updatedCount} client records.`);
  };

  return (
    <div className={`space-y-4 text-slate-800 dark:text-slate-100 ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-50 dark:bg-slate-900 p-6 overflow-auto' : ''}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <HardDrive size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Document Management System (DMS)</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Connected to Google Drive · E-Lawyers Company Folder</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle (only for drive tab) */}
          {activeTab === 'drive' && (
            <div className="flex bg-slate-200 dark:bg-slate-800 rounded-xl p-1">
              <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                ☰ List
              </button>
              <button onClick={() => setViewMode('grid')} className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                ⊞ Grid
              </button>
            </div>
          )}

          <button onClick={handleCopyLink} title="Copy folder link" className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black border transition-all ${copied ? 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 border-slate-350 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-500 hover:text-blue-500 dark:hover:text-blue-400'}`}>
            {copied ? <CheckCheck size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>

          <button onClick={handleRefresh} title="Refresh Drive" className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black border border-slate-350 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-500 hover:text-blue-500 dark:hover:text-blue-400 transition-all">
            <RefreshCw size={14} /> Refresh
          </button>

          <a href={PARENT_FOLDER_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black border border-blue-300 dark:border-blue-800 bg-blue-550/10 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-all">
            <ExternalLink size={14} /> Open in Drive
          </a>

          <button onClick={() => setIsFullscreen(prev => !prev)} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} className="p-2 rounded-xl border border-slate-350 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-all">
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Connection Actions */}
      <div className={`flex items-center gap-3 px-4 py-3 border rounded-2xl transition-colors ${
        driveConnected
          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50'
          : driveAutoConnecting
          ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/30'
          : driveWasConnected
          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50'
          : 'bg-blue-550/5 dark:bg-blue-950/40 border-blue-150 dark:border-blue-900/50'
      }`}>
        {driveConnected ? (
          <>
            <ShieldCheck size={15} className="text-emerald-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Authenticated with Google Drive</p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-500 font-medium truncate">App has access to manage and create folders automatically.</p>
            </div>
            <button
              onClick={disconnectFromDrive}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-[10px] font-black rounded-lg hover:bg-slate-350 dark:hover:bg-slate-700 transition-all shrink-0"
            >
              <Unplug size={12} /> Disconnect
            </button>
          </>
        ) : driveAutoConnecting ? (
          <>
            <Loader2 size={15} className="text-blue-500 dark:text-blue-400 shrink-0 animate-spin" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-blue-700 dark:text-blue-400">Reconnecting to Google Drive…</p>
              <p className="text-[11px] text-blue-600 dark:text-blue-500 font-medium truncate">Restoring your previous session automatically. Please wait.</p>
            </div>
          </>
        ) : driveWasConnected ? (
          <>
            <Info size={15} className="text-amber-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-400">Session Expired — Reconnect Required</p>
              <p className="text-[11px] text-amber-600 dark:text-amber-500 font-medium truncate">Your Google Drive session has expired. Click Reconnect to restore access instantly.</p>
            </div>
            <button
              onClick={reconnectDrive}
              disabled={driveConnecting}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white border-transparent text-[11px] font-black rounded-lg transition-all shadow-sm shrink-0 disabled:opacity-50"
            >
              <RefreshCw size={13} className={driveConnecting ? 'animate-spin' : ''} />
              {driveConnecting ? 'Reconnecting...' : 'Reconnect'}
            </button>
          </>
        ) : (
          <>
            <Info size={15} className="text-blue-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-blue-750 dark:text-blue-400">Enable Automatic Folder Creation</p>
              <p className="text-[11px] text-blue-600 dark:text-blue-500 font-medium truncate">Connect your Google account once — the app will reconnect automatically next time.</p>
            </div>
            <button
              onClick={connectDrive}
              disabled={driveConnecting}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#1a73e8] text-white border-transparent text-[11px] font-black rounded-lg hover:bg-[#1557b0] transition-all shadow-sm shrink-0 disabled:opacity-50"
            >
              <HardDrive size={13} /> {driveConnecting ? 'Connecting...' : 'Connect Google Drive'}
            </button>
          </>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex bg-slate-200 dark:bg-slate-800 rounded-2xl p-1.5 w-fit border border-slate-300 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('drive')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'drive' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
        >
          <HardDrive size={13} /> Drive Folder
        </button>
        <button
          onClick={() => setActiveTab('folders')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'folders' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
        >
          <Users size={13} /> Client Folders
          <span className="bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-[10px] font-black px-1.5 py-0.5 rounded-full">{customers.length}</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'drive' ? (
        <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm"
          style={{ height: isFullscreen ? 'calc(100vh - 280px)' : '68vh' }}
        >
          {/* Toolbar */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-800/40">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-6 h-6 bg-[#1a73e8] rounded-lg flex items-center justify-center shrink-0">
                <FolderOpen size={13} className="text-white" />
              </div>
              <div className="flex items-center gap-1 min-w-0">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest shrink-0">Drive</span>
                <span className="text-slate-400 dark:text-slate-600">/</span>
                <span className="text-xs font-black text-slate-700 dark:text-slate-300 truncate">E-Lawyers Company Folder</span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Link2 size={12} className="text-slate-400 dark:text-slate-500" />
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate max-w-[160px] hidden sm:block">{PARENT_FOLDER_ID}</span>
            </div>
          </div>
          <iframe
            key={iframeKey}
            src={embedUrl}
            title="E-Lawyers Google Drive Folder"
            className="w-full border-0 bg-white dark:bg-slate-900"
            style={{ height: 'calc(100% - 49px)' }}
            allow="autoplay"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          {/* Search & Bulk Action */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-100/30 dark:bg-slate-800/20">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search client folders..."
                className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            
            {driveConnected && missingFolders.length > 0 && (
              <button
                onClick={handleCreateBulkFolders}
                disabled={isCreatingBulk || isSyncing}
                className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-400 text-xs font-black rounded-xl transition-all border border-amber-200 dark:border-amber-900 whitespace-nowrap"
              >
                {isCreatingBulk ? <Loader2 size={14} className="animate-spin" /> : <FolderPlus size={14} />}
                {isCreatingBulk 
                  ? `Creating (${bulkProgress.current}/${bulkProgress.total})...` 
                  : `Create All Missing (${missingFolders.length})`}
              </button>
            )}

            <button
              onClick={handleSyncExistingFolders}
              disabled={isSyncing || isCreatingBulk}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-400 text-xs font-black rounded-xl transition-all border border-blue-200 dark:border-blue-900/55 whitespace-nowrap"
            >
              {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {isSyncing 
                ? `Syncing (${syncProgress.current}/${syncProgress.total})...` 
                : 'Sync Folder Names'}
            </button>
          </div>

          {/* Folder List */}
          <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-[60vh] overflow-y-auto">
            {filteredClients.length === 0 ? (
              <div className="py-12 text-center bg-white dark:bg-slate-900">
                <FolderOpen size={40} className="text-slate-400 dark:text-slate-700 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-400 dark:text-slate-500">No client folders found</p>
              </div>
            ) : (
              filteredClients.map(client => (
                <div key={client.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group bg-white dark:bg-slate-900">
                  {/* Folder Icon */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    client.driveFolderUrl ? 'bg-blue-100 dark:bg-blue-500/10' : 'bg-slate-100 dark:bg-slate-800'
                  }`}>
                    <FolderOpen size={18} className={client.driveFolderUrl ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'} />
                  </div>

                  {/* Folder Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-700 dark:text-slate-200 truncate font-mono">{client.folderName || buildFolderName(client.id, client.name)}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-500 font-medium truncate">{client.name} · {client.id}</p>
                  </div>

                  {/* Status + Action */}
                  <div className="flex items-center gap-2 shrink-0">
                    {client.driveFolderUrl ? (
                      <a
                        href={client.driveFolderUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 dark:bg-blue-500/10 hover:bg-blue-200 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-black rounded-xl transition-all"
                      >
                        <FolderOpen size={13} /> Open
                      </a>
                    ) : (
                      driveConnected ? (
                        <button
                          onClick={() => handleCreateFolder(client)}
                          disabled={creatingId === client.id || isCreatingBulk}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-400 text-xs font-black rounded-xl transition-all disabled:opacity-50"
                        >
                          {creatingId === client.id ? <Loader2 size={13} className="animate-spin" /> : <FolderPlus size={13} />}
                          {creatingId === client.id ? 'Creating...' : 'Auto Create'}
                        </button>
                      ) : (
                        <a
                          href={PARENT_FOLDER_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 dark:bg-amber-950/40 hover:bg-amber-200 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-500 text-xs font-black rounded-xl transition-all border border-amber-200 dark:border-amber-900/50"
                          title={`Create folder: ${client.folderName || buildFolderName(client.id, client.name)}`}
                        >
                          <FolderPlus size={13} /> Create
                        </a>
                      )
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/10 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <p className="text-[11px] text-slate-500 font-medium">{filteredClients.length} client folders</p>
            <a href={PARENT_FOLDER_URL} target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center gap-1">
              Open Company Folder <ExternalLink size={11} />
            </a>
          </div>
        </div>
      )}

      {/* Footer */}
      <p className="text-[11px] text-slate-500 dark:text-slate-500 text-center font-medium">
        Files are managed directly in Google Drive. Client folders are automatically named and listed here.
        <a href={PARENT_FOLDER_URL} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline ml-1">
          Open Drive folder ↗
        </a>
      </p>
    </div>
  );
};

export default DMSView;
