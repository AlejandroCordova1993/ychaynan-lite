import { describe, expect, it } from 'vitest';
import { createSupabaseClient } from './client';

describe('createSupabaseClient', () => {
  it('lanza un error si falta la URL', () => {
    expect(() => createSupabaseClient('', 'anon-key')).toThrow(/obligatorias/);
  });

  it('lanza un error si falta la clave anónima', () => {
    expect(() => createSupabaseClient('https://example.supabase.co', '')).toThrow(/obligatorias/);
  });

  it('crea un cliente cuando ambos valores están presentes', () => {
    const client = createSupabaseClient('https://example.supabase.co', 'anon-key');
    expect(client).toBeTruthy();
  });
});
