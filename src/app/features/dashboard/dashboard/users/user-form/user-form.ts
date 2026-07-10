// src/app/features/dashboard/dashboard/admin/users/user-form/user-form.ts
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { User, UserCreate, UserUpdate } from '../../../../../core/models/Users/user.model';
import { Users } from '../../../../../core/services/Users/users';


const AVAILABLE_ROLES = [
  { value: 'SUPER_ADMIN', label: 'Super Administrateur' },
  { value: 'PASTOR_PRINCIPAL', label: 'Pasteur Principal' },
  { value: 'PASTEUR_SITE', label: 'Pasteur de Site' },
  { value: 'ELDER', label: 'Ancien / Diacre' },
  { value: 'TREASURER', label: 'Trésorier de Site' },
  { value: 'PASTORAL_SECRETARY', label: 'Secrétaire Pastoral' },
  { value: 'CELL_LEADER', label: 'Responsable de Cellule' },
  { value: 'DEPARTMENT_HEAD', label: 'Responsable de Département' },
  { value: 'HR_MANAGER', label: 'Responsable RH' },
  { value: 'COMMUNICATION', label: 'Responsable Communication' },
  { value: 'PROPERTY_MANAGER', label: 'Responsable Patrimoine' },
  { value: 'MEMBER', label: 'Membre Ordinaire' },
  { value: 'VOLUNTEER', label: 'Bénévole' },
];

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
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './user-form.html',
  styleUrl: './user-form.scss',
})
export class UserForm implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private userId: string | null = null;

  readonly availableRoles = AVAILABLE_ROLES;
  readonly genderOptions = GENDER_OPTIONS;
  readonly maritalStatusOptions = MARITAL_STATUS_OPTIONS;

  isEditMode = signal(false);
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  fieldErrors = signal<Record<string, string>>({});

  showProfileSection = signal(false);
  photoFile: File | null = null;
  photoPreviewUrl = signal<string | null>(null);

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private userService: Users,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.form = this.fb.group({
      // ── Identité de compte ──
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9+\s]{8,15}$/)]],
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],

      // ── Mot de passe (uniquement en création) ──
      password: [''],
      confirmPassword: [''],

      // ── Rôles ──
      roles: [[] as string[]],

      // ── Profil complémentaire (optionnel) ──
      profile: this.fb.group({
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
      }),
    });
  }

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('id');
    this.isEditMode.set(!!this.userId);

    if (this.isEditMode()) {
      // En édition, mot de passe non requis
      this.form.get('password')?.clearValidators();
      this.form.get('confirmPassword')?.clearValidators();
      this.loadUser();
    } else {
      // En création, mot de passe requis
      this.form.get('password')?.setValidators([Validators.required, Validators.minLength(8)]);
      this.form.get('confirmPassword')?.setValidators([Validators.required]);
    }
    this.form.get('password')?.updateValueAndValidity();
    this.form.get('confirmPassword')?.updateValueAndValidity();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ───────────────────────────────────────────────────────────────
  // CHARGEMENT (mode édition)
  // ───────────────────────────────────────────────────────────────

  private loadUser(): void {
    if (!this.userId) return;
    this.loading.set(true);

    this.userService
      .getUserById(this.userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: { success: any; data: any }) => {
          if (response.success && response.data) {
            this.populateForm(response.data);
          } else {
            this.error.set(response.success || 'Impossible de charger cet utilisateur.');
          }
          this.loading.set(false);
        },
        error: (err: any) => {
          this.error.set('Impossible de charger cet utilisateur.');
          this.loading.set(false);
        },
      });
  }

  private populateForm(user: User): void {
    this.form.patchValue({
      username: user.username,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles ?? [],
      profile: {
        gender: user.profile?.gender ?? '',
        maritalStatus: (user.profile as any)?.maritalStatus ?? '',
        dateOfBirth: this.toDateInputValue((user.profile as any)?.dateOfBirth),
        address: (user.profile as any)?.address ?? '',
        city: (user.profile as any)?.city ?? '',
        country: (user.profile as any)?.country ?? '',
        postalCode: (user.profile as any)?.postalCode ?? '',
        nationalId: (user.profile as any)?.nationalId ?? '',
        emergencyContact: (user.profile as any)?.emergencyContact ?? '',
        emergencyPhone: (user.profile as any)?.emergencyPhone ?? '',
        numberOfChildren: (user.profile as any)?.numberOfChildren ?? null,
        profession: (user.profile as any)?.profession ?? '',
        education: (user.profile as any)?.education ?? '',
        notes: (user.profile as any)?.notes ?? '',
      },
    }, { emitEvent: false });

    if (user.photoUrl) {
      this.photoPreviewUrl.set(user.photoUrl);
    }
  }

  private toDateInputValue(date: string | null | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }

  // ───────────────────────────────────────────────────────────────
  // RÔLES (sélection multiple)
  // ───────────────────────────────────────────────────────────────

  toggleRole(roleValue: string): void {
    const current: string[] = this.form.get('roles')?.value ?? [];
    if (current.includes(roleValue)) {
      this.form.get('roles')?.setValue(current.filter((r) => r !== roleValue));
    } else {
      this.form.get('roles')?.setValue([...current, roleValue]);
    }
  }

  isRoleSelected(roleValue: string): boolean {
    const current: string[] = this.form.get('roles')?.value ?? [];
    return current.includes(roleValue);
  }

  // ───────────────────────────────────────────────────────────────
  // PHOTO
  // ───────────────────────────────────────────────────────────────

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.photoFile = file;
    const reader = new FileReader();
    reader.onload = () => this.photoPreviewUrl.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  clearPhoto(): void {
    this.photoFile = null;
    this.photoPreviewUrl.set(null);
  }

  // ───────────────────────────────────────────────────────────────
  // SECTION PROFIL (repliable)
  // ───────────────────────────────────────────────────────────────

  toggleProfileSection(): void {
    this.showProfileSection.update((v) => !v);
  }

  // ───────────────────────────────────────────────────────────────
  // VALIDATION / SOUMISSION
  // ───────────────────────────────────────────────────────────────

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  private passwordsMatch(): boolean {
    if (this.isEditMode()) return true; // pas de changement de mdp ici
    const pwd = this.form.get('password')?.value;
    const confirm = this.form.get('confirmPassword')?.value;
    return pwd === confirm;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Veuillez corriger les champs invalides avant de continuer.');
      return;
    }

    if (!this.passwordsMatch()) {
      this.error.set('Les mots de passe ne correspondent pas.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.fieldErrors.set({});

    if (this.isEditMode()) {
      this.updateExistingUser();
    } else {
      this.createNewUser();
    }
  }

  private createNewUser(): void {
    const value = this.form.value;
    const payload: UserCreate = {
      username: value.username,
      email: value.email,
      phone: value.phone,
      firstName: value.firstName,
      lastName: value.lastName,
      password: value.password,
      confirmPassword: value.confirmPassword,
      roles: value.roles,
      profile: this.cleanProfile(value.profile),
    };

    this.userService
      .register(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: { success: any; data: any }) => {
          this.saving.set(false);
          if (response.success && response.data) {
            this.router.navigate(['/dashboard/admin/utilisateurs', response.data.id]);
          } else {
            this.applyErrorResponse(response);
          }
        },
        error: (err: any) => {
          console.error('❌ Erreur lors de la création:', err);
          this.saving.set(false);
          this.error.set("Une erreur est survenue lors de la création de l'utilisateur.");
        },
      });
  }

  private updateExistingUser(): void {
    if (!this.userId) return;
    const value = this.form.value;
    const payload: UserUpdate = {
      username: value.username,
      email: value.email,
      phone: value.phone,
      firstName: value.firstName,
      lastName: value.lastName,
      roles: value.roles,
      profile: this.cleanProfile(value.profile),
    };

    this.userService
      .updateUser(this.userId, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: { success: any; }) => {
          this.saving.set(false);
          if (response.success) {
            this.router.navigate(['/dashboard/admin/utilisateurs', this.userId]);
          } else {
            this.applyErrorResponse(response);
          }
        },
        error: (err: any) => {
          console.error('❌ Erreur lors de la mise à jour:', err);
          this.saving.set(false);
          this.error.set("Une erreur est survenue lors de la mise à jour.");
        },
      });
  }

  private cleanProfile(profile: any): any {
    // Supprime les champs vides pour ne pas polluer le FormData
    const cleaned: any = {};
    for (const key of Object.keys(profile)) {
      const v = profile[key];
      if (v !== '' && v !== null && v !== undefined) {
        cleaned[key] = v;
      }
    }
    return Object.keys(cleaned).length ? cleaned : undefined;
  }

  private applyErrorResponse(response: any): void {
    this.error.set(response.message || 'Une erreur est survenue.');
    if (response.errors?.length) {
      const map: Record<string, string> = {};
      for (const e of response.errors) {
        if (e.field) map[e.field] = e.message ?? e;
      }
      this.fieldErrors.set(map);
    }
  }

  cancel(): void {
    if (this.isEditMode() && this.userId) {
      this.router.navigate(['/dashboard/admin/users', this.userId]);
    } else {
      this.router.navigate(['/dashboard/admin/users']);
    }
  }

  getInitials(): string {
    const f = this.form.get('firstName')?.value ?? '';
    const l = this.form.get('lastName')?.value ?? '';
    return `${f.charAt(0)}${l.charAt(0)}`.toUpperCase() || '?';
  }
}
