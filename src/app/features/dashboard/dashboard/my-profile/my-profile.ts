// src/app/features/dashboard/dashboard/admin/my-profile/my-profile.ts
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { UserProfileCreate, UserProfileUtils } from '../../../../core/models/Users/user-profile.model';
import { User } from '../../../../core/models/Users/user.model';
import { Users } from '../../../../core/services/Users/users';



const GENDER_OPTIONS = [
  { value: 'M', label: 'Homme' },
  { value: 'F', label: 'Femme' },
];

const MARITAL_STATUS_OPTIONS = [
  { value: 'Single', label: 'Célibataire' },
  { value: 'Married', label: 'Marié(e)' },
  { value: 'Divorced', label: 'Divorcé(e)' },
  { value: 'Widowed', label: 'Veuf(ve)' },
];

@Component({
  selector: 'app-my-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './my-profile.html',
  styleUrl: './my-profile.scss',
})
export class MyProfile implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  readonly genderOptions = GENDER_OPTIONS;
  readonly maritalStatusOptions = MARITAL_STATUS_OPTIONS;

  currentUser = signal<User | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  // ── Édition des infos de compte (lecture seule pour l'instant, backend n'expose pas de PUT /me pour username/email) ──
  isEditMode = signal(false);
  saving = signal(false);
  saveError = signal<string | null>(null);
  saveSuccess = signal(false);

  // ── Photo ──
  photoFile: File | null = null;
  photoPreviewUrl = signal<string | null>(null);
  uploadingPhoto = signal(false);
  photoError = signal<string | null>(null);

  // ── Changement de mot de passe ──
  showPasswordSection = signal(false);
  changingPassword = signal(false);
  passwordError = signal<string | null>(null);
  passwordSuccess = signal(false);
  passwordForm: FormGroup;

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private userService: Users,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.form = this.fb.group({
      gender: [''],
      maritalStatus: [''],
      dateOfBirth: [''],
      address: [''],
      city: [''],
      country: [''],
      postalCode: [''],
      nationalId: [''],
      emergencyContact: [''],
      emergencyPhone: [''],
      numberOfChildren: [null],
      profession: [''],
      education: [''],
      notes: [''],
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadCurrentUser();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ───────────────────────────────────────────────────────────────
  // CHARGEMENT
  // ───────────────────────────────────────────────────────────────

  private loadCurrentUser(): void {
    this.loading.set(true);
    this.error.set(null);

    this.userService
      .getCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => { // Typage inféré automatiquement
          if (response.success && response.data) {
            this.currentUser.set(response.data);
            this.populateForm(response.data);

            const photoUrl = this.userService.getPhotoUrl(response.data.photoUrl);
            if (photoUrl) this.photoPreviewUrl.set(photoUrl);
          } else {
            this.error.set(response.message || 'Impossible de charger votre profil.');
          }
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Impossible de charger votre profil.');
          this.loading.set(false);
        },
      });
  }

  private populateForm(user: User): void {
    const profile = user.profile;
    this.form.patchValue({
      gender: profile?.gender ?? '',
      maritalStatus: (profile as any)?.maritalStatus ?? '',
      dateOfBirth: this.toDateInputValue(profile?.dateOfBirth),
      address: (profile as any)?.address ?? '',
      city: (profile as any)?.city ?? '',
      country: (profile as any)?.country ?? '',
      postalCode: (profile as any)?.postalCode ?? '',
      nationalId: (profile as any)?.nationalId ?? '',
      emergencyContact: (profile as any)?.emergencyContact ?? '',
      emergencyPhone: (profile as any)?.emergencyPhone ?? '',
      numberOfChildren: (profile as any)?.numberOfChildren ?? null,
      profession: (profile as any)?.profession ?? '',
      education: (profile as any)?.education ?? '',
      notes: (profile as any)?.notes ?? '',
    }, { emitEvent: false });
  }

  private toDateInputValue(date: string | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }

  // ───────────────────────────────────────────────────────────────
  // MODE ÉDITION
  // ───────────────────────────────────────────────────────────────

  enterEditMode(): void {
    this.isEditMode.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);
  }

  cancelEditMode(): void {
    const user = this.currentUser();
    if (user) this.populateForm(user);
    this.isEditMode.set(false);
    this.saveError.set(null);
  }

  save(): void {
    this.saving.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);

    const value = this.form.value;
    const payload: UserProfileCreate = this.cleanProfile(value);

    this.userService
      .updateCurrentUser(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: { success: any; data: any; message: any; }) => {
          this.saving.set(false);
          if (response.success) {
            if (response.data) this.currentUser.set(response.data);
            this.isEditMode.set(false);
            this.saveSuccess.set(true);
            setTimeout(() => this.saveSuccess.set(false), 3000);
          } else {
            this.saveError.set(response.message || 'Une erreur est survenue.');
          }
        },
        error: (err: any) => {
          console.error('❌ Erreur lors de la mise à jour du profil:', err);
          this.saving.set(false);
          this.saveError.set('Une erreur est survenue lors de la mise à jour.');
        },
      });
  }

  private cleanProfile(profile: any): UserProfileCreate {
    const cleaned: any = {};
    for (const key of Object.keys(profile)) {
      const v = profile[key];
      if (v !== '' && v !== null && v !== undefined) {
        cleaned[key] = v;
      }
    }
    return cleaned;
  }

  // ───────────────────────────────────────────────────────────────
  // PHOTO
  // ───────────────────────────────────────────────────────────────

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.photoError.set('Veuillez sélectionner un fichier image valide.');
      return;
    }

    this.photoFile = file;
    this.photoError.set(null);

    const reader = new FileReader();
    reader.onload = () => this.photoPreviewUrl.set(reader.result as string);
    reader.readAsDataURL(file);

    // Upload immédiat
    this.uploadPhoto();
  }

  private uploadPhoto(): void {
    if (!this.photoFile) return;

    this.uploadingPhoto.set(true);
    this.photoError.set(null);

    this.userService
      .updateProfilePhoto(this.photoFile)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {  // ✅ Type inféré automatiquement
          this.uploadingPhoto.set(false);
          if (response.success && response.data) {
            this.currentUser.set(response.data);
            const photoUrl = this.userService.getPhotoUrl(response.data.photoUrl);
            if (photoUrl) this.photoPreviewUrl.set(photoUrl);
          } else {
            this.photoError.set(response.message || "Impossible de mettre à jour la photo.");
          }
        },
        error: (err) => {
          console.error('❌ Erreur lors de l’upload de la photo:', err);
          this.uploadingPhoto.set(false);
          this.photoError.set("Impossible de mettre à jour la photo.");
        },
      });
  }

  // ───────────────────────────────────────────────────────────────
  // MOT DE PASSE
  // ───────────────────────────────────────────────────────────────

  togglePasswordSection(): void {
    this.showPasswordSection.update((v) => !v);
    this.passwordForm.reset();
    this.passwordError.set(null);
    this.passwordSuccess.set(false);
  }

  isPasswordFieldInvalid(field: string): boolean {
    const control = this.passwordForm.get(field);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  changePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const value = this.passwordForm.value;
    if (value.newPassword !== value.confirmPassword) {
      this.passwordError.set('Les nouveaux mots de passe ne correspondent pas.');
      return;
    }

    this.changingPassword.set(true);
    this.passwordError.set(null);
    this.passwordSuccess.set(false);

    this.userService
      .changePassword({
        currentPassword: value.currentPassword,
        newPassword: value.newPassword,
        confirmPassword: value.confirmPassword,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: { success: any; message: any; }) => {
          this.changingPassword.set(false);
          if (response.success) {
            this.passwordSuccess.set(true);
            this.passwordForm.reset();
            setTimeout(() => {
              this.passwordSuccess.set(false);
              this.showPasswordSection.set(false);
            }, 2000);
          } else {
            this.passwordError.set(response.message || 'Impossible de changer le mot de passe.');
          }
        },
        error: (err: any) => {
          console.error('❌ Erreur lors du changement de mot de passe:', err);
          this.changingPassword.set(false);
          this.passwordError.set('Impossible de changer le mot de passe. Vérifiez votre mot de passe actuel.');
        },
      });
  }

  // ───────────────────────────────────────────────────────────────
  // HELPERS D'AFFICHAGE
  // ───────────────────────────────────────────────────────────────

  getInitials(): string {
    const user = this.currentUser();
    if (!user) return '?';
    return `${user.firstName?.charAt(0) ?? ''}${user.lastName?.charAt(0) ?? ''}`.toUpperCase() || '?';
  }

  getGenderLabel(gender?: string): string {
    return UserProfileUtils.getGenderLabel(gender);
  }

  getMaritalStatusLabel(status?: string): string {
    return UserProfileUtils.getMaritalStatusLabel(status);
  }

  formatDate(date: string | undefined): string {
    if (!date) return 'Non renseigné';
    return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  }
}
