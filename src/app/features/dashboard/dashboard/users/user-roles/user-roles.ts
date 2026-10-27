import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { RoleDropdownDto } from '../../../../../core/models/Roles/role.models';
import { User } from '../../../../../core/models/Users/user.model';
import { Notification } from '../../../../../core/services/Notification/notification';
import { Roles } from '../../../../../core/services/Roles/roles';
import { Users } from '../../../../../core/services/Users/users';

@Component({
  selector: 'app-user-roles',
  imports: [CommonModule, RouterModule],
  templateUrl: './user-roles.html',
  styleUrl: './user-roles.scss',
})
export class UserRoles implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly users = inject(Users);
  private readonly rolesService = inject(Roles);
  private readonly notification = inject(Notification);

  userId = '';
  user: User | null = null;
  roles: RoleDropdownDto[] = [];
  selected = new Set<string>();
  loading = true;
  saving = false;
  error = '';

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.userId) {
      this.error = 'Utilisateur introuvable.';
      this.loading = false;
      return;
    }

    forkJoin({
      user: this.users.getUserById(this.userId),
      roles: this.rolesService.getRolesForDropdown(),
    }).subscribe({
      next: ({ user, roles }) => {
        this.user = user.success ? user.data : null;
        this.roles = roles.success ? roles.data ?? [] : [];
        this.selected = new Set(this.user?.roles ?? []);
        this.loading = false;
        if (!this.user) {
          this.error = 'Utilisateur introuvable.';
        }
      },
      error: () => {
        this.loading = false;
        this.error = 'Impossible de charger les rôles de cet utilisateur.';
      },
    });
  }

  isSelected(code: string): boolean {
    return this.selected.has(code);
  }

  toggle(code: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.selected.add(code);
    } else {
      this.selected.delete(code);
    }
  }

  save(): void {
    if (!this.user || this.saving) {
      return;
    }

    this.saving = true;
    this.users.updateUserRoles(this.user.id, [...this.selected]).subscribe({
      next: (response) => {
        this.saving = false;
        if (!response.success) {
          this.notification.error('Enregistrement impossible', response.message || 'Réessayez.');
          return;
        }
        this.notification.success('Rôles enregistrés', 'Les rôles de cet utilisateur ont été mis à jour.');
        void this.router.navigate(['/dashboard/admin/users']);
      },
      error: () => {
        this.saving = false;
        this.notification.error('Enregistrement impossible', 'Le serveur n’a pas accepté la modification.');
      },
    });
  }

  back(): void {
    void this.router.navigate(['/dashboard/admin/users']);
  }

  get displayName(): string {
    if (!this.user) {
      return '';
    }
    return this.user.fullName || `${this.user.firstName} ${this.user.lastName}`.trim() || this.user.email;
  }
}
