// src/app/features/dashboard/pastor/appointments/appointment-form/appointment-form.component.ts

import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { Appointment, AppointmentCreate, AppointmentUpdate, AppointmentUtils, AppointmentStatus } from '../../../../../core/models/Pastor/appointment.model';
import { PastorAppointmentService } from '../../../../../core/services/PastortRvd/pastort-appointment';
import { Users } from '../../../../../core/services/Users/users';
import { Church as ChurchService } from '../../../../../core/services/Church/church';
import { Members } from '../../../../../core/services/Members/members';
import { Church as ChurchModel } from '../../../../../core/models/Church/church.model';
import { Site } from '../../../../../core/models/Church/site.model';
import { User } from '../../../../../core/models/Users/user.model';
import { Member } from '../../../../../core/models/Members/member.model';
import { Roles } from '../../../../../core/services/Roles/roles';

@Component({
  selector: 'app-appointment-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './appointment-form.html',
  styleUrls: ['./appointment-form.scss'],
})
export class AppointmentForm implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private appointmentService = inject(PastorAppointmentService);
  private userService = inject(Users);
  private churchService = inject(ChurchService);
  private memberService = inject(Members);


  // ── État ──
  isEditMode = signal(false);
  appointmentId: string | null = null;
  saving = signal(false);
  error = signal<string | null>(null);

  pastorRoleNames = signal<string[]>([]);

  // ── Listes ──
  pastors = signal<User[]>([]);
  loadingPastors = signal(false);
  churches = signal<ChurchModel[]>([]);
  loadingChurches = signal(false);
  sites = signal<Site[]>([]);
  loadingSites = signal(false);

  // ── Recherche de membres ──
  searchingMember = signal(false);
  showMemberResults = signal(false);
  memberResults = signal<Member[]>([]);
  selectedMember = signal<Member | null>(null);
  private roleService = inject(Roles);

  // ── Formulaire ──
  form: FormGroup;

  // ── Statut du rendez-vous (pour édition) ──
  readonly AppointmentStatus = AppointmentStatus;
  statusOptions = Object.values(AppointmentStatus).map((s) => ({
    value: s,
    label: AppointmentUtils.getStatusLabel(s),
  }));

  // ── Helpers ──
  getPastorFullName = (user: User): string => user.fullName || `${user.firstName} ${user.lastName}`.trim();
  getMemberFullName = (member: Member): string => `${member.firstName} ${member.lastName}`.trim();
  getMemberInitials = (member: Member): string => {
    const f = member.firstName?.charAt(0) || '?';
    const l = member.lastName?.charAt(0) || '?';
    return `${f}${l}`.toUpperCase();
  };

  constructor() {
    this.form = this.fb.group({
      pastorId: ['', Validators.required],
      churchId: ['', Validators.required],
      siteId: [''],
      memberId: [''],
      memberSearch: [''],
      visitorName: [''],
      visitorPhone: [''],
      visitorEmail: [''],
      appointmentDate: ['', Validators.required],
      durationMinutes: [30, [Validators.required, Validators.min(1)]],
      location: [''],
      reason: ['', Validators.required],
      notes: [''],
      status: [AppointmentStatus.Scheduled],
    });
  }

  ngOnInit(): void {
    this.loadChurches();
    this.loadPastors();
    this.loadPastorRoleNames();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.appointmentId = id;
      this.loadAppointment(id);
    }

    // Réactivité église → sites
    this.form.get('churchId')?.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((churchId: string) => {
        this.form.get('siteId')?.setValue('');
        this.sites.set([]);
        if (churchId) this.loadSites(churchId);
      });

    // Recherche de membre
    this.form.get('memberSearch')?.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((term: string) => {
        if (term && term.trim().length >= 2) {
          this.searchMembers(term.trim());
        } else {
          this.memberResults.set([]);
          this.showMemberResults.set(false);
        }
      });

    // Si un membre est sélectionné, on cache les champs visiteur
    this.form.get('memberId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((memberId) => {
        if (memberId) {
          this.form.get('visitorName')?.setValue('');
          this.form.get('visitorPhone')?.setValue('');
          this.form.get('visitorEmail')?.setValue('');
          this.form.get('visitorName')?.disable({ emitEvent: false });
          this.form.get('visitorPhone')?.disable({ emitEvent: false });
          this.form.get('visitorEmail')?.disable({ emitEvent: false });
        } else {
          this.form.get('visitorName')?.enable({ emitEvent: false });
          this.form.get('visitorPhone')?.enable({ emitEvent: false });
          this.form.get('visitorEmail')?.enable({ emitEvent: false });
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }


  private loadPastorRoleNames(): void {
  const codes = ['PASTOR_PRINCIPAL', 'PASTEUR_SITE'];
  const names: string[] = [];
  let remaining = codes.length;

  for (const code of codes) {
    this.roleService.getRoleByCode(code)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            names.push(response.data.roleName);
          }
          remaining--;
          if (remaining === 0) this.pastorRoleNames.set(names);
        },
        error: () => {
          remaining--;
          if (remaining === 0) this.pastorRoleNames.set(names);
        },
      });
  }
}

  // ──────────────────────────────────────────────────────────────
  // 🛠️ EXTRACTEUR DÉFENSIF DE LISTE
  // ──────────────────────────────────────────────────────────────
  // Gère plusieurs formes possibles de réponse API sans provoquer
  // d'erreur TypeScript, tant que la forme exacte de UserListResponse
  // / MemberListResponse n'est pas confirmée.
  //
  // Formes supportées :
  //   1. response.items                (DTO retourné brut par le contrôleur, ex: EventListResponseDto)
  //   2. response.data.items           (ApiResponse<T> où T a un champ items)
  //   3. response.data                 (ApiResponse<T> où T est directement un tableau)
  //   4. response                      (tableau brut)
  private extractItems<T>(response: any): T[] {
    if (!response) return [];

    if (Array.isArray(response)) return response as T[];

    if (Array.isArray(response.items)) return response.items as T[];

    if (response.data) {
      if (Array.isArray(response.data)) return response.data as T[];
      if (Array.isArray(response.data.items)) return response.data.items as T[];
    }

    console.warn('⚠️ Forme de réponse API inattendue, impossible d’extraire la liste :', response);
    return [];
  }

  // ──────────────────────────────────────────────────────────────
  // CHARGEMENT DES DONNÉES
  // ──────────────────────────────────────────────────────────────

  private loadChurches(): void {
    this.loadingChurches.set(true);
    this.churchService.getAllChurches().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.churches.set(response.data as any);
        }
        this.loadingChurches.set(false);
      },
      error: () => this.loadingChurches.set(false),
    });
  }

  private loadSites(churchId: string): void {
    this.loadingSites.set(true);
    this.churchService.getSitesByChurchId(churchId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.sites.set(response.data as any);
        }
        this.loadingSites.set(false);
      },
      error: () => this.loadingSites.set(false),
    });
  }

private loadPastors(): void {
  this.loadingPastors.set(true);
  this.userService
    .getUsers({ page: 1, pageSize: 100 } as any)
    .subscribe({
      next: (response: any) => {
        console.log('📡 [loadPastors] Réponse brute:', response);
        const allUsers = this.extractItems<User>(response);
        console.log('👥 Tous les utilisateurs:', allUsers);

        // 🔍 Log des rôles pour chaque utilisateur
        allUsers.forEach(u => {
          console.log(`👤 ${u.fullName} | roles:`, u.roles, '| roleNames:', u.roles);
        });

        // ✅ Filtrer les utilisateurs ayant un rôle de pasteur
        const pastorRoleCodes = ['PASTEUR_SITE', 'PASTOR_PRINCIPAL'];
        const pastorRoleNames = ['Pasteur de Site', 'Pasteur Principal', 'PASTEUR SITE', 'PASTOR PRINCIPAL'];

        const filtered = allUsers.filter((u: any) => {
          // Récupérer tous les rôles possibles
          const userRoles = [
            ...(u.roles ?? []),
            ...(u.roleNames ?? []),
            ...(u.Roles ?? []),
            ...(u.roleName ? [u.roleName] : [])
          ].map((r: string) => r.toUpperCase().trim());

          // Vérifier si un rôle correspond
          return userRoles.some((r: string) =>
            pastorRoleCodes.includes(r) ||
            pastorRoleNames.some(n => r === n.toUpperCase().trim())
          );
        });

        console.log('✅ Pasteurs filtrés:', filtered);
        this.pastors.set(filtered);
        this.loadingPastors.set(false);
      },
      error: (err) => {
        console.error('❌ Erreur chargement pasteurs:', err);
        this.pastors.set([]);
        this.loadingPastors.set(false);
      },
    });
}

  private searchMembers(term: string): void {
    this.searchingMember.set(true);
    this.showMemberResults.set(true);
    this.memberService
      .getMembers({ page: 1, pageSize: 8, fullName: term } as any)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          const items = this.extractItems<Member>(response);
          this.memberResults.set(items);
          this.searchingMember.set(false);
        },
        error: () => {
          this.memberResults.set([]);
          this.searchingMember.set(false);
        },
      });
  }

  private loadAppointment(id: string): void {
    this.appointmentService.getAppointmentById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.populateForm(data);
        },
        error: (err) => {
          console.error('❌ Erreur chargement:', err);
          this.error.set('Impossible de charger le rendez-vous.');
        },
      });
  }

  private populateForm(app: Appointment): void {
    this.form.patchValue({
      pastorId: app.pastorId,
      churchId: app.churchId,
      siteId: app.siteId || '',
      memberId: app.memberId || '',
      memberSearch: app.memberName || '',
      visitorName: app.visitorName || '',
      visitorPhone: app.visitorPhone || '',
      visitorEmail: app.visitorEmail || '',
      appointmentDate: this.formatDateInput(app.appointmentDate),
      durationMinutes: app.durationMinutes || 30,
      location: app.location || '',
      reason: app.reason,
      notes: app.notes || '',
      status: app.status || AppointmentStatus.Scheduled,
    });

    if (app.memberId) {
      this.selectedMember.set({
        id: app.memberId,
        firstName: app.memberName?.split(' ')[0] || '',
        lastName: app.memberName?.split(' ')[1] || '',
      } as Member);
      this.form.get('visitorName')?.disable({ emitEvent: false });
      this.form.get('visitorPhone')?.disable({ emitEvent: false });
      this.form.get('visitorEmail')?.disable({ emitEvent: false });
    }

    if (app.churchId) {
      this.loadSites(app.churchId);
    }
  }

  private formatDateInput(date: string): string {
    if (!date) return '';
    const d = new Date(date);
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 16);
  }

  // ──────────────────────────────────────────────────────────────
  // GESTION DES MEMBRES (autocomplete)
  // ──────────────────────────────────────────────────────────────

  selectMember(member: Member): void {
    this.selectedMember.set(member);
    this.form.patchValue({
      memberId: member.id,
      memberSearch: this.getMemberFullName(member),
    });
    this.showMemberResults.set(false);
    this.memberResults.set([]);
    this.form.get('visitorName')?.enable({ emitEvent: false });
    this.form.get('visitorPhone')?.enable({ emitEvent: false });
    this.form.get('visitorEmail')?.enable({ emitEvent: false });
  }

  clearMember(): void {
    this.selectedMember.set(null);
    this.form.patchValue({ memberId: '', memberSearch: '' });
    this.form.get('visitorName')?.enable({ emitEvent: false });
    this.form.get('visitorPhone')?.enable({ emitEvent: false });
    this.form.get('visitorEmail')?.enable({ emitEvent: false });
  }

  // ──────────────────────────────────────────────────────────────
  // VALIDATION & SOUMISSION
  // ──────────────────────────────────────────────────────────────

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Veuillez corriger les champs invalides.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const raw = this.form.value;

    const hasMember = !!raw.memberId;
    const hasVisitor = raw.visitorName?.trim();

    if (!hasMember && !hasVisitor) {
      this.error.set('Veuillez sélectionner un membre ou saisir un visiteur.');
      this.saving.set(false);
      return;
    }

    if (hasMember && hasVisitor) {
      this.error.set('Veuillez choisir soit un membre, soit un visiteur, pas les deux.');
      this.saving.set(false);
      return;
    }

    const payload: AppointmentCreate = {
      pastorId: raw.pastorId,
      churchId: raw.churchId,
      siteId: raw.siteId || undefined,
      memberId: raw.memberId || undefined,
      visitorName: raw.visitorName || undefined,
      visitorPhone: raw.visitorPhone || undefined,
      visitorEmail: raw.visitorEmail || undefined,
      appointmentDate: new Date(raw.appointmentDate).toISOString(),
      durationMinutes: raw.durationMinutes || 30,
      location: raw.location || undefined,
      reason: raw.reason,
      notes: raw.notes || undefined,
    };

    const request$ = this.isEditMode() && this.appointmentId
      ? this.appointmentService.updateAppointment(this.appointmentId, payload)
      : this.appointmentService.createAppointment(payload);

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.saving.set(false);
        this.router.navigate(['/dashboard/rendez-vous', data.id]);
      },
      error: (err) => {
        console.error('❌ Erreur sauvegarde:', err);
        this.saving.set(false);
        this.error.set(err?.error?.message || 'Une erreur est survenue.');
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/dashboard/rendez-vous']);
  }
}
