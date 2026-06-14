import { get, set, keys, del } from 'idb-keyval';

// Offline draft storage
export const OfflineDrafts = {
  async list() {
    const allKeys = await keys();
    const draftKeys = allKeys.filter(k => k.startsWith('offline_draft_'));
    const drafts = await Promise.all(draftKeys.map(async k => {
      const draft = await get(k);
      return { id: k.replace('offline_draft_', ''), ...draft };
    }));
    return drafts.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  },
  async get(id) {
    return get(`offline_draft_${id}`);
  },
  async save(id, draftData) {
    await set(`offline_draft_${id}`, {
      ...draftData,
      updatedAt: new Date().toISOString(),
      synced: false
    });
  },
  async delete(id) {
    await del(`offline_draft_${id}`);
  },
  async getAllUnsynced() {
    const allKeys = await keys();
    const unsynced = [];
    for (const k of allKeys) {
      if (k.startsWith('offline_draft_')) {
        const draft = await get(k);
        if (draft && !draft.synced) unsynced.push({ id: k.replace('offline_draft_', ''), ...draft });
      }
    }
    return unsynced;
  },
  async markSynced(id) {
    const draft = await get(`offline_draft_${id}`);
    if (draft) {
      await set(`offline_draft_${id}`, { ...draft, synced: true });
    }
  }
};

// Offline sync queue (for write operations when offline)
export const SyncQueue = {
  async add(operation) {
    const queue = await get('sync_queue') || [];
    queue.push({ ...operation, queuedAt: new Date().toISOString() });
    await set('sync_queue', queue);
  },
  async getAll() {
    return await get('sync_queue') || [];
  },
  async remove(index) {
    const queue = await get('sync_queue') || [];
    queue.splice(index, 1);
    await set('sync_queue', queue);
  },
  async clear() {
    await del('sync_queue');
  }
};

// Cached API data
export const OfflineCache = {
  async set(key, data) {
    await set(`cache_${key}`, { data, cachedAt: Date.now() });
  },
  async get(key, maxAge = 24 * 60 * 60 * 1000) {
    const entry = await get(`cache_${key}`);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > maxAge) return null;
    return entry.data;
  }
};
