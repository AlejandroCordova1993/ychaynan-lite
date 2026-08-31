import { BrandMark } from './BrandMark';

/**
 * Contenido de la marca. El espacio entre el nombre y la etiqueta es
 * intencional: sin él el nombre accesible se lee «YchayñanLite» de corrido.
 * En un contenedor flex ese espacio no altera la separación visual, que la
 * define `gap`.
 */
export function BrandLockup() {
  return (
    <>
      <BrandMark className="brand__mark" />
      <span className="brand__name">Ychayñan</span> <span className="brand__tag">Lite</span>
    </>
  );
}
