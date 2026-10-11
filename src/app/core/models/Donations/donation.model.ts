// Modèles Donations (Live Stream) — publics.

export interface PublicCulteDonation {
  serviceId: string;
  title: string;
  date?: string | null;
  churchName?: string | null;
  siteName?: string | null;
  isLive: boolean;
  donationEnabled: boolean;
  currency: string;
  suggestedAmounts: number[];
  message?: string | null;
}

export interface CreateDonationIntent {
  amount: number;
  currency?: string;
  donorName?: string;
  donorPhone?: string;
  donorEmail?: string;
  paymentMethod?: string;
  message?: string;
}

export interface DonationIntentResult {
  success: boolean;
  errorMessage?: string | null;
  intentId?: string | null;
  reference?: string | null;
  checkoutUrl?: string | null;
  paymentUrl?: string | null;
  qrCode?: string | null;
  amount: number;
  currency: string;
}

export interface DonationStatus {
  reference: string;
  status: string;
  amount: number;
  currency: string;
  serviceId?: string | null;
  completedAt?: string | null;
}

export interface DonationNotification {
  donorName: string;
  amount: number;
  currency: string;
  message?: string | null;
  createdAt: string;
}

/** Don en ligne d'un culte (vue administrateur). */
export interface ServiceDonation {
  intentId: string;
  reference: string;
  donorName: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  completedAt?: string | null;
  offeringId?: string | null;
  offeringStatus?: string | null;
  isValidated?: boolean;
}

export interface ServiceDonationsResponse {
  success: boolean;
  data: ServiceDonation[];
  total: number;
}
