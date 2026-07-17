import { get, set, keys, del } from 'idb-keyval';

export const OfflineDrafts = {
  async list() {
    const allKeys = await keys();
    const draftKeys = allKeys.filter(k => String(k).startsWith('offline_draft_'));
    const drafts = await Promise.all(draftKeys.map(async k => {
      const key = String(k);
      const draft = await get(k);
      return { id: key.replace('offline_draft_', ''), ...draft };
    }));
    return drafts.sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  },
  async get(id: string) {
    return get(`offline_draft_${id}`);
  },
  async save(id: string, draftData: any) {
    await set(`offline_draft_${id}`, {
      ...draftData,
      updatedAt: new Date().toISOString(),
      synced: false
    });
  },
  async delete(id: string) {
    await del(`offline_draft_${id}`);
  },
  async getAllUnsynced() {
    const allKeys = await keys();
    const unsynced: any[] = [];
    for (const k of allKeys) {
      const key = String(k);
      if (key.startsWith('offline_draft_')) {
        const draft = await get(k);
        if (draft && !draft.synced) unsynced.push({ id: key.replace('offline_draft_', ''), ...draft });
      }
    }
    return unsynced;
  },
  async markSynced(id: string) {
    const draft = await get(`offline_draft_${id}`);
    if (draft) {
      await set(`offline_draft_${id}`, { ...draft, synced: true });
    }
  }
};

export const SyncQueue = {
  async add(operation: any) {
    const queue = await get('sync_queue') || [];
    queue.push({ ...operation, queuedAt: new Date().toISOString() });
    await set('sync_queue', queue);
  },
  async getAll() {
    return await get('sync_queue') || [];
  },
  async remove(index: number) {
    const queue = await get('sync_queue') || [];
    queue.splice(index, 1);
    await set('sync_queue', queue);
  },
  async clear() {
    await del('sync_queue');
  }
};

export const OfflineCache = {
  async set(key: string, data: any) {
    await set(`cache_${key}`, { data, cachedAt: Date.now() });
  },
  async get(key: string, maxAge: number = 24 * 60 * 60 * 1000) {
    const entry = await get(`cache_${key}`);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > maxAge) return null;
    return entry.data;
  }
};
