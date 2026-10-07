import { Pipe, PipeTransform } from '@angular/core';
import { memberStatusColor, memberStatusLabel } from '../models/Members/member.model';

/**
 * Traduit un statut de membre en libellé FRANÇAIS lisible.
 * Ex. `{{ member.status | memberStatusLabel }}` → « Ministre Berger ».
 * Gère les cas inconnus en renvoyant le code brut (jamais vide).
 */
@Pipe({ name: 'memberStatusLabel', standalone: true })
export class MemberStatusLabelPipe implements PipeTransform {
  transform(status: string | null | undefined): string {
    return memberStatusLabel(status);
  }
}

/**
 * Renvoie la classe CSS de couleur du badge pour un statut de membre.
 * Ex. `[ngClass]="member.status | memberStatusColor"`.
 * Repli « status-unknown » (gris) pour toute valeur non reconnue.
 */
@Pipe({ name: 'memberStatusColor', standalone: true })
export class MemberStatusColorPipe implements PipeTransform {
  transform(status: string | null | undefined): string {
    return memberStatusColor(status);
  }
}
