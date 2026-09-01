import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';

export function TeacherHomeScreen() {
  return (
    <div className="teacher-home stack--loose stack">
      <PageHeader
        eyebrow="Panel docente"
        title="Inicio docente"
        lead="Prepara el diagnóstico de lectura y escritura desde un espacio de trabajo sencillo. Elige una sección en el menú para continuar."
      />

      <section className="teacher-home__next card" aria-labelledby="teacher-next-title">
        <p className="mono-label">Siguiente paso</p>
        <div className="teacher-home__next-body">
          <div>
            <h2 id="teacher-next-title">Configura tus paralelos</h2>
            <p>
              Crea un paralelo e importa la nómina para dejar lista la base de tu evaluación
              diagnóstica.
            </p>
          </div>
          <Link className="button button--primary" to="/docente/paralelos">
            Abrir paralelos
          </Link>
        </div>
      </section>

      <section className="teacher-home__status" aria-label="Estado de la aplicación">
        <div>
          <span className="mono-label">Estado</span>
          <strong>Configuración inicial</strong>
        </div>
        <div>
          <span className="mono-label">Disponible</span>
          <strong>Paralelos y nómina</strong>
        </div>
        <div>
          <span className="mono-label">Siguiente módulo</span>
          <strong>Crear evaluación</strong>
        </div>
      </section>
    </div>
  );
}
