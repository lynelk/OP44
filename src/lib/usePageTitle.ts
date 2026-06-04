import { useEffect } from 'react';

const APP_NAME = 'OpFin';

export function usePageTitle(title: string): void {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} — ${APP_NAME}` : APP_NAME;
    return () => { document.title = prev; };
  }, [title]);
}
