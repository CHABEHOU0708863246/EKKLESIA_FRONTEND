import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { User } from '../../../../../core/models/Users/user.model';
import { Users } from '../../../../../core/services/Users/users';

@Component({
  selector: 'app-user-detail',
  imports: [CommonModule, RouterModule],
  templateUrl: './user-detail.html',
  styleUrl: './user-detail.scss',
})
export class UserDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly users = inject(Users);

  userId = '';
  user: User | null = null;
  loading = true;
  error = '';

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.userId) {
      this.error = 'Utilisateur introuvable.';
      this.loading = false;
      return;
    }

    this.users.getUserById(this.userId).subscribe({
      next: (response) => {
        this.loading = false;
        this.user = response.success ? response.data : null;
        if (!this.user) {
          this.error = 'Utilisateur introuvable.';
        }
      },
      error: () => {
        this.loading = false;
        this.error = 'Impossible de charger cet utilisateur.';
      },
    });
  }

  get displayName(): string {
    if (!this.user) {
      return '';
    }
    return this.user.fullName || `${this.user.firstName} ${this.user.lastName}`.trim() || this.user.email;
  }

  formatDate(value?: string): string {
    if (!value) {
      return '—';
    }
    return new Date(value).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  edit(): void {
    void this.router.navigate(['/dashboard/admin/users', this.userId, 'edit']);
  }

  manageRoles(): void {
    void this.router.navigate(['/dashboard/admin/users', this.userId, 'roles']);
  }

  back(): void {
    void this.router.navigate(['/dashboard/admin/users']);
  }
}
