// Configuración del asistente resuelta de forma determinista: cualquier valor inválido
// vuelve al predeterminado en lugar de propagar NaN o un tiempo de espera absurdo.

/** Modelo vigente de DeepSeek para generación estructurada (`deepseek-chat` ya no existe). */
export const DEFAULT_DEEPSEEK_MODEL = 'deepseek-v4-flash';

export const DEFAULT_AI_TIMEOUT_MS = 90_000;
export const MIN_AI_TIMEOUT_MS = 5_000;
export const MAX_AI_TIMEOUT_MS = 120_000;

const POSITIVE_INTEGER = /^[0-9]+$/;

export function resolveTimeoutMs(raw: string | null | undefined): number {
  const value = raw?.trim() ?? '';
  if (!POSITIVE_INTEGER.test(value)) return DEFAULT_AI_TIMEOUT_MS;

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) return DEFAULT_AI_TIMEOUT_MS;
  if (parsed < MIN_AI_TIMEOUT_MS || parsed > MAX_AI_TIMEOUT_MS) return DEFAULT_AI_TIMEOUT_MS;
  return parsed;
}

export function resolveModel(raw: string | null | undefined): string {
  return raw?.trim() || DEFAULT_DEEPSEEK_MODEL;
}
