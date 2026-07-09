import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Token } from '../../../core/services/Token/token';
import { jwtDecode } from 'jwt-decode';
import { NotificationComponent } from "../../../core/components/notification-component/notification-component";
import { Notification } from '../../../core/services/Notification/notification';
import { Auth } from '../../../core/services/Auth/auth';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, RouterModule, NotificationComponent],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  isLoading = false;
  hidePassword = true;

  private tokenService = inject(Token);
  private authService = inject(Auth);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private notificationService = inject(Notification);

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      rememberMe: [true],
    });
  }

  goToForgotPassword(): void {
    this.router.navigate(['/auth/forgot-password']);
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.notificationService.warning(
        'Formulaire incomplet',
        'Veuillez remplir correctement tous les champs obligatoires.'
      );
      return;
    }

    this.isLoading = true;
    const { email, password, rememberMe } = this.loginForm.value;

    const loginRequest = {
      email: email,
      password: password,
      rememberMe: rememberMe,
    };

    this.authService.authenticate(loginRequest).subscribe({
      next: (response: any) => {
        this.isLoading = false;

        // Vérification de la réponse
        if (response && response.token) {
          const token = response.token;

          // Décodage du token pour extraire le rôle
          let userRole = 'user';
          try {
            if (token) {
              const decodedToken: any = jwtDecode(token);
              userRole =
                decodedToken['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
                decodedToken.role ||
                decodedToken.roles?.[0] ||
                decodedToken.authorities?.[0] ||
                'user';
            }
          } catch (error) {
            console.error('Erreur lors du décodage du token:', error);
          }

          // Stockage du token
          if (token) {
            this.tokenService.saveToken(token, userRole);

            if (response.refreshToken) {
              localStorage.setItem('refresh_token', response.refreshToken);
            }

            if (rememberMe) {
              localStorage.setItem('remember_me', 'true');
            }
          }

          // ✅ Notification de succès
          this.notificationService.success(
            'Connexion réussie',
            'Bienvenue ! Redirection vers votre tableau de bord...'
          );

          // ✅ Navigation SPA directe, sans délai artificiel ni fallback de rechargement complet
          this.router.navigate(['/dashboard']).then((success) => {
            if (!success) {
              console.error('❌ Navigation vers /dashboard a échoué (success=false). Vérifiez les guards.');
              console.log(localStorage.getItem('ekklesia_auth_data'));
              console.log(localStorage.getItem('refresh_token'));
            }
          }).catch((err) => {
            console.error('❌ Erreur lors de la navigation vers /dashboard:', err);
          });
        } else {
          this.notificationService.error(
            'Échec de la connexion',
            'Réponse du serveur invalide. Token manquant.'
          );
          console.error('Réponse sans token:', response);
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.handleLoginError(err);
      },
    });
  }

  /**
   * Gestion centralisée des erreurs de login
   */
  private handleLoginError(err: any): void {
    let errorTitle = 'Erreur de connexion';
    let errorMessage = 'Une erreur est survenue lors de la connexion.';

    if (err.status === 400) {
      errorTitle = 'Données invalides';
      errorMessage = err.error?.message || 'Veuillez vérifier votre email et mot de passe.';
    } else if (err.status === 401) {
      errorTitle = 'Identifiants invalides';
      errorMessage = err.error?.message || 'Email ou mot de passe incorrect.';
    } else if (err.status === 403) {
      errorTitle = 'Accès refusé';
      errorMessage = err.error?.message || "Votre compte n'a pas les droits nécessaires.";
    } else if (err.status === 404) {
      errorTitle = 'Service indisponible';
      errorMessage = "Le service d'authentification est momentanément indisponible.";
    } else if (err.status === 429) {
      errorTitle = 'Trop de tentatives';
      errorMessage = 'Veuillez réessayer dans quelques minutes.';
    } else if (err.status >= 500) {
      errorTitle = 'Erreur serveur';
      errorMessage = 'Le serveur rencontre des difficultés. Veuillez réessayer plus tard.';
    } else if (err.error?.message) {
      errorMessage = err.error.message;
    }

    // ✅ Afficher la notification d'erreur
    this.notificationService.error(errorTitle, errorMessage);
    console.error('Login error:', err);
  }

  /**
   * Méthode pour basculer la visibilité du mot de passe
   */
  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }
}
