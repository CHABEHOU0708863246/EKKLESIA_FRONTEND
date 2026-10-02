# Guide — Version mobile (Android & iOS) avec Capacitor

> **Projet** : EKKLESIA / MIAV — frontend Angular 21 (SSR + PWA)
> **Objectif** : publier l'application sur **Google Play** et **App Store**
> en réutilisant le code Angular existant, via **Capacitor**.
> **Public** : développeur(s) en charge de la version mobile.
> **Version** : 1.0

---

## 0. Vue d'ensemble du processus

Le parcours complet, de zéro à la publication :

```
[1] Prérequis machine
      ↓
[2] Adapter le projet Angular (séparation SSR / SPA)
      ↓
[3] Installer Capacitor
      ↓
[4] Créer les projets natifs (Android / iOS)
      ↓
[5] Configurer l'app (capacitor.config, nom, ID, icônes, splash)
      ↓
[6] Brancher les plugins natifs (caméra, push, stockage sécurisé…)
      ↓
[7] Adapter le code Angular au contexte mobile (API, permissions, navigation)
      ↓
[8] Build & synchronisation (web → natif)
      ↓
[9] Tester sur émulateur / appareil réel
      ↓
[10] Signer & publier (Play Console / App Store Connect)
      ↓
[11] Maintenance & mises à jour (OTA / stores)
```

---

## ÉTAPE 1 — Préparer l'environnement de développement

### 1.1 Outils communs (Windows, dans notre cas)

| Outil | Version conseillée | Rôle |
|---|---|---|
| **Node.js** | 20 LTS ou 22 | Déjà présent (build Angular) |
| **npm** | 11+ | Déjà présent |
| **Java JDK** | **17** (LTS) | Requis par Android Gradle Plugin |
| **Android Studio** | Latest (Ladybug+) | SDK Android, émulateur, build |
| **Android SDK** | API 34/35 | Plateforme cible |
| **Git** | Latest | Versioning |

> **iOS** : la compilation iOS **exige macOS**. Sur un poste Windows, on ne
> peut pas compiler d'IPA. Deux options :
> - un **Mac** (physique ou cloud type MacStadium / MacinCloud) ;
> - ou un **CI/CD macOS** (GitHub Actions `macos-latest`, Codemagic, Xcode Cloud).

### 1.2 Android — installation pas à pas

1. Installer **JDK 17** (Temurin/Adoptium) et définir `JAVA_HOME`.
2. Installer **Android Studio** (inclut le SDK Manager).
3. Dans le SDK Manager, installer : *Android SDK Platform 34+*, *Android SDK
   Build-Tools*, *Android SDK Command-line Tools*, *Android Emulator*.
4. Créer une variable d'environnement `ANDROID_HOME` pointant vers le SDK
   (ex. `C:\Users\<user>\AppData\Local\Android\Sdk`).
5. Vérifier :
   ```powershell
   java -version        # → 17.x
   echo $env:ANDROID_HOME
   ```

### 1.3 iOS — prérequis (sur Mac)

1. **macOS** (dernière version majeure).
2. **Xcode** (depuis l'App Store) + *Command Line Tools*.
3. **CocoaPods** (`sudo gem install cocoapods`).
4. Un **compte Apple Developer** (99 $/an) pour publier.

---

## ÉTAPE 2 — Adapter le projet Angular (crucial : SSR → SPA)

> ⚠️ **Point n°1 à comprendre** : un build mobile Capacitor est un **build web
> statique** (HTML/JS/CSS servis localement dans une WebView). Or votre projet
> est configuré en **SSR** (`main.server.ts`, `app.config.server.ts`,
> `provideServerRendering`). **On n'embarque JAMAIS de serveur Node dans une app
> mobile.** Il faut donc produire un build **côté client uniquement**.

### 2.1 Décision d'architecture : deux cibles

| Cible | Build | Contenu |
|---|---|---|
| **Web/Vercel** | SSR (existant) | Inchangé |
| **Mobile (Capacitor)** | **SPA client-only** | Réutilise `appConfig` **sans** `serverConfig` |

**Bonne nouvelle** : votre `appConfig` (navigateur) est déjà séparé du
`serverConfig`. Le `main.ts` fait déjà `bootstrapApplication(App, appConfig)`
→ c'est **exactement** le bootstrap mobile souhaité. Le SSR n'est ajouté que
par `main.server.ts`. Donc l'essentiel du travail consiste à **produire un build
qui n'inclut pas le SSR**.

### 2.2 Créer une configuration de build « mobile »

Dans `angular.json`, ajouter une configuration (sans `server`/`ssr`/`prerender`)
et s'assurer que `outputPath` produit bien un `browser/` utilisable par Capacitor.

```jsonc
// angular.json → projects.EKKLESIA_FRONTEND.architect.build.configurations
"mobile": {
  "outputHashing": "all",
  "optimization": true,
  "sourceMap": false,
  "extractLicenses": true,
  "fileReplacements": [
    { "replace": "src/environments/environment.ts",
      "with": "src/environments/environment.mobile.ts" }
  ]
}
```

Et un script npm :

```jsonc
// package.json → scripts
"build:mobile": "ng build --configuration=mobile"
```

### 2.3 Vérifier l'absence de SSR dans le build mobile

- Ne PAS lancer `ng run ...:server` ni inclure `server.ts` dans la config mobile.
- Le dossier produit doit contenir : `dist/EKKLESIA_FRONTEND/browser/index.html`
  + les bundles. C'est ce dossier que Capacitor embarquera.

### 2.4 Fichier d'environnement mobile

Créer `src/environments/environment.mobile.ts` :

```ts
export const environment = {
  production: true,
  // Même API backend (déployée). En dev vous pouvez pointer vers votre IP LAN.
  apiUrl: 'https://ekklesia-backend-jxkc.onrender.com',
};
```

> **Dev local sur appareil réel** : `localhost` ne marche pas depuis un
> téléphone. Utilisez l'IP de votre PC sur le réseau (ex. `http://192.168.1.20:5121`)
> et autorisez le CORS côté backend pour cette origine.

---

## ÉTAPE 3 — Installer Capacitor

À la racine du projet Angular :

```powershell
npm install @capacitor/core @capacitor/cli
npx cap init
```

`npx cap init` demande :
- **App name** : `MIAV ERP`
- **App ID (package name)** : `ci.miav.ekklesia` (⚠️ **immuable une fois publié**)
- **Web asset directory** : `dist/EKKLESIA_FRONTEND/browser`

Cela crée `capacitor.config.ts` :

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ci.miav.ekklesia',
  appName: 'MIAV ERP',
  webDir: 'dist/EKKLESIA_FRONTEND/browser',
  // bundledWebRuntime: false (par défaut)
};

export default config;
```

---

## ÉTAPE 4 — Créer les projets natifs

```powershell
npm install @capacitor/android @capacitor/ios
npx cap add android
npx cap add ios        # nécessite macOS/CocoaPods
```

Résultat : deux dossiers natifs **générés** :

```
EKKLESIA_FRONTEND/
├── android/     → projet Android Studio (Gradle)
├── ios/         → projet Xcode (CocoaPods)
├── capacitor.config.ts
└── dist/EKKLESIA_FRONTEND/browser/   ← build web embarqué
```

> Les dossiers `android/` et `ios/` sont des projets natifs **générés** : on
> les versionne, mais on n'y met du code à la main que lorsque c'est
> incontournable (voir étape 6).

---

## ÉTAPE 5 — Configurer l'application (identité visuelle & réglages)

### 5.1 Nom, identifiant, version

- **Nom** : dans `capacitor.config.ts` + `android/app/src/main/res/values/strings.xml` + `ios/App/Info.plist`.
- **Versions** : `android/app/build.gradle` (`versionCode`, `versionName`) et
  `ios/App/App.xcodeproj` (`CFBundleShortVersionString`, `CFBundleVersion`).
- **Nomenclature Play/App Store** : `ci.miav.ekklesia` (ne changez plus).

### 5.2 Icônes & écran de démarrage (Splash)

Le plus simple : `@capacitor/assets`.

```powershell
npm install -D @capacitor/assets
# Placer des sources dans ./resources :
#   resources/icon.png                 (1024x1024)
#   resources/splash.png               (2732x2732)
npx capacitor-assets generate --android --ios
```

Cela génère **toutes** les tailles d'icônes et de splash pour Android et iOS.

### 5.3 Statut bar / navigation (optionnel mais recommandé)

```powershell
npm install @capacitor/status-bar @capacitor/splash-screen
```

Configurer dans le code (démarrage) : couleur de la barre de statut, masquage
du splash après chargement.

### 5.4 Sécurité réseau (important)

- **Android** : `android/app/src/main/AndroidManifest.xml` → n'autoriser
  `usesCleartextTraffic` **que** en dev (HTTPS obligatoire en prod).
- **iOS** : `Info.plist` → pas d'`NSAppTransportSecurity` permissif en prod.

---

## ÉTAPE 6 — Brancher les plugins natifs (par fonctionnalité)

Voici les plugins utiles **pour vos modules existants** :

| Plugin | Module EKKLESIA concerné |
|---|---|
| `@capacitor/camera` | **Photo justificative d'offrande / dépense**, photo de profil membre |
| `@capacitor/preferences` | Petites préférences locales (thème, dernier onglet) |
| `@capacitor/filesystem` | Téléchargement de reçus PDF, certificats d'actes pastoraux |
| `@capacitor/push-notifications` | Notifications (backend déjà prêt : `NotificationDispatchWorker`) |
| `@capacitor/app` | Bouton « retour » Android, reprise d'état, deep links |
| `@capacitor/browser` | Ouverture du portail de paiement (GeniusPay) |
| `@capacitor/share` | Partage de contenus, invitations d'événements |
| `capacitor-secure-storage-plugin` | Stockage **chiffré** du JWT (au lieu du `localStorage`) |
| `@capacitor/network` | Détection hors-ligne (message « pas de connexion ») |

Exemple d'installation :

```powershell
npm install @capacitor/camera @capacitor/preferences @capacitor/app `
             @capacitor/push-notifications @capacitor/browser @capacitor/share `
             capacitor-secure-storage-plugin
npx cap sync
```

> **Règle** : chaque plugin doit être testé sur appareil réel. Sur navigateur
> (`ng serve`), les plugins sont inactifs → prévoir des **fallbacks web**.

---

## ÉTAPE 7 — Adapter le code Angular au contexte mobile

### 7.1 Détecter le mode natif

```ts
import { Capacitor } from '@capacitor/core';
export const isNative = Capacitor.isNativePlatform();
```

### 7.2 Storage du token

Votre `Token` service utilise probablement `localStorage`. Sur mobile, préférer
**SecureStorage** (chiffré) avec repli web :

```ts
// pseudo-code
if (Capacitor.isNativePlatform()) {
  await SecureStorage.set('jwt', token);
} else {
  localStorage.setItem('jwt', token);
}
```

### 7.3 Caméra au lieu de `<input type="file">`

Le composant `app-upload-field` (photo justificative) doit, sur mobile,
utiliser `@capacitor/camera` (`Camera.getPhoto`) **au lieu** du sélecteur de
fichier. Prévoir la permission caméra/galerie.

### 7.4 Bouton retour Android

```ts
import { App } from '@capacitor/app';
App.addListener('backButton', ({ canGoBack }) => {
  if (canGoBack) history.back();
  else App.exitApp();
});
```

### 7.5 Appels API & CORS

- En **web prod** : l'origine est `https://...vercel.app`.
- En **app native** : l'origine est `capacitor://localhost` (iOS) /
  `http://localhost` (Android). **Autoriser ces origines dans le CORS backend**,
  sinon toutes les requêtes seront bloquées.

```csharp
// EKKLESIA WebAPI — appsettings.json / CorsConfig
"Cors": { "Origin": "https://ekklesia-frontend.vercel.app,http://localhost:4200,capacitor://localhost,http://localhost" }
```

### 7.6 Ouverture des liens/paiement dans le navigateur système

Utiliser `@capacitor/browser` pour le portail GeniusPay (évite l'impasse dans
la WebView).

---

## ÉTAPE 8 — Build & synchronisation (le cycle quotidien)

Le cycle de travail à chaque modification web :

```powershell
# 1) Build Angular (client-only, config mobile)
npm run build:mobile

# 2) Copier le build web dans les projets natifs + MAJ plugins
npx cap sync

# 3) Ouvrir le projet natif dans l'IDE, ou lancer directement
npx cap open android      # → Android Studio
npx cap open ios          # → Xcode (Mac)
```

> `npx cap sync` = `cap copy` (copie le web) + `cap update` (plugins natifs).
> **Toujours** relancer `build:mobile` **avant** `cap sync` après un changement.

### Build de production Android

```powershell
npx cap sync android
# Dans android/ :
./gradlew bundleRelease      # → android/app/build/outputs/bundle/release/app-release.aab
```

### Build de production iOS (sur Mac)

```powershell
npx cap sync ios
cd ios/App
pod install
# → Xcode : Product > Archive → distribuer vers App Store Connect
```

---

## ÉTAPE 9 — Tester

### 9.1 Émulateurs

- **Android** : `npx cap run android` (ou via Android Studio → AVD Manager).
- **iOS** : simulateur Xcode (Mac).

### 9.2 Appareil réel (indispensable)

- Activez le **débogage USB** (Android) et branchez l'appareil.
- Tester : connexion, 403 (rôle Consultant), caméra, push, hors-ligne,
  bouton retour, rotation, mode sombre, petite/grande taille d'écran.

### 9.3 Points de contrôle fonctionnels EKKLESIA

| Test | Attendu |
|---|---|
| Login + permissions | Menus/boutons filtrés selon le rôle |
| Photo offrande | Caméra native → upload vers le backend |
| Dashboard consolidé | Graphiques Chart.js rendus, XOF correct |
| Rôle Consultant | Aucun bouton d'écriture, lectures OK |
| Notifications | Réception push (si plugin + backend configuré) |
| Paiement | Ouverture navigateur système, retour app |

---

## ÉTAPE 10 — Signer et publier

### 10.1 Android — Google Play

1. Créer une **clé de signature** (keystore) :
   ```powershell
   keytool -genkey -v -keystore miar-release.keystore -alias miar `
     -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Configurer `android/app/build.gradle` avec le `signingConfig` (garder les
   identifiants **hors du dépôt**).
3. Générer le **AAB** (`./gradlew bundleRelease`).
4. Créer l'application sur **Google Play Console** (compte 25 $ unique),
   remplir la fiche (description, captures, icône, politique de
   confidentialité), téléverser l'`.aab`, déployer en *test interne* puis
   *production*.

### 10.2 iOS — App Store

1. Compte **Apple Developer** (99 $/an).
2. Créer l'**App ID** + certificats + provisioning profile (ou signature
   automatique dans Xcode).
3. **Archive** dans Xcode → upload vers **App Store Connect**.
4. Remplir la fiche, tester via **TestFlight**, soumettre à la **review** Apple.

### 10.3 Checklist « reviews stores »

- Politique de **confidentialité** (obligatoire, surtout avec comptes utilisateurs).
- Justification des **permissions** (caméra, notifications).
- Compte de **démonstration** pour les reviewers (ex. un compte Consultant !).
- Pas de contenu de test / placeholders.
- Conformité RGPD (données personnelles de membres).

---

## ÉTAPE 11 — Maintenance & mises à jour

| Changement | Procédure |
|---|---|
| **UI / logique web** (Angular) | `build:mobile` → `cap sync` → rebuild store (ou OTA) |
| **Config Capacitor / plugin** | `cap sync` → rebuild natif obligatoire |
| **Code natif (Gradle/Xcode)** | rebuild natif + nouvelle version store |
| **Hotfix urgent** | **OTA** possible via Capgo / Ionic Appflow (mise à jour JS sans store) |

> **OTA (Over-The-Air)** : permet de pousser un nouveau bundle JS/HTML sans
> repasser par la review des stores — idéal pour corriger vite. Respecter les
> règles Apple (pas de changement de fonctionnalité majeur par OTA).

### Bonnes pratiques

- Versionner les **deux** dossiers `android/` et `ios/`.
- Centraliser le build : **CI/CD** (GitHub Actions) → build + sync + signature.
- Ne jamais committer le **keystore** ni les secrets de signature.
- Tester chaque binaire sur appareil réel avant soumission.

---

## Annexe A — Récapitulatif des commandes essentielles

```powershell
# Installation (une fois)
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android @capacitor/ios
npx cap init
npx cap add android
npx cap add ios

# Cycle quotidien
npm run build:mobile
npx cap sync
npx cap open android      # ou: npx cap run android
npx cap open ios

# Production
# Android : ./gradlew bundleRelease  → .aab
# iOS     : Xcode > Archive        → App Store Connect
```

## Annexe B — Points de vigilance spécifiques à EKKLESIA

1. **SSR** : ne jamais embarquer le serveur ; toujours builder en **SPA**.
2. **CORS** : ajouter `capacitor://localhost` et `http://localhost` aux origines autorisées.
3. **JWT** : passser du `localStorage` à un **stockage sécurisé** natif.
4. **Caméra** : remplacer le file-picker de `app-upload-field` par la caméra native.
5. **API URL** : HTTPS obligatoire ; en dev, utiliser l'IP LAN du PC.
6. **Rôle Consultant** : prévoir un compte de démo (lecture seule) pour les reviewers des stores.
7. **Paiement GeniusPay** : ouvrir dans le navigateur système (`@capacitor/browser`).
8. **Icône du logo MIAV** : fournir un `icon.png` 1024×1024 + splash dédié.

---

*Fin du guide.*
