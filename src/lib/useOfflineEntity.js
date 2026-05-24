import { useState, useEffect, useCallback } from 'react';
import { db } from './offlineDb';
import { base44 } from '@/api/base44Client';
import { syncManager } from './syncManager';

/**
 * useOfflineEntity - offline-first data hook
 *
 * Usage:
 *   const { data, loading, create, update, remove } = useOfflineEntity('SavingsPocket', { user_id: userId });
 *
 * - Reads from local IndexedDB immediately (fast, works offline)
 * - Also fetches from server when online and merges (server wins on conflict)
 * - Writes go to local DB first, then to server if online, else queued in outbox
 */
export function useOfflineEntity(entityName, filter = {}, sortField = '-updated_date') {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const table = db[entityName];
  const entityClient = base44.entities[entityName];

  // Read from local DB
  const readLocal = useCallback(async () => {
    if (!table) return [];
    let query = table;
    const filterKeys = Object.keys(filter);
    if (filterKeys.length > 0) {
      // Apply first filter key via index, rest via JS filter
      const [firstKey, ...restKeys] = filterKeys;
      query = table.where(firstKey).equals(filter[firstKey]);
      let results = await query.toArray();
      for (const key of restKeys) {
        results = results.filter(r => r[key] === filter[key]);
      }
      return results;
    }
    return table.toArray();
  }, [entityName, JSON.stringify(filter)]);

  // Initial load from local DB
  useEffect(() => {
    setLoading(true);
    readLocal().then(records => {
      // Sort
      const field = sortField.replace(/^-/, '');
      const desc = sortField.startsWith('-');
      const sorted = [...records].sort((a, b) => {
        if (a[field] < b[field]) return desc ? 1 : -1;
        if (a[field] > b[field]) return desc ? -1 : 1;
        return 0;
      });
      setData(sorted);
      setLoading(false);
    });

    // Check pending outbox count
    db._outbox.where('synced_at').equals('').count().then(setPendingCount);
  }, [entityName, JSON.stringify(filter)]);

  // Live subscription to local DB changes
  useEffect(() => {
    if (!table) return;
    // Re-read whenever local DB changes (Dexie observable alternative: polling on sync)
    const unsub = syncManager.subscribe(({ status }) => {
      if (status === 'synced') {
        readLocal().then(records => {
          const field = sortField.replace(/^-/, '');
          const desc = sortField.startsWith('-');
          const sorted = [...records].sort((a, b) => {
            if (a[field] < b[field]) return desc ? 1 : -1;
            if (a[field] > b[field]) return desc ? -1 : 1;
            return 0;
          });
          setData(sorted);
        });
        db._outbox.where('synced_at').equals('').count().then(setPendingCount);
      }
    });
    return unsub;
  }, [entityName, JSON.stringify(filter)]);

  // CREATE
  const create = useCallback(async (newData) => {
    const tempId = `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const record = { ...newData, id: tempId, created_date: new Date().toISOString(), updated_date: new Date().toISOString() };

    // Optimistic local write
    if (table) await table.put(record);
    setData(prev => [record, ...prev]);

    if (navigator.onLine && entityClient) {
      const saved = await entityClient.create(newData);
      // Replace temp record with real one
      if (table) {
        await table.delete(tempId);
        await table.put(saved);
      }
      setData(prev => prev.map(r => r.id === tempId ? saved : r));
      return saved;
    } else {
      await syncManager.queueMutation(entityName, 'create', newData);
      return record;
    }
  }, [entityName, table, entityClient]);

  // UPDATE
  const update = useCallback(async (id, updates) => {
    const existing = await table?.get(id);
    const updated = { ...existing, ...updates, updated_date: new Date().toISOString() };

    // Optimistic local write
    if (table) await table.put(updated);
    setData(prev => prev.map(r => r.id === id ? updated : r));

    if (navigator.onLine && entityClient) {
      const saved = await entityClient.update(id, updates);
      if (table) await table.put(saved);
      setData(prev => prev.map(r => r.id === id ? saved : r));
      return saved;
    } else {
      await syncManager.queueMutation(entityName, 'update', updates, id);
      return updated;
    }
  }, [entityName, table, entityClient]);

  // DELETE
  const remove = useCallback(async (id) => {
    if (table) await table.delete(id);
    setData(prev => prev.filter(r => r.id !== id));

    if (navigator.onLine && entityClient) {
      await entityClient.delete(id);
    } else {
      await syncManager.queueMutation(entityName, 'delete', {}, id);
    }
  }, [entityName, table, entityClient]);

  return { data, loading, create, update, remove, pendingCount };
}

export default useOfflineEntity;