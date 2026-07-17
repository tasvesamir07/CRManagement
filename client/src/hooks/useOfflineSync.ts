import { useEffect } from 'react';
import { OfflineDrafts } from '../services/offline';
import { announcementsAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function useOfflineSync(isOnline: boolean) {
  useEffect(() => {
    if (!isOnline) return;

    const syncDrafts = async () => {
      try {
        const unsynced = await OfflineDrafts.getAllUnsynced();
        if (unsynced.length === 0) return;

        toast.loading(`Back online! Syncing ${unsynced.length} offline draft(s)...`, { id: 'sync-toast' });

        let successCount = 0;
        for (const draft of unsynced) {
          try {
            const payload = {
              title: draft.title, content: draft.content,
              category: draft.category || 'general',
              course_id: draft.course_id || null,
              sections: draft.sections || [],
              platform_ids: draft.platform_ids || [],
              scheduled_at: draft.scheduled_at || null,
              status: draft.status || 'draft',
              files: draft.files || []
            };
            if (draft.id && !draft.id.startsWith('local_')) {
              await announcementsAPI.update(draft.id, payload);
            } else {
              await announcementsAPI.create(payload);
            }
            await OfflineDrafts.delete(draft.id);
            successCount++;
          } catch (err) {
            console.error('Failed to sync draft:', draft.id, err);
          }
        }

        if (successCount > 0) {
          toast.success(`${successCount} offline draft(s) synced successfully!`, { id: 'sync-toast' });
          window.dispatchEvent(new CustomEvent('offline-drafts-synced'));
        } else {
          toast.dismiss('sync-toast');
        }
      } catch (err) {
        console.error('Sync drafts failed:', err);
        toast.dismiss('sync-toast');
      }
    };

    syncDrafts();
  }, [isOnline]);
}
