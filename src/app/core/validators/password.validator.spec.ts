import { FormControl } from '@angular/forms';
import {
  PASSWORD_MIN_LENGTH,
  passwordPolicyValidator,
  passwordStrength,
} from './password.validator';

describe('passwordPolicyValidator', () => {
  it('accepte une valeur vide (required gère le caractère obligatoire)', () => {
    const control = new FormControl('');
    expect(passwordPolicyValidator(control)).toBeNull();
  });

  it('accepte un mot de passe conforme à la politique backend', () => {
    const control = new FormControl('MotDePasse1');
    expect(passwordPolicyValidator(control)).toBeNull();
  });

  it('rejette un mot de passe sans majuscule', () => {
    const control = new FormControl('motdepasse1');
    expect(passwordPolicyValidator(control)).toEqual({ passwordPolicy: true });
  });

  it('rejette un mot de passe sans minuscule', () => {
    const control = new FormControl('MOTDEPASSE1');
    expect(passwordPolicyValidator(control)).toEqual({ passwordPolicy: true });
  });

  it('rejette un mot de passe sans chiffre', () => {
    const control = new FormControl('MotDePasse');
    expect(passwordPolicyValidator(control)).toEqual({ passwordPolicy: true });
  });

  it('expose une longueur minimale de 8', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8);
  });
});

describe('passwordStrength', () => {
  it('retourne 0 pour une valeur vide', () => {
    expect(passwordStrength('')).toBe(0);
  });

  it('retourne 4 pour un mot de passe pleinement conforme', () => {
    expect(passwordStrength('MotDePasse1')).toBe(4);
  });

  it('compte la longueur, la majuscule, la minuscule et le chiffre', () => {
    expect(passwordStrength('abc')).toBe(1); // minuscule seule
    expect(passwordStrength('Abc')).toBe(2); // minuscule + majuscule
    expect(passwordStrength('Abc1')).toBe(3); // + chiffre
  });
});
