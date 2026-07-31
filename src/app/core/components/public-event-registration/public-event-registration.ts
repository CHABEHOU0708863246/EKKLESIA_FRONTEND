import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import {
  ReactiveFormsModule, FormBuilder, FormGroup, Validators,
  AbstractControl, ValidationErrors
} from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { distinctUntilChanged, finalize, Subject, takeUntil } from 'rxjs';
import { PublicEventDetails, ParticipantProfileType } from '../../models/Events/event.model';
import { PublicRegistrationService } from '../../services/Event/public-registration-service';
import { Church as ChurchService } from '../../services/Church/church';
import { Church as ChurchModel } from '../../models/Church/church.model';
import { Site } from '../../models/Church/site.model';

const PROFILE_OPTIONS = [
  { value: ParticipantProfileType.External, label: 'Personne extérieure' },
  { value: ParticipantProfileType.Member, label: 'Membre simple' },
  { value: ParticipantProfileType.Berehin, label: 'Béréen' },
  { value: ParticipantProfileType.FraternityLeader, label: 'Leader de fraternité' },
  { value: ParticipantProfileType.Shepherd, label: 'Berger' },
  { value: ParticipantProfileType.ShepherdMinister, label: 'Ministre Berger' },
  { value: ParticipantProfileType.Pastor, label: 'Pasteur' },
];

/**
 * ⚠️ Validateur de groupe : une adresse email doit exister quelque part
 * (participant OU payeur), sinon aucun reçu ne peut être envoyé.
 * Reproduit la règle du backend (EventPublicRegistrationDto.Validate).
 */
function atLeastOneEmailValidator(group: AbstractControl): ValidationErrors | null {
  const email = (group.get('email')?.value ?? '').trim();
  const payerEmail = (group.get('payerEmail')?.value ?? '').trim();
  return email || payerEmail ? null : { noEmailAnywhere: true };
}

@Component({
  selector: 'app-public-event-registration',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './public-event-registration.html',
  styleUrl: './public-event-registration.scss',
})
export class PublicEventRegistration implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private registrationService = inject(PublicRegistrationService);
  private churchService = inject(ChurchService);

  eventId!: string;
  event = signal<PublicEventDetails | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  submitting = signal(false);

  churches = signal<ChurchModel[]>([]);
  sites = signal<Site[]>([]);
  loadingChurches = signal(false);
  loadingSites = signal(false);

  registrationResult = signal<{
    checkoutUrl?: string;
    paymentUrl?: string;
    qrCode?: string;
    registrationId: string;
    participantName: string;
  } | null>(null);

  /** ✅ Mémorise le payeur pour enchaîner les inscriptions sans le ressaisir. */
  private lastPayer: {
    paidByThirdParty: boolean;
    payerName: string;
    payerPhone: string;
    payerEmail: string;
  } | null = null;

  /** Nombre de personnes inscrites lors de cette session. */
  registeredCount = signal(0);

  readonly profileOptions = PROFILE_OPTIONS;

  form: FormGroup;

  availableFormulas = computed(() => {
    const ev = this.event();
    return ev?.formulas.filter(f => f.isAvailable) ?? [];
  });

  /** Raccourci template : le bloc payeur est-il déplié ? */
  get isThirdPartyPayer(): boolean {
    return this.form.get('paidByThirdParty')?.value === true;
  }

  /** Vrai si aucun email n'est renseigné nulle part et que le formulaire a été touché. */
  get missingEmailEverywhere(): boolean {
    return this.form.hasError('noEmailAnywhere')
        && (this.form.get('email')?.touched === true
         || this.form.get('payerEmail')?.touched === true
         || this.form.touched);
  }

  constructor() {
    this.form = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],

      // ✅ Email optionnel : plus de Validators.required
      email: ['', [Validators.email]],

      phone: ['', Validators.required],
      gender: ['', Validators.required],
      profileType: [ParticipantProfileType.External, Validators.required],
      churchId: [''],
      siteId: [{ value: '', disabled: true }],
      formulaId: ['', Validators.required],
      paymentMethod: ['wave'],

      // ── Payeur ──
      paidByThirdParty: [false],
      payerName: [''],
      payerPhone: [''],
      payerEmail: ['', [Validators.email]],
    }, { validators: atLeastOneEmailValidator });

    // ── Église → sites ──
    this.form.get('churchId')?.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((churchId: string) => {
        const siteControl = this.form.get('siteId');
        siteControl?.setValue('');
        this.sites.set([]);

        if (!churchId) {
          siteControl?.disable();
          return;
        }

        siteControl?.enable();
        this.loadSitesForChurch(churchId);
      });

    // ── Bascule « quelqu'un d'autre paie » ──
    this.form.get('paidByThirdParty')?.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((isThirdParty: boolean) => this.applyPayerMode(isThirdParty));
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
    this.loadChurches();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ══════════════════════════════════════════════════════════
  // PAYEUR
  // ══════════════════════════════════════════════════════════

  /**
   * ⚠️ Les validateurs des champs payeur sont posés/retirés dynamiquement :
   * un champ requis mais masqué bloquerait la soumission sans que
   * l'utilisateur comprenne pourquoi.
   */
  private applyPayerMode(isThirdParty: boolean): void {
    const nameCtrl = this.form.get('payerName');
    const phoneCtrl = this.form.get('payerPhone');

    if (isThirdParty) {
      nameCtrl?.setValidators([Validators.required, Validators.minLength(2)]);
      phoneCtrl?.setValidators([Validators.required]);
    } else {
      nameCtrl?.clearValidators();
      phoneCtrl?.clearValidators();
      nameCtrl?.setValue('', { emitEvent: false });
      phoneCtrl?.setValue('', { emitEvent: false });
    }

    nameCtrl?.updateValueAndValidity({ emitEvent: false });
    phoneCtrl?.updateValueAndValidity({ emitEvent: false });
    this.form.updateValueAndValidity({ emitEvent: false });
  }

  // ══════════════════════════════════════════════════════════
  // CHARGEMENT
  // ══════════════════════════════════════════════════════════

  private loadChurches(): void {
    this.loadingChurches.set(true);

    this.churchService.getAllChurches()
      .pipe(finalize(() => this.loadingChurches.set(false)), takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.churches.set(response.data);
          }
        },
        error: (err) => console.error('❌ Chargement des églises', err?.status, err?.error),
      });
  }

  private loadSitesForChurch(churchId: string): void {
    this.loadingSites.set(true);

    this.churchService.getSitesByChurchId(churchId)
      .pipe(finalize(() => this.loadingSites.set(false)), takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.sites.set(response.success && response.data ? response.data : []);
        },
        error: (err) => {
          console.error('❌ Chargement des sites', err?.status, err?.error);
          this.sites.set([]);
        },
      });
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

  // ══════════════════════════════════════════════════════════
  // VALIDATION & SOUMISSION
  // ══════════════════════════════════════════════════════════

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

      if (this.form.hasError('noEmailAnywhere')) {
        this.error.set(
          "Une adresse email est nécessaire pour recevoir le reçu : "
        + "celle du participant, ou celle de la personne qui paie."
        );
      }
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    const raw = this.form.getRawValue();
    const isThirdParty = raw.paidByThirdParty === true;

    // ✅ Mémorise le payeur pour la prochaine inscription de la session
    this.lastPayer = {
      paidByThirdParty: isThirdParty,
      payerName: (raw.payerName ?? '').trim(),
      payerPhone: (raw.payerPhone ?? '').trim(),
      payerEmail: (raw.payerEmail ?? '').trim(),
    };

    const participantName = `${raw.firstName.trim()} ${raw.lastName.trim()}`;

    this.registrationService.register({
      eventId: this.eventId,
      firstName: raw.firstName.trim(),
      lastName: raw.lastName.trim(),
      email: (raw.email ?? '').trim() || undefined,   // ✅ undefined si vide
      phone: raw.phone.trim(),
      gender: raw.gender,
      profileType: raw.profileType,
      churchId: raw.churchId || undefined,
      siteId: raw.siteId || undefined,
      formulaId: raw.formulaId,
      paymentMethod: raw.paymentMethod,

      paidByThirdParty: isThirdParty,
      payerName: isThirdParty ? (raw.payerName ?? '').trim() : undefined,
      payerPhone: isThirdParty ? (raw.payerPhone ?? '').trim() : undefined,
      payerEmail: (raw.payerEmail ?? '').trim() || undefined,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.submitting.set(false);

        if (!response.success) {
          this.error.set(response.message);
          return;
        }

        this.registeredCount.update((n) => n + 1);
        this.registrationResult.set({
          checkoutUrl: response.checkoutUrl,
          paymentUrl: response.paymentUrl,
          qrCode: response.qrCode,
          registrationId: response.registrationId,
          participantName,
        });
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(
          err?.error?.message
          || "Une erreur est survenue lors de l'inscription. Veuillez réessayer."
        );
      },
    });
  }

  goToPayment(): void {
    const result = this.registrationResult();
    const url = result?.checkoutUrl || result?.paymentUrl;
    if (url) window.location.href = url;
  }

  /**
   * ✅ NOUVEAU — réinitialise le formulaire pour inscrire la personne suivante,
   * en conservant les informations du payeur, la formule et le moyen de paiement.
   *
   * ⚠️ L'inscription précédente reste « en attente de paiement » tant que
   * l'utilisateur n'a pas cliqué sur « Procéder au paiement ». Le message
   * du template l'en avertit explicitement.
   */
  registerAnotherPerson(): void {
    const previous = this.form.getRawValue();

    this.registrationResult.set(null);
    this.error.set(null);

    this.form.reset({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      gender: '',
      profileType: ParticipantProfileType.External,

      // On garde le contexte commun au groupe
      churchId: previous.churchId ?? '',
      siteId: previous.siteId ?? '',
      formulaId: previous.formulaId ?? '',
      paymentMethod: previous.paymentMethod ?? 'wave',

      // On garde le payeur
      paidByThirdParty: this.lastPayer?.paidByThirdParty ?? false,
      payerName: this.lastPayer?.payerName ?? '',
      payerPhone: this.lastPayer?.payerPhone ?? '',
      payerEmail: this.lastPayer?.payerEmail ?? '',
    }, { emitEvent: false });

    // Le reset a effacé les validateurs dynamiques : on les repose
    this.applyPayerMode(this.lastPayer?.paidByThirdParty ?? false);

    // Le site reste actif si une église était sélectionnée
    if (previous.churchId) {
      this.form.get('siteId')?.enable({ emitEvent: false });
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
