export function SkipLink({ targetId = 'contenido' }: { targetId?: string }) {
  return (
    <a
      className="skip-link"
      href={`#${targetId}`}
      onClick={(event) => {
        event.preventDefault();
        document.getElementById(targetId)?.focus();
      }}
    >
      Saltar al contenido
    </a>
  );
}
