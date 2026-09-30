import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { UserImportReport, Users } from '../../../../../core/services/Users/users';
import { Notification } from '../../../../../core/services/Notification/notification';

/**
 * Import des utilisateurs depuis le modèle Excel : 1) choisir le fichier,
 * 2) ANALYSER (dry-run, aucune écriture), 3) CONFIRMER.
 */
@Component({
  selector: 'app-user-import',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './user-import.html',
  styleUrl: './user-import.scss',
})
export class UserImportComponent {
  private usersService = inject(Users);
  private notification = inject(Notification);

  selectedFile = signal<File | null>(null);
  analyzing = signal(false);
  importing = signal(false);
  report = signal<UserImportReport | null>(null);
  applied = signal(false);

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
    this.report.set(null);
    this.applied.set(false);
  }

  analyze(): void {
    const file = this.selectedFile();
    if (!file) {
      this.notification.warning('Aucun fichier', 'Choisissez d’abord le fichier Excel à importer.');
      return;
    }
    this.analyzing.set(true);
    this.usersService.importUsersFromExcel(file, true).subscribe({
      next: (report) => {
        this.report.set(report);
        this.analyzing.set(false);
        this.notification.success(
          'Analyse terminée',
          `${report.total} ligne(s) : ${report.toCreate} à créer, ${report.toUpdate} à mettre à jour, ${report.errors} erreur(s).`
        );
      },
      error: () => {
        this.analyzing.set(false);
        this.notification.error('Échec de l’analyse', 'Le fichier n’a pas pu être lu. Vérifiez le modèle.');
      },
    });
  }

  confirm(): void {
    const file = this.selectedFile();
    if (!file) return;
    this.importing.set(true);
    this.usersService.importUsersFromExcel(file, false).subscribe({
      next: (report) => {
        this.report.set(report);
        this.importing.set(false);
        this.applied.set(true);
        this.notification.success(
          'Import effectué',
          `${report.toCreate} compte(s) créé(s), ${report.toUpdate} mis à jour, ${report.errors} erreur(s).`
        );
      },
      error: () => {
        this.importing.set(false);
        this.notification.error('Échec de l’import', 'L’import n’a pas abouti. Aucune donnée n’a été modifiée en cas d’erreur.');
      },
    });
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'created': return 'À créer';
      case 'updated': return 'À mettre à jour';
      case 'ignored': return 'Ignoré';
      case 'error': return 'Erreur';
      default: return status;
    }
  }
}
