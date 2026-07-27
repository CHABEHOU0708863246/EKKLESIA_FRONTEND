// src/app/features/dashboard/dashboard/medias/newsletter/newsletter.component.ts

import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil, finalize, debounceTime, distinctUntilChanged } from 'rxjs';

import { Content, ContentType, ContentUtils } from '../../../../../core/models/Communication/content.model';
import { Permissions } from '../../../../../core/services/Permissions/permissions';
import { Contents } from '../../../../../core/services/Content/contents';

// Interface locale pour une newsletter (extension de Content)
interface NewsletterItem extends Content {
  // Champs spécifiques aux newsletters stockés dans metadata
  recipients?: string[];
  status?: 'draft' | 'sent' | 'sending' | 'failed';
  sentAt?: string;
}

@Component({
  selector: 'app-newsletter',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './newsletter.html',
  styleUrls: ['./newsletter.scss'],
})
export class Newsletter implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private contentService = inject(Contents);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  public permissions = inject(Permissions);

  // ── État ──
  loading = signal(true);
  saving = signal(false);
  sending = signal(false);
  error = signal<string | null>(null);

  // ── Données ──
  newsletters = signal<NewsletterItem[]>([]);
  selectedNewsletter = signal<NewsletterItem | null>(null);
  showForm = signal(false);
  isEditMode = signal(false);

  // ── Statistiques ──
  stats = computed(() => {
    const list = this.newsletters();
    const total = list.length;
    const drafts = list.filter((n) => n.status === 'draft' || !n.status).length;
    const sent = list.filter((n) => n.status === 'sent').length;
    const failed = list.filter((n) => n.status === 'failed').length;
    return { total, drafts, sent, failed };
  });

  // ── Filtres ──
  searchTerm = signal('');
  filterStatus = signal<'all' | 'draft' | 'sent' | 'failed'>('all');

  // ── Formulaire ──
  form: FormGroup;

  // ── Helpers ──
  getStatusLabel = (status?: string): string => {
    if (!status) return 'Brouillon';
    const labels: Record<string, string> = {
      draft: 'Brouillon',
      sent: 'Envoyé',
      sending: 'En cours',
      failed: 'Échoué',
    };
    return labels[status] || status;
  };

  getStatusColor = (status?: string): string => {
    if (!status) return 'secondary';
    const colors: Record<string, string> = {
      draft: 'secondary',
      sent: 'success',
      sending: 'warning',
      failed: 'danger',
    };
    return colors[status] || 'secondary';
  };

  getFormattedDate = ContentUtils.getFormattedDateTime;
  getTypeLabel = ContentUtils.getTypeLabel;

  constructor() {
    this.form = this.fb.group({
      id: [''],
      title: ['', [Validators.required, Validators.minLength(3)]],
      content: ['', [Validators.required, Validators.minLength(10)]],
      recipients: ['', [Validators.required]],
      status: ['draft'],
    });
  }

  ngOnInit(): void {
    this.loadNewsletters();

    // Recherche en temps réel
    // On peut filtrer côté client
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Chargement ──
  loadNewsletters(): void {
    this.loading.set(true);
    this.error.set(null);

    const filter = {
      type: ContentType.Announcement,
      page: 1,
      pageSize: 100,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };

    this.contentService
      .getAll(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            // Transformer les contenus en newsletters
            const items = (response.data as any).items || [];
            this.newsletters.set(
              items.map((item: any) => this.mapToNewsletter(item))
            );
          } else {
            this.newsletters.set([]);
            this.error.set(response.message || 'Impossible de charger les newsletters.');
          }
          this.loading.set(false);
        },
        error: (err) => {
          console.error('❌ Erreur chargement newsletters:', err);
          this.error.set('Erreur lors du chargement.');
          this.loading.set(false);
        },
      });
  }

  // ── Mapping Content → NewsletterItem ──
  private mapToNewsletter(content: any): NewsletterItem {
    return {
      ...content,
      recipients: content.metadata?.recipients?.split(',') || [],
      status: content.metadata?.status || 'draft',
      sentAt: content.metadata?.sentAt || null,
    };
  }

  // ── Mapping NewsletterItem → ContentCreate ──
  private mapToContentCreate(data: any): any {
    return {
      title: data.title,
      type: ContentType.Announcement,
      url: '', // pas de fichier
      description: data.content,
      metadata: {
        recipients: data.recipients,
        status: data.status || 'draft',
        sentAt: data.status === 'sent' ? new Date().toISOString() : null,
      },
      tags: ['newsletter'],
      churchId: '', // à récupérer du contexte utilisateur
      isPublished: data.status === 'sent',
      isFeatured: false,
    };
  }

  // ── Filtrer les newsletters ──
  get filteredNewsletters(): NewsletterItem[] {
    const list = this.newsletters();
    const search = this.searchTerm().toLowerCase().trim();
    const status = this.filterStatus();

    return list.filter((n) => {
      const matchSearch =
        n.title.toLowerCase().includes(search) ||
        (n.description && n.description.toLowerCase().includes(search));
      if (!matchSearch) return false;

      if (status === 'all') return true;
      return n.status === status;
    });
  }

  // ── Actions ──
  openCreateForm(): void {
    this.isEditMode.set(false);
    this.selectedNewsletter.set(null);
    this.form.reset({
      title: '',
      content: '',
      recipients: '',
      status: 'draft',
    });
    this.showForm.set(true);
  }

  openEditForm(newsletter: NewsletterItem): void {
    this.isEditMode.set(true);
    this.selectedNewsletter.set(newsletter);
    this.form.patchValue({
      id: newsletter.id,
      title: newsletter.title,
      content: newsletter.description || '',
      recipients: (newsletter.recipients || []).join(', '),
      status: newsletter.status || 'draft',
    });
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.selectedNewsletter.set(null);
    this.form.reset();
  }

  saveNewsletter(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    const raw = this.form.value;

    const payload = this.mapToContentCreate(raw);

    const request$ = this.isEditMode()
      ? this.contentService.update(this.selectedNewsletter()!.id, payload)
      : this.contentService.create(payload);

    request$.pipe(
      takeUntil(this.destroy$),
      finalize(() => this.saving.set(false))
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.closeForm();
          this.loadNewsletters();
        } else {
          this.error.set(response.message || 'Erreur lors de l’enregistrement.');
        }
      },
      error: (err) => {
        console.error('❌ Erreur sauvegarde:', err);
        this.error.set('Une erreur est survenue.');
      },
    });
  }

  sendNewsletter(newsletter: NewsletterItem, event: Event): void {
    event.stopPropagation();
    if (newsletter.status === 'sent') {
      this.error.set('Cette newsletter a déjà été envoyée.');
      return;
    }

    if (!confirm(`Envoyer la newsletter "${newsletter.title}" à ${(newsletter.recipients || []).length} destinataires ?`)) {
      return;
    }

    this.sending.set(true);
    // Mettre à jour le statut en "sending"
    const payload = this.mapToContentCreate({
      ...newsletter,
      status: 'sending',
    });

    this.contentService
      .update(newsletter.id, payload)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.sending.set(false))
      )
      .subscribe({
        next: (response) => {
          if (response.success) {
            // Simuler l'envoi (dans la vraie vie, un worker envoie les emails)
            // On passe le statut à "sent" après un délai
            setTimeout(() => {
              const sentPayload = this.mapToContentCreate({
                ...newsletter,
                status: 'sent',
                sentAt: new Date().toISOString(),
              });
              this.contentService.update(newsletter.id, sentPayload).subscribe();
            }, 2000);
            this.loadNewsletters();
          } else {
            this.error.set(response.message || 'Erreur lors de l’envoi.');
          }
        },
        error: (err) => {
          console.error('❌ Erreur envoi:', err);
          this.error.set('Erreur lors de l’envoi.');
        },
      });
  }

  deleteNewsletter(newsletter: NewsletterItem, event: Event): void {
    event.stopPropagation();
    if (newsletter.status === 'sent') {
      this.error.set('Impossible de supprimer une newsletter déjà envoyée.');
      return;
    }

    if (!confirm(`Supprimer la newsletter "${newsletter.title}" ?`)) {
      return;
    }

    this.contentService
      .delete(newsletter.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.loadNewsletters();
          } else {
            this.error.set(response.message || 'Erreur lors de la suppression.');
          }
        },
        error: (err) => {
          console.error('❌ Erreur suppression:', err);
          this.error.set('Erreur lors de la suppression.');
        },
      });
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.filterStatus.set('all');
  }

  // ── Gestion du formulaire ──
  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!control && control.invalid && (control.dirty || control.touched);
  }
}
