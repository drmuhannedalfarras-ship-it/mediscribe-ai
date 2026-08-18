import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'patients',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/patients/patient-list/patient-list.component').then(
        (m) => m.PatientListComponent,
      ),
  },
  {
    path: 'patients/new',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/patients/patient-form/patient-form.component').then(
        (m) => m.PatientFormComponent,
      ),
  },
  {
    path: 'patients/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/patients/patient-detail/patient-detail.component').then(
        (m) => m.PatientDetailComponent,
      ),
  },
  {
    path: 'consultations',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/consultations/consultation-list/consultation-list.component').then(
        (m) => m.ConsultationListComponent,
      ),
  },
  {
    path: 'consultations/new',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/consultations/consultation-form/consultation-form.component').then(
        (m) => m.ConsultationFormComponent,
      ),
  },
  {
    path: 'consultations/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/consultations/consultation-detail/consultation-detail.component').then(
        (m) => m.ConsultationDetailComponent,
      ),
  },
  { path: '', pathMatch: 'full', redirectTo: '/dashboard' },
  { path: '**', redirectTo: '/dashboard' },
];
