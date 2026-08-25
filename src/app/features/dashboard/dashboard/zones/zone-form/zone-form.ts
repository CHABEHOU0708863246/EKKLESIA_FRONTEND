// zone-form.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Users } from '../../../../../core/services/Users/users';
import { ZoneService } from '../../../../../core/services/Zones/zone-service';
import { Church } from '../../../../../core/services/Church/church';


interface SiteOption { id: string; name: string; churchName: string; }
interface ChurchOption { id: string; name: string; }
interface UserOption { id: string; fullName: string; }

@Component({
  selector: 'app-zone-form',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './zone-form.html',
  styleUrl: './zone-form.scss',
})
export class ZoneForm implements OnInit {
  form: FormGroup;
  submitting = signal(false);
  error = signal<string | null>(null);

  churches = signal<ChurchOption[]>([]);
  sites = signal<SiteOption[]>([]);
  users = signal<UserOption[]>([]);

  constructor(
    private fb: FormBuilder,
    public zoneServices: ZoneService,
    private churchService: Church,
    private usersService: Users,
    private router: Router
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      churchId: [''],
      chiefUserId: ['', Validators.required],
      siteIds: this.fb.control<string[]>([], Validators.required),
    });
  }

  ngOnInit(): void {
    this.loadChurchesAndSites();
    this.loadUsers();
  }

  private loadChurchesAndSites(): void {
    // ⚠️ Suppose ChurchService.getAllChurches() renvoie ApiResponse<Church[]>
    // avec chaque Church.sites embarqué (cf. modèle backend Church.cs)
    this.churchService.getAllChurches().subscribe((res: any) => {
      if (!res.success) return;
      const churchList: ChurchOption[] = [];
      const siteList: SiteOption[] = [];

      for (const church of res.data) {
        churchList.push({ id: church.id, name: church.name });
        for (const site of church.sites ?? []) {
          siteList.push({ id: site.id, name: site.name, churchName: church.name });
        }
      }

      this.churches.set(churchList);
      this.sites.set(siteList);
    });
  }

  private loadUsers(): void {
    this.usersService.getUsers({ page: 1, pageSize: 100 }).subscribe((res) => {
      if (res.success && res.data) {
        this.users.set(res.data.items.map((u: any) => ({
          id: u.id,
          fullName: u.fullName || u.username || u.email
        })));
      }
    });
  }

  isSiteSelected(siteId: string): boolean {
    return (this.form.value.siteIds || []).includes(siteId);
  }

  toggleSite(siteId: string): void {
    const current: string[] = this.form.value.siteIds || [];
    const updated = current.includes(siteId)
      ? current.filter((id) => id !== siteId)
      : [...current, siteId];
    this.form.patchValue({ siteIds: updated });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // ✅ Validation supplémentaire
    const formValue = this.form.value;
    if (!formValue.chiefUserId) {
      this.error.set('Veuillez sélectionner un chef de zone.');
      return;
    }
    if (!formValue.siteIds || formValue.siteIds.length === 0) {
      this.error.set('Veuillez sélectionner au moins un site.');
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    this.zoneServices.createZone(formValue).subscribe({
      next: (res) => {
        this.submitting.set(false);
        if (!res.success) {
          this.error.set(res.message);
          return;
        }
        this.router.navigate(['/dashboard/admin/zones']);
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(err.message || 'Erreur lors de la création de la zone.');
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/dashboard/admin/zones']);
  }
}
