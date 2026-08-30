import { Link } from 'react-router-dom';

export function TeacherHomeScreen() {
  return (
    <main>
      <h1>Inicio docente</h1>
      <p>Esta pantalla se implementará en una fase posterior.</p>
      <nav aria-label="Cuenta docente">
        <Link to="/docente/cambiar-contrasena">Cambiar contraseña</Link>
      </nav>
    </main>
  );
}
