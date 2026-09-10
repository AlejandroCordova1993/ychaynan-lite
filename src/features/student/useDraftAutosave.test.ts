import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useDraftAutosave } from './useDraftAutosave';

afterEach(() => vi.useRealTimers());

it('cancela el guardado y la reconexión mientras hay conflicto o entrega en curso', async () => {
  vi.useFakeTimers();
  const save = vi.fn();
  const { rerender } = renderHook(
    ({ enabled }) =>
      useDraftAutosave({
        enabled,
        dirty: true,
        schedule: true,
        revision: { q1: 'texto' },
        onSave: save,
      }),
    { initialProps: { enabled: true } },
  );
  await act(() => vi.advanceTimersByTimeAsync(500));
  rerender({ enabled: false });
  await act(() => vi.advanceTimersByTimeAsync(2000));
  act(() => window.dispatchEvent(new Event('online')));
  expect(save).not.toHaveBeenCalled();
});

it('retira temporizador y eventos al abandonar la pantalla', async () => {
  vi.useFakeTimers();
  const save = vi.fn();
  const { unmount } = renderHook(() =>
    useDraftAutosave({
      enabled: true,
      dirty: true,
      schedule: true,
      revision: { q1: 'texto' },
      onSave: save,
    }),
  );
  unmount();
  await act(() => vi.advanceTimersByTimeAsync(2000));
  act(() => window.dispatchEvent(new Event('online')));
  expect(save).not.toHaveBeenCalled();
});
