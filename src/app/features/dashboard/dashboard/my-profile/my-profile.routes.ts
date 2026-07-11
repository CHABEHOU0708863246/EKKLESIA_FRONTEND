// src/app/features/dashboard/my-profile/my-profile.routes.ts
import { Routes } from '@angular/router';

export const MYPROFILE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./my-profile').then((m) => m.MyProfile),
    title: 'Mon profil — EKKLESIA',
  },
];
