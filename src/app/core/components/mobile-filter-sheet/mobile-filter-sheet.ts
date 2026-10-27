import { Component, Input, signal } from '@angular/core';

@Component({
  selector: 'app-mobile-filter-sheet',
  standalone: true,
  templateUrl: './mobile-filter-sheet.html',
  styleUrl: './mobile-filter-sheet.scss',
})
export class MobileFilterSheet {
  @Input() title = 'Filtres';
  @Input() applyLabel = 'Voir les résultats';

  readonly isOpen = signal(false);

  open(): void {
    this.isOpen.set(true);
    document.body.classList.add('iam-filter-sheet-open');
  }

  close(): void {
    this.isOpen.set(false);
    document.body.classList.remove('iam-filter-sheet-open');
  }
}
