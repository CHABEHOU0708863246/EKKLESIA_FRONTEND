import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Members, MemberImportReport } from '../../../../../core/services/Members/members';
import { Notification } from '../../../../../core/services/Notification/notification';

/**
 * Import des membres depuis un fichier Excel/CSV :
 * 1) choisir le fichier, 2) ANALYSER (dry-run), 3) CONFIRMER.
 */
@Component({
  selector: 'app-member-import',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="mi-page">
      <header>
        <h1>Importer des membres</h1>
        <p class="mi-sub">Ajoutez plusieurs membres d'un coup depuis un fichier Excel (.xlsx) ou CSV.</p>
        <a class="mi-back" routerLink="/dashboard/membres">Retour à l'annuaire</a>
      </header>

      <ol class="mi-steps">
        <li><b>1</b> Choisissez le fichier (colonnes : prenom, nom, telephone, email, date_naissance, genre, statut, site, employeur, niveau_etudes).</li>
        <li><b>2</b> Cliquez sur <b>Analyser</b> (aucune écriture).</li>
        <li><b>3</b> Si tout est correct, cliquez sur <b>Confirmer l'import</b>.</li>
      </ol>

      <section class="miav-card mi-card">
        <button class="miav-btn miav-btn--ghost" (click)="downloadTemplate()">
          Télécharger le modèle Excel
        </button>
        <input type="file" accept=".xlsx,.csv" (change)="onFileSelected($event)" />
        @if (selectedFile()) {
          <p>Fichier : <b>{{ selectedFile()?.name }}</b></p>
        }
        <div class="mi-actions">
          <button class="miav-btn miav-btn--primary" (click)="analyze()" [disabled]="!selectedFile() || analyzing()">
            {{ analyzing() ? 'Analyse…' : 'Analyser' }}
          </button>
          <button class="miav-btn miav-btn--accent" (click)="confirm()"
                  [disabled]="!report() || applied() || importing() || (report()?.errors ?? 0) > 0">
            {{ importing() ? 'Import…' : 'Confirmer l\'import' }}
          </button>
        </div>
        @if (report() && (report()?.errors ?? 0) > 0) {
          <p class="mi-warn">Corrigez les lignes en rouge puis relancez l'analyse.</p>
        }
      </section>

      @if (report(); as r) {
        <section class="miav-card mi-card">
          <h2>{{ r.dryRun ? 'Résultat de l\'analyse' : 'Import effectué' }}</h2>
          <p class="mi-summary">
            {{ r.total }} ligne(s) · {{ r.created }} à créer · {{ r.updated }} à mettre à jour ·
            {{ r.errors }} erreur(s) · {{ r.ignored }} ignorée(s)
          </p>
          <table class="mi-table">
            <thead><tr><th>#</th><th>Nom</th><th>Statut</th><th>Détail</th></tr></thead>
            <tbody>
              @for (row of r.rows; track row.row) {
                <tr [class.mi-err]="row.status === 'error'">
                  <td>{{ row.row }}</td>
                  <td>{{ row.name }}</td>
                  <td>{{ row.status }}</td>
                  <td>@for (m of row.messages; track m) { <div>{{ m }}</div> }</td>
                </tr>
              }
            </tbody>
          </table>
        </section>
      }
    </div>
  `,
  styles: [`
    .mi-page { max-width: 960px; margin: 0 auto; padding: 24px 16px; }
    .mi-sub { color: var(--color-muted); }
    .mi-back { display: inline-block; margin-top: 6px; }
    .mi-steps { padding-left: 20px; color: var(--color-text); }
    .mi-steps li { margin: 6px 0; }
    .mi-steps b { display: inline-flex; width: 20px; height: 20px; border-radius: 50%; background: var(--color-primary); color: #fff; align-items: center; justify-content: center; margin-right: 6px; font-size: 12px; }
    .mi-card { padding: 16px; margin-top: 16px; }
    .mi-actions { display: flex; gap: 10px; margin-top: 12px; }
    .mi-warn { color: #B7791F; background: #FEF3C7; padding: 10px; border-radius: 8px; }
    .mi-summary { font-weight: 600; }
    .mi-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .mi-table th, .mi-table td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--color-border); }
    .mi-err { background: rgba(224, 70, 70, .08); }
  `],
})
export class MemberImportComponent {
  private members = inject(Members);
  private notification = inject(Notification);

  selectedFile = signal<File | null>(null);
  analyzing = signal(false);
  importing = signal(false);
  report = signal<MemberImportReport | null>(null);
  applied = signal(false);

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
    this.report.set(null);
    this.applied.set(false);
  }

  downloadTemplate(): void {
    this.members.downloadImportTemplate().subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'modele-import-membres.xlsx';
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.notification.error('Échec', 'Impossible de télécharger le modèle.'),
    });
  }

  analyze(): void {
    const file = this.selectedFile();
    if (!file) return;
    this.analyzing.set(true);
    this.members.importMembersFromFile(file, true).subscribe({
      next: (r) => {
        this.report.set(r);
        this.analyzing.set(false);
        this.notification.success('Analyse terminée', `${r.total} ligne(s), ${r.errors} erreur(s).`);
      },
      error: () => { this.analyzing.set(false); this.notification.error('Échec', 'Fichier illisible.'); },
    });
  }

  confirm(): void {
    const file = this.selectedFile();
    if (!file) return;
    this.importing.set(true);
    this.members.importMembersFromFile(file, false).subscribe({
      next: (r) => {
        this.report.set(r);
        this.importing.set(false);
        this.applied.set(true);
        this.notification.success('Import effectué', `${r.created} créé(s), ${r.updated} mis à jour.`);
      },
      error: () => { this.importing.set(false); this.notification.error('Échec', 'Import impossible.'); },
    });
  }
}
