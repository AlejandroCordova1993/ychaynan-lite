import type { ReactNode } from 'react';

export interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  lead?: ReactNode;
}

export function PageHeader({ eyebrow, title, lead }: PageHeaderProps) {
  return (
    <header className="page-header">
      {eyebrow && <p className="page-header__eyebrow mono-label">{eyebrow}</p>}
      <h1>{title}</h1>
      {lead && <p className="page-header__lead">{lead}</p>}
    </header>
  );
}
