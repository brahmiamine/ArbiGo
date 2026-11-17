import type { Operation } from '@/domain/types';
/** Leave headroom below the API's 256 kB body limit, including multibyte text. */
export function operationBatch(operations: Operation[]): Operation[] {
  const batch: Operation[] = [];
  const encoder = new TextEncoder();
  for (const operation of operations.slice(0, 50)) {
    const next = [...batch, operation];
    if (encoder.encode(JSON.stringify({ operations: next })).byteLength > 240000) break;
    batch.push(operation);
  }
  return batch;
}
