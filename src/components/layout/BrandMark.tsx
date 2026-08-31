/**
 * Marca propia de Ychayñan Lite (guía §20: identidad diseñada desde cero, sin
 * reproducir la de Ecuafuturo). El trazo escalonado evoca el «ñan» —camino— que
 * asciende hasta un punto: el saber al que lleva el recorrido diagnóstico.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      role="presentation"
    >
      <path
        d="M2.5 21h5.5v-5h5.5v-5h5.5V7"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="19" cy="3.6" r="2.6" fill="var(--signal)" />
    </svg>
  );
}
