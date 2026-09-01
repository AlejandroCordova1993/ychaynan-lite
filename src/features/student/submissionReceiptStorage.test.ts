import { beforeEach, expect, it } from 'vitest';
import { loadSubmissionReceipt, saveSubmissionReceipt } from './submissionReceiptStorage';

beforeEach(() => sessionStorage.clear());
it('conserva el recibo necesario para la pantalla final', () => {
  const receipt = {
    receiptId: 'sub-1',
    submittedAt: '2026-09-01T12:00:00.000Z',
    finalDraftVersion: 2,
  };
  saveSubmissionReceipt('diag', receipt);
  expect(loadSubmissionReceipt('diag')).toEqual(receipt);
});
