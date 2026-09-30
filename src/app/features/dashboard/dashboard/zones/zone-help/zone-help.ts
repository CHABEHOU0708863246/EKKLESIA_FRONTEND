import { Component } from '@angular/core';

/**
 * Page d'aide expliquant le rôle du chef de zone (Lot 9).
 */
@Component({
  selector: 'app-zone-help',
  standalone: true,
  template: `
    <div class="zh-page">
      <h1>Mon rôle de chef de zone</h1>
      <div class="miav-card zh-card">
        <h2>Ce que je peux faire</h2>
        <ul>
          <li>Voir les <b>effectifs</b>, <b>offrandes</b>, <b>cultes</b> et <b>membres</b> de toutes les églises de ma zone.</li>
          <li>Consulter des <b>rapports consolidés</b> (ma zone uniquement).</li>
          <li>Exporter des rapports (Excel / PDF).</li>
        </ul>
      </div>
      <div class="miav-card zh-card">
        <h2>Ce que je ne peux pas faire</h2>
        <ul>
          <li>Voir les <b>Ressources Humaines</b> (employés, salaires, congés).</li>
          <li>Voir le <b>Patrimoine</b> (biens, contrats, maintenance).</li>
          <li>Gérer les <b>comptes utilisateurs</b> ni les rôles.</li>
        </ul>
      </div>
      <div class="miav-card zh-card">
        <h2>Bonne pratique</h2>
        <p>Vérifiez régulièrement les alertes de <b>saisie manquante</b> (cultes, présences, offrandes) et encouragez les pasteurs de site de votre zone à compléter leurs données à temps.</p>
      </div>
    </div>
  `,
  styles: [`
    .zh-page { max-width: 720px; margin: 0 auto; padding: 24px 16px; }
    .zh-card { padding: 18px; margin-top: 14px; }
    .zh-card h2 { margin-top: 0; }
    .zh-card ul { margin: 0; padding-left: 20px; }
    .zh-card li { margin: 6px 0; }
  `],
})
export class ZoneHelp {}
