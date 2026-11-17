'use client';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../app-provider';
import { createMatchDebrief, restoreDebriefForm, type DebriefForm } from '@/domain/debrief/schema';
import { createEmptyForm } from '@/domain/debrief/formModel';
import type { Match } from '@/domain/types';

/** Every edit starts an IndexedDB transaction immediately; there is no debounce to lose on navigation. */
export function useMatchDebrief(match: Match) {
  const app = useApp();
  const [form, setForm] = useState<DebriefForm>(() =>
    restoreDebriefForm(match.debrief?.form, createMatchDebrief(match, app.profile?.name ?? '')),
  );
  const current = useRef(form);
  const firstWrite = useRef(!match.debrief);
  const writes = useRef(new Set<Promise<void>>());
  const failed = useRef(false);
  const mounted = useRef(true);
  const [saveState, setSaveState] = useState(
    match.debrief ? 'Enregistré sur cet appareil' : 'Prêt à remplir',
  );
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  function persist(changes: Partial<DebriefForm>, next: DebriefForm) {
    current.current = next;
    setForm(next);
    setSaveState('Enregistrement…');
    const patch = firstWrite.current ? next : changes;
    firstWrite.current = false;
    const task = app
      .dispatch(match.id, { type: 'DEBRIEF', changes: patch })
      .catch(() => {
        failed.current = true;
      })
      .finally(() => {
        writes.current.delete(task);
        if (mounted.current && !writes.current.size)
          setSaveState(
            failed.current ? 'Enregistrement impossible' : 'Enregistré sur cet appareil',
          );
      });
    writes.current.add(task);
  }
  function update(name: keyof DebriefForm, value: string, index?: number) {
    const next =
      typeof index === 'number'
        ? {
            ...current.current,
            [name]: (current.current[name] as string[]).map((v, i) => (i === index ? value : v)),
          }
        : { ...current.current, [name]: value };
    persist({ [name]: next[name] }, next);
  }
  function updateMany(changes: Partial<DebriefForm>) {
    persist(changes, { ...current.current, ...changes });
  }
  function retry() {
    failed.current = false;
    persist(current.current, current.current);
  }
  async function flush() {
    await Promise.all([...writes.current]);
    return !failed.current;
  }
  function reset() {
    const empty = createEmptyForm();
    failed.current = false;
    persist(empty, empty);
  }
  return { form, update, updateMany, reset, retry, flush, saveState };
}
