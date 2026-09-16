import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Politique de mot de passe imposée par le backend EKKLESIA (Identity) :
 *  - longueur minimale : 8 caractères
 *  - au moins 1 chiffre
 *  - au moins 1 majuscule
 *  - au moins 1 minuscule
 *
 * ⚠️ Toute modification ici doit rester alignée avec
 * `MongoDbConfig.cs` côté backend.
 */
export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_POLICY_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

export const PASSWORD_POLICY_HINT =
  'Au moins 8 caractères, dont une majuscule, une minuscule et un chiffre.';

/**
 * Validateur à appliquer au contrôle « nouveau mot de passe » :
 * ne produit PAS d'erreur pour une valeur vide (laisser `Validators.required`
 * gérer le caractère obligatoire).
 */
export const passwordPolicyValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const value = (control.value ?? '') as string;
  if (!value) return null;
  return PASSWORD_POLICY_PATTERN.test(value) ? null : { passwordPolicy: true };
};

/**
 * Score de robustesse (0-4) utilisé par les jauges d'affichage.
 */
export function passwordStrength(value: string): number {
  if (!value) return 0;
  let score = 0;
  if (value.length >= PASSWORD_MIN_LENGTH) score++;
  if (/[A-Z]/.test(value)) score++;
  if (/[a-z]/.test(value)) score++;
  if (/\d/.test(value)) score++;
  return score;
}
