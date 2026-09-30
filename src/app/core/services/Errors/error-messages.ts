import { HttpErrorResponse } from '@angular/common/http';
import { ApiError, ApiFieldError, API_ERROR_CODES } from '../../models/Common/api-error.model';

/** Erreur traduite en clair, prête à afficher à un utilisateur non technique. */
export interface DescribedError {
  code: string;
  title: string;
  message: string;
  action?: string;
  reference?: string;
  fields: ApiFieldError[];
  status: number;
}

interface Template {
  title: string;
  message: string;
  action?: string;
}

const TEMPLATES: Record<string, Template> = {
  [API_ERROR_CODES.SESSION_EXPIRED]: {
    title: 'Session expirée',
    message: 'Votre session a pris fin.',
    action: 'Reconnectez-vous pour continuer.',
  },
  [API_ERROR_CODES.UNAUTHENTICATED]: {
    title: 'Connexion requise',
    message: 'Vous devez être connecté pour effectuer cette action.',
    action: 'Connectez-vous puis réessayez.',
  },
  [API_ERROR_CODES.PERMISSION_DENIED]: {
    title: 'Accès refusé',
    message: "Vous n'avez pas les droits nécessaires pour cette action.",
    action: 'Vérifiez votre rôle ou contactez un administrateur.',
  },
  [API_ERROR_CODES.PERMISSION_DENIED_CHURCH]: {
    title: 'Église non autorisée',
    message: "Vous ne pouvez pas agir sur cette église : elle n'est pas dans votre périmètre.",
    action: 'Choisissez une église autorisée dans la liste ou contactez votre chef de zone.',
  },
  [API_ERROR_CODES.ACCOUNT_DISABLED]: {
    title: 'Compte désactivé',
    message: 'Votre compte a été désactivé.',
    action: "Contactez un administrateur pour le réactiver.",
  },
  [API_ERROR_CODES.VALIDATION_FAILED]: {
    title: 'Informations à corriger',
    message: 'Certaines informations sont incorrectes.',
    action: 'Corrigez les champs signalés en rouge puis réessayez.',
  },
  [API_ERROR_CODES.MISSING_FIELD]: {
    title: 'Champ obligatoire',
    message: 'Un champ obligatoire est vide.',
    action: 'Complétez les champs marqués en rouge.',
  },
  [API_ERROR_CODES.INVALID_FORMAT]: {
    title: 'Format invalide',
    message: 'Une valeur saisie n’a pas le bon format.',
    action: 'Vérifiez la saisie (dates, nombres, téléphone…).',
  },
  [API_ERROR_CODES.NOT_FOUND]: {
    title: 'Introuvable',
    message: "L'élément demandé est introuvable.",
    action: 'Actualisez la page ou vérifiez qu’il existe encore.',
  },
  [API_ERROR_CODES.DUPLICATE]: {
    title: 'Doublon détecté',
    message: 'Cet élément existe déjà.',
    action: 'Recherchez l’existant ou modifiez-le au lieu de le recréer.',
  },
  [API_ERROR_CODES.DUPLICATE_SERVICE]: {
    title: 'Culte déjà enregistré',
    message: 'Un culte identique existe déjà pour cette date.',
    action: 'Modifiez le culte existant ou choisissez une autre date.',
  },
  [API_ERROR_CODES.CONFLICT]: {
    title: 'Conflit',
    message: 'Cette action entre en conflit avec des données existantes.',
    action: 'Rafraîchissez puis réessayez.',
  },
  [API_ERROR_CODES.BUSINESS_RULE]: {
    title: 'Action impossible',
    message: "Cette action n'est pas autorisée dans l'état actuel.",
    action: 'Vérifiez les informations liées à cet élément.',
  },
  [API_ERROR_CODES.FILE_TOO_LARGE]: {
    title: 'Fichier trop lourd',
    message: 'Le fichier dépasse la taille autorisée.',
    action: 'Choisissez un fichier plus léger ou réduisez sa taille.',
  },
  [API_ERROR_CODES.FILE_TYPE_NOT_ALLOWED]: {
    title: 'Format de fichier non autorisé',
    message: 'Ce type de fichier n’est pas accepté.',
    action: 'Utilisez une photo (JPEG/PNG) ou un PDF.',
  },
  [API_ERROR_CODES.RATE_LIMITED]: {
    title: 'Trop de tentatives',
    message: 'Vous avez effectué trop de demandes en peu de temps.',
    action: 'Patientez quelques instants avant de réessayer.',
  },
  [API_ERROR_CODES.INTERNAL_ERROR]: {
    title: 'Erreur technique',
    message: 'Une erreur interne est survenue.',
    action: 'Réessayez dans un instant ; si cela persiste, communiquez la référence ci-dessous au support.',
  },
  [API_ERROR_CODES.SERVICE_UNAVAILABLE]: {
    title: 'Service momentanément indisponible',
    message: "Le serveur ne répond pas pour l'instant.",
    action: 'Réessayez dans quelques instants.',
  },
  [API_ERROR_CODES.NETWORK_ERROR]: {
    title: 'Connexion perdue',
    message: 'Impossible de joindre le serveur.',
    action: 'Vérifiez votre connexion internet puis réessayez.',
  },
};

function statusToCode(status: number): string {
  switch (status) {
    case 0: return API_ERROR_CODES.NETWORK_ERROR;
    case 401: return API_ERROR_CODES.SESSION_EXPIRED;
    case 403: return API_ERROR_CODES.PERMISSION_DENIED;
    case 404: return API_ERROR_CODES.NOT_FOUND;
    case 409: return API_ERROR_CODES.DUPLICATE;
    case 413: return API_ERROR_CODES.FILE_TOO_LARGE;
    case 415: return API_ERROR_CODES.FILE_TYPE_NOT_ALLOWED;
    case 422: return API_ERROR_CODES.BUSINESS_RULE;
    case 429: return API_ERROR_CODES.RATE_LIMITED;
    case 503: case 504: return API_ERROR_CODES.SERVICE_UNAVAILABLE;
    default: return status >= 500 ? API_ERROR_CODES.INTERNAL_ERROR : API_ERROR_CODES.VALIDATION_FAILED;
  }
}

/**
 * Traduit une erreur HTTP en message humain + action suggérée.
 * Priorité : le `code` renvoyé par le serveur ; sinon déduit du statut.
 */
export function describeError(error: HttpErrorResponse): DescribedError {
  const body = (error?.error ?? {}) as ApiError;

  const code = body.code || statusToCode(error.status);
  const template = TEMPLATES[code] ?? TEMPLATES[API_ERROR_CODES.INTERNAL_ERROR];

  const fields = Array.isArray(body.fields) ? body.fields : [];

  return {
    code,
    title: template.title,
    // Le message du serveur est plus précis quand il existe (ex. nom de l'église).
    message: (body.message && body.message.trim()) || template.message,
    action: template.action,
    reference: body.reference,
    fields,
    status: error.status,
  };
}

/** Compose le texte final affiché (message + action + référence). */
export function formatDescribedError(d: DescribedError): string {
  const parts = [d.message];
  if (d.action) parts.push(d.action);
  if (d.reference) parts.push(`Référence : ${d.reference}`);
  return parts.join(' ');
}
