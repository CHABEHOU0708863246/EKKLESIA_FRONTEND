import { ReceiptIdentity } from '../../models/Events/event.model';

/**
 * Preuve d'identité exigée par le backend pour lire ou renvoyer un reçu public
 * (`?email=` ou `?phone=`). Le formulaire d'inscription la mémorise au moment
 * de l'inscription ; la page de confirmation la relit pour afficher le reçu
 * sans redemander au participant de se ré-identifier.
 *
 * Stockage `sessionStorage` (et non `localStorage`) : donnée personnelle
 * éphémère, liée à l'onglet du parcours d'inscription.
 */
const STORAGE_KEY = 'ekklesia_receipt_identity';

interface StoredReceiptIdentity extends ReceiptIdentity {
  attendeeId: string;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof sessionStorage !== 'undefined';
}

export function saveReceiptIdentity(attendeeId: string, identity: ReceiptIdentity): void {
  if (!isBrowser() || !attendeeId) return;
  const payload: StoredReceiptIdentity = {
    attendeeId,
    email: identity.email?.trim() || undefined,
    phone: identity.phone?.trim() || undefined,
  };
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // stockage indisponible (mode privé) : la page de confirmation redemandera
  }
}

export function loadReceiptIdentity(attendeeId?: string): ReceiptIdentity | null {
  if (!isBrowser()) return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredReceiptIdentity;
    if (!parsed?.email && !parsed?.phone) return null;
    if (attendeeId && parsed.attendeeId && parsed.attendeeId !== attendeeId) return null;
    return { email: parsed.email, phone: parsed.phone };
  } catch {
    return null;
  }
}

export function clearReceiptIdentity(): void {
  if (!isBrowser()) return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
