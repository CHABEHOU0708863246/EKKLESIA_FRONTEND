// src/app/features/dashboard/dashboard/admin/roles/role-form/role-form.ts
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID, signal, computed } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { PERMISSIONS_BY_MODULE, RoleResponseDto, RoleCreateDto, RoleUpdateDto } from '../../../../../core/models/Roles/role.models';
import { Roles } from '../../../../../core/services/Roles/roles';
import { getPermissionLabel, getPermissionLabelWithCode } from '../../../../../core/models/Roles/permission-labels';


@Component({
  selector: 'app-role-form',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './role-form.html',
  styleUrl: './role-form.scss',
})
export class RoleForm implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private roleId: string | null = null;

  readonly permissionModules = Object.entries(PERMISSIONS_BY_MODULE) as [string, string[]][];

  isEditMode = signal(false);
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);

  isSystemRole = signal(false);

  // ── Permissions sélectionnées ──
  selectedPermissions = signal<Set<string>>(new Set());

  // ── Sections repliables (module -> ouvert/fermé) ──
  expandedModules = signal<Set<string>>(new Set());

  // ── Recherche dans les permissions ──
  permissionSearch = signal('');

  form: FormGroup;

  totalPermissionsCount = computed(() =>
    this.permissionModules.reduce((sum, [, perms]) => sum + perms.length, 0)
  );

  selectedCount = computed(() => this.selectedPermissions().size);

  filteredModules = computed(() => {
    const term = this.permissionSearch().toLowerCase().trim();
    if (!term) return this.permissionModules;
    return this.permissionModules
      .map(([module, perms]) => [module, perms.filter((p) => p.toLowerCase().includes(term))] as [string, string[]])
      .filter(([, perms]) => perms.length > 0);
  });

  constructor(
    private fb: FormBuilder,
    private roleService: Roles,
    private route: ActivatedRoute,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.form = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^[A-Z0-9_]+$/)]],
      roleName: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      isVisible: [true],
    });

    // Tous les modules ouverts par défaut
    this.expandedModules.set(new Set(this.permissionModules.map(([m]) => m)));
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.roleId = this.route.snapshot.paramMap.get('id');
    this.isEditMode.set(!!this.roleId);

    if (this.isEditMode()) {
      this.loadRole();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ───────────────────────────────────────────────────────────────
  // CHARGEMENT (mode édition)
  // ───────────────────────────────────────────────────────────────

  private loadRole(): void {
    if (!this.roleId) return;
    this.loading.set(true);

    this.roleService
      .getRoleById(this.roleId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: { success: any; message: any; data: any }) => {
          if (response.success && response.data) {
            this.populateForm(response.data);
          } else {
            this.error.set(response.message || 'Impossible de charger ce rôle.');
          }
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Impossible de charger ce rôle.');
          this.loading.set(false);
        },
      });
  }

  private populateForm(role: RoleResponseDto): void {
    this.form.patchValue({
      code: role.code,
      roleName: role.roleName,
      description: role.description ?? '',
      isVisible: role.isVisible,
    });

    this.isSystemRole.set(role.isSystem);
    this.selectedPermissions.set(new Set(role.permissions ?? []));

    // Un rôle système protégé : on verrouille le code (souvent la clé métier)
    if (role.isSystem) {
      this.form.get('code')?.disable();
    }
  }

  // ───────────────────────────────────────────────────────────────
  // GESTION DES PERMISSIONS
  // ───────────────────────────────────────────────────────────────

  togglePermission(permission: string): void {
    const current = new Set(this.selectedPermissions());
    if (current.has(permission)) {
      current.delete(permission);
    } else {
      current.add(permission);
    }
    this.selectedPermissions.set(current);
  }

  isPermissionSelected(permission: string): boolean {
    return this.selectedPermissions().has(permission);
  }

  isModuleFullySelected(perms: string[]): boolean {
    return perms.length > 0 && perms.every((p) => this.isPermissionSelected(p));
  }

  isModulePartiallySelected(perms: string[]): boolean {
    const selectedInModule = perms.filter((p) => this.isPermissionSelected(p)).length;
    return selectedInModule > 0 && selectedInModule < perms.length;
  }

  toggleModule(perms: string[]): void {
    const current = new Set(this.selectedPermissions());
    const allSelected = this.isModuleFullySelected(perms);

    if (allSelected) {
      perms.forEach((p) => current.delete(p));
    } else {
      perms.forEach((p) => current.add(p));
    }
    this.selectedPermissions.set(current);
  }

  getModuleSelectedCount(perms: string[]): number {
    return perms.filter((p) => this.isPermissionSelected(p)).length;
  }

  toggleModuleExpanded(module: string): void {
    const current = new Set(this.expandedModules());
    if (current.has(module)) {
      current.delete(module);
    } else {
      current.add(module);
    }
    this.expandedModules.set(current);
  }

  isModuleExpanded(module: string): boolean {
    return this.expandedModules().has(module);
  }

  selectAllPermissions(): void {
    const all = new Set<string>();
    this.permissionModules.forEach(([, perms]) => perms.forEach((p) => all.add(p)));
    this.selectedPermissions.set(all);
  }

  clearAllPermissions(): void {
    this.selectedPermissions.set(new Set());
  }

  // ───────────────────────────────────────────────────────────────
  // GÉNÉRATION AUTO DU CODE
  // ───────────────────────────────────────────────────────────────

  onRoleNameChange(): void {
    if (this.isEditMode()) return; // ne pas auto-générer en édition
    const name = this.form.get('roleName')?.value ?? '';
    const code = name
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // retire les accents
      .replace(/[^A-Z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '_');
    this.form.get('code')?.setValue(code, { emitEvent: false });
  }

  // ───────────────────────────────────────────────────────────────
  // VALIDATION / SOUMISSION
  // ───────────────────────────────────────────────────────────────

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Veuillez corriger les champs invalides avant de continuer.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    if (this.isEditMode()) {
      this.updateExistingRole();
    } else {
      this.createNewRole();
    }
  }

  private createNewRole(): void {
    const value = this.form.getRawValue();
    const payload: RoleCreateDto = {
      code: value.code,
      roleName: value.roleName,
      description: value.description || undefined,
      permissions: Array.from(this.selectedPermissions()),
      isVisible: value.isVisible,
      isSystem: false,
    };

    this.roleService
      .createRole(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: { success: any; message: any; data: any }) => {
          this.saving.set(false);
          if (response.success && response.data) {
            this.router.navigate(['/dashboard/admin/parametres/roles', response.data.id]);
          } else {
            this.error.set(response.message || 'Une erreur est survenue lors de la création.');
          }
        },
        error: (err: any) => {
          console.error('❌ Erreur lors de la création du rôle:', err);
          this.saving.set(false);
          this.error.set('Une erreur est survenue lors de la création du rôle.');
        },
      });
  }

  private updateExistingRole(): void {
    if (!this.roleId) return;
    const value = this.form.getRawValue();
    const payload: RoleUpdateDto = {
      code: value.code,
      roleName: value.roleName,
      description: value.description || undefined,
      permissions: Array.from(this.selectedPermissions()),
      isVisible: value.isVisible,
    };

    this.roleService
      .updateRole(this.roleId, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: { success: any; message: any; }) => {
          this.saving.set(false);
          if (response.success) {
            this.router.navigate(['/dashboard/admin/parametres/roles', this.roleId]);
          } else {
            this.error.set(response.message || 'Une erreur est survenue lors de la mise à jour.');
          }
        },
        error: (err: any) => {
          console.error('❌ Erreur lors de la mise à jour du rôle:', err);
          this.saving.set(false);
          this.error.set('Une erreur est survenue lors de la mise à jour du rôle.');
        },
      });
  }

  getPermissionLabel(permission: string): string {
    return getPermissionLabel(permission);
  }

  // ✅ Méthode pour obtenir le libellé avec le code
  getPermissionLabelWithCode(permission: string): string {
    return getPermissionLabelWithCode(permission);
  }

  cancel(): void {
    if (this.isEditMode() && this.roleId) {
      this.router.navigate(['/dashboard/admin/parametres/roles', this.roleId]);
    } else {
      this.router.navigate(['/dashboard/admin/parametres/roles']);
    }
  }
}
