import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  ConsolidatedDashboard,
  ConsolidatedDashboardService,
  OfferingTypeSplit,
  ScopeChurchRow,
  ScopeTotals,
  TimelinePoint,
} from '../../../../core/services/Dashboard/consolidated-dashboard';

type ScopeKind = 'National' | 'International' | 'Synthese';

interface Kpi {
  label: string;
  value: number;
  icon: string;
  isMoney?: boolean;
  currency?: string;
  /** D'où vient le chiffre : affiché sous la carte et dans le panneau explicatif. */
  source: string;
}

interface Bar {
  label: string;
  value: number;
  tone: 'gold' | 'red' | 'teal' | 'blue';
}

/**
 * Vue consolidée plein écran (National / International / Synthèse).
 * Une page par entrée de menu : le périmètre est porté par la route (data.scope).
 * Chaque indicateur affiche sa définition et sa provenance pour rester vérifiable.
 */
@Component({
  selector: 'app-consolidated-scope-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="csp">
      <!-- ── En-tête ─────────────────────────────────────────── -->
      <header class="csp-head" [class.is-int]="scope === 'International'" [class.is-syn]="scope === 'Synthese'">
        <div class="csp-head-icon"><i class="bx" [ngClass]="meta.icon"></i></div>
        <div class="csp-head-txt">
          <h1>{{ meta.title }}</h1>
          <p>{{ meta.subtitle }}</p>
        </div>
        <div class="csp-period">
          <label>Du <input type="date" [(ngModel)]="from" (change)="load()"></label>
          <label>Au <input type="date" [(ngModel)]="to" (change)="load()"></label>
          <button class="csp-refresh" (click)="load()" [disabled]="loading()">
            <i class="bx bx-refresh" [class.spin]="loading()"></i> Actualiser
          </button>
        </div>
      </header>

      @if (loading()) {
        <div class="csp-state"><i class="bx bx-loader-alt spin"></i> Chargement des données consolidées…</div>
      } @else if (error()) {
        <div class="csp-state err"><i class="bx bx-error-circle"></i> {{ error() }}</div>
      } @else if (data(); as d) {

        <!-- ── Indicateurs clés ──────────────────────────────── -->
        <section class="csp-block">
          <h2 class="csp-h2"><i class="bx bx-tachometer"></i> Indicateurs clés</h2>
          <div class="csp-kpis">
            @for (k of kpis(); track k.label) {
              <div class="kpi" [attr.data-tone]="k.isMoney ? 'money' : 'count'">
                <div class="kpi-ic"><i class="bx" [ngClass]="k.icon"></i></div>
                <div class="kpi-body">
                  <div class="kpi-val">
                    @if (k.isMoney) { {{ k.value | number:'1.0-0' }} <span class="kpi-cur">{{ k.currency }}</span> }
                    @else { {{ k.value | number:'1.0-0' }} }
                  </div>
                  <div class="kpi-lbl">{{ k.label }}</div>
                  <div class="kpi-src" [title]="k.source"><i class="bx bx-info-circle"></i> {{ k.source }}</div>
                </div>
              </div>
            }
          </div>
        </section>

        <!-- ── Graphiques ────────────────────────────────────── -->
        <section class="csp-block csp-2col">
          @if (scope === 'International') {
            <div class="csp-card">
              <h3><i class="bx bx-globe"></i> Offrandes par devise</h3>
              <p class="csp-hint">Jamais additionnées entre elles : chaque devise reste isolée.</p>
              @for (b of currencyBars(); track b.label) {
                <div class="bar-row">
                  <span class="bar-l"> {{ b.label }} </span>
                  <div class="bar"><div class="bar-fill" [class]="'t-' + b.tone" [style.width.%]="pct(b.value, maxIn(currencyBars()))"></div></div>
                  <span class="bar-v">{{ b.value | number:'1.0-0' }}</span>
                </div>
              }
              @if (!currencyBars().length) { <p class="csp-empty">Aucun mouvement sur la période.</p> }
            </div>
          } @else {
            <div class="csp-card">
              <h3><i class="bx bx-coin-stack"></i> Flux financiers ({{ d.referenceCurrency }})</h3>
              <p class="csp-hint">Offrandes encaissées contre dépenses validées sur la période.</p>
              @for (b of financeBars(); track b.label) {
                <div class="bar-row">
                  <span class="bar-l"> {{ b.label }} </span>
                  <div class="bar"><div class="bar-fill" [class]="'t-' + b.tone" [style.width.%]="pct(b.value, maxIn(financeBars()))"></div></div>
                  <span class="bar-v">{{ b.value | number:'1.0-0' }}</span>
                </div>
              }
            </div>
          }

          <div class="csp-card">
            <h3><i class="bx bx-bar-chart-alt-2"></i> Effectifs & activité</h3>
            <p class="csp-hint">Membres, églises, cultes et présences cumulées du périmètre.</p>
            @for (b of countBars(); track b.label) {
              <div class="bar-row">
                <span class="bar-l"> {{ b.label }} </span>
                <div class="bar"><div class="bar-fill" [class]="'t-' + b.tone" [style.width.%]="pct(b.value, maxIn(countBars()))"></div></div>
                <span class="bar-v">{{ b.value | number:'1.0-0' }}</span>
              </div>
            }
          </div>
        </section>

        <!-- ── Évolution temporelle ──────────────────────────── -->
        <section class="csp-block">
          <h2 class="csp-h2"><i class="bx bx-line-chart"></i> Évolution mensuelle</h2>
          @if (chart(); as c) {
            <div class="csp-card">
              <div class="evo-legend">
                <span class="lg lg-offer"><i></i> Offrandes</span>
                <span class="lg lg-exp"><i></i> Dépenses</span>
                <span class="lg-note">Montants en {{ d.referenceCurrency }}<span *ngIf="scope === 'International'"> (convertis, indicatif)</span></span>
              </div>
              <div class="evo-wrap">
                <div class="evo-y">
                  <span>{{ c.max | number:'1.0-0' }}</span>
                  <span>{{ c.max / 2 | number:'1.0-0' }}</span>
                  <span>0</span>
                </div>
                <div class="evo-plot">
                  <svg viewBox="0 0 720 220" preserveAspectRatio="none" class="evo-svg">
                    <line x1="0" [attr.y1]="c.y100" x2="720" [attr.y2]="c.y100" class="grid" />
                    <line x1="0" [attr.y1]="c.y50" x2="720" [attr.y2]="c.y50" class="grid" />
                    <line x1="0" [attr.y1]="c.y0" x2="720" [attr.y2]="c.y0" class="grid grid-base" />
                    <path [attr.d]="c.offerArea" class="area-offer" />
                    <polyline [attr.points]="c.offerLine" class="ln-offer" />
                    <polyline [attr.points]="c.expLine" class="ln-exp" />
                  </svg>
                  <div class="evo-x">
                    @for (l of c.labels; track l.i) { <span>{{ l.text }}</span> }
                  </div>
                </div>
              </div>
              <p class="csp-hint">Chaque point = un mois. Survolez la ligne pour suivre la tendance ; les mois sans mouvement apparaissent à zéro.</p>
            </div>
          } @else {
            <div class="csp-card"><p class="csp-empty">Aucun mouvement sur la période sélectionnée.</p></div>
          }
        </section>

        <!-- ── Répartition par type d'offrande ──────────────── -->
        <section class="csp-block">
          <h2 class="csp-h2"><i class="bx bx-pie-chart-alt-2"></i> Répartition par type d'offrande</h2>
          <div class="csp-card">
            <p class="csp-hint">Nature des offrandes encaissées sur la période (montants en {{ d.referenceCurrency }}).</p>
            @for (t of offeringsByType(); track t.type; let i = $index) {
              <div class="bar-row">
                <span class="bar-l" [title]="t.label">{{ t.label }}</span>
                <div class="bar"><div class="bar-fill" [class]="typeTone(i)" [style.width.%]="pct(t.amount, typeTotal())"></div></div>
                <span class="bar-v">{{ t.amount | number:'1.0-0' }} · {{ typeShare(t.amount) }}%</span>
              </div>
            }
            @if (!offeringsByType().length) { <p class="csp-empty">Aucune offrande sur la période.</p> }
          </div>
        </section>

        <!-- ── Détail mensuel ────────────────────────────────── -->
        @if (timeline().length) {
          <section class="csp-block">
            <h2 class="csp-h2"><i class="bx bx-table"></i> Détail mensuel</h2>
            <div class="csp-table">
              <div class="csp-tr csp-th csp-tr-m">
                <span>Mois</span><span>Offrandes</span><span>Dépenses</span><span>Solde</span><span>Cultes</span><span>Présences</span>
              </div>
              @for (p of timeline(); track p.period) {
                <div class="csp-tr csp-tr-m">
                  <span><b>{{ monthLabel(p.period) }}</b></span>
                  <span class="num pos">{{ p.offerings | number:'1.0-0' }}</span>
                  <span class="num neg">{{ p.expenses | number:'1.0-0' }}</span>
                  <span class="num" [class.pos]="p.offerings - p.expenses >= 0" [class.neg]="p.offerings - p.expenses < 0">
                    {{ p.offerings - p.expenses | number:'1.0-0' }}
                  </span>
                  <span class="num">{{ p.servicesCount | number }}</span>
                  <span class="num">{{ p.attendancePresent | number }}</span>
                </div>
              }
            </div>
          </section>
        }

        <!-- ── Détail par église / site ──────────────────────── -->
        @if (churches().length) {
          <section class="csp-block">
            <h2 class="csp-h2"><i class="bx bx-buildings"></i> Détail par église / site</h2>
            <div class="csp-table">
              <div class="csp-tr csp-th csp-tr-c">
                <span>Église / site</span><span>Périmètre</span><span>Membres</span><span>Cultes</span><span>Présences</span><span>Offrandes</span><span>Dépenses</span>
              </div>
              @for (r of churches(); track r.entityId + r.scope) {
                <div class="csp-tr csp-tr-c">
                  <span class="row-name" [title]="r.name">{{ r.name }}</span>
                  <span><span class="pill" [class.pill-int]="r.scope === 'International'">{{ r.scope }}</span></span>
                  <span class="num">{{ r.membersCount | number }}</span>
                  <span class="num">{{ r.servicesCount | number }}</span>
                  <span class="num">{{ r.attendancePresent | number }}</span>
                  <span class="num pos">{{ r.offerings | number:'1.0-0' }}</span>
                  <span class="num neg">{{ r.expenses | number:'1.0-0' }}</span>
                </div>
              }
            </div>
            <p class="csp-hint">Montants convertis en {{ d.referenceCurrency }}. Les lignes sont classées par offrandes décroissantes.</p>
          </section>
        }

        <!-- ── Top / Flop églises ────────────────────────────── -->
        @if (churches().length) {
          <section class="csp-block">
            <h2 class="csp-h2"><i class="bx bx-trophy"></i> Classement des églises</h2>
            <div class="csp-2col">
              <div class="csp-card">
                <h3><i class="bx bx-up-arrow-alt"></i> Top 5 — plus fortes offrandes</h3>
                @for (r of topChurches(); track r.entityId + r.scope; let i = $index) {
                  <div class="rank-row">
                    <span class="rank-pos" [class.rank-gold]="i === 0">{{ i + 1 }}</span>
                    <span class="rank-name" [title]="r.name">{{ r.name }}</span>
                    <span class="rank-val pos">{{ r.offerings | number:'1.0-0' }}</span>
                  </div>
                }
                @if (!topChurches().length) { <p class="csp-empty">—</p> }
              </div>
              <div class="csp-card">
                <h3><i class="bx bx-down-arrow-alt"></i> Flop 5 — offrandes les plus faibles</h3>
                @for (r of flopChurches(); track r.entityId + r.scope; let i = $index) {
                  <div class="rank-row">
                    <span class="rank-pos rank-low">{{ i + 1 }}</span>
                    <span class="rank-name" [title]="r.name">{{ r.name }}</span>
                    <span class="rank-val">{{ r.offerings | number:'1.0-0' }}</span>
                  </div>
                }
                @if (!flopChurches().length) { <p class="csp-empty">—</p> }
              </div>
            </div>
          </section>
        }

        <!-- ── Synthèse : taux de conversion ────────────────── -->
        @if (scope === 'Synthese' && d.rates.length) {
          <section class="csp-block">
            <h2 class="csp-h2"><i class="bx bx-transfer-alt"></i> Taux de conversion appliqués</h2>
            <div class="csp-table">
              <div class="csp-tr csp-th"><span>Devise</span><span>Montant d'origine</span><span>Taux</span><span>Contre-valeur {{ d.referenceCurrency }}</span></div>
              @for (r of d.rates; track r.from + r.to) {
                <div class="csp-tr">
                  <span><b>{{ r.from }}</b> → {{ r.to }}</span>
                  <span>{{ r.originalAmount | number:'1.0-0' }}</span>
                  <span>{{ r.rate | number:'1.2-6' }}</span>
                  <span>{{ r.convertedAmount | number:'1.0-0' }}</span>
                </div>
              }
            </div>
          </section>
        }

        <!-- ── Comprendre ces chiffres ──────────────────────── -->
        <section class="csp-block">
          <h2 class="csp-h2"><i class="bx bx-book-reader"></i> Comprendre ces chiffres</h2>
          <div class="csp-notes">
            @for (n of notes(); track n.label) {
              <div class="note">
                <div class="note-l"><i class="bx bx-check-shield"></i> {{ n.label }}</div>
                <div class="note-d">{{ n.def }}</div>
              </div>
            }
          </div>
          <p class="csp-disclaimer"><i class="bx bx-info-square"></i> {{ meta.disclaimer }}</p>
        </section>
      }
    </div>
  `,
  styles: [`
    :host { display:block; }
    .csp { padding:20px 24px 48px; max-width:1400px; margin:0 auto; color:#1e293b; }
    .spin { animation: csp-spin 1s linear infinite; }
    @keyframes csp-spin { to { transform:rotate(360deg); } }

    .csp-head { display:flex; align-items:center; gap:16px; padding:20px 22px; border-radius:16px;
      background:linear-gradient(120deg,#0f3d2e,#1c6b4f); color:#fff; box-shadow:0 10px 30px rgba(15,61,46,.25); }
    .csp-head.is-int { background:linear-gradient(120deg,#123b63,#1f6fb2); }
    .csp-head.is-syn { background:linear-gradient(120deg,#4a2c63,#7b4bb0); }
    .csp-head-icon { width:54px; height:54px; border-radius:14px; background:rgba(255,255,255,.15);
      display:flex; align-items:center; justify-content:center; font-size:28px; }
    .csp-head-txt { flex:1; min-width:220px; }
    .csp-head-txt h1 { margin:0; font-size:22px; font-weight:700; letter-spacing:.2px; }
    .csp-head-txt p { margin:4px 0 0; font-size:13px; opacity:.85; }
    .csp-period { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
    .csp-period label { font-size:12px; display:flex; align-items:center; gap:6px; opacity:.95; }
    .csp-period input { border:none; border-radius:8px; padding:7px 9px; font-size:12px; color:#0f172a; }
    .csp-refresh { border:none; border-radius:9px; padding:8px 14px; font-weight:600; cursor:pointer;
      background:#f5c451; color:#3a2c00; display:flex; align-items:center; gap:6px; }
    .csp-refresh:disabled { opacity:.6; cursor:default; }

    .csp-state { margin-top:24px; padding:40px; text-align:center; color:#64748b; font-size:15px; }
    .csp-state.err { color:#b42318; }
    .csp-state i { font-size:20px; margin-right:8px; }

    .csp-block { margin-top:28px; }
    .csp-h2 { font-size:15px; font-weight:700; text-transform:uppercase; letter-spacing:.6px;
      color:#475569; margin:0 0 14px; display:flex; align-items:center; gap:8px; }
    .csp-2col { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
    @media (max-width:900px) { .csp-2col { grid-template-columns:1fr; } }

    .csp-kpis { display:grid; grid-template-columns:repeat(auto-fill,minmax(230px,1fr)); gap:16px; }
    .kpi { display:flex; gap:14px; padding:16px; border-radius:14px; background:#fff;
      border:1px solid #eef2f6; box-shadow:0 6px 18px rgba(15,23,42,.06); position:relative; overflow:hidden; }
    .kpi::before { content:''; position:absolute; left:0; top:0; bottom:0; width:4px; background:#2563eb; }
    .kpi[data-tone="money"]::before { background:#0e9f6e; }
    .kpi-ic { width:44px; height:44px; border-radius:11px; background:#eff6ff; color:#2563eb;
      display:flex; align-items:center; justify-content:center; font-size:22px; flex:none; }
    .kpi[data-tone="money"] .kpi-ic { background:#ecfdf5; color:#0e9f6e; }
    .kpi-body { min-width:0; }
    .kpi-val { font-size:24px; font-weight:800; color:#0f172a; line-height:1.1; }
    .kpi-cur { font-size:12px; font-weight:600; color:#64748b; }
    .kpi-lbl { font-size:13px; color:#475569; margin-top:2px; }
    .kpi-src { font-size:11px; color:#94a3b8; margin-top:6px; display:flex; gap:4px; align-items:flex-start; line-height:1.3; }

    .csp-card { background:#fff; border:1px solid #eef2f6; border-radius:14px; padding:18px 18px 8px;
      box-shadow:0 6px 18px rgba(15,23,42,.06); }
    .csp-card h3 { margin:0 0 4px; font-size:14px; color:#334155; display:flex; align-items:center; gap:8px; }
    .csp-hint { margin:0 0 14px; font-size:11.5px; color:#94a3b8; }
    .csp-empty { color:#94a3b8; font-size:13px; padding:8px 0 14px; }

    .bar-row { display:flex; align-items:center; gap:10px; margin-bottom:11px; }
    .bar-l { width:88px; font-size:12.5px; color:#475569; flex:none; }
    .bar { flex:1; height:14px; background:#f1f5f9; border-radius:8px; overflow:hidden; }
    .bar-fill { height:100%; border-radius:8px; transition:width .5s ease; min-width:2px; }
    .t-gold { background:linear-gradient(90deg,#f5b301,#f5c451); }
    .t-red { background:linear-gradient(90deg,#e02424,#f87171); }
    .t-teal { background:linear-gradient(90deg,#0e9f6e,#34d399); }
    .t-blue { background:linear-gradient(90deg,#1f6fb2,#60a5fa); }
    .bar-v { width:92px; text-align:right; font-size:12.5px; font-weight:700; color:#0f172a; flex:none; }

    .csp-table { background:#fff; border:1px solid #eef2f6; border-radius:14px; overflow:hidden; box-shadow:0 6px 18px rgba(15,23,42,.06); }
    .csp-tr { display:grid; grid-template-columns:1.2fr 1fr .8fr 1fr; gap:10px; padding:11px 16px; font-size:13px; border-bottom:1px solid #f1f5f9; }
    .csp-tr:last-child { border-bottom:none; }
    .csp-th { background:#f8fafc; font-weight:700; color:#475569; font-size:12px; text-transform:uppercase; letter-spacing:.4px; }

    .csp-notes { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:14px; }
    .note { background:#fff; border:1px solid #eef2f6; border-left:3px solid #1c6b4f; border-radius:10px; padding:12px 14px; }
    .note-l { font-size:13px; font-weight:700; color:#334155; display:flex; align-items:center; gap:6px; }
    .note-l i { color:#1c6b4f; }
    .note-d { font-size:12px; color:#64748b; margin-top:5px; line-height:1.45; }
    .csp-disclaimer { margin-top:16px; font-size:12px; color:#92400e; background:#fffbeb; border:1px solid #fde68a;
      border-radius:10px; padding:10px 14px; display:flex; gap:8px; align-items:flex-start; }

    /* Évolution mensuelle */
    .evo-legend { display:flex; align-items:center; gap:18px; margin-bottom:10px; font-size:12px; color:#475569; }
    .lg { display:flex; align-items:center; gap:6px; font-weight:600; }
    .lg i { width:14px; height:4px; border-radius:2px; display:inline-block; }
    .lg-offer i { background:#0e9f6e; }
    .lg-exp i { background:#e02424; }
    .lg-note { margin-left:auto; color:#94a3b8; }
    .evo-wrap { display:flex; gap:10px; }
    .evo-y { display:flex; flex-direction:column; justify-content:space-between; font-size:10px; color:#94a3b8;
      text-align:right; min-width:52px; padding:0 0 22px; }
    .evo-plot { flex:1; min-width:0; }
    .evo-svg { width:100%; height:200px; display:block; }
    .evo-svg .grid { stroke:#eef2f6; stroke-width:1; vector-effect:non-scaling-stroke; }
    .evo-svg .grid-base { stroke:#dbe3ea; }
    .evo-svg .area-offer { fill:rgba(14,159,110,.12); }
    .evo-svg .ln-offer { fill:none; stroke:#0e9f6e; stroke-width:2.4; vector-effect:non-scaling-stroke;
      stroke-linejoin:round; stroke-linecap:round; }
    .evo-svg .ln-exp { fill:none; stroke:#e02424; stroke-width:2; vector-effect:non-scaling-stroke;
      stroke-dasharray:5 4; stroke-linejoin:round; stroke-linecap:round; }
    .evo-x { display:flex; justify-content:space-between; font-size:10px; color:#94a3b8; margin-top:4px; }
    .evo-x span { flex:1; text-align:center; white-space:nowrap; }

    /* Détails (tableaux enrichis) */
    .csp-tr-m { grid-template-columns:1fr 1fr 1fr 1fr .7fr .8fr; }
    .csp-tr-c { grid-template-columns:2fr 1fr .8fr .7fr .9fr 1fr 1fr; }
    .num { text-align:right; font-variant-numeric:tabular-nums; }
    .csp-th .num { text-align:right; }
    .pos { color:#0e9f6e; font-weight:600; }
    .neg { color:#c81e1e; font-weight:600; }
    .row-name { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .pill { display:inline-block; padding:2px 8px; border-radius:999px; font-size:11px; font-weight:600;
      background:#ecfdf5; color:#0e9f6e; }
    .pill-int { background:#eff6ff; color:#1f6fb2; }

    /* Classement top/flop */
    .rank-row { display:flex; align-items:center; gap:10px; padding:9px 2px; border-bottom:1px solid #f1f5f9; }
    .rank-row:last-child { border-bottom:none; }
    .rank-pos { width:24px; height:24px; border-radius:7px; background:#f1f5f9; color:#475569;
      font-size:12px; font-weight:700; display:flex; align-items:center; justify-content:center; flex:none; }
    .rank-gold { background:#fef3c7; color:#b45309; }
    .rank-low { background:#fee2e2; color:#b42318; }
    .rank-name { flex:1; min-width:0; font-size:13px; color:#334155;
      overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .rank-val { font-weight:700; font-size:13px; font-variant-numeric:tabular-nums; }

    @media (max-width:900px) { .csp-tr-m, .csp-tr-c { grid-template-columns:1fr 1fr 1fr; } }
  `],
})
export class ConsolidatedScopePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(ConsolidatedDashboardService);

  readonly scope = (this.route.snapshot.data['scope'] as ScopeKind) ?? 'National';

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly data = signal<ConsolidatedDashboard | null>(null);

  from = '';
  to = '';

  ngOnInit(): void {
    const now = new Date();
    this.to = this.iso(now);
    this.from = this.iso(new Date(now.getFullYear(), 0, 1));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.getConsolidated(this.from, this.to).subscribe({
      next: (res) => {
        this.data.set(res?.data ?? null);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(
          err?.status === 403
            ? "Vous n'avez pas les droits pour consulter cette vue consolidée."
            : err?.error?.message || 'Impossible de charger les données consolidées.'
        );
      },
    });
  }

  get meta() {
    switch (this.scope) {
      case 'International':
        return {
          icon: 'bx-world',
          title: 'Vue Internationale',
          subtitle: "Activité des églises/sites hors Siège. Les devises ne sont jamais additionnées entre elles.",
          disclaimer:
            "Chaque devise est présentée séparément : un total International n'est pas une somme de devises. Le contre-équivalent en " +
            "XOF est indicatif et n'engage pas de conversion réelle.",
        };
      case 'Synthese':
        return {
          icon: 'bx-bar-chart-square',
          title: 'Synthèse consolidée',
          subtitle: 'National + International réconciliés dans la devise de référence, avec les taux appliqués.',
          disclaimer:
            "Les montants International sont convertis en XOF au taux du jour indiqué. Les effectifs (membres, églises, cultes, présences) " +
            "sont des comptages, jamais convertis.",
        };
      default:
        return {
          icon: 'bx-flag',
          title: 'Vue Nationale',
          subtitle: "Activité des églises/sites du périmètre National (Siège et églises nationales).",
          disclaimer:
            "Le périmètre est déterminé par le site de rattachement : un membre/culte d'un site International est compté en International, " +
            "même si son église siège est nationale.",
        };
    }
  }

  private totals(): ScopeTotals | null {
    const d = this.data();
    if (!d) return null;
    if (this.scope === 'International') return d.internationalCounts;
    if (this.scope === 'Synthese') return d.synthese;
    return d.national;
  }

  readonly kpis = computed<Kpi[]>(() => {
    const d = this.data();
    const t = this.totals();
    if (!d || !t) return [];

    const counts: Kpi[] = [
      { label: 'Membres actifs', value: t.membersCount, icon: 'bx-group', source: 'Membres non inactifs rattachés aux églises/sites du périmètre.' },
      { label: 'Églises & sites', value: t.churchesCount, icon: 'bx-church', source: 'Nombre d’entités (églises/sites) incluses dans le périmètre.' },
      { label: 'Cultes célébrés', value: t.servicesCount, icon: 'bx-calendar-star', source: 'Cultes enregistrés sur la période dans le périmètre.' },
      { label: 'Présences cumulées', value: t.attendancePresent, icon: 'bx-chair', source: 'Somme des présences relevées à chaque culte du périmètre.' },
    ];

    // International : les montants sont PAR DEVISE et jamais additionnés.
    // On affiche donc une carte par devise (les totaux « counts » n'ont pas de montant).
    if (this.scope === 'International') {
      const money: Kpi[] = [];
      for (const c of d.international ?? []) {
        money.push({
          label: `Offrandes — ${c.currency}`, value: c.offerings, icon: 'bx-donate-heart', isMoney: true, currency: c.currency,
          source: `Offrandes validées en ${c.currency} (${c.offeringsCount} saisies). Chaque devise reste isolée.`
        });
        if (c.expenses > 0) {
          money.push({
            label: `Dépenses — ${c.currency}`, value: c.expenses, icon: 'bx-wallet', isMoney: true, currency: c.currency,
            source: `Dépenses approuvées en ${c.currency}.`
          });
        }
      }
      return [...money, ...counts];
    }

    const money: Kpi[] = [
      { label: 'Offrandes encaissées', value: t.offerings, icon: 'bx-donate-heart', isMoney: true, currency: d.referenceCurrency,
        source: `Somme des offrandes validées (${t.offeringsCount} saisies) du périmètre.` },
      { label: 'Dépenses validées', value: t.expenses, icon: 'bx-wallet', isMoney: true, currency: d.referenceCurrency,
        source: 'Somme des dépenses approuvées/validées du périmètre sur la période.' },
    ];
    return [...money, ...counts];
  });

  readonly financeBars = computed<Bar[]>(() => {
    const t = this.totals();
    if (!t) return [];
    return [
      { label: 'Offrandes', value: t.offerings, tone: 'gold' },
      { label: 'Dépenses', value: t.expenses, tone: 'red' },
    ];
  });

  readonly countBars = computed<Bar[]>(() => {
    const t = this.totals();
    if (!t) return [];
    return [
      { label: 'Membres', value: t.membersCount, tone: 'blue' },
      { label: 'Églises', value: t.churchesCount, tone: 'teal' },
      { label: 'Cultes', value: t.servicesCount, tone: 'gold' },
      { label: 'Présences', value: t.attendancePresent, tone: 'blue' },
    ];
  });

  readonly currencyBars = computed<Bar[]>(() => {
    const d = this.data();
    if (!d) return [];
    const tones: Bar['tone'][] = ['gold', 'teal', 'blue', 'red'];
    return d.international.map((c, i) => ({ label: c.currency, value: c.offerings, tone: tones[i % tones.length] }));
  });

  readonly timeline = computed<TimelinePoint[]>(() => {
    const d = this.data();
    if (!d) return [];
    if (this.scope === 'International') return d.internationalTimeline ?? [];
    if (this.scope === 'Synthese') return d.syntheseTimeline ?? [];
    return d.nationalTimeline ?? [];
  });

  readonly churches = computed<ScopeChurchRow[]>(() => {
    const d = this.data();
    if (!d) return [];
    if (this.scope === 'International') return d.internationalChurches ?? [];
    if (this.scope === 'Synthese') {
      return [...(d.nationalChurches ?? []), ...(d.internationalChurches ?? [])]
        .sort((a, b) => b.offerings - a.offerings);
    }
    return d.nationalChurches ?? [];
  });

  readonly offeringsByType = computed<OfferingTypeSplit[]>(() => {
    const d = this.data();
    if (!d) return [];
    if (this.scope === 'International') return d.internationalOfferingsByType ?? [];
    if (this.scope === 'Synthese') return d.syntheseOfferingsByType ?? [];
    return d.nationalOfferingsByType ?? [];
  });

  readonly typeTotal = computed<number>(() =>
    this.offeringsByType().reduce((sum, t) => sum + t.amount, 0)
  );

  /** Top 5 des églises par offrandes. */
  readonly topChurches = computed<ScopeChurchRow[]>(() =>
    [...this.churches()].sort((a, b) => b.offerings - a.offerings).slice(0, 5)
  );

  /** Flop 5 des églises par offrandes (les plus faibles en premier). */
  readonly flopChurches = computed<ScopeChurchRow[]>(() =>
    [...this.churches()].sort((a, b) => a.offerings - b.offerings).slice(0, 5)
  );

  /** Géométrie du graphique d'évolution (SVG, sans dépendance externe). */
  readonly chart = computed<{
    max: number;
    y100: number;
    y50: number;
    y0: number;
    offerLine: string;
    expLine: string;
    offerArea: string;
    labels: { i: number; text: string }[];
  } | null>(() => {
    const pts = this.timeline();
    if (!pts.length) return null;

    const W = 720;
    const padT = 10;
    const padB = 10;
    const innerH = 200;
    const max = Math.max(1, ...pts.map((p) => Math.max(p.offerings, p.expenses)));
    const y = (v: number) => padT + innerH - (v / max) * innerH;
    const n = pts.length;
    const x = (i: number) => (n === 1 ? W / 2 : (i * W) / (n - 1));

    const offerPts = pts.map((p, i) => `${x(i).toFixed(1)},${y(p.offerings).toFixed(1)}`);
    const expPts = pts.map((p, i) => `${x(i).toFixed(1)},${y(p.expenses).toFixed(1)}`);
    const base = padT + innerH;

    const step = Math.max(1, Math.ceil(n / 12));
    const labels = pts
      .map((p, i) => ({ i, text: this.monthLabel(p.period) }))
      .filter((l) => l.i % step === 0 || l.i === n - 1);

    return {
      max,
      y100: padT,
      y50: padT + innerH / 2,
      y0: base,
      offerLine: offerPts.join(' '),
      expLine: expPts.join(' '),
      offerArea: `M ${x(0).toFixed(1)},${base} L ${offerPts.join(' L ')} L ${x(n - 1).toFixed(1)},${base} Z`,
      labels,
    };
  });

  monthLabel(period: string): string {
    if (!period || period === 'n/a' || period.length < 7) return period || '—';
    const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
    const year = period.slice(2, 4);
    const m = parseInt(period.slice(5, 7), 10);
    return `${months[m - 1] ?? period.slice(5, 7)} ${year}`;
  }

  readonly notes = computed<{ label: string; def: string }[]>(() => {
    const d = this.data();
    if (!d) return [];
    const common = [
      { label: 'Offrandes', def: 'Total encaissé des offrandes et dons validés sur la période (statut validé/encaissé).' },
      { label: 'Dépenses', def: 'Total des dépenses approuvées sur la période, par catégorie déclarée.' },
      { label: 'Membres / Églises', def: 'Comptages instantanés : membres actifs rattachés et nombre d’entités du périmètre.' },
      { label: 'Présences', def: 'Cumul des personnes présentes déclarées à chaque culte — pas des membres distincts.' },
    ];
    if (this.scope === 'International') {
      return [
        { label: 'Vue Internationale', def: d.internationalNote },
        { label: 'Séparation des devises', def: d.conversionNote },
        ...common,
      ];
    }
    if (this.scope === 'Synthese') {
      return [
        { label: 'Périmètre de la synthèse', def: d.syntheseNote },
        { label: 'National', def: d.nationalNote },
        { label: 'Conversion', def: d.conversionNote },
        ...common,
      ];
    }
    return [{ label: 'Périmètre National', def: d.nationalNote }, ...common];
  });

  /** Part (en %) d'un type dans le total des offrandes. */
  typeShare(amount: number): number {
    const total = this.typeTotal();
    return total > 0 ? Math.round((amount / total) * 1000) / 10 : 0;
  }

  private readonly typeTones = ['t-gold', 't-teal', 't-blue', 't-red'];

  typeTone(index: number): string {
    return this.typeTones[index % this.typeTones.length];
  }

  pct(value: number, max: number): number {
    if (!max || max <= 0) return 0;
    return Math.max(2, Math.round((value / max) * 100));
  }

  maxIn(bars: Bar[]): number {
    return bars.reduce((m, b) => Math.max(m, b.value), 0);
  }

  private iso(d: Date): string {
    return d.toISOString().slice(0, 10);
  }
}
