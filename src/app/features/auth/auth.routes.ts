import { Routes } from '@angular/router';
import { ForgotPasswordForm } from './forgot-password-form/forgot-password-form';
import { ResetPasswordComponent } from './reset-password/reset-password';
import { LoginComponent } from './login/login';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordForm
  },
  {
    path: 'reset-password',
    component: ResetPasswordComponent
  }
];
