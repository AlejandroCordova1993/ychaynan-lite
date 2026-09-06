import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { StudentLayout } from './StudentLayout';

it('mueve el foco al contenido sin reemplazar la ruta de HashRouter', async () => {
  window.location.hash = '#/evaluacion/diag';
  const user = userEvent.setup();
  render(
    <StudentLayout>
      <p>Contenido</p>
    </StudentLayout>,
  );
  await user.click(screen.getByRole('link', { name: 'Saltar al contenido' }));
  expect(window.location.hash).toBe('#/evaluacion/diag');
  expect(screen.getByRole('main')).toHaveFocus();
});
