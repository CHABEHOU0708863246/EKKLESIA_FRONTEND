import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Notification } from '../../../core/services/Notification/notification';
import { Token } from '../../../core/services/Token/token';
import { Auth } from '../../../core/services/Auth/auth';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(Auth);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notificationService = inject(Notification);
  private tokenService = inject(Token);

  resetPasswordForm!: FormGroup;
  isLoading = false;
  isValidating = true;
  tokenValid = false;
  hidePassword = true;
  hideConfirmPassword = true;
  errorMessage = '';
  successMessage = '';
  email = '';
  token = '';

  ngOnInit(): void {
    // Redirection si déjà connecté
    if (this.tokenService.isLogged()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    // Récupérer les paramètres de l'URL
    this.route.queryParams.subscribe(params => {
      this.email = params['email'] || '';
      this.token = params['token'] || '';

      if (this.email && this.token) {
        this.validateToken();
      } else {
        this.errorMessage = 'Lien de réinitialisation invalide. Veuillez demander un nouveau lien.';
        this.tokenValid = false;
        this.isValidating = false;
        this.notificationService.error('Lien invalide', this.errorMessage);
      }
    });

    this.initForm();
  }

  private initForm(): void {
    this.resetPasswordForm = this.fb.group({
      newPassword: ['', [
        Validators.required,
        Validators.minLength(6),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/)
      ]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  private passwordMatchValidator(form: FormGroup): { [key: string]: boolean } | null {
    const password = form.get('newPassword');
    const confirm = form.get('confirmPassword');

    if (password && confirm && password.value !== confirm.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  get newPassword() {
    return this.resetPasswordForm.get('newPassword');
  }

  get confirmPassword() {
    return this.resetPasswordForm.get('confirmPassword');
  }

  get hasPasswordMismatch(): boolean {
    return this.resetPasswordForm.hasError('passwordMismatch') &&
           this.confirmPassword?.dirty === true;
  }

  private validateToken(): void {
    this.isValidating = true;
    this.errorMessage = '';

    this.authService.validateResetToken({ email: this.email, token: this.token })
      .subscribe({
        next: (response: any) => {
          this.isValidating = false;
          if (response && response.success === true) {
            this.tokenValid = true;
            this.notificationService.success('Lien valide', 'Vous pouvez maintenant définir votre nouveau mot de passe.');
          } else {
            this.tokenValid = false;
            this.errorMessage = response?.message || 'Le lien de réinitialisation a expiré ou est invalide.';
            this.notificationService.error('Lien invalide', this.errorMessage);
          }
        },
        error: (err: any) => {
          this.isValidating = false;
          this.tokenValid = false;
          this.errorMessage = 'Erreur lors de la validation du lien. Veuillez réessayer.';
          this.notificationService.error('Erreur', this.errorMessage);
          console.error('Erreur validation token:', err);
        }
      });
  }

  onSubmit(): void {
    if (this.resetPasswordForm.invalid) {
      this.resetPasswordForm.markAllAsTouched();
      this.notificationService.warning(
        'Formulaire invalide',
        'Veuillez corriger les erreurs dans le formulaire.'
      );
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const { newPassword } = this.resetPasswordForm.value;

    this.authService.resetPassword({
      email: this.email,
      token: this.token,
      password: newPassword
    }).subscribe({
      next: (response: any) => {
        this.isLoading = false;

        if (response && response.success === true) {
          this.successMessage = response.message || 'Votre mot de passe a été réinitialisé avec succès !';
          this.notificationService.success('Mot de passe réinitialisé', this.successMessage);

          // Réinitialiser le formulaire
          this.resetPasswordForm.reset();

          // Redirection automatique après 3 secondes
          setTimeout(() => {
            this.goBackToLogin();
          }, 3000);
        } else {
          this.errorMessage = response?.message || 'Erreur lors de la réinitialisation. Veuillez réessayer.';
          this.notificationService.error('Erreur', this.errorMessage);
        }
      },
      error: (err: any) => {
        this.isLoading = false;
        this.handleError(err);
      }
    });
  }

  private handleError(err: any): void {
    let message = 'Une erreur est survenue. Veuillez réessayer.';

    if (err.status === 400) {
      message = err.error?.message || 'Données invalides. Vérifiez votre saisie.';
    } else if (err.status === 401) {
      message = 'Session expirée. Veuillez demander un nouveau lien.';
    } else if (err.status === 404) {
      message = 'Lien invalide. Veuillez demander un nouveau lien.';
    } else if (err.status >= 500) {
      message = 'Erreur serveur. Veuillez réessayer plus tard.';
    }

    this.errorMessage = message;
    this.notificationService.error('Erreur', message);
  }

  goBackToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  requestNewResetLink(): void {
    this.router.navigate(['/auth/forgot-password']);
  }

  // Méthodes pour la force du mot de passe
  hasUpperCase(): boolean {
    return /[A-Z]/.test(this.newPassword?.value || '');
  }

  hasLowerCase(): boolean {
    return /[a-z]/.test(this.newPassword?.value || '');
  }

  hasNumber(): boolean {
    return /\d/.test(this.newPassword?.value || '');
  }

  getPasswordStrengthClass(): string {
    const password = this.newPassword?.value || '';
    let strength = 0;
    if (password.length >= 6) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;

    if (strength === 0 || strength === 1) return 'strength-1';
    if (strength === 2) return 'strength-2';
    if (strength === 3) return 'strength-3';
    return 'strength-4';
  }

  getPasswordStrengthColor(): string {
    const password = this.newPassword?.value || '';
    let strength = 0;
    if (password.length >= 6) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;

    if (strength === 0 || strength === 1) return '#E17055';
    if (strength === 2) return '#FDCB6E';
    if (strength === 3) return '#74B9FF';
    return '#00B894';
  }

  getPasswordStrengthLabel(): string {
    const password = this.newPassword?.value || '';
    let strength = 0;
    if (password.length >= 6) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;

    if (strength === 0 || strength === 1) return 'Faible';
    if (strength === 2) return 'Moyen';
    if (strength === 3) return 'Fort';
    return 'Très fort';
  }
}
