
export interface Address {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  fullAddress: string;
  formattedAddress: string;
}

/**
 * Classe utilitaire pour la gestion des adresses
 */
export class AddressUtils {
  /**
   * Formate une adresse complète
   */
  static getFullAddress(address?: Address): string {
    if (!address) return 'Adresse non renseignée';

    // Utiliser fullAddress si disponible
    if (address.fullAddress && address.fullAddress.trim() !== '') {
      return address.fullAddress;
    }

    // Sinon construire l'adresse
    const parts = [
      address.street,
      address.city,
      address.state,
      address.postalCode,
      address.country
    ].filter(part => part && part.trim() !== '');

    return parts.length > 0 ? parts.join(', ') : 'Adresse non renseignée';
  }

  /**
   * Formate une adresse courte (ville, pays)
   */
  static getShortAddress(address?: Address): string {
    if (!address) return 'Adresse non renseignée';

    const parts = [
      address.city,
      address.country
    ].filter(part => part && part.trim() !== '');

    return parts.length > 0 ? parts.join(', ') : 'Adresse non renseignée';
  }

  /**
   * Vérifie si une adresse est complète
   */
  static isComplete(address?: Address): boolean {
    if (!address) return false;
    return !!(address.street && address.city && address.country);
  }

  /**
   * Obtient les coordonnées formatées
   */
  static getCoordinates(address?: Address): string {
    if (!address) return 'Non renseigné';
    if (address.latitude && address.longitude) {
      return `${address.latitude}, ${address.longitude}`;
    }
    return 'Non renseigné';
  }

  /**
   * Crée une adresse vide
   */
  static createEmpty(): Address {
    return {
      street: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
      latitude: undefined,
      longitude: undefined,
      fullAddress: '',
      formattedAddress: ''
    };
  }

  /**
   * Clone une adresse
   */
  static clone(address: Address): Address {
    return {
      street: address.street,
      city: address.city,
      state: address.state,
      country: address.country,
      postalCode: address.postalCode,
      latitude: address.latitude,
      longitude: address.longitude,
      fullAddress: address.fullAddress || '',
      formattedAddress: address.formattedAddress || ''
    };
  }

  /**
   * Compare deux adresses
   */
  static areEqual(a: Address, b: Address): boolean {
    if (!a && !b) return true;
    if (!a || !b) return false;

    return a.street === b.street &&
           a.city === b.city &&
           a.state === b.state &&
           a.country === b.country &&
           a.postalCode === b.postalCode &&
           a.latitude === b.latitude &&
           a.longitude === b.longitude;
  }

  /**
   * Met à jour fullAddress à partir des composants
   */
  static updateFullAddress(address: Address): Address {
    const parts = [
      address.street,
      address.city,
      address.state,
      address.postalCode,
      address.country
    ].filter(part => part && part.trim() !== '');

    return {
      ...address,
      fullAddress: parts.length > 0 ? parts.join(', ') : 'Adresse non renseignée',
      formattedAddress: parts.length > 0 ? parts.join(', ') : 'Adresse non renseignée'
    };
  }
}

export interface ServiceTime {
  day: string;
  time: string;
  type?: string;
  formattedDisplay: string;
}

/**
 * Classe utilitaire pour ServiceTime
 */
export class ServiceTimeUtils {
  static getFormattedDisplay(serviceTime: ServiceTime): string {
    if (serviceTime.formattedDisplay) return serviceTime.formattedDisplay;
    return `${serviceTime.day} - ${serviceTime.time}${serviceTime.type ? ` (${serviceTime.type})` : ''}`;
  }

  static createDefault(): ServiceTime {
    return {
      day: 'Dimanche',
      time: '08:00',
      type: 'Matin',
      formattedDisplay: 'Dimanche - 08:00 (Matin)'
    };
  }

  static getDays(): string[] {
    return ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  }

  static getServiceTypes(): string[] {
    return ['Matin', 'Soir', 'Jeunes', 'Enfants', 'Louange', 'Prière', 'Étude Biblique', 'Autre'];
  }
}

export interface Site {
  id: string;
  name: string;
  address: Address;
  phone?: string;
  email?: string;
  pastorId?: string;
  pastorName?: string;
  isActive: boolean;
  serviceTimes: ServiceTime[];
  formattedAddress: string;
  formattedServices: string;
}

export interface SiteCreate {
  name: string;
  address: Address;
  phone?: string;
  email?: string;
  pastorId?: string;
  isActive?: boolean;
  serviceTimes?: ServiceTime[];
}

export interface SiteUpdate {
  name?: string;
  address?: Address;
  phone?: string;
  email?: string;
  pastorId?: string;
  isActive?: boolean;
  serviceTimes?: ServiceTime[];
}

/**
 * Classe utilitaire pour Site
 */
export class SiteUtils {
  /**
   * Obtient l'adresse formatée d'un site
   */
  static getFormattedAddress(site: Site | SiteCreate): string {
    if (!site.address) return 'Adresse non renseignée';

    // Utiliser AddressUtils pour formater
    const fullAddress = AddressUtils.getFullAddress(site.address);
    return fullAddress || 'Adresse non renseignée';
  }

  /**
   * Obtient les services formatés
   */
  static getFormattedServices(serviceTimes: ServiceTime[]): string {
    if (!serviceTimes || serviceTimes.length === 0) return 'Aucun service';

    // Utiliser le formattedDisplay si disponible
    const displays = serviceTimes.map(s => s.formattedDisplay || ServiceTimeUtils.getFormattedDisplay(s));
    return displays.join(', ');
  }

  /**
   * Obtient le badge de statut
   */
  static getStatusBadge(isActive: boolean): { label: string; color: string } {
    return isActive
      ? { label: 'Actif', color: 'success' }
      : { label: 'Inactif', color: 'danger' };
  }

  /**
   * Obtient les initiales du nom
   */
  static getInitials(name: string): string {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  /**
   * Trie les sites par nombre de services
   */
  static sortByServiceCount(sites: Site[]): Site[] {
    return [...sites].sort((a, b) =>
      (b.serviceTimes?.length || 0) - (a.serviceTimes?.length || 0)
    );
  }

  /**
   * Filtre les sites par recherche
   */
  static filterSites(sites: Site[], searchTerm: string): Site[] {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return sites;

    return sites.filter(site =>
      site.name.toLowerCase().includes(term) ||
      (site.address?.city && site.address.city.toLowerCase().includes(term)) ||
      (site.address?.country && site.address.country.toLowerCase().includes(term)) ||
      (site.phone && site.phone.includes(term)) ||
      (site.email && site.email.toLowerCase().includes(term))
    );
  }

  /**
   * Crée un site vide
   */
  static createEmpty(): Site {
    return {
      id: '',
      name: '',
      address: AddressUtils.createEmpty(),
      phone: '',
      email: '',
      pastorId: '',
      pastorName: '',
      isActive: true,
      serviceTimes: [],
      formattedAddress: '',
      formattedServices: ''
    };
  }
}
