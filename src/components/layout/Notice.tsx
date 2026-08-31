import type { ReactNode } from 'react';

export type NoticeTone = 'error' | 'success' | 'warning' | 'info';

/**
 * El glifo acompaña siempre al color para que el tono del aviso no dependa
 * únicamente del color (guía §20). Es decorativo: el texto del aviso ya dice
 * qué ocurrió, así que se oculta a lectores de pantalla.
 */
const GLYPHS: Record<NoticeTone, string> = {
  error: '!',
  success: '✓',
  warning: '!',
  info: 'i',
};

export interface NoticeProps {
  tone: NoticeTone;
  /** `alert` interrumpe; `status` anuncia sin interrumpir la escritura. */
  role?: 'alert' | 'status';
  id?: string;
  children: ReactNode;
}

export function Notice({
  tone,
  role = tone === 'error' ? 'alert' : 'status',
  id,
  children,
}: NoticeProps) {
  return (
    <p id={id} role={role} className={`notice notice--${tone}`}>
      <span className="notice__icon" aria-hidden="true">
        {GLYPHS[tone]}
      </span>
      {children}
    </p>
  );
}
