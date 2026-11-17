import { openDB, deleteDB, type DBSchema } from 'idb';
import { applyOperation } from '@/domain/match';
import type { Match, OperationInput, Operation, Inventory } from '@/domain/types';
interface Queued {
  id: string;
  operation: Operation;
  status: 'PENDING' | 'CONFLICT' | 'QUARANTINED';
  reason?: string;
  serverMatch?: Match;
  sequence: number;
}
interface LocalDatabase extends DBSchema {
  matches: { key: string; value: Match };
  operations: { key: string; value: Queued };
  meta: { key: string; value: Inventory | number };
  cache: { key: string; value: unknown };
}
export class LocalStore {
  private database;
  constructor(public readonly userId: string) {
    this.database = openDB<LocalDatabase>(`arbigo-v1-${userId}`, 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('matches'))
          db.createObjectStore('matches', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('operations'))
          db.createObjectStore('operations', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
        if (!db.objectStoreNames.contains('cache')) db.createObjectStore('cache');
      },
    });
  }
  async putMatch(m: Match) {
    const db = await this.database;
    await db.put('matches', m);
  }
  async matches() {
    return (await this.database).getAll('matches');
  }
  async queued() {
    return (await (await this.database).getAll('operations')).sort(
      (a, b) => a.sequence - b.sequence,
    );
  }
  async pending() {
    return (await this.queued()).filter((q) => q.status === 'PENDING').map((q) => q.operation);
  }
  async conflicts() {
    return (await this.queued()).filter((q) => q.status !== 'PENDING');
  }
  async dispatch(id: string, deviceId: string, action: OperationInput) {
    const db = await this.database;
    const tx = db.transaction(['matches', 'operations', 'meta'], 'readwrite');
    const m = await tx.objectStore('matches').get(id);
    if (!m) throw new Error('MATCH_UNKNOWN');
    const sequence = (((await tx.objectStore('meta').get('sequence')) as number) ?? 0) + 1;
    const operation: Operation = {
      id: crypto.randomUUID(),
      matchId: id,
      deviceId,
      expectedVersion: m.version,
      fencingVersion: m.fencingVersion,
      occurredAt: new Date().toISOString(),
      action,
    };
    const next = applyOperation(m, operation);
    await tx.objectStore('matches').put(next);
    await tx
      .objectStore('operations')
      .put({ id: operation.id, operation, status: 'PENDING', sequence });
    await tx.objectStore('meta').put(sequence, 'sequence');
    await tx.done;
    return { match: next, operation };
  }
  async acknowledge(id: string, serverMatch: Match) {
    const db = await this.database,
      tx = db.transaction(['matches', 'operations'], 'readwrite');
    await tx.objectStore('operations').delete(id);
    const queue = (await tx.objectStore('operations').getAll())
      .filter((q) => q.status === 'PENDING' && q.operation.matchId === serverMatch.id)
      .sort((a, b) => a.sequence - b.sequence);
    let next = serverMatch;
    for (const q of queue) {
      try {
        next = applyOperation(next, q.operation);
      } catch {
        await tx
          .objectStore('operations')
          .put({ ...q, status: 'CONFLICT', reason: 'VERSION_CONFLICT', serverMatch });
      }
    }
    await tx.objectStore('matches').put(next);
    await tx.done;
  }
  async markConflict(id: string, reason: string, serverMatch?: Match) {
    const db = await this.database;
    const row = await db.get('operations', id);
    if (row)
      await db.put('operations', {
        ...row,
        status: reason === 'DEVICE_REVOKED' ? 'QUARANTINED' : 'CONFLICT',
        reason,
        serverMatch,
      });
  }
  async adoptServer(match: Match) {
    const db = await this.database,
      tx = db.transaction(['matches', 'operations'], 'readwrite');
    for (const q of await tx.objectStore('operations').getAll()) {
      if (q.operation.matchId === match.id)
        await tx.objectStore('operations').put({
          ...q,
          status: 'QUARANTINED',
          reason: q.reason ?? 'USER_ADOPTED_SERVER',
          serverMatch: match,
        });
    }
    await tx.objectStore('matches').put(match);
    await tx.done;
  }
  async bootstrap(matches: Match[]) {
    const pending = new Set(
      (await this.queued())
        .filter((q) => q.status !== 'QUARANTINED')
        .map((q) => q.operation.matchId),
    );
    for (const m of matches) if (!pending.has(m.id)) await this.putMatch(m);
  }
  async inventory() {
    const value = await (await this.database).get('meta', 'inventory');
    return typeof value === 'object' ? value : undefined;
  }
  async putInventory(inventory: Inventory) {
    await (await this.database).put('meta', inventory, 'inventory');
  }
  async cached<T>(key: string) {
    return (await (await this.database).get('cache', key)) as T | undefined;
  }
  async cache(key: string, value: unknown) {
    await (await this.database).put('cache', value, key);
  }
  async media(id: string) {
    const hit = await this.cached<Blob>(`media:${id}`);
    if (hit) return hit;
    const response = await fetch(`/api/media/${id}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('MEDIA_UNAVAILABLE');
    const blob = await response.blob();
    await this.cache(`media:${id}`, blob);
    return blob;
  }
  async clear() {
    (await this.database).close();
    await deleteDB(`arbigo-v1-${this.userId}`);
  }
}
