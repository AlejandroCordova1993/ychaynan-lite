import { describe, expect, it } from 'vitest';
import { generateAssessmentDraftWithProvider } from './provider.ts';

describe('generateAssessmentDraftWithProvider · configuración', () => {
  it('rechaza una configuración sin clave sin intentar una solicitud externa', async () => {
    let called = false;
    const fetchImpl = async () => {
      called = true;
      throw new Error('no debe llamarse');
    };

    await expect(
      generateAssessmentDraftWithProvider(
        {
          readingText: 'Lectura breve.',
          questionCount: 1,
          focus: 'balanced',
        },
        { apiKey: '', model: 'deepseek-chat', timeoutMs: 1_000 },
        fetchImpl,
      ),
    ).rejects.toThrow('provider unavailable');
    expect(called).toBe(false);
  });
});
