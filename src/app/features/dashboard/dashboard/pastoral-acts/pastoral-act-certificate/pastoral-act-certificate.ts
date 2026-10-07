// src/app/features/dashboard/dashboard/pastoral-acts/pastoral-act-certificate/pastoral-act-certificate.ts
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';

import { PastoralActResponseDto } from '../../../../../core/models/PastoralAct/pastoral-act.dtos';
import { PastoralActType } from '../../../../../core/models/PastoralAct/pastoral-act.enums';
import { isMainRole } from '../../../../../core/models/PastoralAct/pastoral-act.models';

const FRENCH_MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

/**
 * Certificat officiel imprimable d'un acte pastoral.
 * Rendu en HTML/CSS haute définition : bordure ornementale, logo MIAV,
 * typographie calligraphique pour les titres, zones de signatures.
 * L'impression (window.print) n'imprime QUE le certificat (classe boddy
 * `certificate-printing` + styles @media print globaux).
 */
@Component({
  selector: 'app-pastoral-act-certificate',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pastoral-act-certificate.html',
  styleUrl: './pastoral-act-certificate.scss',
})
export class PastoralActCertificateComponent {
  @Input({ required: true }) act!: PastoralActResponseDto;
  @Output() close = new EventEmitter<void>();

  private doc = inject(DOCUMENT);

  readonly PastoralActType = PastoralActType;

  get churchName(): string {
    return 'MISSION INTERNATIONALE ARBRE DE VIE';
  }

  get title(): string {
    switch (this.act.type) {
      case PastoralActType.Baptism: return 'Certificat de Baptême';
      case PastoralActType.Wedding: return 'Certificat de Mariage';
      case PastoralActType.Funeral: return 'Certificat de Service Funèbre';
      case PastoralActType.ChildDedication: return "Certificat de Présentation d'Enfant";
      case PastoralActType.Ordination: return "Certificat d'Ordination";
      default: return "Certificat d'Acte Pastoral";
    }
  }

  /** Parties principales (sujets de l'acte), déduites des rôles configurables. */
  get mainNames(): string {
    const mains = (this.act.participants ?? []).filter((p) =>
      isMainRole(this.act.type, p.role)
    );
    const list = (mains.length ? mains : (this.act.participants ?? []).slice(0, 1))
      .map((p) => `${p.firstName} ${p.lastName}`.trim());
    return list.join('   &   ');
  }

  get godparents(): string {
    return (this.act.details?.godparents ?? []).join(', ');
  }

  get witnesses(): string {
    return (this.act.witnesses ?? []).join(', ');
  }

  get sentence(): string {
    const date = this.frenchDate(this.act.date);
    const loc = this.act.location ? ` à ${this.act.location}` : '';
    switch (this.act.type) {
      case PastoralActType.Baptism:
        return `a été baptisé(e) par immersion le ${date}${loc}, en confession publique de sa foi en Jésus-Christ.`;
      case PastoralActType.Wedding:
        return `ont été unis par les liens sacrés du mariage le ${date}${loc}, ` +
          (this.act.details?.marriageRegime
            ? `sous le régime de ${this.act.details.marriageRegime}.`
            : 'devant Dieu et les témoins présents.');
      case PastoralActType.Funeral:
        return `a été confié(e) au Seigneur lors du service funèbre célébré le ${date}${loc}` +
          (this.act.details?.burialLocation ? `, inhumation à ${this.act.details.burialLocation}.` : '.');
      case PastoralActType.ChildDedication:
        return `a été présenté(e) au Seigneur le ${date}${loc}, en présence de ses parents et de l'assemblée des fidèles.`;
      case PastoralActType.Ordination:
        return `a été consacré(e) par l'ordination le ${date}${loc}, ` +
          (this.act.details?.ordinationTitle
            ? `en qualité de ${this.act.details.ordinationTitle}.`
            : "au service du Seigneur et de Son Église.");
      default:
        return `— acte enregistré le ${date}${loc}.`;
    }
  }

  get showVerse(): boolean {
    return !!this.act.details?.bibleVerse &&
      (this.act.type === PastoralActType.Baptism || this.act.type === PastoralActType.ChildDedication);
  }

  frenchDate(date: string | Date | null | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return `${d.getDate()} ${FRENCH_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }

  today(): string {
    return this.frenchDate(new Date());
  }

  print(): void {
    const body = this.doc.body;
    body.classList.add('certificate-printing');
    // Laisse le navigateur appliquer les styles d'impression avant de rendre la main.
    setTimeout(() => {
      window.print();
      setTimeout(() => body.classList.remove('certificate-printing'), 500);
    }, 60);
  }
}
