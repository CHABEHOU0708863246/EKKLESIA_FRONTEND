import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { PublicEventDetails, ParticipantProfileType } from '../../models/Events/event.model';
import { PublicRegistrationService } from '../../services/Event/public-registration-service';

const PROFILE_OPTIONS = [
  { value: ParticipantProfileType.External, label: 'Personne extérieure' },
  { value: ParticipantProfileType.Member, label: 'Membre simple' },
  { value: ParticipantProfileType.Berehin, label: 'Béréen' },
  { value: ParticipantProfileType.FraternityLeader, label: 'Leader de fraternité' },
  { value: ParticipantProfileType.Shepherd, label: 'Berger' },
  { value: ParticipantProfileType.ShepherdMinister, label: 'Ministre Berger' },
  { value: ParticipantProfileType.Pastor, label: 'Pasteur' },
];

@Component({
  selector: 'app-public-event-registration',
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './public-event-registration.html',
  styleUrl: './public-event-registration.scss',
})
export class PublicEventRegistration implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private registrationService = inject(PublicRegistrationService);

  eventId!: string;
  event = signal<PublicEventDetails | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  submitting = signal(false);

  // Résultat après soumission : on bascule l'UI vers l'écran de paiement
  registrationResult = signal<{
    checkoutUrl?: string;
    paymentUrl?: string;
    qrCode?: string;
    registrationId: string;
  } | null>(null);

  readonly profileOptions = PROFILE_OPTIONS;

  form: FormGroup;

  availableFormulas = computed(() => {
    const ev = this.event();
    return ev?.formulas.filter(f => f.isAvailable) ?? [];
  });

  constructor() {
    this.form = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      gender: ['', Validators.required],
      profileType: [ParticipantProfileType.External, Validators.required],
      formulaId: ['', Validators.required],
      paymentMethod: ['wave'],
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('eventId');
    if (!id) {
      this.error.set("Lien d'inscription invalide.");
      this.loading.set(false);
      return;
    }
    this.eventId = id;
    this.loadEvent();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadEvent(): void {
    this.loading.set(true);
    this.error.set(null);

    this.registrationService.getEventDetails(this.eventId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (ev) => {
          this.event.set(ev);
          this.loading.set(false);

          if (!ev.registrationOpen) {
            this.error.set('Les inscriptions pour cet événement sont fermées.');
          } else if (ev.isFull) {
            this.error.set('Cet événement est complet.');
          }
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(
            err?.status === 404
              ? "Cet événement n'existe pas ou l'inscription publique n'est plus disponible."
              : "Une erreur est survenue lors du chargement de l'événement."
          );
        },
      });
  }

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  getFormulaLabel(formulaId: string): string {
    const f = this.event()?.formulas.find((x) => x.id === formulaId);
    return f ? `${f.name} — ${f.price.toLocaleString()} ${f.currency}` : '';
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    const raw = this.form.value;
    this.registrationService.register({
      eventId: this.eventId,
      firstName: raw.firstName.trim(),
      lastName: raw.lastName.trim(),
      email: raw.email.trim(),
      phone: raw.phone.trim(),
      gender: raw.gender,
      profileType: raw.profileType,
      formulaId: raw.formulaId,
      paymentMethod: raw.paymentMethod,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.submitting.set(false);

        if (!response.success) {
          this.error.set(response.message);
          return;
        }

        // ✅ On garde l'utilisateur sur cette page, on affiche l'écran de
        // paiement plutôt que de le rediriger d'office : s'il ferme
        // l'onglet, la page de statut lui permettra de reprendre son
        // paiement en attente (voir Étape 6.4 plus bas).
        this.registrationResult.set({
          checkoutUrl: response.checkoutUrl,
          paymentUrl: response.paymentUrl,
          qrCode: response.qrCode,
          registrationId: response.registrationId,
        });
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(
          err?.error?.message || "Une erreur est survenue lors de l'inscription. Veuillez réessayer."
        );
      },
    });
  }

  goToPayment(): void {
    const result = this.registrationResult();
    const url = result?.checkoutUrl || result?.paymentUrl;
    if (url) {
      window.location.href = url;
    }
  }
}
