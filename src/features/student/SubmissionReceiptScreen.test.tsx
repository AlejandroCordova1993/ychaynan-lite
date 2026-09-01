import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it } from 'vitest';
import { saveLocalDraft } from './draftStorage';
import { saveSubmissionReceipt } from './submissionReceiptStorage';
import { saveStudentSession } from './studentSessionStorage';
import { SubmissionReceiptScreen } from './SubmissionReceiptScreen';

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

it('muestra el recibo sin resultados y limpia solo al pulsar finalizar', async () => {
  saveStudentSession('diag', {
    token: 'token-seguro-de-prueba-con-longitud-suficiente',
    expiresAt: '2099-09-01T00:00:00.000Z',
    clientSubmissionKey: 'key',
    submissionId: 'sub-1',
    draftVersion: 2,
  });
  saveLocalDraft('diag', { q1: 'respuesta' });
  saveSubmissionReceipt('diag', {
    receiptId: 'sub-1',
    submittedAt: '2026-09-01T12:00:00.000Z',
    finalDraftVersion: 2,
  });
  render(<SubmissionReceiptScreen slug="diag" />);
  expect(screen.getByText('Entrega recibida')).toBeInTheDocument();
  expect(screen.queryByText(/puntaje|resultado|retroalimentación/i)).not.toBeInTheDocument();
  expect(sessionStorage.length).toBeGreaterThan(0);
  await userEvent.click(screen.getByRole('button', { name: 'Finalizar y limpiar este equipo' }));
  expect(sessionStorage.getItem('ychaynan-lite:v1:session:diag')).toBeNull();
  expect(localStorage.getItem('ychaynan-lite:v1:draft:diag')).toBeNull();
});
