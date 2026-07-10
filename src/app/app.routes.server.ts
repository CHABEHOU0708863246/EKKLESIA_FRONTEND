import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Server // On force TOUT le monde en mode Server (SSR), pas de Prerender !
  }
];
