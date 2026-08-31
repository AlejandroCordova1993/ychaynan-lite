import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';

interface HomeSection {
  title: string;
  description: string;
  /** Solo las secciones ya implementadas tienen destino. */
  to?: string;
}

const SECTIONS: readonly HomeSection[] = [
  {
    title: 'Paralelos y nómina',
    description: 'Crea paralelos e importa la nómina desde un archivo CSV.',
    to: '/docente/paralelos',
  },
  { title: 'Crear evaluación', description: 'Lectura, preguntas y ventana de acceso.' },
  { title: 'Distribuir accesos', description: 'Códigos por estudiante y control de la ventana.' },
  { title: 'Respuestas', description: 'Bandeja de entregas y revisión individual.' },
  { title: 'Resumen diagnóstico', description: 'Perfil del paralelo y del curso.' },
  { title: 'Exportar', description: 'CSV y JSON con manifiesto de la campaña.' },
];

export function TeacherHomeScreen() {
  return (
    <div className="stack--loose stack">
      <PageHeader
        eyebrow="Panel docente"
        title="Inicio docente"
        lead="Prepara el diagnóstico de lectura y escritura. Hoy está disponible la gestión de paralelos y nómina; el resto del recorrido se habilitará por fases."
      />

      <section className="stack" aria-label="Secciones del diagnóstico">
        <ul className="section-list">
          {SECTIONS.map((section, index) => (
            <li key={section.title} className="section-row">
              <span className="section-row__index" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div className="section-row__body">
                <h2 className="section-row__title">
                  {section.to ? <Link to={section.to}>{section.title}</Link> : section.title}
                </h2>
                <p className="section-row__text">{section.description}</p>
              </div>
              <div className="section-row__meta">
                {section.to ? (
                  <span className="section-row__status section-row__status--available">
                    Disponible
                  </span>
                ) : (
                  <span className="section-row__status">En construcción</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
