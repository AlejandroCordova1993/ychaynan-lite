import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearStudentSession,
  loadStudentSession,
  saveStudentSession,
} from './studentSessionStorage';

describe('studentSessionStorage', () => {
  beforeEach(() => sessionStorage.clear());

  it('guarda por evaluación y recupera el contrato completo', () => {
    const value = {
      token: 'token-seguro-de-prueba-con-longitud-suficiente',
      expiresAt: '2099-09-01T12:00:00.000+00:00',
      clientSubmissionKey: 'key',
      submissionId: 'submission',
      draftVersion: 0,
    };
    saveStudentSession('diagnostico', value);
    expect(loadStudentSession('diagnostico')).toEqual(value);
    clearStudentSession('diagnostico');
    expect(loadStudentSession('diagnostico')).toBeNull();
  });

  it('descarta datos inválidos o vencidos', () => {
    sessionStorage.setItem('ychaynan-lite:v1:session:diagnostico', '{"token":"x"}');
    expect(loadStudentSession('diagnostico')).toBeNull();
  });
});
