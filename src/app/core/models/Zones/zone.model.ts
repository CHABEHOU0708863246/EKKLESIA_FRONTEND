// zone.model.ts

/**
 * Zone géographique regroupant plusieurs sites sous la supervision d'un Chef de Zone.
 */
export interface Zone {
  id: string;
  name: string;               // ex: "INTÉRIEUR 1"
  churchId?: string;          // ID de l'église mère
  chiefUserId: string;        // ID de l'utilisateur Chef de Zone
  siteIds: string[];          // IDs des sites rattachés à la zone
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
}

/**
 * DTO pour la création d'une zone
 */
export interface ZoneCreate {
  name: string;
  churchId?: string;
  chiefUserId: string;
  siteIds: string[];
}

/**
 * DTO pour la mise à jour d'une zone (seul le nom et l'église peuvent être modifiés)
 */
export interface ZoneUpdate {
  name?: string;
  churchId?: string;
}

/**
 * DTO pour assigner un Chef de zone
 */
export interface ZoneAssignChief {
  chiefUserId: string;
}

/**
 * DTO pour ajouter un site à une zone
 */
export interface ZoneAddSite {
  siteId: string;
}

/**
 * DTO pour la réponse d'une zone (inclut des champs calculés pour l'affichage)
 */
export interface ZoneResponse extends Zone {
  // Champs calculés (dénormalisés pour l'affichage)
  churchName?: string;        // Nom de l'église mère
  chiefUserName?: string;     // Nom complet du chef de zone
  chiefUserEmail?: string;    // Email du chef
  siteNames?: string[];       // Noms des sites
  siteCount?: number;         // Nombre de sites
  formattedCreatedAt?: string;
  formattedUpdatedAt?: string;
}

/**
 * DTO pour filtrer les zones
 */
export interface ZoneFilter {
  name?: string;
  churchId?: string;
  chiefUserId?: string;
  siteId?: string;            // Filtrer les zones contenant un site spécifique
  isActive?: boolean;
  createdFrom?: string;
  createdTo?: string;
  page: number;
  pageSize: number;
  sortBy?: string;            // "name", "createdAt", "siteCount"
  sortOrder?: "asc" | "desc";
}

/**
 * DTO pour la liste paginée des zones
 */
export interface ZoneListResponse {
  items: ZoneResponse[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

/**
 * DTO pour les statistiques des zones
 */
export interface ZoneStatistics {
  totalZones: number;
  activeZones: number;
  inactiveZones: number;
  totalSitesInZones: number;
  averageSitesPerZone: number;
  zonesByChurch: Record<string, number>; // churchId -> count
  topZonesBySiteCount: ZoneResponse[];
  recentZones: ZoneResponse[];
}
