// src/app/features/dashboard/dashboard/admin/zones/zone.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from '../../../../core/guards/auth.guard';

export const ZONE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./zone-list/zone-list').then((m) => m.ZoneList),
    title: 'Gestion des zones — MIAV',
    canActivate: [authGuard],
    // 🔒 Lecture : policy backend CAN_READ_ZONE = Site_Manage | Church_Settings_Manage
    data: { permissions: ['Site_Manage', 'Church_Settings_Manage'] },
  },
  {
    path: 'new',
    loadComponent: () => import('./zone-form/zone-form').then((m) => m.ZoneForm),
    title: 'Nouvelle zone — MIAV',
    canActivate: [authGuard],
    // 🔒 Écriture : policy backend CAN_MANAGE_ZONE = Site_Manage
    data: { permissions: ['Site_Manage'] },
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./zone-edit/zone-edit').then((m) => m.ZoneEdit),
    title: 'Modifier la zone — MIAV',
    canActivate: [authGuard],
    data: { permissions: ['Site_Manage'] },
  },
];
