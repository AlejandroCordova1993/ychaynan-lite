import { beforeEach, expect, it } from 'vitest';
import { loadSubmissionReceipt, saveSubmissionReceipt } from './submissionReceiptStorage';

beforeEach(() => sessionStorage.clear());
it('conserva el recibo necesario para la pantalla final', () => {
  const receipt = {
    receiptId: 'sub-1',
    submittedAt: '2026-09-04T07:54:55.402851-05:00',
    finalDraftVersion: 2,
  };
  saveSubmissionReceipt('diag', receipt);
  expect(loadSubmissionReceipt('diag')).toEqual(receipt);
});
