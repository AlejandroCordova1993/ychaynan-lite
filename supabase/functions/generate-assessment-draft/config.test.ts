import { describe, expect, it } from 'vitest';
import {
  DEFAULT_AI_TIMEOUT_MS,
  DEFAULT_DEEPSEEK_MODEL,
  MAX_AI_TIMEOUT_MS,
  MIN_AI_TIMEOUT_MS,
  resolveModel,
  resolveTimeoutMs,
} from './config.ts';

describe('resolveTimeoutMs', () => {
  it('usa 90000 milisegundos cuando la variable no está definida', () => {
    expect(DEFAULT_AI_TIMEOUT_MS).toBe(90_000);
    expect(resolveTimeoutMs(undefined)).toBe(90_000);
    expect(resolveTimeoutMs(null)).toBe(90_000);
    expect(resolveTimeoutMs('')).toBe(90_000);
    expect(resolveTimeoutMs('   ')).toBe(90_000);
  });

  it('vuelve al valor predeterminado de forma determinista ante un valor inválido', () => {
    for (const invalido of ['abc', '30s', '12.5', '1e4', '0x2710', 'NaN', 'Infinity', '  9 000 ']) {
      expect(resolveTimeoutMs(invalido), invalido).toBe(DEFAULT_AI_TIMEOUT_MS);
    }
  });

  it('rechaza cero y valores negativos', () => {
    expect(resolveTimeoutMs('0')).toBe(DEFAULT_AI_TIMEOUT_MS);
    expect(resolveTimeoutMs('-1')).toBe(DEFAULT_AI_TIMEOUT_MS);
    expect(resolveTimeoutMs('-90000')).toBe(DEFAULT_AI_TIMEOUT_MS);
  });

  it('acepta únicamente el intervalo razonable de 5000 a 120000 milisegundos', () => {
    expect(MIN_AI_TIMEOUT_MS).toBe(5_000);
    expect(MAX_AI_TIMEOUT_MS).toBe(120_000);

    expect(resolveTimeoutMs('4999')).toBe(DEFAULT_AI_TIMEOUT_MS);
    expect(resolveTimeoutMs('120001')).toBe(DEFAULT_AI_TIMEOUT_MS);
    expect(resolveTimeoutMs('5000')).toBe(5_000);
    expect(resolveTimeoutMs('120000')).toBe(120_000);
    expect(resolveTimeoutMs('45000')).toBe(45_000);
    expect(resolveTimeoutMs(' 30000 ')).toBe(30_000);
  });
});

describe('resolveModel', () => {
  it('usa deepseek-v4-flash como modelo predeterminado', () => {
    expect(DEFAULT_DEEPSEEK_MODEL).toBe('deepseek-v4-flash');
    expect(resolveModel(undefined)).toBe('deepseek-v4-flash');
    expect(resolveModel(null)).toBe('deepseek-v4-flash');
    expect(resolveModel('')).toBe('deepseek-v4-flash');
    expect(resolveModel('   ')).toBe('deepseek-v4-flash');
  });

  it('conserva DEEPSEEK_MODEL como anulación opcional', () => {
    expect(resolveModel('deepseek-v4-pro')).toBe('deepseek-v4-pro');
    expect(resolveModel('  deepseek-v4-pro  ')).toBe('deepseek-v4-pro');
  });
});
