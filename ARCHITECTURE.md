# Architecture — Frontend EKKLESIA / MIAV

> **Document d'architecture logicielle**
> Application Angular 21 (standalone, SSR + Service Worker)
> Audience : développeurs, intégrateurs, équipe de maintenance.
> Version : 1.0 — généré à partir de la structure réelle du dépôt.

---

## 1. Vue d'ensemble de l'application

### 1.1 Contexte fonctionnel

**EKKLESIA_FRONTEND** est l'interface web de l'ERP d'église **MIAV**
(compagnon du backend .NET). Elle couvre :

- l'**authentification** (connexion, mot de passe oublié/réinitialisation) ;
- le **tableau de bord** (commun + vues consolidées National / International / Synthèse) ;
- les **membres**, le **suivi pastoral**, les **cellules**, le **pipeline visiteurs** ;
- la **vie d'église** (cultes, présences, sermons, événements, inscriptions) ;
- les **finances** (offrandes ventilées, dépenses multi-niveaux, budgets, consolidation XOF) ;
- la **communication** (contenus, médias, newsletters, diffusion) ;
- l'**administration** (utilisateurs, rôles, permissions, zones, églises/sites, audit).

Toute l'UI s'appuie sur les **permissions** renvoyées par le serveur : un
bouton d'écriture n'apparaît que si l'utilisateur possède la permission
correspondante (ex. rôle **Consultant** = lecture seule).

### 1.2 Stack technique

| Élément | Choix |
|---|---|
| Framework | **Angular 21** (composants *standalone*, signals) |
| Langage | **TypeScript 5.9** |
| Rendu | **SSR** (`@angular/ssr`, `server.ts`) + **hydratation** client |
| PWA | **Service Worker** (`@angular/service-worker`, `ngsw-config.json`) |
| Graphiques | **Chart.js 4** + **ng2-charts 10** |
| Icônes | **Boxicons** |
| Authentification | **JWT** (`jwt-decode`), intercepteur HTTP |
| Tests | **Vitest** (`*.spec.ts`) |
| Styles | **SCSS** global + SCSS par composant |
| Build/CLI | **Angular CLI / ng build** ; `@angular/build` |
| Déploiement | **Vercel** (`vercel.json`), `Dockerfile` |

### 1.3 Organisation globale

```
EKKLESIA_FRONTEND/
├── src/
│   ├── app/
│   │   ├── core/         → socle : modèles, services, gardes, intercepteurs, composants
│   │   │   ├── components/        (composants transverses réutilisables)
│   │   │   ├── directives/        (directives)
│   │   │   ├── guards/            (gardes de route)
│   │   │   ├── interceptors/      (intercepteur HTTP / JWT)
│   │   │   ├── models/            (interfaces & types du domaine)
│   │   │   ├── services/          (accès API + état global)
│   │   │   ├── utils/             (utilitaires)
│   │   │   └── validators/        (validateurs de formulaires)
│   │   ├── features/     → pages métier, découpées par domaine
│   │   │   ├── auth/              (login, forgot, reset)
│   │   │   └── dashboard/         (tout l'espace connecté)
│   │   ├── app.ts, app.html, app.scss
│   │   ├── app.config.ts          (providers racine)
│   │   ├── app.routes.ts          (routes racine + lazy loading)
│   │   ├── app.config.server.ts   (config SSR)
│   │   └── app.routes.server.ts   (routes SSR)
│   ├── environments/    → environment.ts / environment.development.ts
│   ├── assets/          → ressources statiques
│   ├── index.html
│   ├── main.ts          → bootstrap navigateur
│   ├── main.server.ts   → bootstrap serveur (SSR)
│   ├── server.ts        → serveur Express SSR
│   ├── styles.scss      → styles globaux
│   └── test-providers.ts
├── public/              → favicon, logos, ressources publiques
├── angular.json / tsconfig*.json / ngsw-config.json / vercel.json
└── package.json
```

### 1.4 Paradigme architectural

L'application suit une séparation **Core ↔ Features** :

- **`core/`** — le socle **transverse et singleton** : modèles de données,
  services (accès API + état), gardes, intercepteur, composants réutilisables.
  Aucun composant `core` ne dépend d'un composant `features`.
- **`features/`** — les **écrans métier**, chargés en *lazy loading* par route,
  organisés par domaine puis par couple *liste / détail / formulaire*.

Règle d'or : **`features` dépend de `core`, jamais l'inverse.** Un composant
`core` est agnostique du domaine qui l'utilise.

---

## 2. Graphe de dépendances et références

### 2.1 Règle d'or (anti-inversion / anti-cycle)

> **Le flux de dépendances va de `features/` vers `core/`.** Les services
> `core/services/*` dépendent des modèles `core/models/*` et de
> `environments/environment`. Aucun cycle : pas de `core` → `features`.

```text
┌──────────────────────────────────────────────────────────┐
│ features/            (pages métier — lazy-loaded)        │
│  auth/  dashboard/                                        │
│    ├── <module>/<liste|detail|form>                       │
│    └── *.routes.ts (routes enfants)                       │
└───────────────┬──────────────────────────────────────────┘
                │ dépend de
                ▼
┌──────────────────────────────────────────────────────────┐
│ core/                (socle transverse, singleton)       │
│  components/  directives/  guards/  interceptors/        │
│  models/  services/  utils/  validators/                 │
└───────────────┬──────────────────────────────────────────┘
                │ dépend de
                ▼
┌──────────────────────────────────────────────────────────┐
│ environments/  +  frameworks (Angular, RxJS, Chart, …)   │
└──────────────────────────────────────────────────────────┘
```

### 2.2 Tableau d'interdépendances

**Ce dossier dépend de / Est utilisé par :**

| Dossier | Dépend de (→) | Est utilisé par (←) |
|---|---|---|
| **core/models** | *(aucun — types purs)* | core/services, core/components, features |
| **core/services** | core/models, environments, frameworks (HttpClient, RxJS) | core/components, core/guards, features |
| **core/components** | core/services, core/models, core/utils | features (dashboards, formulaires) |
| **core/guards** | core/services (Permissions, Token) | app.routes, *.routes.ts |
| **core/interceptors** | core/services (Token, Auth) | app.config (HTTP_INTERCEPTORS) |
| **core/utils / validators** | *(aucun)* | core/services, features |
| **features/auth** | core (services Auth/Token, modèles) | app.routes |
| **features/dashboard** | core (services, composants, modèles, guards) | dashboard.routes |

### 2.3 Diagramme textuel

```text
                 ┌────────────────────────────────┐
                 │   app.routes.ts (racine)        │
                 │   + authGuard                    │
                 └───────────────┬────────────────┘
        ┌────────────────────────┼─────────────────────────┐
        ▼                        ▼                          ▼
 ┌───────────────┐      ┌──────────────────┐        ┌─────────────────┐
 │ features/auth │      │features/dashboard│        │ routes publiques │
 │ login,reset…  │      │ (dashboard.routes)│        │ inscription,     │
 └───────┬───────┘      └────────┬──────────┘        │ paiement         │
         │                       │                   └─────────────────┘
         └───────────┬───────────┘
                     ▼
     ┌───────────────────────────────────────────────┐
     │  core/ (services + models + guards + comps)   │
     └───────────────────────┬───────────────────────┘
                             ▼
                    environments + frameworks
```

---

## 3. Arborescence détaillée des dossiers & fichiers

### 3.1 `core/models` — modèles & types du domaine

```
core/models/
├── Agent/          agent.models.ts
├── Audit/          audit.model.ts, AuditLogCreate, AuditLogEnum,
│                   AuditLog*Dto (Export/Filter/List/Response/Summary/Update),
│                   UserActivityDto
├── Church/         church.model.ts, church-settings.model.ts, site.model.ts
├── Common/         api-response.model.ts (ApiResponse<T>), api-error.model.ts
├── Communication/  content.model.ts
├── Content/        content.model.ts
├── Dashboard/      dashboard.model.ts (KPI, charts, DTO dashboard)
├── Events/         event.model.ts, sermon.model.ts, service.model.ts
├── Finances/       offering.model.ts, expense.model.ts, budget.model.ts,
│                   budget-comparison.model.ts, budget-statistics.model.ts,
│                   finance-summary.model.ts
├── HR/             employee.model.ts, volunteer.model.ts
├── Login/          LoginRequest, LoginResponse
├── Members/        member.model.ts, cell-group.model.ts,
│                   cell-group-attendance.model.ts, pastoral-note.model.ts
├── Notifications/  app-notification.model.ts
├── Password/       ChangePasswordRequest, ForgotPassword(Request), ResetPasswordRequest
├── Pastor/         appointment.model.ts
├── PastoralAct/    pastoral-act.models.ts, pastoral-act.dtos.ts, pastoral-act.enums.ts
├── Propertys/      property.model.ts, contract.model.ts, property-summary.model.ts
├── Roles/          role.models.ts, permission-labels.ts
├── Tolen/          TokenData, EkklesiaJwtPayload, RefreshTokenRequest,
│                   ValidateResetTokenRequest
├── Users/          user.model.ts, user-profile.model.ts, user-preferences.model.ts
└── Zones/          zone.model.ts, zone.utils.ts
```

**Responsabilité** : définir les **interfaces TypeScript** (DTO) échangées avec
le backend et les types internes (enums de statut, modèles d'affichage). Aucune
logique d'accès réseau. C'est le vocabulaire typé partagé par toute l'app.

### 3.2 `core/services` — accès API & état global

```
core/services/
├── Agent/          agent.ts                       (assistant IA)
├── Audit/          audit.ts
├── Auth/           auth.ts                        (login, refresh, mot de passe)
├── Church/         church.ts                      (églises, sites)
├── Content/        contents.ts
├── Currency/       currency.ts                    (devises, taux, catalog)
├── Dashboard/      dashboards.ts, consolidated-dashboard.ts
├── Departments/    departments.ts
├── Errors/         error-messages.ts              (traduction des erreurs)
├── Event/          events.ts, public-registration-service.ts, receipt-identity.store.ts
├── Finances/       offerings.ts, expenses.ts, budjets.ts
├── Members/        members.ts
├── Money/          money.service.ts               (catalogue + conversion XOF)
├── Notification/   notification.ts                (toasts UI)
├── Notifications/  notifications-app.ts          (notifications in-app)
├── PastoralAct/    pastoral-acts.ts
├── PastortRvd/     pastort-appointment.ts
├── Permissions/    permissions.ts                 (source de vérité des droits)
├── Roles/          roles.ts
├── Sermon/         sermons.ts
├── Settings/       settings.ts
├── Structure/      structure.ts
├── Theme/          theme.service.ts
├── Token/          token.ts                        (JWT, expiration)
├── Uploads/        image-upload.service.ts, upload-progress.service.ts
├── Users/          users.ts
├── Videos/         video-access.ts
├── Worship/        service.ts                      (cultes & présences)
└── Zones/          zone-service.ts
```

**Responsabilité** : chaque service encapsule les **appels HTTP** au backend
(`environment.apiUrl` + `/api/v1/...`) via `HttpClient` et expose des
`Observable<ApiResponse<T>>`. Les services d'état (`Permissions`, `Token`,
`Theme`, `Money`) maintiennent un état global partagé.

**Services clés** :

| Service | Rôle technique | Utilité fonctionnelle |
|---|---|---|
| `Permissions` | Charge/agrafe les permissions & rôles ; expose `canXxx()` | Conditionne l'affichage des menus/boutons |
| `Token` | Décode le JWT, gère l'expiration/refresh | Authentification |
| `Auth` | Login, refresh, mot de passe | Session utilisateur |
| `Money` | Catalogue devises + `xof(amount, code)` | Conversion temps réel FCFA |
| `Notifications-app` | Liste notifications in-app | Cloche / centre de notifications |
| `Theme` | Thème clair/sombre | Préférence utilisateur |

### 3.3 `core/components` — composants transverses

```
core/components/
├── agent-widget/              Widget de l'assistant IA
├── confirm-dialog/            Modale de confirmation
├── confirm-dialog-with-input/ Confirmation avec saisie (motif)
├── dual-amount/               Affichage montant devise + ≈ FCFA (RG-CURR-04)
├── form-guide/                Guide d'étapes d'un formulaire
├── member-select/             Sélecteur de membre (recherche)
├── not-found/                 Page 404
├── notification-alert/        Alerte notification
├── notification-component/    Centre de notifications
├── payment-confirmation/      Page publique de confirmation de paiement
├── phone-input/               Champ téléphone (pays + indicatif, E.164)
├── public-event-registration/ Inscription publique à un événement
├── sidebar-component/         Menu latéral (navigation + permissions)
├── unauthorized-component/    Page « accès refusé »
├── upload-field/              Champ d'upload réutilisable
└── upload-progress/           Barre de progression d'upload
```

**Responsabilité** : composants **réutilisables et agnostiques du domaine**
(un montant double, un champ téléphone, un dialogue de confirmation…). Ils sont
injectés dans les écrans `features`.

### 3.4 `core/guards`, `interceptors`, `directives`, `utils`, `validators`

```
core/
├── guards/         auth.guard.ts       (accessGuard : auth + permissions + rôles)
├── interceptors/   auth.interceptor.ts (ajout du Bearer JWT, gestion 401)
├── directives/     auth-image.directive.ts (charge une image authentifiée)
├── utils/          file-validation.ts, image-tools.ts, phone.util.ts, upload.helper.ts
└── validators/     password.validator.ts
```

**Responsabilité** :
- **auth.guard.ts** : `accessGuard` (alias `authGuard`, `permissionGuard`,
  `roleGuard`…) — vérifie l'authentification, la permission (`data.permissions`
  = OR, `data.allPermissions` = AND), les rôles, `superAdmin`, `admin`.
- **auth.interceptor.ts** : ajoute le token aux requêtes et gère l'expiration.
- **auth-image.directive.ts** : affiche des images protégées (`/photo/{id}`).
- **utils/validators** : validation de fichiers (taille/type), formatage
  téléphone E.164, force du mot de passe.

### 3.5 `features/auth` — authentification

```
features/auth/
├── auth.routes.ts               (routes publiques : login, forgot, reset)
├── login/                       login.ts/html/scss/spec
├── forgot-password-form/        forgot-password-form.ts/html/scss/spec
└── reset-password/              reset-password.ts/html/scss/spec
```

**Responsabilité** : écrans **hors session** : connexion, demande de
réinitialisation, réinitialisation du mot de passe (avec jeton).

### 3.6 `features/dashboard` — espace connecté

Le shell `dashboard.ts` (`SidebarComponent` + `AgentWidget` + notifications +
Chart.js) porte toutes les pages enfants.

```
features/dashboard/
├── dashboard.routes.ts      (lazy loading de tous les modules + consolidation)
└── dashboard/
    ├── dashboard.ts         (shell : sidebar, header, chart)
    ├── dashboard-home/      (tableau de bord d'accueil + accès consolidation)
    ├── consolidation/       consolidated-scope-page.ts (National/International/Synthèse)
    ├── members/             member-list, member-create, member-detail, member-import,
    │                        cell-group-list, cell-group-edit,
    │                        pastoral-care, visitor-pipeline
    ├── workship/            service-list, service-form, service-detail,
    │                        service-attendance, service-sermon-library,
    │                        sermon-list, sermon-form, sermon-edit
    ├── events/              event-list, event-form, event-detail,
    │                        event-registrations, event-checkin, event-church-stats
    ├── offerings/           offering-list, offering-form, offering-detail,
    │                        offering-dashboard, offering-by-member, offering-receipts
    ├── expenses/            expense-list, expense-form, expense-detail
    ├── budgets/             budget-list, budget-form, budget-detail, budget-comparison
    ├── pastor/              appointment-list, appointment-form, appointment-detail
    ├── pastoral-acts/       pastoral-act-list, pastoral-act-create,
    │                        pastoral-act-edit, pastoral-act-detail
    ├── users/               user-list, user-form, user-detail, user-roles, user-import
    ├── roles/               role-list, role-form, role-permissions
    ├── church/              church-list, church-form, church-edit
    ├── sites/               site-list, site-form
    ├── zones/               zone-list, zone-form, zone-edit, my-zone, zone-help
    ├── departments/         department-list
    ├── contents/            content-list, content-form, content-detail,
    │                        live-broadcast, newsletter, video-access
    ├── notifications/       my-notifications
    ├── audit/               audit-log-list
    ├── settings/            settings-page.ts
    ├── my-profile/          my-profile.ts/html/scss
    └── <domaine>.routes.ts  (routes enfants par module)
```

**Responsabilité** : une **page = un couple** `liste` / `détail` /
`formulaire` par domaine. Chaque module possède son fichier `*.routes.ts`
(chargé en *lazy*). Convention de nommage des fichiers d'un écran :

```
<screen>.ts     → composant (standalone) : logique, signals, appels service
<screen>.html   → template Angular
<screen>.scss   → styles scopés du composant
<screen>.spec.ts→ tests Vitest
```

**Anatomie typique d'un écran** (ex. `offering-form`) :
- `.ts` : `FormGroup` (Reactive Forms), chargement des listes (églises, sites,
  catégories, devises), calculs dérivés (signals/computed), appels service ;
- `.html` : formulaire **guidé** (`app-form-guide`), champs réutilisables
  (`app-phone-input`, `app-member-select`, `app-upload-field`, `app-dual-amount`) ;
- `.ts` : boutons conditionnés par `permissions.canXxx()`.

---

## 4. Routage (navigation)

### 4.1 Routes racine (`app.routes.ts`)

| Chemin | Chargement | Garde |
|---|---|---|
| `''` | redirection → `auth/login` | — |
| `auth` | `features/auth/auth.routes` | — (public) |
| `inscription/:eventId` | `PublicEventRegistration` | — (public) |
| `paiement/confirmation` | `PaymentConfirmation` | — (public) |
| `dashboard` | `features/dashboard/dashboard.routes` | **authGuard** |
| `unauthorized` | `UnauthorizedComponent` | — |
| `**` | `NotFound` | — |

### 4.2 Routes dashboard (`dashboard.routes.ts`)

Le shell `Dashboard` déclare ses enfants en *lazy loading*. Un module = un
`loadChildren` (ex. `membres`, `offrandes`, `finances/depenses`, `cultes`…).
Chaque route protégée porte `canActivate: [authGuard]` et, si nécessaire,
`data: { permissions: [...] }`.

Exemple — **vues consolidées** (3 routes, même composant, `data.scope` différent) :

```ts
{ path: 'consolidation/national',
  loadComponent: () => import('./dashboard/consolidation/consolidated-scope-page')
                            .then(m => m.ConsolidatedScopePage),
  canActivate: [authGuard],
  data: { scope: 'National', permissions: [
    'Finance_Consolidated_View', 'Mission_National_Analytics_View',
    'Mission_International_Analytics_View', 'Mission_International_Finance_View' ] } }
```

### 4.3 Défense par permissions

`authGuard` (= `accessGuard`) lit `data` :

| Clé `data` | Sémantique |
|---|---|
| `permissions` | au moins **une** requise (OR) |
| `allPermissions` | **toutes** requises (AND) |
| `roles` | au moins un rôle requis |
| `superAdmin` / `admin` | restreint au super admin / « admin ou plus » |

Si l'accès est refusé → redirection vers `/unauthorized`.

### 4.4 Configuration applicative (`app.config.ts`)

`appConfig` fournit : zone change detection optimisée, **router**,
**hydratation**, **HttpClient** (`withFetch`, intercepteurs DI),
**Service Worker**, et un `provideAppInitializer` qui **charge les permissions
serveur avant le premier guard** (évite de bloquer à tort un utilisateur dont
les droits ne sont pas encore chargés).

---

## 5. Flux applicatif (résumé pédagogique)

```
Navigateur (ou SSR Express)
   │  navigation de route
   ▼
[ app.routes.ts ]  →  authGuard (permissions/rôles)
   │
   ▼
[ features/<module>/<screen> ]  Composant standalone
   │   formulaire (Reactive Forms) + signals
   │   appels via inject(<Service>)
   ▼
[ core/services/<domaine> ]  HttpClient → environment.apiUrl
   │   DTO typés (core/models)
   ▼
[ backend .NET ]  (avec Bearer JWT posé par l'intercepteur)
   │
   ▲  ApiResponse<T>  → toasts (Notification) / état (signals)
   │
[ core/components ]  sidebar, dialogs, champs réutilisables, dual-amount…
```

Interception transverse : **auth.interceptor** ajoute le token et traite le 401 ;
**error-messages** traduit les erreurs serveur en messages lisibles.

---

## 6. Conventions & règles d'or de contribution

1. **Sens des dépendances** : `features → core`, jamais l'inverse ; aucun cycle.
2. **Composants standalone** : pas de `NgModule` ; importer explicitement ce
   qui est utilisé (`imports: [...]`).
3. **Lazy loading** : toute nouvelle page est chargée par route (`loadComponent`
   / `loadChildren`), jamais importée « en dur » dans le shell.
4. **État** : privilégier les **signals** (`signal`, `computed`) ; `Observable`
   pour les appels HTTP.
5. **Typage** : utiliser les DTO de `core/models`, jamais `any` pour un
   contrat d'API.
6. **Permissions** : un bouton d'écriture est **conditionné** par
   `permissions.canXxx()` ; la garde de route filtre l'accès à l'écran. Le
   serveur reste l'autorité finale (403).
7. **Champs réutilisables** : téléphone → `app-phone-input` ; membre →
   `app-member-select` ; upload → `app-upload-field` ; montant multidevise →
   `app-dual-amount`.
8. **Devise** : la devise pivot est **XOF** ; `MoneyService.xof()` fournit la
   contre-valeur ; ne jamais additionner des devises différentes.
9. **Accompagnement** : les formulaires affichent un `app-form-guide` (étapes)
   et les messages d'erreur explicites.
10. **Tests** : chaque écran/service a un `*.spec.ts` (Vitest).

---

## 7. Registre des dépendances externes (packages clés)

| Domaine | Package |
|---|---|
| Framework | `@angular/core`, `@angular/common`, `@angular/forms`, `@angular/router` |
| SSR / PWA | `@angular/platform-server`, `@angular/ssr`, `@angular/service-worker`, `express` |
| Graphiques | `chart.js`, `ng2-charts` |
| Icônes | `boxicons` |
| Auth | `jwt-decode` |
| Réactivité | `rxjs`, `zone.js` |
| Tests | `vitest`, `jsdom` |
| Build | `@angular/cli`, `@angular/build`, `typescript` |

---

*Fin du document.*
