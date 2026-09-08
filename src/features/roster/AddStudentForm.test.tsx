import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { AddStudentForm } from './AddStudentForm';
import { addStudent } from '../../lib/api/students';
vi.mock('../../lib/supabase/client', () => ({ getSupabaseClient: () => ({}) }));
vi.mock('../../lib/api/students');
it('añade en el paralelo elegido y explica el paso de generar acceso', async () => {
  vi.mocked(addStudent).mockResolvedValue(undefined);
  render(<AddStudentForm groupId="g" />);
  await userEvent.type(screen.getByLabelText('Nombre completo del estudiante'), 'Ana Ruiz');
  await userEvent.click(screen.getByRole('button', { name: 'Añadir estudiante' }));
  expect(await screen.findByText(/Estudiante añadido a la nómina/)).toBeInTheDocument();
  expect(addStudent).toHaveBeenCalledWith({}, 'g', 'Ana Ruiz');
  expect(screen.getByLabelText('Nombre completo del estudiante')).toHaveValue('');
});
it('conserva el nombre cuando falla el guardado', async () => {
  vi.mocked(addStudent).mockRejectedValue(new Error('Ya existe un estudiante con ese nombre.'));
  render(<AddStudentForm groupId="g" />);
  await userEvent.type(screen.getByLabelText('Nombre completo del estudiante'), 'Ana Ruiz');
  await userEvent.click(screen.getByRole('button', { name: 'Añadir estudiante' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Ya existe');
  expect(screen.getByLabelText('Nombre completo del estudiante')).toHaveValue('Ana Ruiz');
});
