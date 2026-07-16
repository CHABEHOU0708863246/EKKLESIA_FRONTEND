// // features/dashboard/services/service-sermon-library/service-sermon-library.component.ts

// import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { RouterModule } from '@angular/router';
// import { FormControl, ReactiveFormsModule } from '@angular/forms';
// import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
// @Component({
//   selector: 'app-service-sermon-library',
//   standalone: true,
//   imports: [CommonModule, RouterModule, ReactiveFormsModule],
//   templateUrl: './service-sermon-library.html',
//   styleUrls: ['./service-sermon-library.scss'],
// })
// export class ServiceSermonLibrary implements OnInit, OnDestroy {
//   private destroy$ = new Subject<void>();
//   private sermonService = inject(SermonService);

//   sermons = signal<Sermon[]>([]);
//   loading = signal(false);
//   error = signal<string | null>(null);
//   totalCount = signal(0);
//   currentPage = signal(1);
//   totalPages = signal(1);
//   pageSize = signal(12);

//   // Filtres
//   searchControl = new FormControl('');
//   preacherControl = new FormControl('');

//   // Liste des prédicateurs (extraits des sermons)
//   preachers = signal<string[]>([]);

//   // Pagination
//   pageRangeLabel = computed(() => {
//     const total = this.totalCount();
//     const page = this.currentPage();
//     const size = this.pageSize();
//     if (total === 0) return '0 sermon';
//     const start = (page - 1) * size + 1;
//     const end = Math.min(page * size, total);
//     return `${start}–${end} sur ${total}`;
//   });

//   get pageSizeOptions(): number[] { return [12, 24, 48, 96]; }

//   // Pour affichage date
//   formatDate = ServiceUtils.getFormattedDate;

//   ngOnInit(): void {
//     this.loadSermons();

//     this.searchControl.valueChanges
//       .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
//       .subscribe(() => this.resetAndLoad());

//     this.preacherControl.valueChanges
//       .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
//       .subscribe(() => this.resetAndLoad());
//   }

//   ngOnDestroy(): void {
//     this.destroy$.next();
//     this.destroy$.complete();
//   }

//   private resetAndLoad(): void {
//     this.currentPage.set(1);
//     this.loadSermons();
//   }

//   private loadSermons(): void {
//     this.loading.set(true);
//     this.error.set(null);

//     const filter: SermonFilter = {
//       ...DEFAULT_SERMON_FILTER,
//       page: this.currentPage(),
//       pageSize: this.pageSize(),
//       searchTerm: this.searchControl.value || undefined,
//       preacher: this.preacherControl.value || undefined,
//     };

//     this.sermonService.getAll(filter)
//       .pipe(takeUntil(this.destroy$))
//       .subscribe({
//         next: (response: any) => {
//           // Gestion des deux structures possibles (wrapper ou direct)
//           let data: any;
//           if (response?.success && response?.data) {
//             data = response.data;
//           } else if (response?.items) {
//             data = response;
//           } else {
//             data = null;
//           }

//           if (data?.items) {
//             this.sermons.set(data.items);
//             this.totalCount.set(data.totalCount || 0);
//             this.currentPage.set(data.currentPage || 1);
//             this.totalPages.set(data.totalPages || 1);
//             // Extraire la liste des prédicateurs uniques
//             const preachers = [...new Set(data.items.map((s: Sermon) => s.preacher).filter(Boolean))];
//             this.preachers.set(preachers);
//           } else {
//             this.sermons.set([]);
//             this.totalCount.set(0);
//             this.error.set('Impossible de charger les sermons.');
//           }
//           this.loading.set(false);
//         },
//         error: (err) => {
//           console.error('❌ Erreur chargement sermons:', err);
//           this.sermons.set([]);
//           this.loading.set(false);
//           this.error.set('Erreur lors du chargement des sermons.');
//         },
//       });
//   }

//   // Pagination
//   goToPage(page: number): void {
//     if (page < 1 || page > this.totalPages()) return;
//     this.currentPage.set(page);
//     this.loadSermons();
//   }
//   previousPage(): void { this.goToPage(this.currentPage() - 1); }
//   nextPage(): void { this.goToPage(this.currentPage() + 1); }

//   onPageSizeChange(size: string): void {
//     this.pageSize.set(Number(size));
//     this.currentPage.set(1);
//     this.loadSermons();
//   }

//   resetFilters(): void {
//     this.searchControl.setValue('', { emitEvent: false });
//     this.preacherControl.setValue('', { emitEvent: false });
//     this.currentPage.set(1);
//     this.loadSermons();
//   }

//   // Helpers
//   getInitials(name: string): string {
//     if (!name) return '?';
//     const parts = name.trim().split(' ');
//     if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
//     return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
//   }
// }
