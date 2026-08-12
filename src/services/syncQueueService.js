// Offline Synchronization Queue Service
const QUEUE_KEY = 'erp_offline_sync_queue';

export const syncQueueService = {
  // Retrieve current sync queue from localStorage
  getQueue: () => {
    try {
      const queue = localStorage.getItem(QUEUE_KEY);
      return queue ? JSON.parse(queue) : [];
    } catch (e) {
      console.error('Failed to parse offline sync queue:', e);
      return [];
    }
  },

  // Save sync queue back to localStorage
  saveQueue: (queue) => {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  },

  // Add an operation to the sync queue
  addToQueue: (url, method, body, table = '') => {
    const queue = syncQueueService.getQueue();
    // Prevent duplicate pending entries for the same ID/operation if appropriate
    const id = `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newEntry = {
      id,
      url,
      method,
      body,
      table: table || url.split('/').pop() || 'Unknown',
      timestamp: new Date().toISOString(),
      status: 'Pending',
      attempts: 0
    };
    queue.push(newEntry);
    syncQueueService.saveQueue(queue);
    console.log(`[Sync Queue] Added offline request to queue: ${method} ${url}`);
    return newEntry;
  },

  // Process the queue and attempt to sync pending items
  processQueue: async () => {
    const queue = syncQueueService.getQueue();
    const pending = queue.filter(item => item.status === 'Pending' || item.status === 'Failed');
    if (pending.length === 0) return { success: true, syncedCount: 0 };

    let syncedCount = 0;
    const updatedQueue = [...queue];

    for (const item of pending) {
      const idx = updatedQueue.findIndex(q => q.id === item.id);
      if (idx === -1) continue;

      updatedQueue[idx].attempts += 1;
      try {
        const response = await fetch(item.url, {
          method: item.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.body)
        });

        if (response.ok) {
          updatedQueue[idx].status = 'Synced';
          syncedCount++;
        } else {
          updatedQueue[idx].status = 'Failed';
          updatedQueue[idx].error = `Server error: ${response.status} ${response.statusText}`;
        }
      } catch (err) {
        updatedQueue[idx].status = 'Failed';
        updatedQueue[idx].error = err.message || 'Network unreachable';
      }
    }

    // Keep history but clean up very old items if needed
    // For simplicity, we can keep the entries or clean up successfully synced items after 30 seconds
    syncQueueService.saveQueue(updatedQueue);
    return { success: true, syncedCount };
  },

  // Clear all items in the queue
  clearQueue: () => {
    syncQueueService.saveQueue([]);
  },

  // Remove a single item from the queue
  removeItem: (id) => {
    const queue = syncQueueService.getQueue();
    const filtered = queue.filter(item => item.id !== id);
    syncQueueService.saveQueue(filtered);
  }
};
