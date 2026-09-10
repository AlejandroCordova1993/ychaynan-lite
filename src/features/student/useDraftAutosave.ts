import { useEffect, useRef } from 'react';

/** Programa guardados; la cola y el control de versiones pertenecen al editor. */
export function useDraftAutosave({
  enabled,
  schedule,
  dirty,
  revision,
  onSave,
}: {
  enabled: boolean;
  schedule: boolean;
  dirty: boolean;
  revision: Record<string, string>;
  onSave: () => void;
}) {
  const save = useRef(onSave);
  useEffect(() => {
    save.current = onSave;
  }, [onSave]);

  useEffect(() => {
    if (!enabled || !schedule) return;
    const timer = window.setTimeout(() => save.current(), 1500);
    return () => window.clearTimeout(timer);
  }, [enabled, schedule, revision]);

  useEffect(() => {
    if (!enabled || !dirty) return;
    const onOnline = () => save.current();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [enabled, dirty]);
}
